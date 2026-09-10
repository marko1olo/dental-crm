/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CMO CLINICAL QUALITY & STATUTORY AUDIT ENGINE UNIT TESTS (WAVE 9)
 * 100% Coverage of Orders 834n, 785n, 1051n, 804n, 203n, SanPiN, UKEP
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isValidIcd10Code,
	isValidNomenclature804nCode,
	extractAnesthesiaBatchNumber,
	extractAnesthesiaDosage,
	isEndodonticCase,
	checkEndodonticApexXrayControl,
	runCmoQualityAudit,
	calculateFinalCmoQualityScore,
	createCmoAuditRecord,
	addCmoDefectRemark,
	resolveCmoDefectRemark,
	applyCmoResolution,
	generateVkkExpertiseAct,
	exportVkkExpertiseActText,
	filterCmoAuditRecords,
	calculateCmoDoctorRankings,
	generateCmoVkkSummaryReport,
	isCmoDefectCodeMatch,
	isCmoRuleMatch,
	findCmoDefectPreset,
	CMO_STATUTORY_DEFECT_PRESETS,
	generateKerProtocolNumber,
	resetKerSequenceCounter,
	type CmoQualityAuditRecord,
} from "../clinicalQualityEngine";
import type { MedicalCardForm043uData } from "../../emr/emr043Types";

// ── Helper to build clean test MedicalCardForm043uData ──
function buildMockCard(overrides?: Partial<MedicalCardForm043uData>): MedicalCardForm043uData {
	return {
		formNumber: "043/у",
		formOrderName: "Приказ Минздрава России от 15.12.2014 № 834н",
		clinic: {
			clinicName: "Клиника ДЕНТЕ",
			clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			clinicAddress: "г. Москва, ул. Усачёва, д. 29",
			clinicPhone: "+7 (495) 789-20-20",
			clinicOgrn: "1237700456789",
			clinicInn: "7704812345",
			licenseNumber: "ЛО-77-01-021456",
			licenseDate: "15.03.2023",
			licenseIssuer: "Департамент здравоохранения г. Москвы",
			chiefDoctorFullName: "Барабаш С.В.",
		},
		passport: {
			medicalCardNumber: "СТ-2026-TEST",
			cardOpenedDate: "2026-08-20",
			patientFullName: "Иванов Иван Иванович",
			patientBirthDate: "1990-01-01",
			patientSex: "male",
			patientAddressRegistration: "г. Москва, ул. Ленина, д. 1",
			patientIdentityDocument: "Паспорт РФ 45 10 № 123456",
			primaryDiagnosisText: "Кариес дентина зуба 1.6",
			primaryDiagnosisIcd10: "K02.1",
			attendingDoctorFullName: "Волкова Екатерина Сергеевна",
			attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
		},
		anamnesis: {
			chiefComplaint: "Кратковременные боли от холодного в зубе 1.6.",
			historyOfPresentIllness: "Беспокоит 2 недели.",
			medicalHistoryVitae: "Соматически здоров.",
			allergologicalHistory: "Аллергии нет.",
			concomitantSomaticDiseases: "Нет",
			currentSystemicMedications: "Нет",
			pregnancyLactationStatus: "Не применимо",
			pastDentalInterventions: "Лечение кариеса.",
		},
		dentalStatus: {
			odontogramTeeth: [],
			dmftIndex: { decayed: 1, filled: 0, missing: 0, totalDmft: 1, decayedSurfaces: 1, filledSurfaces: 0, totalDmfs: 1, deciduousDecayed: 0, deciduousFilled: 0, deciduousExtracted: 0, totalDft: 0, intensityLevel: "very_low" },
			cpitnIndex: {
				sextant18_14: "0_healthy",
				sextant13_23: "0_healthy",
				sextant24_28: "0_healthy",
				sextant48_44: "0_healthy",
				sextant43_33: "0_healthy",
				sextant34_38: "0_healthy",
				treatmentNeedCategory: "0_none",
			},
			hygieneIndexOhiS: { debrisScore: 0.2, calculusScore: 0.2, totalScore: 0.4, ratingText: "Хорошая" },
			biteType: "orthognathic",
			biteDescription: "Ортогнатический",
			oralMucosaStatus: {
				color: "pale_pink_normal",
				moisture: "normal",
				gingivalPapillae: "normal_pointed",
				bleedingPBI: "grade_0",
				tongueStatus: "Чистый",
				regionalLymphNodes: "Не увеличены",
				tmjFunction: "Норма",
			},
			xrayFindingsDescription: "Дефект дентина жевательной поверхности 1.6.",
			xrayRadiationDoseMsv: 0.004,
		},
		generalTreatmentPlan: "1. Лечение кариеса 1.6.",
		visitDiaries: [
			{
				id: "vd-test-1",
				entryDate: "2026-08-20",
				toothNumber: "16",
				subjectiveComplaints: "Жалобы на кратковременные боли от холодного.",
				objectiveStatusLocalis: "Кариозная полость средней глубины на окклюзионной поверхности 1.6.",
				assessmentDiagnosisText: "Кариес дентина зуба 1.6",
				assessmentIcd10Code: "K02.1",
				procedureProtocol: "Инфильтрационная анестезия Sol. Ubistesini 4% 1.7 мл (партия 24B012). Изоляция коффердамом. Препарирование, обработка 2% хлоргексидином, бондинг, пломба Ceram.x A2, шлифовка, полировка.",
				anesthesiaDetails: "Sol. Ubistesini 4% 1.7 мл (партия 24B012)",
				appliedMaterials: "Ceram.x A2",
				doctorFullName: "Волкова Екатерина Сергеевна",
				isSignedWithUkep: true,
				digitalSignatureHash: "a4f891b8d234e6c7901ef5b89a03b51e7845cd1209384756abcdef1234567890",
			},
		],
		epicrisis: {
			treatmentSummary: "Лечение кариеса дентина 1.6 завершено.",
			treatmentOutcome: "complete_cure",
			treatmentOutcomeLabel: "Выздоровление",
			dispensaryGroup: "D_I_healthy",
			dispensaryGroupLabel: "Д-I (Здоровые)",
			plannedRecallIntervalMonths: 6,
			preventivePlanRecommendations: "Гигиена полости рта.",
			dateCompleted: "2026-08-20",
			attendingDoctorFullName: "Волкова Е.С.",
		},
		...overrides,
	};
}

