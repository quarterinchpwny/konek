import type { Client as SSHClient } from "ssh2";

import { shellEscape } from "./shell";

const runCommand = (client: SSHClient, command: string) =>
  new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = "";
        let stderr = "";
        let code: number | null = null;

        stream.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        stream.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        stream.on("exit", (exitCode: number | null) => {
          code = exitCode;
        });
        stream.on("close", () => {
          resolve({
            code,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
          });
        });
      });
    },
  );

const runCheckedCommand = async (
  client: SSHClient,
  command: string,
  failureMessage: string,
) => {
  const result = await runCommand(client, command);
  if (result.code !== 0) {
    throw new Error(result.stderr || failureMessage);
  }
};

const buildTmuxCommand = (command: string, socketName?: string) => {
  if (!socketName) {
    return `tmux ${command}`;
  }

  return `tmux -L ${shellEscape(socketName)} -f /dev/null ${command}`;
};

export const getPersistentTerminalSocketName = (sessionId: string) =>
  `konek-${sessionId.replace(/-/g, "").slice(0, 16)}`;

export const ensurePersistentTerminalAvailable = async (client: SSHClient) => {
  const result = await runCommand(client, "command -v tmux >/dev/null 2>&1 || exit 127");
  if (result.code === 127) {
    throw new Error("Reconnectable terminal tabs require tmux on the remote host.");
  }
};

export const createPersistentTerminalSession = async (
  client: SSHClient,
  socketName: string,
  sessionName: string,
) => {
  await runCheckedCommand(
    client,
buildTmuxCommand(
  [
    "start-server",
    "set-option -g default-terminal tmux-256color",
    "set-option -ga terminal-overrides ',*:Tc'",
    `new-session -d -s ${shellEscape(sessionName)}`,
  ].join(" \\; "),
  socketName,
),
    "Failed to create terminal tab.",
  );
  
};

export const killPersistentTerminalSession = async (
  client: SSHClient,
  socketName: string,
  sessionName: string,
) => {
  await runCommand(
    client,
    buildTmuxCommand(`kill-session -t ${shellEscape(sessionName)}`, socketName),
  );
};

export const resizeTmuxSession = async (
  client: SSHClient,
  sessionName: string,
  cols: number,
  rows: number,
  socketName?: string,
) => {
  if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) {
    return;
  }

  await runCommand(
    client,
    buildTmuxCommand(
      `resize-window -t ${shellEscape(sessionName)} -x ${Math.floor(cols)} -y ${Math.floor(rows)}`,
      socketName,
    ),
  );
};

export const buildPersistentTerminalAttachCommand = (
  socketName: string,
  sessionName: string,
) =>
  buildTmuxCommand(`attach-session -d -t ${shellEscape(sessionName)}`, socketName);
