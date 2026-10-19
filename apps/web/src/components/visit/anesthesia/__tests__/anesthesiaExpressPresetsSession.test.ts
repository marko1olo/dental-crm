/**
 * anesthesiaExpressPresetsSession.test.ts — Unit Tests for Express Anesthesia Presets (Session & Journal)
 * Standards: Минздрав РФ, СтАР. Mandates: 8e, 8k, 8n, 8b (<= 120 lines).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyExpressPresetToSession,
	createExpressAspirationAttempt,
	EXPRESS_ANESTHESIA_PRESETS,
	EXPRESS_PRESETS_BY_ID,
	generateExpressPresetDiaryText,
	getExpressPresetById,
	validateAllExpressPresets,
} from "../anesthesiaExpressPresets";

describe("Anesthesia Express Presets Session & Diary (Mandates 8e, 8n)", () => {
	it("should correctly configure Preset 6 and Preset 7", () => {
		const p6 = getExpressPresetById(
			"mandibular_plus_infiltration_ultracaine_forte",
		);
		assert.ok(p6);
		assert.equal(p6.volumeMl, 1.7);
		assert.equal(p6.isTwoPlaneRequired, true);

		const p7 = getExpressPresetById("infiltration_septanest_1_7");
		assert.ok(p7);
		assert.equal(p7.volumeMl, 1.7);
		assert.equal(p7.techniqueId, "infiltration_supraperiosteal");
	});

	it("should anatomically validate all presets without any clinical warnings", () => {
		const validation = validateAllExpressPresets();
		assert.equal(validation.allValid, true);
		assert.equal(validation.results.length, 7);
	});

	it("should create valid negative aspiration attempts for all presets", () => {
		for (const preset of EXPRESS_ANESTHESIA_PRESETS) {
			const attempt = createExpressAspirationAttempt(preset, 1);
			assert.equal(attempt.overallResult, "negative");
			assert.equal(attempt.bloodObserved, false);
		}
	});

	it("should generate complete, legally compliant Form 043/u text for all presets", () => {
		for (const preset of EXPRESS_ANESTHESIA_PRESETS) {
			const exportResult = generateExpressPresetDiaryText(preset, {
				patientFullName: "Смирнова Екатерина Васильевна",
				toothNumber: "46",
				side: "right",
			});

			assert.equal(exportResult.isLegalSafe, true);
			assert.equal(exportResult.complianceCheckPassed, true);
			assert.equal(exportResult.warningsRu.length, 0);

			const text = exportResult.diaryText043;
			assert.ok(
				text.includes("ПРОТОКОЛ МЕСТНОЙ АНЕСТЕЗИИ И АСПИРАЦИОННОЙ ПРОБЫ"),
			);
			assert.ok(text.includes("ОТРИЦАТЕЛЬНАЯ"));
			assert.ok(text.includes(`${preset.volumeMl} мл`));
		}
	});

	it("should apply preset to existing session and preserve patient demographics", () => {
		const initialSession = {
			patientFullName: "Иванов Иван Иванович",
			medCardNumber: "043-2026/001",
			patientAgeYears: 42,
			toothNumber: "36",
			side: "left" as const,
		};
		const preset = EXPRESS_PRESETS_BY_ID.mandibular_weisbrem_articaine_1_7;
		const updatedSession = applyExpressPresetToSession(initialSession, preset);

		assert.equal(updatedSession.patientFullName, "Иванов Иван Иванович");
		assert.equal(updatedSession.aspirationStatus, "negative_safe");
		assert.equal(updatedSession.attempts.length, 1);
	});
});
