import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { getRequestAuthSessionId, getRequestAuthToken } from "../middleware/auth";
import {
  assertLoginAllowed,
  clearLoginAttempts,
  recordLoginAttempt,
} from "../services/login-rate-limit";
import { issueAuthToken, revokeAuthToken } from "../services/auth";

const authRoute = new Hono();

const getClientAddress = (headers: Headers) => {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return headers.get("x-real-ip") || "unknown";
};

authRoute.post("/login", async (c) => {
  const { password } = await c.req.json();
  if (typeof password !== "string" || password.length === 0) {
    throw new HTTPException(400, { message: "Password is required" });
  }

  const clientAddress = getClientAddress(c.req.raw.headers);
  assertLoginAllowed(clientAddress);

  const result = issueAuthToken(password);
  if (!result) {
    recordLoginAttempt(clientAddress);
    throw new HTTPException(401, { message: "Invalid password" });
  }

  clearLoginAttempts(clientAddress);
  return c.json(result);
});

authRoute.get("/session", async (c) => {
  return c.json({ authenticated: true, sessionId: getRequestAuthSessionId(c) });
});

authRoute.post("/logout", async (c) => {
  revokeAuthToken(getRequestAuthToken(c));
  return c.json({ success: true });
});

export default authRoute;
