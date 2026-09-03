import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildComplaintsText,
	suggestIcd10FromComplaints,
	generateToothStatusLocalis,
	getFullToothAnatomicalNameRu,
	calculateAnesthesiaDosage,
	calculateDrugCourseDose,
	generateForm107_1uPrescription,
	getForm043DocumentStatus,
	formatForm043RevisionAuditStamp,
	CLINICAL_COMPLAINTS_PRESETS,
	ANESTHESIA_DRUGS_CATALOG,
	DENTAL_DRUGS_PRESETS,
} from "../clinicalEmrEngine";

describe("clinicalEmrEngine — 1. Complaints and Anamnesis Synthesis (Жалобы и Анамнез)", () => {
	it("synthesizes canonical text for sharp spontaneous pain", () => {
		const text = buildComplaintsText(["acute_spontaneous_pain"]);
		assert.match(text, /острые приступообразные самопроизвольные боли/i);
		assert.match(text, /ночное время/i);
	});

	it("synthesizes multiple selected complaint chips with custom notes", () => {
		const text = buildComplaintsText(
			["thermal_sensitivity", "filling_lost"],
			"Боли беспокоят около 3 дней.",
		);
		assert.match(text, /температурных раздражителей/i);
		assert.match(text, /выпадение старой пломбы/i);
		assert.match(text, /Боли беспокоят около 3 дней/);
	});

	it("suggests accurate ICD-10 codes based on selected complaint keys", () => {
		const codes1 = suggestIcd10FromComplaints(["acute_spontaneous_pain"]);
		assert.ok(codes1.includes("K04.0"));

		const codes2 = suggestIcd10FromComplaints(["gingival_bleeding", "tooth_mobility"]);
		assert.ok(codes2.includes("K05.3"));

		const codes3 = suggestIcd10FromComplaints(["routine_checkup"]);
		assert.ok(codes3.includes("Z01.2"));
	});

	it("falls back to routine checkup when no complaints are selected", () => {
		const text = buildComplaintsText([]);
		assert.match(text, /Жалоб на момент осмотра не предъявляет/i);
	});
});

describe("clinicalEmrEngine — 2. Status Localis and ICD-10 Auto-Binding (Объективный статус)", () => {
	it("correctly generates full anatomical tooth names in Russian", () => {
		assert.equal(getFullToothAnatomicalNameRu(16), "16 (верхний правый первый моляр)");
		assert.equal(getFullToothAnatomicalNameRu(21), "21 (верхний левый центральный резец)");
		assert.equal(getFullToothAnatomicalNameRu(36), "36 (нижний левый первый моляр)");
		assert.equal(getFullToothAnatomicalNameRu(48), "48 (нижний правый третий моляр (зуб мудрости))");
		assert.equal(getFullToothAnatomicalNameRu(55), "55 (верхний правый временный второй моляр)");
		assert.equal(getFullToothAnatomicalNameRu(71), "71 (нижний левый временный центральный резец)");
	});

	it("binds K02.1 Dentin Caries with probing along enamel-dentin border and transient thermal pain", () => {
		const result = generateToothStatusLocalis({
			toothNumber: 16,
			icd10Code: "K02.1",
			subType: "medium",
		});

		assert.equal(result.icd10Code, "K02.1");
		assert.match(result.clinicalDiagnosisText, /K02.1 Кариес дентина \(средний кариес\) зуба 16/);
		assert.match(result.statusLocalisText, /средних слоев дентина/);
		assert.match(result.statusLocalisText, /эмалево-дентинной границе/);
		assert.equal(result.objectiveFindings.percussionVertical, "negative");
		assert.equal(result.objectiveFindings.thermalTestResponse, "transient_pain");
		assert.equal(result.objectiveFindings.probingTenderness, "along_enamel_dentin_border");
		assert.equal(result.objectiveFindings.eodMicroamperes, 4);
		assert.match(result.recommendedProcedureProtocol, /коффердам/i);
	});

	it("binds K04.0 Pulpitis with cavity communication, bleeding pulp and lingering sharp pain", () => {
		const result = generateToothStatusLocalis({
			toothNumber: 26,
			icd10Code: "K04.0",
		});

		assert.equal(result.icd10Code, "K04.0");
		assert.match(result.clinicalDiagnosisText, /K04.0 Пульпит/);
		assert.match(result.statusLocalisText, /сообщающаяся с полостью зуба/);
		assert.match(result.statusLocalisText, /пульпа кровоточит/);
		assert.equal(result.objectiveFindings.probingTenderness, "bleeding_orifice");
		assert.equal(result.objectiveFindings.thermalTestResponse, "lingering_sharp_pain");
		assert.equal(result.objectiveFindings.percussionVertical, "positive_mild");
		assert.equal(result.objectiveFindings.eodMicroamperes, 35);
		assert.match(result.recommendedProcedureProtocol, /WaveOne|ProTaper|апекслокатор/i);
	});

	it("binds K04.5 Chronic Apical Periodontitis with necrotic pulp (EOD > 100 uA) and periapical RVG lesion", () => {
		const result = generateToothStatusLocalis({
			toothNumber: 36,
			icd10Code: "K04.5",
		});

		assert.equal(result.icd10Code, "K04.5");
		assert.match(result.clinicalDiagnosisText, /K04.5 Хронический апикальный периодонтит/);
		assert.match(result.statusLocalisText, /очаг деструкции костной ткани/);
		assert.equal(result.objectiveFindings.thermalTestResponse, "indifferent");
		assert.equal(result.objectiveFindings.eodMicroamperes, 120);
		assert.match(result.recommendedProcedureProtocol, /гидроксид.*кальци/i);
	});

	it("binds K05.3 Chronic Periodontitis with deep periodontal pockets, PBI bleeding and mobile teeth", () => {
		const result = generateToothStatusLocalis({
			toothNumber: 41,
			icd10Code: "K05.3",
			probingPocketDepthMm: 5.0,
		});

		assert.equal(result.icd10Code, "K05.3");
		assert.match(result.clinicalDiagnosisText, /K05.3 Хронический.*пародонтит/);
		assert.match(result.statusLocalisText, /пародонтальных карманов составляет 5 мм/);
		assert.match(result.statusLocalisText, /Индекс кровоточивости PBI/);
		assert.equal(result.objectiveFindings.probingPocketDepthMm, 5.0);
		assert.match(result.recommendedProcedureProtocol, /скейлинг.*Метрогил Дента/i);
	});

	it("binds K08.1 Surgical Extraction with total crown destruction (IROPZ > 0.9)", () => {
		const result = generateToothStatusLocalis({
			toothNumber: 48,
			icd10Code: "K08.1",
		});

		assert.equal(result.icd10Code, "K08.1");
		assert.match(result.clinicalDiagnosisText, /K08.1 Полное разрушение коронки зуба 48/);
		assert.match(result.statusLocalisText, /ИРОПЗ > 0.9/);
		assert.match(result.recommendedProcedureProtocol, /Синдесмотомия.*Альвостим/i);
	});
});

