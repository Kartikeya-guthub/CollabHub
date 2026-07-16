"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Room {
  id: string;
  name: string;
  type: "code" | "whiteboard" | "both";
  created_at: string;
}

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<Room["type"]>("code");
  const [displayName, setDisplayName] = useState("User");
  const router = useRouter();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRooms(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    }
  };

  useEffect(() => {
    if (!token) {
      router.push("/test-auth"); // Or /login if that's what is being used
      return;
    }
    const storedName = localStorage.getItem("displayName");
    if (storedName) {
      setDisplayName(storedName);
    }
    fetchRooms();
  }, [token, router]);

  const createRoom = async () => {
    if (!name.trim()) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, type }),
      });
      if (res.ok) {
        const room = await res.json();
        router.push(`/room/${room.id}`);
      }
    } catch (err) {
      console.error("Failed to create room:", err);
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 600 }}>Your Dashboard</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ color: "var(--foreground)", opacity: 0.7 }}>
            Hello, {displayName}
          </span>
          <button 
            className="btn-secondary"
            onClick={() => {
              localStorage.clear();
              router.push("/test-auth");
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="bento-grid" style={{ gridTemplateColumns: "1fr 2fr", padding: 0 }}>
        
        {/* Create Room Panel */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", height: "fit-content" }}>
          <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Create a new room</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--foreground)", opacity: 0.8 }}>Room Name</label>
            <input 
              className="input-field"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Project Brainstorm" 
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.9rem", color: "var(--foreground)", opacity: 0.8 }}>Room Type</label>
            <select 
              className="input-field"
              value={type} 
              onChange={(e) => setType(e.target.value as Room["type"])}
            >
              <option value="code" style={{ background: "#1e1e1e", color: "#fff" }}>Code Editor</option>
              <option value="whiteboard" style={{ background: "#1e1e1e", color: "#fff" }}>Whiteboard</option>
              <option value="both" style={{ background: "#1e1e1e", color: "#fff" }}>Both (Split View)</option>
            </select>
          </div>

          <button className="btn-primary" onClick={createRoom} style={{ marginTop: "10px" }}>
            Create & Join
          </button>
        </div>

        {/* Room List Panel */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "1.2rem", margin: "0 0 20px 0" }}>Recent Rooms</h2>
          
          {rooms.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--foreground)", opacity: 0.5 }}>
              You haven't joined any rooms yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {rooms.map((r) => (
                <div 
                  key={r.id} 
                  style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    padding: "16px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "12px",
                    border: "1px solid var(--glass-border)"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <a href={`/room/${r.id}`} style={{ color: "var(--foreground)", textDecoration: "none", fontSize: "1.1rem", fontWeight: 500 }}>
                      {r.name}
                    </a>
                    <div style={{ display: "flex", gap: "10px", fontSize: "0.8rem", color: "var(--foreground)", opacity: 0.6 }}>
                      <span style={{ textTransform: "capitalize", background: "var(--glass-bg)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--glass-border)" }}>
                        {r.type}
                      </span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        const link = `${window.location.origin}/room/${r.id}/join`;
                        navigator.clipboard.writeText(link);
                        alert("Invite link copied to clipboard!");
                      }}
                    >
                      Copy Invite
                    </button>
                    <button 
                      className="btn-primary"
                      onClick={() => router.push(`/room/${r.id}`)}
                    >
                      Enter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
