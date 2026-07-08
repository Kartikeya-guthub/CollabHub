"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      .then(r => r.json())
      .then(d => setStatus(d.status))
      .catch(() => setStatus("unreachable"));
  }, []);

  return <div>Server status: {status}</div>;
}
