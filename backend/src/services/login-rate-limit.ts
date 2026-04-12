import { HTTPException } from "hono/http-exception";

interface LoginWindow {
  attempts: number[];
}

const windows = new Map<string, LoginWindow>();
const windowMs = 15 * 60 * 1000;
const maxAttempts = 8;

const prune = (timestamps: number[], now: number) =>
  timestamps.filter((value) => now - value < windowMs);

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of windows.entries()) {
    const attempts = prune(value.attempts, now);
    if (attempts.length === 0) {
      windows.delete(key);
      continue;
    }
    value.attempts = attempts;
  }
}, 5 * 60 * 1000);

export const assertLoginAllowed = (key: string) => {
  const now = Date.now();
  const current = windows.get(key) ?? { attempts: [] };
  current.attempts = prune(current.attempts, now);

  if (current.attempts.length >= maxAttempts) {
    throw new HTTPException(429, { message: "Too many login attempts. Try again later." });
  }

  windows.set(key, current);
};

export const recordLoginAttempt = (key: string) => {
  const current = windows.get(key) ?? { attempts: [] };
  current.attempts.push(Date.now());
  windows.set(key, current);
};

export const clearLoginAttempts = (key: string) => {
  windows.delete(key);
};
