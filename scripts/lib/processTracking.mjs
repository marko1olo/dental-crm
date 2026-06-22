import { spawn } from "node:child_process";

export function spawnTracked(name, command, args, options) {
  const child = spawn(command, args, options);
  let stderr = "";
  let stdout = "";
  child.stderr?.on("data", (chunk) => {
    stderr = `${stderr}${chunk.toString("utf8")}`.slice(-4_000);
  });
  child.stdout?.on("data", (chunk) => {
    stdout = `${stdout}${chunk.toString("utf8")}`.slice(-4_000);
  });
  return { child, name, stderr: () => stderr, stdout: () => stdout };
}

export async function stopTracked(tracked) {
  if (!tracked?.child || tracked.child.killed) return;
  tracked.child.kill();
  await Promise.race([
    new Promise((resolve) => tracked.child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000))
  ]);
}

export function processExitFailure(tracked, label) {
  return new Promise((_, reject) => {
    tracked.child.once("exit", (code, signal) => {
      reject(
        new Error(
          `${label} exited early (code=${code ?? "null"}, signal=${signal ?? "null"}) stdout=${tracked
            .stdout()
            .slice(-800)} stderr=${tracked.stderr().slice(-800)}`
        )
      );
    });
  });
}
