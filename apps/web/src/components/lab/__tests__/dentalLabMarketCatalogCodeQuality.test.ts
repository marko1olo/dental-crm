import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("dentalLabMarketCatalogCodeQuality — Mandates 8b & 8d", () => {
	it("Mandate 8b: All lab and orthopedics files strictly <= 800 lines of code", () => {
		const baseDir = fs.existsSync(path.resolve(process.cwd(), "apps/web"))
			? path.resolve(process.cwd(), "apps/web")
			: process.cwd();
		const directories = [
			path.resolve(baseDir, "src/components/lab"),
			path.resolve(baseDir, "src/components/orthopedics"),
		];

		const oversizedFiles: Array<{ file: string; lines: number }> = [];

		function scanDir(dir: string) {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory() && entry.name !== "__tests__" && entry.name !== "node_modules") {
					scanDir(fullPath);
				} else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
					const content = fs.readFileSync(fullPath, "utf8");
					const lines = content.split(/\r?\n/).length;
					if (lines > 800) {
						oversizedFiles.push({ file: path.relative(process.cwd(), fullPath), lines });
					}
				}
			}
		}

		for (const d of directories) {
			if (fs.existsSync(d)) scanDir(d);
		}

		assert.equal(oversizedFiles.length, 0);
	});

	it("Mandate 8d: Zero cartoon emojis across all lab and orthopedics components", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const baseDir = fs.existsSync(path.resolve(process.cwd(), "apps/web"))
			? path.resolve(process.cwd(), "apps/web")
			: process.cwd();
		const directories = [
			path.resolve(baseDir, "src/components/lab"),
			path.resolve(baseDir, "src/components/orthopedics"),
		];

		const emojiViolations: Array<{ file: string; line: number; match: string }> = [];

		function scanDir(dir: string) {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory() && entry.name !== "__tests__" && entry.name !== "node_modules") {
					scanDir(fullPath);
				} else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
					const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
					lines.forEach((line, idx) => {
						const match = line.match(emojiRegex);
						if (match) {
							emojiViolations.push({
								file: path.relative(process.cwd(), fullPath),
								line: idx + 1,
								match: match[0],
							});
						}
					});
				}
			}
		}

		for (const d of directories) {
			if (fs.existsSync(d)) scanDir(d);
		}

		assert.equal(emojiViolations.length, 0);
	});
});
