import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

describe("Dental Lab — Mandate 8d Zero Emojis Compliance", () => {
	it("10. Zero Emojis Compliance across all lab files (Mandate 8d Sin #7)", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const targetFiles = [
			"DentalLabOrderModal.tsx",
			"DentalLabOrdersHubModal.tsx",
			"DentalLabShadeSelector.tsx",
			"DentalLabPrintBlank.tsx",
			"labMath.ts",
			"dentalLabWorkflowEngine.ts",
			"dentalLabFinancialGateEngine.ts",
			"DentalLabFinancialGate.tsx",
			"DentalLabRestorationTab.tsx",
		];

		const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
		const extPictRegex = /\p{Extended_Pictographic}/u;

		for (const file of targetFiles) {
			const fullPath = path.join(labDir, file);
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, "utf-8");
				assert.equal(
					emojiRegex.test(content),
					false,
					`Файл ${file} содержит запрещенные символы/эмодзи (Мандат 8d п. 7)`,
				);
				assert.equal(
					extPictRegex.test(content),
					false,
					`Файл ${file} содержит Extended_Pictographic эмодзи (Мандат 8d п. 7)`,
				);
			}
		}
	});
});
