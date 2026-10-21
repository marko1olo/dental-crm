const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.join(__dirname, "biome_clean_output.txt"), "utf8");

// Parse diagnostic blocks with fixability info
const lines = content.split("\n");

const fixabilityByRule = {};
const fixabilityByScope = {
  "apps/web/src": { safe: 0, unsafe: 0, manual: 0, format: 0 },
  "biome.json": { safe: 0, unsafe: 0, manual: 0, format: 0 },
  "packages": { safe: 0, unsafe: 0, manual: 0, format: 0 },
  "scripts": { safe: 0, unsafe: 0, manual: 0, format: 0 },
  "root": { safe: 0, unsafe: 0, manual: 0, format: 0 },
};

let currentHeader = "";
let currentFixType = "manual";

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\u001b\[[0-9;]*m/g, "").trim();

  if (line.match(/^([^\s:]+(?::\d+:\d+)?)\s+(lint\/[^\s]+|format)\b/)) {
    currentHeader = line;
    let fixType = "manual";
    if (line.includes("FIXABLE")) {
      fixType = "safe";
    } else if (line.endsWith("format")) {
      fixType = "format";
    }

    // Scan next few lines for "Unsafe fix" or "Safe fix"
    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      const nextLine = lines[j].replace(/\u001b\[[0-9;]*m/g, "").trim();
      if (nextLine.startsWith("i Unsafe fix")) {
        fixType = "unsafe";
        break;
      }
      if (nextLine.startsWith("i Safe fix")) {
        fixType = "safe";
        break;
      }
    }

    const locMatch = line.match(/^([^\s:]+(?::\d+:\d+)?)\s+(lint\/[^\s]+|format)\b/);
    const loc = locMatch[1];
    const rule = locMatch[2];
    const file = loc.split(":")[0].replace(/\\/g, "/");

    let scope = "root";
    if (file === "biome.json") scope = "biome.json";
    else if (file.startsWith("apps/web/src")) scope = "apps/web/src";
    else if (file.startsWith("apps/api/src")) scope = "apps/api/src";
    else if (file.startsWith("packages/")) scope = "packages";
    else if (file.startsWith("scripts/")) scope = "scripts";

    if (!fixabilityByScope[scope]) fixabilityByScope[scope] = { safe: 0, unsafe: 0, manual: 0, format: 0 };
    fixabilityByScope[scope][fixType]++;

    if (!fixabilityByRule[rule]) fixabilityByRule[rule] = { safe: 0, unsafe: 0, manual: 0, format: 0 };
    fixabilityByRule[rule][fixType]++;
  }
}

console.log("=== FIXABILITY BY SCOPE ===");
console.log(JSON.stringify(fixabilityByScope, null, 2));

console.log("\n=== FIXABILITY BY RULE ===");
console.log(JSON.stringify(fixabilityByRule, null, 2));
