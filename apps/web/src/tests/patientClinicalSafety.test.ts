import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CLINICAL_SAFETY_CATALOG,
	checkProcedureSafety,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	parseSafetyProfileFromText,
	type PatientClinicalSafetyProfile,
} from "../components/patient/safetyMath";

describe("Patient Clinical Safety & Anamnesis Engine (safetyMath.ts)", () => {
	it("catalog contains all critical clinical stop-factors defined by Russian standards", () => {
		const ids = CLINICAL_SAFETY_CATALOG.map((c) => c.id);
		assert.ok(ids.includes("pacemaker_exs"), "Must include pacemaker/EXS");
		assert.ok(ids.includes("bisphosphonates_mronj"), "Must include bisphosphonates/MRONJ");
		assert.ok(ids.includes("anticoagulants_bleeding"), "Must include anticoagulants/bleeding");
		assert.ok(ids.includes("allergy_articaine"), "Must include articaine allergy");
		assert.ok(ids.includes("allergy_lidocaine"), "Must include lidocaine allergy");
		assert.ok(ids.includes("allergy_mepivacaine"), "Must include mepivacaine allergy");
		assert.ok(ids.includes("allergy_sulfites"), "Must include sulfite allergy");
		assert.ok(ids.includes("pregnancy_trimester_1"), "Must include 1st trimester");
		assert.ok(ids.includes("pregnancy_trimester_2"), "Must include 2nd trimester");
		assert.ok(ids.includes("pregnancy_trimester_3"), "Must include 3rd trimester");
		assert.ok(ids.includes("hypertension_cvd"), "Must include hypertension/CVD");
		assert.ok(ids.includes("diabetes_mellitus"), "Must include diabetes");
		assert.ok(ids.includes("bronchial_asthma"), "Must include asthma");
		assert.ok(ids.includes("epilepsy_seizures"), "Must include epilepsy");
		assert.ok(ids.includes("hepatitis_hiv_infection"), "Must include hepatitis/HIV");
	});

	it("evaluates Pacemaker / ЭКС as a critical red-flag with absolute ban on ultrasound scaling", () => {
		const profile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			hasPacemakerExs: true,
		};

		const result = evaluatePatientSafetyFlags(profile);
		assert.equal(result.hasCriticalStopFlags, true);
		assert.equal(result.maxSeverity, "critical");
		assert.ok(result.forbiddenProcedures.some((p) => p.includes("Ультразвуковой скейлинг")));
		assert.ok(result.forbiddenProcedures.some((p) => p.includes("электрокоагуляция")));
		assert.ok(result.mandatoryPrecautions.some((m) => m.includes("кюретами Грейси")));

		// Procedure check
		const usCheck = checkProcedureSafety("Ультразвуковой скейлинг и чистка Air-Flow", profile);
		assert.equal(usCheck.isAllowed, false);
		assert.equal(usCheck.severity, "critical");
		assert.match(usCheck.warnings[0] ?? "", /Ультразвуковой скейлинг абсолютно запрещен/);
		assert.match(usCheck.alternatives[0] ?? "", /кюретами Грейси/);

		const coagCheck = checkProcedureSafety("Монополярная электрокоагуляция десны", profile);
		assert.equal(coagCheck.isAllowed, false);
		assert.equal(coagCheck.severity, "critical");
	});

	it("evaluates Bisphosphonates as critical red-flag for MRONJ osteonecrosis risk", () => {
		const profile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			takesBisphosphonates: true,
			bisphosphonateName: "Акласта (Золедронат)",
		};

		const result = evaluatePatientSafetyFlags(profile);
		assert.equal(result.hasCriticalStopFlags, true);
		assert.ok(result.activeFlags.some((f) => f.id === "bisphosphonates_mronj"));

		const surgeryCheck = checkProcedureSafety("Сложное удаление зуба 38 и имплантация", profile);
		assert.equal(surgeryCheck.isAllowed, false);
		assert.equal(surgeryCheck.severity, "critical");
		assert.match(surgeryCheck.warnings[0] ?? "", /MRONJ/);
	});

	it("evaluates Anticoagulants (Warfarin/Xarelto) for hemorrhage risks", () => {
		const profile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			takesAnticoagulants: true,
			anticoagulantName: "Варфарин",
			lastInrValue: 2.8,
		};

		const result = evaluatePatientSafetyFlags(profile);
		assert.equal(result.hasCriticalStopFlags, true);
		assert.ok(result.activeFlags.some((f) => f.id === "anticoagulants_bleeding"));

		const extractionCheck = checkProcedureSafety("Удаление корня зуба", profile);
		assert.equal(extractionCheck.severity, "critical");
		assert.ok(extractionCheck.warnings.some((w) => w.includes("МНО (INR < 2.5)")));
		assert.ok(extractionCheck.alternatives.some((a) => a.toLowerCase().includes("транексамов")));
	});

	it("differentiates Pregnancy Trimesters with clinical precision", () => {
		// Trimester 1
		const trim1Profile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "trimester_1",
		};
		const trim1Result = evaluatePatientSafetyFlags(trim1Profile);
		assert.equal(trim1Result.hasCriticalStopFlags, true);
		assert.ok(trim1Result.forbiddenProcedures.some((p) => p.includes("Рентгенологические исследования")));

		const ctCheck = checkProcedureSafety("КЛКТ обеих челюстей (КТ)", trim1Profile);
		assert.equal(ctCheck.isAllowed, false);
		assert.equal(ctCheck.severity, "critical");

		// Trimester 2
		const trim2Profile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "trimester_2",
		};
		const trim2Result = evaluatePatientSafetyFlags(trim2Profile);
		assert.equal(trim2Result.hasCriticalStopFlags, false);
		assert.equal(trim2Result.maxSeverity, "moderate");
		assert.ok(trim2Result.anestheticRecommendations.some((r) => r.includes("Ультракаин Д-С")));

		// Trimester 3
		const trim3Profile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "trimester_3",
		};
		const trim3Result = evaluatePatientSafetyFlags(trim3Profile);
		assert.equal(trim3Result.hasHighRiskFlags, true);
		assert.ok(trim3Result.mandatoryPrecautions.some((m) => m.includes("левый бок на 15°")));
	});

	it("evaluates Local Anesthetic Allergies (Articaine, Lidocaine, Sulfites)", () => {
		const articaineProfile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			hasArticaineAllergy: true,
		};
		const articaineResult = evaluatePatientSafetyFlags(articaineProfile);
		assert.equal(articaineResult.hasCriticalStopFlags, true);
		assert.ok(articaineResult.activeFlags.some((f) => f.id === "allergy_articaine"));
		assert.ok(articaineResult.anestheticRecommendations.some((r) => r.includes("Скандонест 3%")));

		const sulfiteProfile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			hasSulfiteAllergy: true,
		};
		const sulfiteResult = evaluatePatientSafetyFlags(sulfiteProfile);
		assert.equal(sulfiteResult.hasCriticalStopFlags, true);
		assert.ok(sulfiteResult.activeFlags.some((f) => f.id === "allergy_sulfites"));
	});

	it("parses unstructured Russian clinical notes into structured safety flags", () => {
		const note = "Пациент 65 лет. Установлен ЭКС в 2022 году. Принимает Ксарелто 20 мг. Аллергия на лидокаин и сульфиты.";
		const profile = parseSafetyProfileFromText(note);

		assert.equal(profile.hasPacemakerExs, true);
		assert.equal(profile.takesAnticoagulants, true);
		assert.equal(profile.hasLidocaineAllergy, true);
		assert.equal(profile.hasSulfiteAllergy, true);
		assert.equal(profile.hasArticaineAllergy, false);

		const evalResult = evaluatePatientSafetyFlags(profile);
		assert.equal(evalResult.hasCriticalStopFlags, true);
		assert.equal(evalResult.totalAlertCount, 4);
	});

	it("formats legally sound and Form 043/u compliant SOAP diary text", () => {
		const profile: PatientClinicalSafetyProfile = {
			pregnancyTrimester: "none",
			hasArticaineAllergy: true,
			hasPenicillinAllergy: true,
			hasPacemakerExs: true,
			hasHypertension: true,
			hasDiabetesMellitus: true,
			diabetesType: "2",
		};

		const diaryText = formatSafetyProfileToDiaryText(profile);
		assert.match(diaryText, /Аллергологический анамнез: Отягощен/);
		assert.match(diaryText, /Артикаин \(Ультракаин\)/);
		assert.match(diaryText, /Пенициллины \(Амоксиклав\)/);
		assert.match(diaryText, /Электрокардиостимулятор \(ЭКС\)/);
		assert.match(diaryText, /Гипертоническая болезнь/);
		assert.match(diaryText, /Сахарный диабет 2 типа/);
	});
});
