import { Client as SSHClient } from "ssh2";

export const exec = (client: SSHClient, cmd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    client.exec(cmd, (err, stream) => {
      if (err) return reject(err);

      let output = "";
      stream.on("data", (d: Buffer) => (output += d.toString()));
      stream.on("close", () => resolve(output.trim()));
    });
  });
