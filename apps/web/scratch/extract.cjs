const fs = require("fs");
const lines = fs
	.readFileSync("apps/web/src/SettingsView.tsx", "utf8")
	.split("\n");

const start = lines.findIndex((line) =>
	line.includes('settingsTab === "clinic" ? ('),
);
const nextTabStart = lines.findIndex((line) =>
	line.includes('settingsTab === "access" ? ('),
);

// The actual section starts at `start` and ends at `nextTabStart - 1`
const block = lines.slice(start, nextTabStart).join("\n");
fs.writeFileSync("apps/web/scratch/clinic_tab.tsx", block, "utf8");
console.log("Extracted lines", start, "to", nextTabStart);
