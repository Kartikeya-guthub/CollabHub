"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function JoinRoom() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // User is not logged in. Send to auth page and ideally support ?redirect=/room/[id]/join later
      router.push("/test-auth");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${id}/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to join room");
        }
        return res.json();
      })
      .then(() => {
        router.push(`/room/${id}`);
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to join room. It might not exist.");
        router.push("/dashboard");
      });
  }, [id, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div className="linear-panel" style={{ padding: "40px", textAlign: "center", width: "100%", maxWidth: "400px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.6px", marginBottom: "12px" }}>Joining Room...</h2>
        <p style={{ color: "var(--ink-subtle)", fontSize: "14px", marginBottom: "0" }}>Please wait while we verify your invitation.</p>
      </div>
    </div>
  );
}
