const { spawnSync } = require("child_process");
const path = require("path");

console.log("Testing biome check with overrides config...");

const configPath = path.resolve(__dirname, "test_overrides.json");

const result = spawnSync("npx", ["biome", "check", `--config-path=${configPath}`, "--files-ignore-unknown=true"], {
  cwd: path.resolve(__dirname, "../.."),
  encoding: "utf8",
  shell: true,
  env: { ...process.env, NO_COLOR: "1" }
});

const output = (result.stdout || "") + "\n" + (result.stderr || "");

const lines = output.split("\n");

const summaryByFile = {};
const summaryByRule = {};

lines.forEach(line => {
  const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, "").trim();
  const headerMatch = cleanLine.match(/^([^\s:]+(?::\d+:\d+)?)\s+(lint\/[^\s]+|format)\b/);
  if (headerMatch) {
    const loc = headerMatch[1];
    const rule = headerMatch[2];
    const file = loc.split(":")[0].replace(/\\/g, "/");

    summaryByFile[file] = (summaryByFile[file] || 0) + 1;
    summaryByRule[rule] = (summaryByRule[rule] || 0) + 1;
  }
});

console.log(`\nRemaining diagnostic headers count: ${Object.values(summaryByFile).reduce((a, b) => a + b, 0)}`);
console.log("\nRules breakdown:", JSON.stringify(summaryByRule, null, 2));
console.log("\nFiles breakdown:", JSON.stringify(summaryByFile, null, 2));
