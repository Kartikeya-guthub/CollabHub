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
      <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
        <h2>Joining Room...</h2>
        <p style={{ opacity: 0.7 }}>Please wait while we verify your invitation.</p>
      </div>
    </div>
  );
}
