const fs = require("fs");
const path = require("path");

const summary = JSON.parse(fs.readFileSync(path.join(__dirname, "biome_analysis_summary.json"), "utf8"));

const targetFile = "packages\\shared\\src\\index.ts";
const pkgDiags = summary.diagnostics.filter(d => d.file === targetFile || d.file === "packages/shared/src/index.ts");

console.log(`Diagnostics in ${targetFile}:`, pkgDiags.length);
pkgDiags.forEach(d => console.log(`  ${d.loc} -> ${d.rule} [${d.header}]`));
