const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function findUnusedRoutes() {
	const routesDir = path.join(__dirname, "apps/api/src/routes");

	function getFiles(dir) {
		let results = [];
		const list = fs.readdirSync(dir);
		list.forEach((file) => {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);
			if (stat && stat.isDirectory()) {
				results = results.concat(getFiles(filePath));
			} else if (
				filePath.endsWith(".ts") &&
				!filePath.endsWith(".test.ts") &&
				!filePath.includes("\\tests\\")
			) {
				results.push(filePath);
			}
		});
		return results;
	}

	const routeFiles = getFiles(routesDir);
	const orphans = [];

	for (const file of routeFiles) {
		const relPath = path.relative(__dirname, file).replace(/\\/g, "/");
		const baseName = path.basename(file, ".ts");

		// We will search for the import of this file in any non-test file in apps/api/src
		// e.g. "routes/documents/sign" or "./sign.js" or "routes/.../file.js"
		// To be safe, we can just search for the filename `baseName` or `baseName.js`

		try {
			// Find all usages of the file name in apps/api/src excluding tests
			const out = execSync(
				`rg -l "${baseName}" apps/api/src -g "!**/*.test.ts" -g "!**/tests/**"`,
			).toString();
			// If the only result is the file itself, it's an orphan
			const lines = out
				.trim()
				.split("\n")
				.filter((l) => l);
			if (
				lines.length === 1 &&
				lines[0].replace(/\\/g, "/").endsWith(relPath)
			) {
				orphans.push(relPath);
			} else if (lines.length === 0) {
				orphans.push(relPath);
			}
		} catch (e) {
			// rg returns 1 if no matches found
			orphans.push(relPath);
		}
	}

	console.log("Unused routes:");
	console.log(orphans);
}

findUnusedRoutes();
