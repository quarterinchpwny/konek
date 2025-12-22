import { spawn } from "node:child_process";

const run = (cwd) =>
  spawn("npm", ["run", "dev"], {
    cwd,
    stdio: "inherit",
    shell: true,
  });

run("frontend");
run("backend");