describe("1. Statutory Validation Helpers (ICD-10 & Nomenclature 804n)", () => {
	it("validates correct ICD-10 dental and general codes", () => {
		assert.equal(isValidIcd10Code("K02.1"), true);
		assert.equal(isValidIcd10Code("K04.0"), true);
		assert.equal(isValidIcd10Code("K05.3"), true);
		assert.equal(isValidIcd10Code("K00"), true);
		assert.equal(isValidIcd10Code("k02.0"), true); // Case-insensitive
		assert.equal(isValidIcd10Code("A00.1"), true);
	});

	it("rejects invalid ICD-10 codes", () => {
		assert.equal(isValidIcd10Code(""), false);
		assert.equal(isValidIcd10Code(null), false);
		assert.equal(isValidIcd10Code(undefined), false);
		assert.equal(isValidIcd10Code("123"), false);
		assert.equal(isValidIcd10Code("Кариес"), false);
		assert.equal(isValidIcd10Code("KK02"), false);
	});

	it("validates correct Nomenclature 804n service codes", () => {
		assert.equal(isValidNomenclature804nCode("A16.07.002"), true);
		assert.equal(isValidNomenclature804nCode("A16.07.002.001"), true);
		assert.equal(isValidNomenclature804nCode("B01.003.004.001"), true);
		assert.equal(isValidNomenclature804nCode("A06.07.001"), true);
	});

	it("rejects invalid Nomenclature 804n service codes", () => {
		assert.equal(isValidNomenclature804nCode(""), false);
		assert.equal(isValidNomenclature804nCode(null), false);
		assert.equal(isValidNomenclature804nCode("Услуга 1"), false);
		assert.equal(isValidNomenclature804nCode("C16.07"), false);
	});
});

