const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.join(__dirname, "biome_clean_output.txt"), "utf8");
const summary = JSON.parse(fs.readFileSync(path.join(__dirname, "biome_analysis_summary.json"), "utf8"));

// Filter files in apps/web/src
const webFiles = {};
const webRules = {};
const webDiagnostics = [];

const otherFiles = {};
const otherRules = {};

summary.diagnostics.forEach(d => {
  if (d.file.startsWith("apps\\web\\src") || d.file.startsWith("apps/web/src")) {
    webDiagnostics.push(d);
    webFiles[d.file] = (webFiles[d.file] || 0) + 1;
    webRules[d.rule] = (webRules[d.rule] || 0) + 1;
  } else {
    otherFiles[d.file] = (otherFiles[d.file] || 0) + 1;
    otherRules[d.rule] = (otherRules[d.rule] || 0) + 1;
  }
});

console.log("=== APPS/WEB/SRC DIAGNOSTICS ===");
console.log("Total in apps/web/src:", webDiagnostics.length);
console.log("Web Rules breakdown:", JSON.stringify(webRules, null, 2));
console.log("Web Files breakdown:", JSON.stringify(webFiles, null, 2));
console.log("Web Diagnostics detail headers:");
webDiagnostics.forEach(d => console.log(`  ${d.loc} -> ${d.rule}`));

console.log("\n=== OTHER FILES DIAGNOSTICS ===");
console.log("Other files count:", Object.keys(otherFiles).length);
console.log("Other Rules breakdown:", JSON.stringify(otherRules, null, 2));
