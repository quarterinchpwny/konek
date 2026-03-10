// src/services/session.ts
import { HTTPException } from "hono/http-exception";

import type { SSHSession } from "../../types";

export const sessions = new Map<string, SSHSession>();

export const getOwnedSession = (sessionId: string, ownerId: string) => {
  const session = sessions.get(sessionId);
  if (!session || session.ownerId !== ownerId) {
    throw new HTTPException(401, { message: "Session not found or unauthorized" });
  }

  session.lastActive = Date.now();
  return session;
};
