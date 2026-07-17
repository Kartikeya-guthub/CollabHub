"use client";
import { useEffect, useState } from "react";
import { Awareness } from "y-protocols/awareness";


interface PresenceUser {
  id: string;
  name: string;
  color: string;
  surface: "code" | "whiteboard" | "both";
}

export default function UnifiedPresenceList({
  awareness,
  editor,
  layout = "vertical"
}: {
  awareness?: Awareness | null;
  editor?: any | null;
  layout?: "vertical" | "horizontal";
}) {
  const [users, setUsers] = useState<Map<string, PresenceUser>>(new Map());

  useEffect(() => {
    const update = () => {
      const merged = new Map<string, PresenceUser>();

      if (awareness) {
        for (const [, state] of awareness.getStates()) {
          if (!state.user) continue;
          merged.set(state.user.id, { ...state.user, surface: "code" });
        }
      }

      if (editor && typeof editor.getCollaborators === "function") {
        for (const p of editor.getCollaborators()) {
          const existing = merged.get(p.userId);
          merged.set(p.userId, {
            id: p.userId,
            name: p.userName,
            color: existing?.color ?? "#888",
            surface: existing ? "both" : "whiteboard",
          });
        }
      }

      setUsers(merged);
    };

    update();
    
    if (awareness) {
      awareness.on("change", update);
    }
    
    // We don't have a reliable listen hook for Excalidraw collaborators yet
    // without implementing full collaboration sync, so we just rely on awareness for now.

    return () => {
      if (awareness) {
        awareness.off("change", update);
      }
    };
  }, [awareness, editor]);

  return (
    <div>
      {layout === "vertical" && (
        <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem", color: "var(--foreground)", opacity: 0.8 }}>
          Online ({users.size})
        </h3>
      )}
      <ul style={{ 
        listStyle: "none", 
        padding: 0, 
        margin: 0, 
        display: "flex", 
        flexDirection: layout === "vertical" ? "column" : "row", 
        gap: layout === "vertical" ? "8px" : "12px",
        alignItems: "center"
      }}>
        {Array.from(users.values()).map((u) => (
          <li key={u.id} style={{ display: "flex", alignItems: "center", gap: "6px", color: "white" }}>
            <span style={{ color: u.color, fontSize: "1.2rem" }}>●</span>
            <span style={{ fontWeight: 500, fontSize: layout === "horizontal" ? "0.9rem" : "1rem" }}>{u.name}</span>
            {layout === "vertical" && (
              <span style={{ opacity: 0.5, fontSize: "0.8rem" }}>
                {u.surface === "both" ? "(code + board)" : `(${u.surface})`}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
