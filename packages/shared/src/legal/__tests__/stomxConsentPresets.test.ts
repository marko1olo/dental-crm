import assert from "node:assert/strict";
import test from "node:test";
import {
	LEGACY_CONSENT_PRESETS,
	STOMX_SPECIALIZED_CONSENT_PRESETS,
	THERAPY_CONSENT_PRESETS,
	SURGERY_AND_IMPLANT_CONSENT_PRESETS,
	ORTHO_AND_PROSTHETIC_CONSENT_PRESETS,
	ANESTHESIA_AND_GENERAL_CONSENT_PRESETS,
	type ProcedureSpecificConsentProcedure,
	type ClinicalProcedureConsentPreset,
} from "../stomxConsentPresets.js";

test("Facade stomxConsentPresets correctly re-exports LEGACY_CONSENT_PRESETS and STOMX_SPECIALIZED_CONSENT_PRESETS", () => {
	assert.ok(LEGACY_CONSENT_PRESETS, "LEGACY_CONSENT_PRESETS must be exported");
	assert.ok(STOMX_SPECIALIZED_CONSENT_PRESETS, "STOMX_SPECIALIZED_CONSENT_PRESETS must be exported");
	assert.equal(typeof STOMX_SPECIALIZED_CONSENT_PRESETS, "object");
	assert.equal(typeof LEGACY_CONSENT_PRESETS, "object");
});

test("STOMX_SPECIALIZED_CONSENT_PRESETS contains all specialized procedure presets with complete clinical fields", () => {
	const expectedProcedures: ProcedureSpecificConsentProcedure[] = [
		"veneers",
		"implantation",
		"sinus_lifting",
		"bone_grafting",
		"sedation",
		"surgery_extraction",
		"fixed_prosthetics",
		"removable_prosthetics",
		"deep_caries",
		"superficial_medium_caries",
		"pulpitis_endodontics",
		"periodontology",
		"professional_hygiene",
		"teeth_whitening",
		"orthodontics",
		"aligners",
		"minor_general",
		"xray_cbct",
		"photoprotocol",
		"egisz_refusal",
		"medical_intervention_refusal",
		"warranty_policy",
		"xray_dose_load_sheet",
		"warranty_passport",
		"somatic_health_questionnaire",
	];

	for (const proc of expectedProcedures) {
		const preset = STOMX_SPECIALIZED_CONSENT_PRESETS[proc];
		assert.ok(preset, `Preset for ${proc} must exist in STOMX_SPECIALIZED_CONSENT_PRESETS`);
		assert.equal(preset.procedureType, proc, `procedureType must match ${proc}`);
		assert.ok(preset.procedureName.trim().length > 3, `procedureName for ${proc} must be non-empty`);
		assert.ok(preset.diagnosisOrIndication.trim().length > 5, `diagnosisOrIndication for ${proc} must be non-empty`);
		assert.ok(preset.plannedAnesthesia.trim().length > 0, `plannedAnesthesia for ${proc} must be non-empty`);
		assert.ok(preset.materialsAndSystems.trim().length > 0, `materialsAndSystems for ${proc} must be non-empty`);
		assert.ok(Array.isArray(preset.patientSpecificRiskFactors) && preset.patientSpecificRiskFactors.length >= 1, `patientSpecificRiskFactors for ${proc} must have >= 1 items`);
		assert.ok(Array.isArray(preset.procedureSpecificRisks) && preset.procedureSpecificRisks.length >= 1, `procedureSpecificRisks for ${proc} must have >= 1 items`);
		assert.ok(Array.isArray(preset.alternatives) && preset.alternatives.length >= 1, `alternatives for ${proc} must have >= 1 items`);
		assert.ok(Array.isArray(preset.aftercareAndLimits) && preset.aftercareAndLimits.length >= 1, `aftercareAndLimits for ${proc} must have >= 1 items`);
	}
});

test("LEGACY_CONSENT_PRESETS preserves 100% backward compatibility with all 6 legacy keys", () => {
	const legacyKeys = [
		"therapy_endo_restoration",
		"local_anesthesia",
		"implantation_bone_graft",
		"prosthetics",
		"hygiene_whitening",
		"other",
	];

	for (const key of legacyKeys) {
		const preset = LEGACY_CONSENT_PRESETS[key];
		assert.ok(preset, `Legacy preset ${key} must exist in LEGACY_CONSENT_PRESETS`);
		assert.equal(preset.procedureType, key);

		// Also check presence in STOMX_SPECIALIZED_CONSENT_PRESETS
		const inSpecialized = STOMX_SPECIALIZED_CONSENT_PRESETS[key];
		assert.ok(inSpecialized, `Legacy preset ${key} must also be accessible via STOMX_SPECIALIZED_CONSENT_PRESETS`);
		assert.equal(inSpecialized.procedureName, preset.procedureName);
	}
});

test("Modular DAG layers export their categorized domain presets", () => {
	// Therapy layer
	assert.ok(THERAPY_CONSENT_PRESETS.deep_caries);
	assert.ok(THERAPY_CONSENT_PRESETS.superficial_medium_caries);
	assert.ok(THERAPY_CONSENT_PRESETS.pulpitis_endodontics);
	assert.ok(THERAPY_CONSENT_PRESETS.periodontology);
	assert.ok(THERAPY_CONSENT_PRESETS.professional_hygiene);
	assert.ok(THERAPY_CONSENT_PRESETS.teeth_whitening);

	// Surgery and implant layer
	assert.ok(SURGERY_AND_IMPLANT_CONSENT_PRESETS.implantation);
	assert.ok(SURGERY_AND_IMPLANT_CONSENT_PRESETS.sinus_lifting);
	assert.ok(SURGERY_AND_IMPLANT_CONSENT_PRESETS.bone_grafting);
	assert.ok(SURGERY_AND_IMPLANT_CONSENT_PRESETS.surgery_extraction);

	// Ortho and prosthetic layer
	assert.ok(ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.veneers);
	assert.ok(ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.fixed_prosthetics);
	assert.ok(ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.removable_prosthetics);
	assert.ok(ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.orthodontics);
	assert.ok(ORTHO_AND_PROSTHETIC_CONSENT_PRESETS.aligners);

	// Anesthesia and general layer
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.sedation);
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.minor_general);
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.xray_cbct);
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.photoprotocol);
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.egisz_refusal);
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.medical_intervention_refusal);
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.warranty_policy);
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.xray_dose_load_sheet);
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.warranty_passport);
	assert.ok(ANESTHESIA_AND_GENERAL_CONSENT_PRESETS.somatic_health_questionnaire);
});
