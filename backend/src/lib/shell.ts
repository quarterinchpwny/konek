import { HTTPException } from "hono/http-exception";

const dockerPattern = /^[A-Za-z0-9_.-]+$/;
const pidPattern = /^\d+$/;
const archivePattern = /^[A-Za-z0-9._-]+$/;
const allowedSignals = new Set([
  "SIGTERM",
  "SIGKILL",
  "SIGINT",
  "SIGHUP",
  "SIGQUIT",
  "SIGUSR1",
  "SIGUSR2",
]);

export const shellEscape = (value: string) =>
  `'${value.replace(/'/g, `'\\''`)}'`;

export const assertDockerIdentifier = (value: string) => {
  if (!dockerPattern.test(value)) {
    throw new HTTPException(400, { message: "Invalid container ID format" });
  }
  return value;
};

export const assertPid = (value: string) => {
  if (!pidPattern.test(value)) {
    throw new HTTPException(400, { message: "Invalid process ID" });
  }
  return value;
};

export const assertSignal = (value: string) => {
  if (!allowedSignals.has(value)) {
    throw new HTTPException(400, { message: "Invalid signal" });
  }
  return value;
};

export const assertArchiveName = (value: string) => {
  if (!archivePattern.test(value)) {
    throw new HTTPException(400, { message: "Invalid archive name" });
  }
  return value;
};
