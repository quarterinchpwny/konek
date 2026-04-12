import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { securityConfig } from "../config/security";

const algorithm = "aes-256-gcm";
const prefix = "enc:";
const key = createHash("sha256").update(securityConfig.encryptionSecret).digest();

export const encryptSecret = (value: string | null | undefined) => {
  if (value == null || value.length === 0) {
    return value;
  }

  if (value.startsWith(prefix)) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${prefix}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
};

export const decryptSecret = (value: string | null | undefined) => {
  if (value == null || value.length === 0 || !value.startsWith(prefix)) {
    return value;
  }

  const payload = value.slice(prefix.length).split(":");
  if (payload.length !== 3) {
    throw new Error("Invalid encrypted secret format");
  }

  const [iv, tag, encrypted] = payload.map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
};
