import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type PatientClinicalSafetyProfile,
	evaluatePatientSafetyFlags,
} from "../safetyMath.js";

describe("1. evaluatePatientSafetyFlags (Penicillin, Latex & Aggregation)", () => {
	it("1.3. evaluatePatientSafetyFlags detects allergy_penicillin and returns antibiotic precautions", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			pregnancyTrimester: "none",
			hasPenicillinAllergy: true,
		};

		const evalResult = evaluatePatientSafetyFlags(profile);
		assert.strictEqual(evalResult.hasHighRiskFlags, true);

		const penFlag = evalResult.activeFlags.find((f) => f.id === "allergy_penicillin");
		assert.ok(penFlag, "activeFlags must contain allergy_penicillin");
		assert.strictEqual(penFlag.shortBadge, "[СТОП] АЛЛЕРГИЯ: ПЕНИЦИЛЛИНЫ (ЗАПРЕТ АМОКСИКЛАВА)");

		assert.ok(
			evalResult.forbiddenProcedures.some((p) => p.includes("пенициллинового ряда")),
			"evalResult.forbiddenProcedures must ban penicillin antibiotics",
		);
		assert.ok(
			evalResult.mandatoryPrecautions.some((m) => m.includes("Клиндамицин") || m.includes("Линкозамиды")),
			"evalResult.mandatoryPrecautions must list Clindamycin/Macrolide alternative",
		);
	});

	it("1.4. evaluatePatientSafetyFlags detects allergy_latex and returns non-latex protocol", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			pregnancyTrimester: "none",
			hasLatexAllergy: true,
		};

		const evalResult = evaluatePatientSafetyFlags(profile);
		assert.strictEqual(evalResult.hasHighRiskFlags, true);

		const latexFlag = evalResult.activeFlags.find((f) => f.id === "allergy_latex");
		assert.ok(latexFlag, "activeFlags must contain allergy_latex");
		assert.strictEqual(latexFlag.shortBadge, "[СТОП] АЛЛЕРГИЯ НА ЛАТЕКС (БЕСЛАТЕКСНЫЙ РЕЖИМ)");

		assert.ok(
			evalResult.forbiddenProcedures.some((p) => p.includes("латексных")),
			"evalResult.forbiddenProcedures must ban latex gloves and cofferdam",
		);
		assert.ok(
			evalResult.mandatoryPrecautions.some((m) => m.includes("нитриловых") || m.includes("Беслатексный")),
			"evalResult.mandatoryPrecautions must mandate nitrile gloves",
		);
	});

	it("1.5. evaluatePatientSafetyFlags correctly aggregates all three critical dental allergies simultaneously", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			pregnancyTrimester: "none",
			hasNsaidAllergy: true,
			hasPenicillinAllergy: true,
			hasLatexAllergy: true,
		};

		const evalResult = evaluatePatientSafetyFlags(profile);
		assert.strictEqual(evalResult.totalAlertCount, 3);
		assert.strictEqual(evalResult.maxSeverity, "high");

		const ids = evalResult.activeFlags.map((f) => f.id);
		assert.ok(ids.includes("allergy_nsaid"));
		assert.ok(ids.includes("allergy_penicillin"));
		assert.ok(ids.includes("allergy_latex"));
	});
});