describe("clinicalEmrEngine — 3. Anesthesia Dosage & Safety Calculator (Калькулятор анестезии)", () => {
	it("calculates safe Articaine 4% dosage for 70kg adult at 7.0 mg/kg limit (max 490 mg)", () => {
		const res = calculateAnesthesiaDosage({
			drugType: "articaine_4_epi_100k",
			patientWeightKg: 70,
			carpulesCount: 1,
			isPediatric: false,
		});

		assert.equal(res.effectiveMaxMgPerKg, 7.0);
		assert.equal(res.maxSafeDoseMg, 490);
		assert.equal(res.totalDoseMg, 68); // 1.7 ml * 40 mg/ml
		assert.equal(res.totalEpinephrineMg, 0.017);
		assert.equal(res.isOverdose, false);
		assert.equal(res.safetyLevel, "safe");
		assert.match(res.soapNoteText, /Ультракаин Д-С форте/);
	});

	it("caps maximum adult dose at 500 mg absolute limit for 100kg patient", () => {
		const res = calculateAnesthesiaDosage({
			drugType: "articaine_4_epi_100k",
			patientWeightKg: 100, // 100 * 7 = 700 mg, but capped at 500 mg
			carpulesCount: 2,
		});

		assert.equal(res.maxSafeDoseMg, 500);
		assert.equal(res.totalDoseMg, 136);
		assert.equal(res.isOverdose, false);
		assert.equal(res.safetyLevel, "safe");
	});

	it("applies strict 5.0 mg/kg pediatric limit for children (< 18 years or <= 40kg)", () => {
		// 20 kg child -> max safe dose is 20 * 5.0 = 100 mg (instead of 140 mg)
		const childSafe = calculateAnesthesiaDosage({
			drugType: "articaine_4_epi_100k",
			patientWeightKg: 20,
			carpulesCount: 1, // 68 mg <= 100 mg
			patientAgeYears: 7,
			isPediatric: true,
		});

		assert.equal(childSafe.isPediatric, true);
		assert.equal(childSafe.effectiveMaxMgPerKg, 5.0);
		assert.equal(childSafe.maxSafeDoseMg, 100);
		assert.equal(childSafe.totalDoseMg, 68);
		assert.equal(childSafe.isOverdose, false);
		assert.equal(childSafe.safetyLevel, "caution"); // 68% of 100mg is in caution zone [50%, 80%)
	});

	it("triggers overdose danger alert when child exceeds 5.0 mg/kg limit", () => {
		// 20 kg child given 2 carpules = 136 mg (> 100 mg limit!)
		const childOverdose = calculateAnesthesiaDosage({
			drugType: "articaine_4_epi_100k",
			patientWeightKg: 20,
			carpulesCount: 2, // 136 mg > 100 mg
			patientAgeYears: 7,
			isPediatric: true,
		});

		assert.equal(childOverdose.isOverdose, true);
		assert.equal(childOverdose.safetyLevel, "danger");
		assert.ok(childOverdose.warnings.length > 0);
		assert.match(childOverdose.warnings[0]!, /ПРЕВЫШЕНА ПРЕДЕЛЬНАЯ ДОЗА/);
		assert.match(childOverdose.warnings[0]!, /5.0 мг\/кг/);
	});

	it("enforces cardiovascular limit of 0.04 mg epinephrine (max 2 carpules 1:100k)", () => {
		const cardioSafe = calculateAnesthesiaDosage({
			drugType: "articaine_4_epi_100k",
			patientWeightKg: 70,
			carpulesCount: 1, // 0.017 mg <= 0.04 mg
			hasCardiovascularRisk: true,
		});
		assert.equal(cardioSafe.isOverdose, false);

		// 3 carpules 1:100k = 0.051 mg (> 0.04 mg!)
		const cardioOverdose = calculateAnesthesiaDosage({
			drugType: "articaine_4_epi_100k",
			patientWeightKg: 70,
			carpulesCount: 3,
			hasCardiovascularRisk: true,
		});
		assert.equal(cardioOverdose.isOverdose, true);
		assert.equal(cardioOverdose.safetyLevel, "danger");
		assert.ok(cardioOverdose.warnings.some((w) => w.includes("КАРДИОЛИМИТ АДРЕНАЛИНА")));
	});

	it("blocks sulfite-containing Articaine for bronchial asthma / sulfite allergy patients", () => {
		const asthmaCheck = calculateAnesthesiaDosage({
			drugType: "articaine_4_epi_100k",
			patientWeightKg: 70,
			carpulesCount: 1,
			hasSulfiteOrAsthmaAllergy: true,
		});

		assert.equal(asthmaCheck.isOverdose, true);
		assert.equal(asthmaCheck.safetyLevel, "danger");
		assert.ok(asthmaCheck.warnings.some((w) => w.includes("метабисульфит натрия") && w.includes("Скандонест 3%")));
	});

	it("safely accepts Mepivacaine 3% (Scandonest) without epinephrine for cardiac and asthma patients", () => {
		const res = calculateAnesthesiaDosage({
			drugType: "mepivacaine_3_plain",
			patientWeightKg: 60,
			carpulesCount: 2, // 102 mg <= 264 mg (60 * 4.4)
			hasCardiovascularRisk: true,
			hasSulfiteOrAsthmaAllergy: true,
		});

		assert.equal(res.drug.isAdrenalineFree, true);
		assert.equal(res.totalEpinephrineMg, 0);
		assert.equal(res.isOverdose, false);
		assert.equal(res.safetyLevel, "safe");
	});
});

