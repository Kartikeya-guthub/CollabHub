"use client";
import { useEffect, useState } from "react";
import { Awareness } from "y-protocols/awareness";

interface PresenceUser {
  clientId: number;
  name: string;
  color: string;
}

export default function PresenceList({ awareness }: { awareness: Awareness }) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const updateList = () => {
      const states = Array.from(awareness.getStates().entries())
        .filter(([, state]) => state.user)
        .map(([clientId, state]) => ({
          clientId,
          name: state.user.name,
          color: state.user.color,
        }));
      setUsers(states);
    };

    updateList();
    awareness.on("change", updateList);
    return () => awareness.off("change", updateList);
  }, [awareness]);

  return (
    <div style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "8px", background: "#f9f9f9" }}>
      <h3 style={{ margin: "0 0 10px 0" }}>Online ({users.length})</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {users.map((u) => (
          <li key={u.clientId} style={{ color: u.color, fontWeight: "bold", marginBottom: "4px" }}>
            ● {u.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