describe("2. Anesthesia Parsing & Pharmacovigilance (Dosage & Batch Number)", () => {
	it("extracts batch and series numbers in Russian and English formats", () => {
		assert.equal(extractAnesthesiaBatchNumber("Sol. Articaini 4% 1.7 мл, серия 24B012"), "24B012");
		assert.equal(extractAnesthesiaBatchNumber("Партия LOT-8941 до 2027"), "LOT-8941");
		assert.equal(extractAnesthesiaBatchNumber("сер. 99123/A"), "99123/A");
		assert.equal(extractAnesthesiaBatchNumber("LOT 44102"), "44102");
		assert.equal(extractAnesthesiaBatchNumber("Без указания партии"), null);
		assert.equal(extractAnesthesiaBatchNumber(null), null);
	});

	it("extracts dosage in ml, carpules, and mg", () => {
		const res1 = extractAnesthesiaDosage("Введено 1.7 мл артикаина 4%");
		assert.ok(res1);
		assert.equal(res1?.volumeMl, 1.7);

		const res2 = extractAnesthesiaDosage("2 карп. Ультракаина Д-С");
		assert.ok(res2);
		assert.equal(res2?.carpules, 2);
		assert.equal(res2?.volumeMl, 3.4);

		const res3 = extractAnesthesiaDosage("68 мг активного вещества");
		assert.ok(res3);
		assert.equal(res3?.mgActive, 68);

		assert.equal(extractAnesthesiaDosage(""), null);
		assert.equal(extractAnesthesiaDosage(null), null);
	});
});

describe("3. Endodontic Case Identification & Apex X-Ray Verification", () => {
	it("identifies endodontic case by primary ICD-10 K04", () => {
		const card = buildMockCard({
			passport: {
				...buildMockCard().passport,
				primaryDiagnosisIcd10: "K04.0",
				primaryDiagnosisText: "Острый пульпит",
			},
		});
		assert.equal(isEndodonticCase(card, []), true);
	});

	it("identifies endodontic case by diary text", () => {
		const card = buildMockCard({
			visitDiaries: [
				{
					...buildMockCard().visitDiaries[0]!,
					assessmentDiagnosisText: "Пульпит",
					procedureProtocol: "Экстирпация пульпы, пломбирование каналов гуттаперчей.",
				},
			],
		});
		assert.equal(isEndodonticCase(card, []), true);
	});

	it("identifies endodontic case by 804n service code A16.07.008", () => {
		const card = buildMockCard();
		const services = [{ serviceCode: "A16.07.008.002", serviceName: "Пломбирование каналов", quantity: 1, priceRub: 5000 }];
		assert.equal(isEndodonticCase(card, services), true);
	});

	it("verifies apex X-ray control when radiograph and apex reach are documented", () => {
		const card = buildMockCard({
			dentalStatus: {
				...buildMockCard().dentalStatus,
				xrayFindingsDescription: "На визиографии 2 канала запломбированы плотно до рентгенологического апекса.",
			},
		});
		const check = checkEndodonticApexXrayControl(card);
		assert.equal(check.hasApexXrayControl, true);
		assert.equal(check.isApexReached, true);
	});

	it("fails apex X-ray verification when post-treatment radiograph is absent", () => {
		const card = buildMockCard({
			dentalStatus: {
				...buildMockCard().dentalStatus,
				xrayFindingsDescription: "",
				xrayRadiationDoseMsv: 0,
			},
			visitDiaries: [
				{
					...buildMockCard().visitDiaries[0]!,
					procedureProtocol: "Пломбирование корневых каналов без рентген-контроля.",
				},
			],
		});
		const check = checkEndodonticApexXrayControl(card);
		assert.equal(check.hasApexXrayControl, false);
	});
});

