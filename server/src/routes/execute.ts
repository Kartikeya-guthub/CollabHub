import { Router } from "express";
import axios from "axios";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { getLanguageId } from "../judge0/languages";
import { URL } from "url";

const JUDGE0_URL = process.env.JUDGE0_API_URL;
const JUDGE0_KEY = process.env.JUDGE0_API_KEY;

interface TestCase {
  input: string;
  expectedOutput: string;
}

import { Server } from "socket.io";
import { pubClient } from "../redis";

export const executeRouter = (io: Server) => {
  const router = Router();

  router.post("/", requireAuth, async (req: AuthedRequest, res) => {
    const { code, language, testCases, roomId } = req.body as {
      code: string;
      language: string;
      testCases: TestCase[];
      roomId: string;
    };

    if (process.env.CODE_EXECUTION_ENABLED === "false") {
      return res.status(503).json({ error: "Code execution is temporarily disabled by the administrator." });
    }

    if (code.length > 50000) {
      return res.status(400).json({ error: "Code payload too large (max 50,000 chars)." });
    }
    
    if (testCases?.some(tc => tc.input?.length > 10000)) {
      return res.status(400).json({ error: "Stdin payload too large (max 10,000 chars)." });
    }

    const userId = req.user!.userId;
    const secKey = `rate_limit:execute:10s:${userId}`;
    const hrKey = `rate_limit:execute:1hr:${userId}`;
    const dayKey = `rate_limit:execute:1d:${userId}`;

    const [secReq, hrReq, dayReq] = await Promise.all([
      pubClient.incr(secKey),
      pubClient.incr(hrKey),
      pubClient.incr(dayKey)
    ]);

    if (secReq === 1) await pubClient.expire(secKey, 10);
    if (hrReq === 1) await pubClient.expire(hrKey, 3600);
    if (dayReq === 1) await pubClient.expire(dayKey, 86400);

    if (secReq > 5) return res.status(429).json({ error: "Too many code executions (10s limit)." });
    if (hrReq > 100) return res.status(429).json({ error: "Hourly code execution limit reached (max 100)." });
    if (dayReq > 1000) return res.status(429).json({ error: "Daily code execution limit reached (max 1000)." });

    if (typeof code !== "string" || !language || !testCases?.length || !roomId) {
      return res.status(400).json({ error: "code, language, testCases, roomId required" });
    }

    try {
      const results = await Promise.all(
        testCases.map(async (tc) => {
          if (JUDGE0_KEY) {
            // Judge0 Logic
            const languageId = await getLanguageId(language);
            const { data } = await axios.post(
              `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
              {
                source_code: code,
                language_id: languageId,
                stdin: tc.input,
                expected_output: tc.expectedOutput,
                cpu_time_limit: 3,
                memory_limit: 256000,
              },
              {
                headers: {
                  "X-RapidAPI-Key": JUDGE0_KEY,
                  "X-RapidAPI-Host": JUDGE0_URL ? new URL(JUDGE0_URL as string).hostname : "",
                  "Content-Type": "application/json",
                },
                maxContentLength: 1048576,
              }
            );

            return {
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              actualOutput: data.stdout?.trimEnd() ?? "",
              stderr: data.stderr,
              compileOutput: data.compile_output,
              passed: data.status?.id === 3 && data.stdout?.trimEnd() === tc.expectedOutput.trimEnd(),
              statusDescription: data.status?.description,
            };
          } else {
            // Piston Fallback Logic (Local -> Public -> Mock)
            const payload = {
              language,
              version: "*",
              files: [{ content: code }],
              stdin: tc.input,
              run_timeout: 3000,
              compile_timeout: 10000,
              run_memory_limit: 268435456,
              compile_memory_limit: 268435456
            };

            let actualOutput = "";
            let stderr: string | null = null;
            let compileOutput: string | null = null;
            let passed = false;
            let statusDescription = "Runtime Error";

            try {
              // Try local Piston container first
              const { data } = await axios.post(`${PISTON_URL}/api/v2/execute`, payload, { 
                maxContentLength: 1048576,
                headers: {
                  "X-Piston-Api-Key": process.env.PISTON_API_KEY || ""
                }
              });
              actualOutput = data.run.stdout?.trimEnd() ?? "";
              stderr = data.run.stderr;
              passed = data.run.code === 0 && actualOutput === tc.expectedOutput.trimEnd();
              statusDescription = data.run.code === 0 ? "Accepted" : "Runtime Error";
            } catch (err1) {
              try {
                // Try public Piston API if local fails
                const { data } = await axios.post("https://emkc.org/api/v2/piston/execute", payload, { maxContentLength: 1048576 });
                actualOutput = data.run.stdout?.trimEnd() ?? "";
                stderr = data.run.stderr;
                passed = data.run.code === 0 && actualOutput === tc.expectedOutput.trimEnd();
                statusDescription = data.run.code === 0 ? "Accepted" : "Runtime Error";
              } catch (err2) {
                // TRUE LOCAL NATIVE EXECUTION (Since Docker Piston is failing on Windows)
                console.error("APIs failed. Executing natively on host...");
                const fs = require("fs");
                const path = require("path");
                const { execSync } = require("child_process");
                const os = require("os");

                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "collabhub-"));
                
                try {
                  if (language === "c++" || language === "cpp") {
                    const srcFile = path.join(tmpDir, "main.cpp");
                    const exeFile = path.join(tmpDir, "main.exe");
                    fs.writeFileSync(srcFile, code);
                    
                    try {
                      // Compile
                      execSync(`g++ "${srcFile}" -o "${exeFile}"`, { stdio: "pipe" });
                    } catch (compileErr: any) {
                      compileOutput = compileErr.stderr?.toString() || compileErr.message;
                      throw new Error("Compilation failed");
                    }
                    
                    // Run
                    const result = execSync(`"${exeFile}"`, { input: tc.input, stdio: "pipe", timeout: 2000 });
                    actualOutput = result.toString().trimEnd();
                    passed = actualOutput === tc.expectedOutput.trimEnd();
                    statusDescription = "Accepted (Native Host)";
                  } else if (language === "python") {
                    const srcFile = path.join(tmpDir, "main.py");
                    fs.writeFileSync(srcFile, code);
                    const result = execSync(`python "${srcFile}"`, { input: tc.input, stdio: "pipe", timeout: 2000 });
                    actualOutput = result.toString().trimEnd();
                    passed = actualOutput === tc.expectedOutput.trimEnd();
                    statusDescription = "Accepted (Native Host)";
                  } else {
                    throw new Error("Native execution not supported for " + language);
                  }
                } catch (execErr: any) {
                  stderr = execErr.stderr?.toString() || execErr.message;
                  statusDescription = "Runtime/Compile Error";
                } finally {
                  // Cleanup
                  fs.rmSync(tmpDir, { recursive: true, force: true });
                }
              }
            }

            return {
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              actualOutput,
              stderr,
              compileOutput,
              passed,
              statusDescription,
            };
          }
        })
      );

      const payload = {
        results,
        passCount: results.filter((r) => r.passed).length,
        totalCount: results.length,
        triggeredBy: req.user!.userId,
        timestamp: new Date().toISOString(),
      };

      io.to(roomId).emit("execution-result", payload);
      res.json(payload);
    } catch (err: any) {
      console.error("Execute error:", err.message);
      res.status(500).json({ error: err.message || "Execution failed" });
    }
  });

  return router;
};