describe("clinicalEmrEngine — 4. Prescription Form 107-1/u & Drug Course Calculation (Приказ № 1094н)", () => {
	it("calculates course dosage for Amoxiclav 875/125 mg for 7 days", () => {
		const res = calculateDrugCourseDose({
			drugId: "amoxiclav_875_125",
			durationDays: 7,
			timesPerDay: 2,
		});

		assert.equal(res.totalUnitsCount, 14); // 7 * 2 = 14 tablets
		assert.equal(res.packagesCount, 1); // 14 in pack
		assert.equal(res.totalCourseActiveDoseMg, 14000); // 14 * 1000 mg
		assert.equal(res.dailyActiveDoseMg, 2000);
		assert.equal(res.dispenseLatinString, "D.t.d. N 14 in tab.");
		assert.match(res.signaString, /875\/125 мг/);
	});

	it("calculates course dosage for Nimesil 100 mg for 5 days", () => {
		const res = calculateDrugCourseDose({
			drugId: "nimesulide_100",
			durationDays: 5,
			timesPerDay: 2,
		});

		assert.equal(res.totalUnitsCount, 10);
		assert.equal(res.packagesCount, 1);
		assert.equal(res.totalCourseActiveDoseMg, 1000);
		assert.equal(res.dailyActiveDoseMg, 200);
		assert.equal(res.dispenseLatinString, "D.t.d. N 10 in gran.");
		assert.match(res.signaString, /100 мг.*растворив/);
	});

	it("calculates Chlorhexidine 0.05% and Metrogyl Denta course parameters", () => {
		const chx = calculateDrugCourseDose({ drugId: "chlorhexidine_005" });
		assert.equal(chx.packagesCount, 1);
		assert.match(chx.signaString, /Ротовые ванночки.*10-15 мл/);

		const metrogyl = calculateDrugCourseDose({ drugId: "metrogyl_denta" });
		assert.equal(metrogyl.packagesCount, 1);
		assert.match(metrogyl.signaString, /область десен.*2 раза в день/);
	});

	it("generates statutory Form 107-1/u prescription payload conforming to Order 1094n", () => {
		const prescription = generateForm107_1uPrescription({
			clinic: {
				fullName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				address: "г. Москва, ул. Усачёва, д. 29",
				ogrn: "1237700456789",
				inn: "7704812345",
			},
			patient: {
				fullName: "Иванов Иван Иванович",
				birthDate: "1988-04-12",
				medicalCardNumber: "СТ-2026-1043",
			},
			doctor: {
				fullName: "Волкова Екатерина Сергеевна",
				specialty: "Врач-стоматолог-терапевт",
			},
			diagnosisIcd10: "K04.5",
			selectedDrugIds: ["amoxiclav_875_125", "nimesulide_100", "chlorhexidine_005"],
			validityDays: "60",
		});

		assert.equal(prescription.formNumber, "107-1/у");
		assert.match(prescription.statutoryOrder, /1094н/);
		assert.match(prescription.seriesNumber, /^РЕЦ-2026-\d{4}$/);
		assert.equal(prescription.validityDays, "60");
		assert.equal(prescription.patientFullName, "Иванов Иван Иванович");
		assert.equal(prescription.doctorFullName, "Волкова Екатерина Сергеевна");
		assert.equal(prescription.items.length, 3);
		assert.equal(prescription.items[0]?.drug.id, "amoxiclav_875_125");
		assert.equal(prescription.items[1]?.drug.id, "nimesulide_100");
		assert.equal(prescription.items[2]?.drug.id, "chlorhexidine_005");
	});
});