describe("4. Automated CMO Audit Engine (Orders 834n, 785n, 1051n, 804n)", () => {
	it("awards 100% Quality Score (I Category) to fully compliant card", () => {
		const card = buildMockCard();
		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС 1051н", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-20" },
			],
			completedServices: [
				{ serviceCode: "A16.07.002.001", serviceName: "Пломба", quantity: 1, priceRub: 5000 },
			],
		});

		const auditRes = runCmoQualityAudit(record);
		assert.equal(auditRes.score, 100);
		assert.equal(auditRes.qualityCategory, "I_CATEGORY_EXCELLENT");
		assert.equal(auditRes.isEligibleForAutoApproval, true);
		assert.equal(auditRes.failedCount, 0);
	});

	it("deducts 25 points when Informed Consent (ИДС 1051н) is missing", () => {
		const card = buildMockCard();
		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [], // No IDS
		});

		const auditRes = runCmoQualityAudit(record);
		const idsCheck = auditRes.results.find((r) => r.ruleId === "RULE-IDS-1051N");
		assert.ok(idsCheck);
		assert.equal(idsCheck?.passed, false);
		assert.equal(idsCheck?.deduction, 25);
		assert.ok(auditRes.score <= 75);
	});

	it("penalizes procedural violation when IDS is signed after the procedure date", () => {
		const card = buildMockCard();
		const record = createCmoAuditRecord({
			visitDate: "2026-08-20",
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-22" }, // 2 days late
			],
		});

		const auditRes = runCmoQualityAudit(record);
		const idsCheck = auditRes.results.find((r) => r.ruleId === "RULE-IDS-1051N");
		assert.equal(idsCheck?.passed, false);
		assert.equal(idsCheck?.deduction, 20);
	});

	it("deducts 10 points when anesthesia protocol is missing carpule batch number", () => {
		const card = buildMockCard({
			visitDiaries: [
				{
					...buildMockCard().visitDiaries[0]!,
					procedureProtocol: "Инфильтрационная анестезия Sol. Ubistesini 4% 1.7 мл. Препарирование.",
					anesthesiaDetails: "Sol. Ubistesini 4% 1.7 мл", // No batch number!
				},
			],
		});

		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС 1051н", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-20" },
			],
		});

		const auditRes = runCmoQualityAudit(record);
		const anesCheck = auditRes.results.find((r) => r.ruleId === "RULE-ANES-SAFETY");
		assert.equal(anesCheck?.passed, false);
		assert.equal(anesCheck?.severity, "major");
		assert.equal(anesCheck?.deduction, 10);
	});

	it("deducts 25 points for endodontic treatment lacking apex X-ray confirmation", () => {
		const card = buildMockCard({
			passport: {
				...buildMockCard().passport,
				primaryDiagnosisIcd10: "K04.0",
				primaryDiagnosisText: "Острый пульпит",
			},
			dentalStatus: {
				...buildMockCard().dentalStatus,
				xrayFindingsDescription: "",
				xrayRadiationDoseMsv: null,
			},
			visitDiaries: [
				{
					...buildMockCard().visitDiaries[0]!,
					assessmentIcd10Code: "K04.0",
					assessmentDiagnosisText: "Пульпит",
					procedureProtocol: "Экстирпация пульпы, пломбирование каналов гуттаперчей без снимка.",
				},
			],
		});

		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
			],
		});

		const auditRes = runCmoQualityAudit(record);
		const endoCheck = auditRes.results.find((r) => r.ruleId === "RULE-ENDO-APEX-XRAY");
		assert.equal(endoCheck?.passed, false);
		assert.equal(endoCheck?.deduction, 25);
		assert.equal(endoCheck?.severity, "critical");
	});

	it("deducts 20 points when UKEP signature is absent", () => {
		const card = buildMockCard({
			visitDiaries: [
				{
					...buildMockCard().visitDiaries[0]!,
					isSignedWithUkep: false,
					digitalSignatureHash: null,
				},
			],
		});

		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
			],
		});

		const auditRes = runCmoQualityAudit(record);
		const ukepCheck = auditRes.results.find((r) => r.ruleId === "RULE-UKEP-SIGNATURE");
		assert.equal(ukepCheck?.passed, false);
		assert.equal(ukepCheck?.deduction, 20);
	});

	it("deducts 20 points when Form 043/u clinical diaries are absent", () => {
		const card = buildMockCard({
			visitDiaries: [],
		});

		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
			],
		});

		const auditRes = runCmoQualityAudit(record);
		const diaryCheck = auditRes.results.find((r) => isCmoRuleMatch(r.ruleId, "RULE-043-DIARY"));
		assert.ok(diaryCheck);
		assert.equal(diaryCheck?.passed, false);
		assert.equal(diaryCheck?.deduction, 20);
		assert.ok(diaryCheck?.details.includes("отсутствуют дневниковые записи"));
	});

	it("deducts points and reports statutory Form 043/u details without western SOAP acronyms when diary is incomplete", () => {
		const card = buildMockCard({
			visitDiaries: [
				{
					...buildMockCard().visitDiaries[0]!,
					subjectiveComplaints: "",
				},
			],
		});

		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
			],
		});

		const auditRes = runCmoQualityAudit(record);
		const diaryCheck = auditRes.results.find((r) => r.ruleId === "RULE-043-DIARY");
		assert.ok(diaryCheck);
		assert.equal(diaryCheck?.passed, false);
		assert.equal(diaryCheck?.deduction, 10);
		assert.ok(diaryCheck?.details.includes("Форма 043/у"));
		assert.ok(!diaryCheck?.details.includes("Subjective"));
	});
});

