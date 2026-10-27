import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type PatientClinicalSafetyProfile,
	CLINICAL_SAFETY_CATALOG,
	evaluatePatientSafetyFlags,
} from "../safetyMath.js";

describe("1. evaluatePatientSafetyFlags & CLINICAL_SAFETY_CATALOG (NSAID)", () => {
	it("1.1. CLINICAL_SAFETY_CATALOG contains allergy_nsaid with correct clinical stop parameters", () => {
		const nsaidDef = CLINICAL_SAFETY_CATALOG.find((x) => x.id === "allergy_nsaid");
		assert.ok(nsaidDef, "allergy_nsaid must exist in CLINICAL_SAFETY_CATALOG");
		assert.strictEqual(nsaidDef.category, "general_allergy");
		assert.strictEqual(nsaidDef.severity, "high");
		assert.strictEqual(nsaidDef.shortBadge, "[СТОП] АЛЛЕРГИЯ: НПВП (ЗАПРЕТ АСПИРИНА / КЕТОРОЛА)");
		assert.strictEqual(nsaidDef.titleRu, "Аллергия на нестероидные противовоспалительные препараты (НПВП / Аспириновая триада)");
		assert.ok(
			nsaidDef.fullDescription.includes("Аспирин") &&
				nsaidDef.fullDescription.includes("Кеторолак") &&
				nsaidDef.fullDescription.includes("Ибупрофен") &&
				nsaidDef.fullDescription.includes("аспириновая астма"),
			"Description must describe NSAID hypersensitivity",
		);

		assert.ok(
			nsaidDef.forbiddenProcedures.some((p) => p.includes("Аспирина, Кеторолака, Ибупрофена")),
			"Forbidden procedures must ban Aspirin, Ketorolac, Ibuprofen",
		);
		assert.ok(
			nsaidDef.forbiddenProcedures.some((p) => p.includes("комбинированных анальгетиков")),
			"Forbidden procedures must ban combination analgesics",
		);

		assert.ok(
			nsaidDef.mandatoryPrecautions.some((m) => m.includes("Парацетамол")),
			"Mandatory precautions must state Paracetamol",
		);
		assert.ok(
			nsaidDef.mandatoryPrecautions.some((m) => m.includes("трамадол") || m.includes("пролонгированная анестезия")),
			"Mandatory precautions must mention alternatives",
		);

		assert.deepStrictEqual(nsaidDef.icd10Codes, ["Z88.6", "T88.7"]);
		assert.ok(nsaidDef.keywords.includes("нпвп"));
		assert.ok(nsaidDef.keywords.includes("аспирин"));
		assert.ok(nsaidDef.keywords.includes("кеторол"));
		assert.ok(nsaidDef.keywords.includes("ибупрофен"));
	});

	it("1.2. evaluatePatientSafetyFlags detects allergy_nsaid and returns stop warnings and precautions", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			pregnancyTrimester: "none",
			hasNsaidAllergy: true,
		};

		const evalResult = evaluatePatientSafetyFlags(profile);

		assert.strictEqual(evalResult.hasHighRiskFlags, true);
		assert.strictEqual(evalResult.maxSeverity, "high");
		assert.strictEqual(evalResult.totalAlertCount, 1);

		const nsaidFlag = evalResult.activeFlags.find((f) => f.id === "allergy_nsaid");
		assert.ok(nsaidFlag, "activeFlags must contain allergy_nsaid");
		assert.strictEqual(nsaidFlag.shortBadge, "[СТОП] АЛЛЕРГИЯ: НПВП (ЗАПРЕТ АСПИРИНА / КЕТОРОЛА)");

		assert.ok(
			evalResult.forbiddenProcedures.some((p) => p.includes("Аспирина, Кеторолака, Ибупрофена")),
			"evalResult.forbiddenProcedures must list NSAID contraindication",
		);
		assert.ok(
			evalResult.mandatoryPrecautions.some((m) => m.includes("Парацетамол")),
			"evalResult.mandatoryPrecautions must recommend Paracetamol",
		);
		assert.ok(
			evalResult.formattedSummaryLine.includes("[СТОП] АЛЛЕРГИЯ: НПВП (ЗАПРЕТ АСПИРИНА / КЕТОРОЛА)"),
			"formattedSummaryLine must include the NSAID stop badge",
		);
	});
});
