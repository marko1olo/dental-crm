const fs = require("fs");
const path = require("path");

const summary = JSON.parse(fs.readFileSync(path.join(__dirname, "biome_analysis_summary.json"), "utf8"));

const folderBreakdown = {};

summary.diagnostics.forEach(d => {
  const normFile = d.file.replace(/\\/g, "/");
  let folder = "root";
  if (normFile === "biome.json") {
    folder = "biome.json";
  } else if (normFile.startsWith("apps/web/src")) {
    folder = "apps/web/src";
  } else if (normFile.startsWith("apps/api/src")) {
    folder = "apps/api/src";
  } else if (normFile.startsWith("packages/")) {
    folder = "packages";
  } else if (normFile.startsWith("scripts/")) {
    folder = "scripts";
  } else if (normFile.includes("/")) {
    folder = normFile.split("/")[0];
  }

  if (!folderBreakdown[folder]) {
    folderBreakdown[folder] = { total: 0, rules: {}, files: new Set() };
  }
  folderBreakdown[folder].total++;
  folderBreakdown[folder].rules[d.rule] = (folderBreakdown[folder].rules[d.rule] || 0) + 1;
  folderBreakdown[folder].files.add(normFile);
});

console.log("=== DIAGNOSTICS BY FOLDER ===");
for (const [folder, data] of Object.entries(folderBreakdown)) {
  console.log(`\nFolder: ${folder}`);
  console.log(`  Total diagnostics: ${data.total}`);
  console.log(`  Unique files count: ${data.files.size}`);
  console.log(`  Rules breakdown:`, JSON.stringify(data.rules, null, 4));
}
