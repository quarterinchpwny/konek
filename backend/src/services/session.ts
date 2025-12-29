// src/services/session.ts

import type { SSHSession } from "../types";

export const sessions = new Map<string, SSHSession>();