describe("5. CMO Custom Remarks & Resolution Workflow", () => {
	it("adds custom defect remarks and recalculates final score", () => {
		const card = buildMockCard();
		let record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
			],
		});

		assert.equal(record.automatedQualityScore, 100);

		record = addCmoDefectRemark(record, {
			category: "CLINICAL_DIARY_SOAP",
			severity: "major",
			title: "Неполный протокол препарирования",
			comment: "Не указана глубина препарирования дентина.",
			statutoryRef: "Приказ 834н",
			penaltyScore: 15,
			affectedSection: "diaries",
		});

		assert.equal(record.status, "rejected_with_remarks");
		assert.equal(record.automatedQualityScore, 85);
		assert.equal(record.cmoRemarks.length, 1);
		assert.equal(record.auditHistory.length, 2);
	});

	it("resolves remarks by doctor and restores quality score", () => {
		const card = buildMockCard();
		let record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
			],
		});

		record = addCmoDefectRemark(record, {
			category: "ANESTHESIA_BATCH_AND_DOSAGE",
			severity: "major",
			title: "Уточнить серию карпулы",
			comment: "Внести серию",
			statutoryRef: "Приказ 785н",
			penaltyScore: 10,
			affectedSection: "anesthesia",
		});

		assert.equal(record.automatedQualityScore, 90);

		const remarkId = record.cmoRemarks[0]!.id;
		record = resolveCmoDefectRemark(record, remarkId, "Серия 24B012 внесена в карту.", "Волкова Е.С.");

		assert.equal(record.cmoRemarks[0]?.isResolved, true);
		assert.equal(record.status, "pending_review");
		assert.equal(record.automatedQualityScore, 100);
	});

	it("applies CMO resolutions (Approved, Rejected, Commission Referral)", () => {
		const card = buildMockCard();
		const record = createCmoAuditRecord({ cardData: card });

		const approved = applyCmoResolution(record, "approved", {
			fullName: "Барабаш С.В.",
			role: "chief_medical_officer",
			controlLevel: "level_2_cmo_expert",
			comment: "Карта 043/у утверждена.",
		});
		assert.equal(approved.status, "approved");
		assert.equal(approved.cmoResolution?.decision, "approved");

		const referral = applyCmoResolution(record, "commission_referral", {
			fullName: "Барабаш С.В.",
			role: "chief_medical_officer",
			controlLevel: "level_3_medical_commission",
			comment: "Направлено на заседание ВКК.",
		});
		assert.equal(referral.status, "commission_referral");
	});
});

