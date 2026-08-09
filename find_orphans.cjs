const fs = require("fs");
const server = fs.readFileSync("apps/api/src/server.ts", "utf8");
const files = fs
	.readdirSync("apps/api/src/routes")
	.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
const orphans = files.filter((f) => {
	const base = f.replace(".ts", "");
	return (
		!server.includes("routes/" + base + ".js") &&
		!server.includes("routes/" + base + "'") &&
		!server.includes("routes/" + base + '"')
	);
});
console.log(orphans);
