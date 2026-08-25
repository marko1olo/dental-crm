import assert from "node:assert/strict";
import test from "node:test";
import {
	BASE_INFORMED_CONSENT_PRESET,
	CLINICAL_CONSENT_PRESETS,
	MEDICAL_REFUSAL_COMPLICATIONS_PRESET,
	PAID_CONTRACT_736_PRESET,
	PEDIATRIC_MINOR_CONSENT_PRESET,
	PERSONAL_DATA_EGISZ_CONSENT_PRESET,
	WARRANTY_POLICY_PRESETS,
	type ProcedureSpecificConsentProcedure,
} from "../index.js";

test("BASE_INFORMED_CONSENT_PRESET provides compliant 1051n and 323-FZ primary inspection consent", () => {
	assert.ok(BASE_INFORMED_CONSENT_PRESET.intervention.includes("Первичный стоматологический осмотр"));
	assert.ok(BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication.includes("Первичное обращение"));
	assert.ok(BASE_INFORMED_CONSENT_PRESET.explainedRisks.length >= 3);
	assert.ok(BASE_INFORMED_CONSENT_PRESET.alternatives.length >= 2);
	assert.ok(BASE_INFORMED_CONSENT_PRESET.aftercareRequirements.length >= 2);
});

test("CLINICAL_CONSENT_PRESETS covers all required dental procedure blocks with detailed clinical risks and aftercare", () => {
	const requiredProcedures: ProcedureSpecificConsentProcedure[] = [
		"therapy_endo_restoration",
		"local_anesthesia",
		"surgery_extraction",
		"implantation_bone_graft",
		"prosthetics",
		"orthodontics",
		"hygiene_whitening",
		"periodontology",
		"other",
	];

	for (const proc of requiredProcedures) {
		const preset = CLINICAL_CONSENT_PRESETS[proc];
		assert.ok(preset, `Preset for ${proc} must exist`);
		assert.equal(preset.procedureType, proc);
		assert.ok(preset.procedureName.trim().length > 5);
		assert.ok(preset.diagnosisOrIndication.trim().length > 5);
		assert.ok(preset.patientSpecificRiskFactors.length >= 1);
		assert.ok(preset.procedureSpecificRisks.length >= 3, `Risks for ${proc} should have >= 3 items`);
		assert.ok(preset.alternatives.length >= 1);
		assert.ok(preset.aftercareAndLimits.length >= 2);
	}

	// Specific clinical assertions
	const surgery = CLINICAL_CONSENT_PRESETS.surgery_extraction;
	assert.ok(surgery.procedureName.includes("18, 28, 38, 48") || surgery.procedureName.includes("зубов мудрости"));
	assert.ok(surgery.procedureSpecificRisks.some((r) => r.includes("парестезия") || r.includes("нижнелуночкового")));
	assert.ok(surgery.procedureSpecificRisks.some((r) => r.includes("гайморовой пазухи") || r.includes("синус")));

	const implant = CLINICAL_CONSENT_PRESETS.implantation_bone_graft;
	assert.ok(implant.procedureName.includes("синус-лифтинг") || implant.procedureName.includes("костная пластика"));
	assert.ok(implant.procedureSpecificRisks.some((r) => r.includes("периимплантит") || r.includes("отторжения")));

	const therapy = CLINICAL_CONSENT_PRESETS.therapy_endo_restoration;
	assert.ok(therapy.procedureSpecificRisks.some((r) => r.includes("Постпломбировочные боли") || r.includes("депульпирования")));
});

test("PEDIATRIC_MINOR_CONSENT_PRESET includes legal representative safeguards under Art. 20 323-FZ", () => {
	assert.ok(PEDIATRIC_MINOR_CONSENT_PRESET.interventionScope.includes("детское стоматологическое лечение"));
	assert.ok(PEDIATRIC_MINOR_CONSENT_PRESET.explainedRisks.length >= 4);
	assert.ok(PEDIATRIC_MINOR_CONSENT_PRESET.representativeRequirements.length >= 2);
});

test("MEDICAL_REFUSAL_COMPLICATIONS_PRESET covers odontogenic phlegmons, osteomyelitis, bone atrophy, and sepsis risks", () => {
	const cariesRefusal = MEDICAL_REFUSAL_COMPLICATIONS_PRESET.caries_endo_refusal;
	assert.ok(cariesRefusal.explainedRisks.some((r) => r.includes("периостит") || r.includes("флегмона") || r.includes("остеомиелит")));
	assert.ok(cariesRefusal.urgentWarningSigns.some((w) => w.includes("отек") || w.includes("температура")));

	const surgeryRefusal = MEDICAL_REFUSAL_COMPLICATIONS_PRESET.surgery_extraction_refusal;
	assert.ok(surgeryRefusal.explainedRisks.some((r) => r.includes("перикоронит") || r.includes("абсцесса")));

	const prostheticsRefusal = MEDICAL_REFUSAL_COMPLICATIONS_PRESET.prosthetics_implant_refusal;
	assert.ok(prostheticsRefusal.explainedRisks.some((r) => r.includes("атрофия") || r.includes("Попова-Годона") || r.includes("ВНЧС")));
});

test("PERSONAL_DATA_EGISZ_CONSENT_PRESET includes 152-FZ and Decree No. 140 EGISZ provisions", () => {
	assert.ok(PERSONAL_DATA_EGISZ_CONSENT_PRESET.purposes.some((p) => p.includes("ЕГИСЗ") && p.includes("РЭМД")));
	assert.ok(PERSONAL_DATA_EGISZ_CONSENT_PRESET.purposes.some((p) => p.includes("Госуслуги")));
	assert.ok(PERSONAL_DATA_EGISZ_CONSENT_PRESET.transferRules.includes("ЕГИСЗ Минздрава России"));
	assert.ok(PERSONAL_DATA_EGISZ_CONSENT_PRESET.categories.some((c) => c.includes("Специальные категории")));
});

test("PAID_CONTRACT_736_PRESET covers mandatory Decree No. 736 terms", () => {
	assert.ok(PAID_CONTRACT_736_PRESET.legalBasis.includes("Постановление Правительства РФ от 11.05.2023 № 736"));
	assert.ok(PAID_CONTRACT_736_PRESET.freeCareNotice.includes("государственных гарантий"));
	assert.ok(PAID_CONTRACT_736_PRESET.priceChangeRules.includes("дополнительного соглашения") || PAID_CONTRACT_736_PRESET.priceChangeRules.includes("новой сметы"));
	assert.ok(PAID_CONTRACT_736_PRESET.medicalRecommendationWarning.includes("несоблюдение указаний"));
	assert.ok(PAID_CONTRACT_736_PRESET.warrantyTerms.includes("Положением о гарантийных обязательствах"));
});

test("WARRANTY_POLICY_PRESETS includes exact warranty periods and 6-month checkup obligations", () => {
	const keys = ["composite_fillings", "zirconia_emax_crowns", "metal_ceramic_crowns", "clasp_dentures", "dental_implants"];
	for (const key of keys) {
		const item = WARRANTY_POLICY_PRESETS[key];
		assert.ok(item, `Warranty preset for ${key} must exist`);
		assert.ok(item.warrantyPeriod.length > 0);
		assert.ok(item.serviceLife.length > 0);
		assert.ok(item.controlVisitSchedule.includes("6 месяцев"));
		assert.ok(item.patientObligations.length >= 2);
		assert.ok(item.excludedRiskFactors.length >= 2);
		assert.ok(item.urgentContactReasons.length >= 2);
	}
});
