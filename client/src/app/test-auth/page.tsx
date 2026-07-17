"use client";
import { useEffect } from "react";

export default function TestAuth() {
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `test-${Date.now()}@test.com`,
        password: "123",
        displayName: "Tester",
      }),
    })
      .then((r) => r.json().then((data) =>({ status: r.status, data })))
      .then(({ status, data }) => {
        if (status >= 400) {
          console.error("Server Error:", data);
          alert(`Authentication failed: ${data.error || "Unknown error"}`);
          return;
        }
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem(
          "displayName",
          data.user.display_name || data.user.displayName || "Tester"
        );
        window.location.href = "/dashboard";
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        alert("Network error. Check console.");
      });
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div className="linear-panel" style={{ padding: "40px", textAlign: "center", width: "100%", maxWidth: "400px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.6px", marginBottom: "12px" }}>Authenticating</h2>
        <p style={{ color: "var(--ink-subtle)", fontSize: "14px", marginBottom: "0" }}>Joining the workspace...</p>
      </div>
    </div>
  );
}
