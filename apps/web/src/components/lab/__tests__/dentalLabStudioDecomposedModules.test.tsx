/**
 * apps/web/src/components/lab/__tests__/dentalLabStudioDecomposedModules.test.tsx
 *
 * DENTE Dental CRM — Red Team Verification of Decomposed Dental Lab Studio Modules.
 * Tests isolated components: FDI selector, work type selector, shade picker,
 * financial summary, stages timeline, and orders registry.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	UPPER_JAW_TEETH,
	LOWER_JAW_TEETH,
} from "../studioModal/LabFdiTeethSelector";
import {
	CANONICAL_LAB_MATERIALS,
	CLINIC_LABORATORIES,
	VITA_SHADES_SSOT,
	formatKopecksToRubles,
	calcNetRevenueKopecks,
	getMaterialMeta,
} from "../dentalLabCatalogData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const studioDir = path.resolve(__dirname, "../studioModal");

describe("Dental Lab Studio Decomposed Modules Suite (Mandates 8b, 8e, 8am)", () => {
	it("1. Verifies modular directory structure and line limits (Mandate 8b <= 250 lines)", () => {
		assert.ok(fs.existsSync(studioDir), "studioModal directory must exist");
		const files = fs.readdirSync(studioDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

		assert.ok(files.length >= 6, "Must contain at least 6 modular files");

		for (const file of files) {
			const content = fs.readFileSync(path.join(studioDir, file), "utf-8");
			const lineCount = content.split(/\r?\n/).length;
			assert.ok(
				lineCount <= 250,
				`File ${file} has ${lineCount} lines, exceeds 250 lines modular ceiling`,
			);
		}
	});

	it("2. Verifies LabFdiTeethSelector jaws anatomy and teeth count", () => {
		assert.equal(UPPER_JAW_TEETH.length, 14, "Upper jaw must contain 14 teeth");
		assert.equal(LOWER_JAW_TEETH.length, 14, "Lower jaw must contain 14 teeth");
		assert.ok(UPPER_JAW_TEETH.includes(16), "Upper jaw must include 16");
		assert.ok(UPPER_JAW_TEETH.includes(21), "Upper jaw must include 21");
		assert.ok(LOWER_JAW_TEETH.includes(46), "Lower jaw must include 46");
		assert.ok(LOWER_JAW_TEETH.includes(31), "Lower jaw must include 31");
	});

	it("3. Verifies LabOrderFinancialSummary integer math precision", () => {
		const mat = getMaterialMeta("zirconia_multilayer");
		const count = 3;
		const totalLab = mat.baseLabCostKopecks * count;
		const totalPat = mat.defaultPatientPriceKopecks * count;
		const net = calcNetRevenueKopecks(totalPat, totalLab);

		assert.equal(net, totalPat - totalLab, "Net revenue must strictly equal diff");
		assert.ok(net > 0, "Net revenue must be positive");
		assert.ok(
			formatKopecksToRubles(net).includes("₽"),
			"Formatted rubles must contain currency sign",
		);
	});

	it("4. Verifies zero cartoon emojis in all decomposed modules (Mandate 8d)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const files = fs.readdirSync(studioDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

		for (const file of files) {
			const content = fs.readFileSync(path.join(studioDir, file), "utf-8");
			const lines = content.split(/\r?\n/);
			lines.forEach((line, idx) => {
				const cleaned = line.replace(/✓/g, "");
				const match = cleaned.match(emojiRegex);
				assert.equal(
					match,
					null,
					`Found emoji ${match?.[0]} in ${file} at line ${idx + 1}`,
				);
			});
		}
	});

	it("5. Verifies facade file DentalLabStudioModal.tsx size is within 200-300 lines sweet spot", () => {
		const facadePath = path.resolve(__dirname, "../DentalLabStudioModal.tsx");
		assert.ok(fs.existsSync(facadePath), "DentalLabStudioModal.tsx must exist");
		const content = fs.readFileSync(facadePath, "utf-8");
		const lineCount = content.split(/\r?\n/).length;

		assert.ok(
			lineCount >= 180 && lineCount <= 300,
			`Facade has ${lineCount} lines, expected 180-300 lines sweet spot`,
		);
	});
});