describe("6. VKK Official Expertise Act Generation (Order 785n)", () => {
	it("generates structured VKK Expertise Act and formatted text", () => {
		const card = buildMockCard();
		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
			],
		});

		const act = generateVkkExpertiseAct(record);
		assert.equal(act.actNumber, record.recordNumber);
		assert.equal(act.clinicName, "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»");
		assert.equal(act.patientFullName, "Иванов Иван Иванович");
		assert.equal(act.doctorFullName, "Волкова Екатерина Сергеевна");
		assert.equal(act.qualityScore, 100);
		assert.equal(act.qualityCategory, "I_CATEGORY_EXCELLENT");

		const text = exportVkkExpertiseActText(act);
		assert.ok(text.includes("АКТ ЭКСПЕРТИЗЫ КАЧЕСТВА МЕДИЦИНСКОЙ ПОМОЩИ"));
		assert.ok(text.includes("Приказ Минздрава РФ № 785н"));
		assert.ok(text.includes("Иванов Иван Иванович"));
		assert.ok(text.includes("100%"));
		assert.ok(text.includes("Председатель комиссии (Начмед)"));
	});
});

describe("7. Filtering, Doctor Rankings & Summary Analytics", () => {
	it("filters audit records by doctor, status, search, and score", () => {
		const card = buildMockCard();
		const rec1 = createCmoAuditRecord({ id: "r1", doctorStaffId: "doc-01", status: "approved", cardData: card });
		const rec2 = createCmoAuditRecord({ id: "r2", doctorStaffId: "doc-02", status: "rejected_with_remarks", cardData: card });
		const recs = [rec1, rec2];

		const byDoc = filterCmoAuditRecords(recs, { doctorStaffId: "doc-01" });
		assert.equal(byDoc.length, 1);
		assert.equal(byDoc[0]?.id, "r1");

		const byStatus = filterCmoAuditRecords(recs, { status: "rejected_with_remarks" });
		assert.equal(byStatus.length, 1);
		assert.equal(byStatus[0]?.id, "r2");
	});

	it("calculates doctor rankings and VKK summary report", () => {
		const card = buildMockCard();
		const rec1 = createCmoAuditRecord({
			id: "r1",
			doctorStaffId: "doc-01",
			doctorFullName: "Волкова Е.С.",
			doctorSpecialty: "Терапевт",
			status: "approved",
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
			],
		});
		const rec2 = createCmoAuditRecord({
			id: "r2",
			doctorStaffId: "doc-02",
			doctorFullName: "Кузнецов Д.И.",
			doctorSpecialty: "Хирург",
			status: "rejected_with_remarks",
			cardData: card,
			attachedDocuments: [], // Missing IDS
		});

		const rankings = calculateCmoDoctorRankings([rec1, rec2]);
		assert.equal(rankings.length, 2);
		assert.equal(rankings[0]?.doctorStaffId, "doc-01");
		assert.equal(rankings[0]?.averageQualityScore, 100);
		assert.equal(rankings[0]?.complianceStatus, "I_CATEGORY_EXCELLENT");

		const summary = generateCmoVkkSummaryReport([rec1, rec2]);
		assert.equal(summary.totalAudited, 2);
		assert.equal(summary.approvedCount, 1);
		assert.equal(summary.rejectedCount, 1);
		assert.ok(summary.averageQualityScore > 0);
	});
});

