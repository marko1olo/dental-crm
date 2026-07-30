const fs = require("node:fs");
const files = [
	"apps/web/src/components/floatingCorner/cornerDockLayout.ts",
	"apps/web/src/components/floatingCorner/CornerDock.tsx",
	"apps/web/src/components/floatingCorner/cornerDock.css",
	"apps/web/src/components/floatingCorner/cornerDockLabels.ts",
	"apps/web/src/components/floatingCorner/cornerDockLayout.test.ts",
	"apps/web/src/styles/dente-redesign.css",
	"apps/web/src/components/Omnibar.tsx",
];
const pattern = /[РС][-ÿ]/;
let total = 0;
for (const file of files) {
	const lines = fs.readFileSync(file, "utf8").split("\n");
	const broken = lines.filter((line) => pattern.test(line));
	total += broken.length;
	console.log(`${file} broken=${broken.length}`);
}
console.log(`TOTAL_BROKEN=${total}`);
