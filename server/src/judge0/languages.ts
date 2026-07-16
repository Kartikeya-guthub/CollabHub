import axios from "axios";

const JUDGE0_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_API_KEY || "";

const judge0Client = axios.create({
  baseURL: JUDGE0_URL,
  headers: {
    "X-RapidAPI-Key": JUDGE0_KEY,
    "X-RapidAPI-Host": new URL(JUDGE0_URL).hostname,
  },
});

let languageCache: Map<string, number> | null = null;

export const getLanguageId = async (name: string): Promise<number> => {
  if (!languageCache) {
    const res = await judge0Client.get("/languages");
    languageCache = new Map(
      res.data.map((lang: { id: number; name: string }) => [lang.name.toLowerCase(), lang.id])
    );
  }

  // match by substring since Judge0 names are versioned, e.g. "Python (3.12.5)"
  for (const [langName, id] of languageCache.entries()) {
    if (langName.includes(name.toLowerCase())) return id;
  }
  throw new Error(`No Judge0 language match for "${name}"`);
};
