const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const securityConfig = {
  authPassword: requireEnv("KONEK_AUTH_PASSWORD"),
  encryptionSecret: requireEnv("KONEK_SECRET_KEY"),
  tokenTtlMs: 12 * 60 * 60 * 1000,
};
