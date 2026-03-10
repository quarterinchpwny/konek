import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { getAuthSession } from "../services/auth";

const extractToken = (authorization: string | undefined) => {
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return undefined;
};

export const requireAuth = createMiddleware(async (c, next) => {
  if (c.req.path === "/api/auth/login") {
    return next();
  }

  const token = extractToken(c.req.header("authorization"));

  if (!token) {
    throw new HTTPException(401, { message: "Authentication required" });
  }

  const session = getAuthSession(token);
  if (!session) {
    throw new HTTPException(401, { message: "Invalid authentication token" });
  }

  c.set("authSessionId", session.id);
  c.set("authToken", token);

  await next();
});

export const getRequestAuthSessionId = (value: { get: (key: string) => unknown }) => {
  const authSessionId = value.get("authSessionId");
  if (typeof authSessionId !== "string" || authSessionId.length === 0) {
    throw new HTTPException(401, { message: "Authentication required" });
  }
  return authSessionId;
};

export const getRequestAuthToken = (value: { get: (key: string) => unknown }) => {
  const authToken = value.get("authToken");
  if (typeof authToken !== "string" || authToken.length === 0) {
    throw new HTTPException(401, { message: "Authentication required" });
  }
  return authToken;
};
