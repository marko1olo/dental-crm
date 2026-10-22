import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

describe("Wave 243 — Zero Emojis Compliance", () => {
	it("3. Zero Emojis Compliance across all lab files (Mandate 8d Sin #7)", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const targetFiles = [
			"DentalLabOrderModal.tsx",
			"DentalLabOrdersHubModal.tsx",
			"DentalLabShadeSelector.tsx",
			"DentalLabPrintBlank.tsx",
		];

		const emojiRegex = /\p{Extended_Pictographic}/u;

		for (const file of targetFiles) {
			const fullPath = path.join(labDir, file);
			const content = fs.readFileSync(fullPath, "utf-8");
			assert.equal(
				emojiRegex.test(content),
				false,
				`Файл ${file} содержит запрещенные эмодзи (Мандат 8d п. 7)`,
			);
		}
	});
});
