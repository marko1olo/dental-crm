const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Running biome check directly via node child_process with shell: true...");

const result = spawnSync("npx", ["biome", "check", "--files-ignore-unknown=true", "--max-diagnostics=2000"], {
  cwd: path.resolve(__dirname, "../.."),
  encoding: "utf8",
  shell: true,
  maxBuffer: 50 * 1024 * 1024,
  env: { ...process.env, NO_COLOR: "1" }
});

const output = (result.stdout || "") + "\n" + (result.stderr || "");

fs.writeFileSync(path.join(__dirname, "biome_clean_output.txt"), output, "utf8");

console.log("Output saved to biome_clean_output.txt. Total length:", output.length);

const lines = output.split("\n");

const diagnosticBlocks = [];
let currentBlock = null;

const summaryByFile = {};
const summaryByRule = {};
const ignoreFolderDiagnostics = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, "").trim();

  if (cleanLine.includes("useBiomeIgnoreFolder")) {
    ignoreFolderDiagnostics.push(cleanLine);
  }

  // Header pattern:
  // e.g.: "biome.json:23:4 lint/suspicious/useBiomeIgnoreFolder"
  // "apps/web/src/components/CampaignPanel.tsx:10:5 lint/correctness/noUnusedVariables"
  // "scripts/smoke-test.mjs format"
  const headerMatch = cleanLine.match(/^([^\s:]+(?::\d+:\d+)?)\s+(lint\/[^\s]+|format)\b/);
  if (headerMatch) {
    const loc = headerMatch[1];
    const rule = headerMatch[2];

    const file = loc.split(":")[0];
    summaryByFile[file] = (summaryByFile[file] || 0) + 1;
    summaryByRule[rule] = (summaryByRule[rule] || 0) + 1;

    currentBlock = {
      loc,
      file,
      rule,
      header: cleanLine,
      details: []
    };
    diagnosticBlocks.push(currentBlock);
  } else if (currentBlock) {
    currentBlock.details.push(cleanLine);
  }
}

console.log(`\nTotal diagnostic headers found: ${diagnosticBlocks.length}`);

console.log("\n--- DIAGNOSTICS BY RULE ---");
const sortedRules = Object.entries(summaryByRule).sort((a, b) => b[1] - a[1]);
sortedRules.forEach(([rule, count]) => console.log(`  ${rule}: ${count}`));

console.log("\n--- DIAGNOSTICS BY FILE ---");
const sortedFiles = Object.entries(summaryByFile).sort((a, b) => b[1] - a[1]);
sortedFiles.forEach(([file, count]) => console.log(`  ${file}: ${count}`));

console.log(`\nTotal useBiomeIgnoreFolder instances found: ${ignoreFolderDiagnostics.length}`);

// Write JSON summary
fs.writeFileSync(
  path.join(__dirname, "biome_analysis_summary.json"),
  JSON.stringify({
    totalDiagnostics: diagnosticBlocks.length,
    rules: summaryByRule,
    files: summaryByFile,
    ignoreFolderDiagnosticsCount: ignoreFolderDiagnostics.length,
    diagnostics: diagnosticBlocks.map(d => ({ loc: d.loc, file: d.file, rule: d.rule, header: d.header }))
  }, null, 2),
  "utf8"
);
