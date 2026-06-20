import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const onlyPattern = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length) ?? process.env.SMOKE_ONLY ?? "";
const onlyMatcher = onlyPattern ? new RegExp(onlyPattern) : null;

function smokeCommands() {
  return Object.entries(packageJson.scripts)
    .filter(([name, command]) => {
      if (!name.startsWith("smoke:") || name === "smoke:all") return false;
      if (onlyMatcher && !onlyMatcher.test(name)) return false;
      return typeof command === "string" && command.startsWith("node ");
    })
    .map(([name, command]) => ({ name, command }));
}

function splitNodeCommand(command) {
  const parts = command.trim().split(/\s+/);
  if (parts[0] !== "node") throw new Error(`Unsupported smoke command format: ${command}`);
  return parts.slice(1);
}

function tailLines(text, count = 14) {
  return text.trim().split(/\r?\n/).filter(Boolean).slice(-count).join("\n");
}

async function runSmoke({ name, command }) {
  const startedAt = Date.now();
  const args = splitNodeCommand(command);

  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk.toString("utf8")}`.slice(-12_000);
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-12_000);
    });

    child.on("close", (code, signal) => {
      const elapsedMs = Date.now() - startedAt;
      const ok = code === 0;
      console.log(`${ok ? "PASS" : "FAIL"} ${name} ${elapsedMs}ms`);
      if (!ok) {
        const outputTail = tailLines(`${stdout}\n${stderr}`);
        if (outputTail) console.log(outputTail);
      }
      resolve({ name, command, ok, code, signal, elapsedMs, stdout, stderr });
    });
  });
}

const commands = smokeCommands();
if (!commands.length) {
  const filterText = onlyPattern ? ` matching ${onlyPattern}` : "";
  throw new Error(`No smoke commands found${filterText}.`);
}

console.log(`Running ${commands.length} smoke checks${onlyPattern ? ` matching ${onlyPattern}` : ""}.`);
const startedAt = Date.now();
const results = [];

for (const command of commands) {
  results.push(await runSmoke(command));
}

const failed = results.filter((result) => !result.ok);
const elapsedMs = Date.now() - startedAt;
console.log(`SUMMARY total=${results.length} failed=${failed.length} elapsedMs=${elapsedMs}`);

if (failed.length) {
  for (const result of failed) {
    console.log(`FAILED ${result.name} code=${result.code ?? "null"} signal=${result.signal ?? "null"}`);
    const outputTail = tailLines(`${result.stdout}\n${result.stderr}`);
    if (outputTail) console.log(outputTail);
  }
  process.exit(1);
}
