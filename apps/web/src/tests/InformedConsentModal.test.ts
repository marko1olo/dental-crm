import assert from "node:assert/strict";
import test from "node:test";
import {
	BASE_INFORMED_CONSENT_PRESET,
	CLINICAL_CONSENT_PRESETS,
} from "@dental/shared";
import { InformedConsentModal } from "../components/documents/InformedConsentModal";

test("InformedConsentModal component contract and clinical presets integrity", () => {
	assert.equal(typeof InformedConsentModal, "function");

	// 1051n Base inspection preset checks
	assert.ok(BASE_INFORMED_CONSENT_PRESET.intervention.includes("Первичный"));
	assert.ok(BASE_INFORMED_CONSENT_PRESET.explainedRisks.length >= 3);
	assert.ok(BASE_INFORMED_CONSENT_PRESET.alternatives.length >= 2);
	assert.ok(BASE_INFORMED_CONSENT_PRESET.aftercareRequirements.length >= 2);

	// Clinical consent presets check
	const procedures = Object.keys(CLINICAL_CONSENT_PRESETS);
	assert.ok(procedures.length >= 8);
	assert.ok(procedures.includes("therapy_endo_restoration"));
	assert.ok(procedures.includes("surgery_extraction"));
	assert.ok(procedures.includes("implantation_bone_graft"));
	assert.ok(procedures.includes("local_anesthesia"));

	const endo = CLINICAL_CONSENT_PRESETS.therapy_endo_restoration;
	assert.ok(endo.procedureName.includes("Терапевтическое"));
	assert.ok(endo.plannedAnesthesia.includes("артикаин"));
	assert.ok(endo.procedureSpecificRisks.length >= 4);
});
