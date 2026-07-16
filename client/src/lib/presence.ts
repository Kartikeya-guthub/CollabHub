import { Awareness } from "y-protocols/awareness";

const CURSOR_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#818cf8", "#e879f9"];

export const colorForUser = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

export const initLocalPresence = (awareness: Awareness, userId: string, displayName: string) => {
  awareness.setLocalStateField("user", {
    id: userId,
    name: displayName,
    color: colorForUser(userId),
  });
};

import { Editor } from "tldraw";

export const syncTldrawIdentity = (editor: Editor, userId: string, displayName: string) => {
  editor.user.updateUserPreferences({
    id: userId,
    name: displayName,
    color: colorForUser(userId),
  });
};