describe("clinicalEmrEngine — 8. Form 043/u Lifecycle Status & Audit Stamps (Мандат 8e)", () => {
	it("returns draft status and watermark when visit is not closed", () => {
		const status = getForm043DocumentStatus({
			isLocked: false,
			status: "draft",
		});
		assert.equal(status.isDraft, true);
		assert.equal(status.isLocked, false);
		assert.equal(status.watermarkText, "ЧЕРНОВИК");
		assert.match(status.stampText, /ЧЕРНОВИК/);
		assert.equal(status.canDoctorEditDirectly, true);
	});

	it("returns signed status when visit is locked without revisions", () => {
		const status = getForm043DocumentStatus({
			isLocked: true,
			status: "signed",
			revisionCount: 0,
		});
		assert.equal(status.isDraft, false);
		assert.equal(status.isLocked, true);
		assert.equal(status.watermarkText, null);
		assert.match(status.stampText, /ПОДПИСАНО ВРАЧОМ/);
		assert.equal(status.canDoctorEditDirectly, true);
		assert.equal(status.amendmentAuditReasonDefault, "Исправленному верить");
	});

	it("returns revision stamp with 'ИСПРАВЛЕННОМУ ВЕРИТЬ' when revisionCount > 0", () => {
		const status = getForm043DocumentStatus({
			isLocked: true,
			status: "signed",
			revisionCount: 2,
		});
		assert.equal(status.isDraft, false);
		assert.equal(status.isLocked, true);
		assert.match(status.stampText, /ИСПРАВЛЕННОМУ ВЕРИТЬ/);
		assert.match(status.stampText, /РЕДАКЦИЯ 3/);
		assert.equal(status.canDoctorEditDirectly, true);
	});

	it("formats forensic revision audit string accurately", () => {
		const stamp = formatForm043RevisionAuditStamp({
			revisionNumber: 2,
			authorName: "Д-р Иванов А.С.",
			revisedAt: "2026-09-03T12:00:00.000Z",
			reason: "Исправление опечатки в МКБ-10",
		});
		assert.match(stamp, /Редакция №2/);
		assert.match(stamp, /Д-р Иванов А\.С\./);
		assert.match(stamp, /Исправление опечатки в МКБ-10/);
	});

	it("falls back to 'Исправленному верить' when reason is empty", () => {
		const stamp = formatForm043RevisionAuditStamp({
			revisionNumber: 1,
			reason: "",
		});
		assert.match(stamp, /Причина: Исправленному верить/);
	});
});
