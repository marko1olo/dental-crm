import assert from "node:assert/strict";
import test from "node:test";
import {
	BASE_INFORMED_CONSENT_PRESET,
	CLINICAL_CONSENT_PRESETS,
} from "@dental/shared";
import { InformedConsentModal } from "../components/consents/InformedConsentModal";
import {
	detectConsentScopeMismatch,
	sanitizeConsentFieldValue,
	cleanPrintableConsentText,
	sanitizeConsentContext,
} from "../components/consents/consentSummaryHelper.js";

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
	assert.ok(endo.procedureSpecificRisks.length >= 3);
});

test("InformedConsentModal: scope mismatch detection and systemic garbage sanitization contracts", () => {
	// 1. Scope mismatch contract: patient signed therapy, doctor adds invasive surgery
	const surgeryMismatch = detectConsentScopeMismatch({
		signedConsentKeys: ["CONSENT_THERAPY"],
		treatmentPlanText: "Удаление ретинированного зуба 3.8, синус-лифтинг и имплантация",
	});
	assert.equal(surgeryMismatch.hasMismatch, true);
	assert.equal(surgeryMismatch.warningTitle, "Внимание: добавлены процедуры, не покрытые текущим ИДС 1051н");
	assert.ok(surgeryMismatch.uncoveredTemplateKeys.includes("CONSENT_SURGERY_IMPLANT"));
	assert.equal(surgeryMismatch.suggestedActionLabel, "Сформировать доп. согласие на новые процедуры");

	// 2. Scope mismatch contract: patient signed therapy, doctor adds crown prep
	const orthoMismatch = detectConsentScopeMismatch({
		signedConsentKeys: ["CONSENT_THERAPY"],
		treatmentPlanText: "Препарирование зуба 1.6 под коронку из диоксида циркония, снятие слепков",
	});
	assert.equal(orthoMismatch.hasMismatch, true);
	assert.ok(orthoMismatch.uncoveredTemplateKeys.includes("CONSENT_ORTHOPEDICS"));

	// 3. Systemic garbage sanitization contract: no 'id: 804n-undefined', 'null', 'undefined'
	assert.equal(sanitizeConsentFieldValue("null"), "—");
	assert.equal(sanitizeConsentFieldValue("undefined"), "—");
	assert.equal(sanitizeConsentFieldValue("id: 804n-undefined"), "По клиническим показаниям (Приказ Минздрава РФ № 1051н)");
	assert.ok(!cleanPrintableConsentText("Услуга id: 804n-undefined null undefined").includes("undefined"));
	assert.ok(!cleanPrintableConsentText("Услуга id: 804n-undefined null undefined").includes("804n-undefined"));

	const cleaned = sanitizeConsentContext({
		patientName: "null",
		doctorName: "undefined",
		diagnosisIcd: "id: 804n-undefined",
	});
	assert.notEqual(cleaned.patientName, "null");
	assert.notEqual(cleaned.doctorName, "undefined");
	assert.ok(!cleaned.diagnosisIcd?.includes("undefined"));
});