describe("8. Statutory Presets Integrity", () => {
	it("contains all required statutory defect presets", () => {
		assert.ok(CMO_STATUTORY_DEFECT_PRESETS.length >= 9);
		const idsPreset = CMO_STATUTORY_DEFECT_PRESETS.find((p) => p.category === "INFORMED_CONSENT_1051N");
		assert.ok(idsPreset);
		assert.equal(idsPreset?.severity, "critical");

		const anesPreset = CMO_STATUTORY_DEFECT_PRESETS.find((p) => p.category === "ANESTHESIA_BATCH_AND_DOSAGE");
		assert.ok(anesPreset);

		const endoPreset = CMO_STATUTORY_DEFECT_PRESETS.find((p) => p.category === "ENDODONTIC_XRAY_APEX_CONTROL");
		assert.ok(endoPreset);
	});

	it("modernizes diary defect preset to DEF-043-01 / КЭР-043-01 with backward compatibility for SOAP aliases", () => {
		const diaryPreset = CMO_STATUTORY_DEFECT_PRESETS.find((p) => p.id === "DEF-043-01");
		assert.ok(diaryPreset, "Должен содержать пресет DEF-043-01");
		assert.equal(diaryPreset?.code, "КЭР-043-01", "Код пресета должен быть КЭР-043-01");
		assert.ok(diaryPreset?.aliases?.includes("DEF-SOAP-01"), "Должен содержать алиас DEF-SOAP-01");
		assert.ok(diaryPreset?.aliases?.includes("КЭР-SOAP-01"), "Должен содержать алиас КЭР-SOAP-01");

		// Fallback lookup tests
		assert.ok(findCmoDefectPreset("DEF-043-01"));
		assert.ok(findCmoDefectPreset("КЭР-043-01"));
		assert.ok(findCmoDefectPreset("DEF-SOAP-01"), "Поиск по устаревшему DEF-SOAP-01 должен находить пресет 043");
		assert.ok(findCmoDefectPreset("КЭР-SOAP-01"), "Поиск по устаревшему КЭР-SOAP-01 должен находить пресет 043");

		// Matching helper tests
		assert.equal(isCmoDefectCodeMatch("КЭР-SOAP-01", "КЭР-043-01"), true);
		assert.equal(isCmoDefectCodeMatch("КЭР-043-01", "КЭР-SOAP-01"), true);
		assert.equal(isCmoRuleMatch("RULE-SOAP-DIARY", "RULE-043-DIARY"), true);
		assert.equal(isCmoRuleMatch("RULE-043-DIARY", "RULE-SOAP-DIARY"), true);
	});
});

describe("9. Deterministic Sequential KER Protocol Numbers & UUIDv7 IDs (Mandates 8a-8q)", () => {
	it("generates deterministic sequential KER protocol numbers", () => {
		assert.equal(generateKerProtocolNumber(1, 2026), "КЭР-2026-0001");
		assert.equal(generateKerProtocolNumber(42, 2026), "КЭР-2026-0042");
		assert.equal(generateKerProtocolNumber(999, 2026), "КЭР-2026-0999");
		assert.equal(generateKerProtocolNumber(1000, 2026), "КЭР-2026-1000");

		resetKerSequenceCounter(1);
		assert.equal(generateKerProtocolNumber(undefined, 2026), "КЭР-2026-0001");
		assert.equal(generateKerProtocolNumber(undefined, 2026), "КЭР-2026-0002");
		assert.equal(generateKerProtocolNumber(undefined, 2026), "КЭР-2026-0003");

		resetKerSequenceCounter(1);
	});

	it("generates safe UUIDv7 IDs and sequential protocol numbers in createCmoAuditRecord", () => {
		resetKerSequenceCounter(5);
		const card = buildMockCard();
		const rec1 = createCmoAuditRecord({ cardData: card, visitDate: "2026-09-10" });
		const rec2 = createCmoAuditRecord({ cardData: card, visitDate: "2026-09-10" });

		assert.equal(rec1.recordNumber, "КЭР-2026-0005");
		assert.equal(rec2.recordNumber, "КЭР-2026-0006");

		// Validates UUIDv7 in ID
		assert.ok(rec1.id.startsWith("cmo-audit-"));
		const rawUuid1 = rec1.id.replace("cmo-audit-", "");
		const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		assert.ok(uuidV7Regex.test(rawUuid1), `Expected UUIDv7 format for audit id, got: ${rawUuid1}`);

		// Validates UUIDv7 in patientId
		assert.ok(rec1.patientId.startsWith("pat-"));
		const rawPatUuid = rec1.patientId.replace("pat-", "");
		assert.ok(uuidV7Regex.test(rawPatUuid), `Expected UUIDv7 format for patientId, got: ${rawPatUuid}`);

		resetKerSequenceCounter(1);
	});

	it("generates safe UUIDv7 IDs in addCmoDefectRemark", () => {
		const card = buildMockCard();
		let record = createCmoAuditRecord({ cardData: card });
		record = addCmoDefectRemark(record, {
			category: "ANESTHESIA_BATCH_AND_DOSAGE",
			severity: "major",
			title: "Тестовое замечание",
			comment: "Комментарий",
			statutoryRef: "Приказ 785н",
			penaltyScore: 10,
			affectedSection: "anesthesia",
		});

		const remark = record.cmoRemarks[0];
		assert.ok(remark);
		assert.ok(remark.id.startsWith("rem-"));
		const rawRemUuid = remark.id.replace("rem-", "");
		const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		assert.ok(uuidV7Regex.test(rawRemUuid), `Expected UUIDv7 format for remark id, got: ${rawRemUuid}`);
	});
});

