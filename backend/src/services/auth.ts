import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { securityConfig } from "../config/security";

interface AuthSession {
  id: string;
  tokenHash: string;
  expiresAt: number;
}

const sessions = new Map<string, AuthSession>();

const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const normalizeSecret = (value: string) =>
  createHash("sha256").update(value).digest();

const passwordSecret = normalizeSecret(securityConfig.authPassword);

const isExpired = (session: AuthSession) => session.expiresAt <= Date.now();

setInterval(() => {
  for (const [tokenHash, session] of sessions.entries()) {
    if (isExpired(session)) {
      sessions.delete(tokenHash);
    }
  }
}, 5 * 60 * 1000);

export const issueAuthToken = (password: string) => {
  const candidate = normalizeSecret(password);

  if (!timingSafeEqual(candidate, passwordSecret)) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const session: AuthSession = {
    id: randomBytes(16).toString("hex"),
    tokenHash,
    expiresAt: Date.now() + securityConfig.tokenTtlMs,
  };

  sessions.set(tokenHash, session);

  return {
    token,
    expiresAt: session.expiresAt,
    sessionId: session.id,
  };
};

export const getAuthSession = (token: string) => {
  const tokenHash = hashToken(token);
  const session = sessions.get(tokenHash);
  if (!session) {
    return null;
  }

  if (isExpired(session)) {
    sessions.delete(tokenHash);
    return null;
  }

  return session;
};

export const revokeAuthToken = (token: string) => {
  sessions.delete(hashToken(token));
};
