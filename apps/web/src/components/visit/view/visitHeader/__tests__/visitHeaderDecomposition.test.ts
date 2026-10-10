/**
 * @file visitHeaderDecomposition.test.ts
 * @description Регрессионный тест декомпозиции монолита VisitHeaderMonolith (Wave 28).
 * Проверяет лимиты строк (<= 800), тонкий фасад (<= 150), паритет экспортов,
 * сохранение 100% test-id якорей, гигиену кодировки и автономию врача (Мандат 8e).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { registerHooks } from "node:module";

if (typeof registerHooks === "function") {
	try {
		registerHooks({
			load(url, context, nextLoad) {
				if (url.endsWith(".css")) {
					return {
						format: "module",
						shortCircuit: true,
						source: "export default {};",
					};
				}
				return nextLoad(url, context);
			},
		});
	} catch {
		// Fallback if already registered or unsupported
	}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const visitHeaderDir = path.resolve(__dirname, "..");
const facadePath = path.resolve(__dirname, "../../VisitHeaderMonolith.tsx");

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

describe("VisitHeaderMonolith Safe Decomposition Health (Wave 28)", () => {
	describe("1. Line Count Budget (<= 800 per file, facade <= 150)", () => {
		it("ensures canonical facade VisitHeaderMonolith.tsx is strictly <= 150 lines", () => {
			assert.ok(fs.existsSync(facadePath), "Facade file must exist");
			const content = fs.readFileSync(facadePath, "utf-8");
			const lines = content.split("\n").length;
			assert.ok(lines <= 150, `Facade must be <= 150 lines, got ${lines}`);
		});

		it("ensures all decomposed files in visitHeader/ are strictly <= 800 lines", () => {
			const files = fs.readdirSync(visitHeaderDir).filter((f) => /\.(ts|tsx)$/.test(f));
			assert.ok(files.length >= 4, "Must have at least 4 decomposed files");

			for (const f of files) {
				const filePath = path.join(visitHeaderDir, f);
				const content = fs.readFileSync(filePath, "utf-8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 800,
					`File ${f} must be <= 800 lines, but has ${lines} lines`,
				);
			}
		});
	});

	describe("2. Public Export Parity", () => {
		it("exports all canonical components and functions", async () => {
			const mod = await import("../index.js");
			assert.equal(typeof mod.VisitHeaderMonolith, "function", "VisitHeaderMonolith must be exported");
			assert.equal(typeof mod.default, "function", "Default export must be VisitHeaderMonolith");
			assert.equal(typeof mod.PatientAlertBadgesBar, "function", "PatientAlertBadgesBar must be exported");
			assert.equal(typeof mod.VisitTimerAndStatusControls, "function", "VisitTimerAndStatusControls must be exported");
			assert.equal(typeof mod.VisitShiftQueueControls, "function", "VisitShiftQueueControls must be exported");
			assert.equal(typeof mod.VisitActionButtonsToolbar, "function", "VisitActionButtonsToolbar must be exported");
			assert.equal(typeof mod.buildConsolidatedAllergyChip, "function", "buildConsolidatedAllergyChip must be exported");
		});
	});

	describe("3. Test Anchor Parity (data-testid, aria-label, data-tour)", () => {
		it("verifies all test-ids from the original monolith are preserved in visitHeader/", () => {
			const allContent = fs
				.readdirSync(visitHeaderDir)
				.filter((f) => /\.(ts|tsx)$/.test(f))
				.map((f) => fs.readFileSync(path.join(visitHeaderDir, f), "utf-8"))
				.join("\n");

			const requiredTestIds = [
				"visit-header-monolith",
				"visit-focus-allergy-alert",
				"visit-focus-allergy-clean",
				"visit-header-lab-status-badge",
				"btn-somatic-norm-one-click",
				"btn-visit-fast-print-043u",
				"btn-visit-fast-print-act",
				"btn-visit-fast-print-estimate",
				"btn-visit-lab-order-fast",
				"btn-visit-emergency-rescue",
				"visit-shift-queue-tabs",
				"visit-queue-tab-arrived",
				"visit-queue-count-arrived",
				"visit-queue-tab-in-treatment",
				"visit-queue-count-in-treatment",
				"visit-queue-tab-completed",
				"visit-queue-count-completed",
				"btn-save-visit-header-mobile",
				"btn-complete-visit-header",
				"visit-header-more-actions-btn",
				"visit-header-more-actions-dropdown",
				"visit-more-action-lab-order",
				"visit-more-action-print-043u",
				"visit-more-action-print-act",
				"visit-more-action-print-estimate",
				"visit-more-action-print-consent",
				"visit-more-action-consent-modal",
				"visit-more-action-emergency",
				"visit-more-action-warranty-passport",
				"visit-more-action-doctor-shift",
				"visit-more-action-price-lock",
				"visit-more-action-stage-payment",
			];

			for (const testId of requiredTestIds) {
				assert.ok(
					allContent.includes(`data-testid="${testId}"`),
					`Required data-testid "${testId}" must be present in decomposed files`,
				);
			}

			// Required aria-labels and tours
			assert.ok(allContent.includes('aria-label="Шапка текущего приёма"'));
			assert.ok(allContent.includes('aria-label="Заполнить нормой"'));
			assert.ok(allContent.includes('aria-label="Быстрая печать документов"'));
			assert.ok(allContent.includes('aria-label="Оперативная очередь смены врача"'));
			assert.ok(allContent.includes('data-tour="autonorm-btn"'));
		});
	});

	describe("4. Clinical Ergonomics, Doctor Autonomy & Sanctity of Records (Mandates 8d, 8e)", () => {
		it("ensures zero disabled buttons on finish visit or save actions", () => {
			const toolbarCode = fs.readFileSync(
				path.join(visitHeaderDir, "VisitActionButtonsToolbar.tsx"),
				"utf-8",
			);
			assert.ok(
				!toolbarCode.includes("disabled={!"),
				"Toolbar buttons must never be disabled by secondary field validators",
			);
			assert.ok(
				!toolbarCode.includes("disabled={true}"),
				"Toolbar buttons must not hardcode disabled={true}",
			);
		});

		it("ensures zero cartoon emojis in visit header files (Mandate 8d: Lucide SVG only)", () => {
			const files = fs.readdirSync(visitHeaderDir).filter((f) => /\.(ts|tsx)$/.test(f));
			for (const f of files) {
				const content = fs.readFileSync(path.join(visitHeaderDir, f), "utf-8");
				const lines = content.split("\n");
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					if (!line || line.includes("//") || line.includes("/*")) continue;
					assert.ok(
						!EMOJI_REGEX.test(line),
						`Forbidden emoji detected in ${f} at line ${i + 1}: ${line}`,
					);
				}
			}
		});

		it("ensures quiet mode for emergency rescue button (hidden 2xl:inline-flex)", () => {
			const toolbarCode = fs.readFileSync(
				path.join(visitHeaderDir, "VisitActionButtonsToolbar.tsx"),
				"utf-8",
			);
			assert.ok(
				toolbarCode.includes("hidden 2xl:inline-flex"),
				"Emergency rescue button must be demoted to quiet mode on normal desktop screens",
			);
		});
	});
});