describe("10. 7 Core Outpatient Dental Form 043/u Audit Criteria", () => {
	it("deducts points when complaints and anamnesis are completely missing", () => {
		const card = buildMockCard({
			anamnesis: {
				...buildMockCard().anamnesis,
				chiefComplaint: "",
				historyOfPresentIllness: "",
				medicalHistoryVitae: "",
			},
			visitDiaries: [
				{
					...buildMockCard().visitDiaries[0]!,
					subjectiveComplaints: "",
					objectiveStatusLocalis: "",
				},
			],
		});

		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС 1051н", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-20" },
			],
		});

		const auditRes = runCmoQualityAudit(record);
		const anamCheck = auditRes.results.find((r) => r.ruleId === "RULE-043-ANAMNESIS");
		assert.ok(anamCheck);
		assert.equal(anamCheck.passed, false);
		assert.equal(anamCheck.deduction, 10);
	});

	it("deducts points when dental status, formula, and indices are completely empty", () => {
		const card = buildMockCard({
			dentalStatus: {
				odontogramTeeth: [],
				dmftIndex: undefined as any,
				cpitnIndex: undefined as any,
				hygieneIndexOhiS: undefined as any,
				biteType: undefined as any,
				biteDescription: undefined as any,
				xrayFindingsDescription: undefined as any,
				oralMucosaStatus: undefined as any,
			},
		});

		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС 1051н", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-20" },
			],
		});

		const auditRes = runCmoQualityAudit(record);
		const dentCheck = auditRes.results.find((r) => r.ruleId === "RULE-043-DENTAL-STATUS");
		assert.ok(dentCheck);
		assert.equal(dentCheck.passed, false);
		assert.equal(dentCheck.deduction, 10);
	});

	it("deducts points when recommendations and warranty terms are missing", () => {
		const card = buildMockCard({
			epicrisis: {
				...buildMockCard().epicrisis!,
				preventivePlanRecommendations: "",
				dispensaryGroup: undefined as any,
				plannedRecallIntervalMonths: undefined as any,
			},
			generalTreatmentPlan: "",
		});

		const record = createCmoAuditRecord({
			cardData: card,
			attachedDocuments: [
				{ id: "doc-1", type: "ids_1051n", title: "ИДС 1051н", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-20" },
			],
		});

		const auditRes = runCmoQualityAudit(record);
		const warrCheck = auditRes.results.find((r) => r.ruleId === "RULE-043-RECOMMENDATIONS-WARRANTY");
		assert.ok(warrCheck);
		assert.equal(warrCheck.passed, false);
		assert.equal(warrCheck.deduction, 5);
	});
});

describe("11. Hospital Bloat & Inpatient Invariant Verification (Mandate 8i)", () => {
	it("verifies zero hospital inpatient terms and zero 100-point wipeout deductions in defect presets", () => {
		for (const preset of CMO_STATUTORY_DEFECT_PRESETS) {
			const text = `${preset.title} ${preset.description} ${preset.recommendedAction}`.toLowerCase();
			assert.ok(!text.includes("койко-дни"), `Preset ${preset.id} must not contain inpatient bed-days`);
			assert.ok(!text.includes("трансфузиолог"), `Preset ${preset.id} must not contain transfusion`);
			assert.ok(!text.includes("стационар"), `Preset ${preset.id} must not contain inpatient hospital`);
			assert.ok(preset.penaltyScore <= 25, `Preset ${preset.id} penalty (${preset.penaltyScore}) must be proportional and not exceed 25 points`);
		}
	});
});

