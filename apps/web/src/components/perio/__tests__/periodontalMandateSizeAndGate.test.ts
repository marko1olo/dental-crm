/**
 * periodontalMandateSizeAndGate.test.ts — Конституционный гейт Мандата 8b (<=120 строк) и Мандата 8d (0 эмодзи).
 * Мандат 8b: <= 120 строк.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function collectCodeFiles(dir: string): string[] {
	const result: string[] = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			result.push(...collectCodeFiles(full));
		} else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
			result.push(full);
		}
	}
	return result;
}

describe("13. Constitutional Gates: Mandates 8b (Sweet Spot 200-300 / <=500 lines) & 8d (Zero Emojis)", () => {
	const perioDir = path.resolve(__dirname, "..");
	const allFiles = collectCodeFiles(perioDir);

	it("all files in components/perio are strictly <= 500 lines (Mandate 8b & Anti-Monolith)", () => {
		const violations: string[] = [];

		for (const f of allFiles) {
			const content = fs.readFileSync(f, "utf8");
			const lines = content.split("\n").length;
			if (lines > 500) {
				violations.push(`${path.relative(perioDir, f)}: ${lines} lines`);
			}
		}

		assert.deepStrictEqual(
			violations,
			[],
			`MANDATE 8b VIOLATIONS (files exceeding 500 lines):\n${violations.join("\n")}`,
		);
	});


	it("zero cartoon emojis in all perio files (Mandate 8d & Apple HIG)", () => {
		// Detect cartoon emojis while allowing standard typographical checkmarks (✓ \u2713, \u2714)
		const emojiRegex = /(?![✓\u2713\u2714])[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const violations: string[] = [];

		for (const f of allFiles) {
			const content = fs.readFileSync(f, "utf8");
			const match = emojiRegex.exec(content);
			if (match) {
				violations.push(`${path.relative(perioDir, f)} contains '${match[0]}'`);
			}
		}

		assert.deepStrictEqual(
			violations,
			[],
			`MANDATE 8d VIOLATIONS (cartoon emojis found):\n${violations.join("\n")}`,
		);
	});
});
