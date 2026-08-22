import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isValidIcd10Code,
	runAutomatedEmrAudit,
	calculateQualityScore,
	createAuditRecord,
	submitRecordForReview,
	applyCmoAuditDecision,
	addCmoRemark,
	resolveCmoRemark,
	filterAuditRecords,
	calculateDoctorQualityMetrics,
	generateCmoAuditSummaryReport,
	exportCmoAuditProtocolText,
} from "../components/emr/audit/cmoEmrAuditEngine";
import type { MedicalCardForm043uData } from "../components/emr/emr043Types";

const MOCK_CARD_PERFECT: MedicalCardForm043uData = {
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
	},
	passport: {
		medicalCardNumber: "СТ-2026-0001",
		cardOpenedDate: "2026-08-20",
		patientFullName: "Иванов Иван Иванович",
		patientBirthDate: "1992-04-12",
		patientSex: "male",
		patientAddressRegistration: "г. Москва, ул. Арбат, д. 10",
		patientIdentityDocument: "Паспорт РФ 45 15 № 123456",
		primaryDiagnosisText: "Кариес дентина зуба 2.4",
		primaryDiagnosisIcd10: "K02.1",
		attendingDoctorFullName: "Волкова Екатерина Сергеевна",
		attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
	},
	anamnesis: {
		chiefComplaint: "Кратковременная боль от холодного.",
		historyOfPresentIllness: "Появилась неделю назад.",
		medicalHistoryVitae: "Соматически здоров.",
		allergologicalHistory: "Аллергических реакций нет.",
		concomitantSomaticDiseases: "Отрицает.",
		currentSystemicMedications: "Не принимает.",
		pregnancyLactationStatus: "Не применимо",
		pastDentalInterventions: "Лечение кариеса в 2025 г.",
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
		hygieneIndexOhiS: { debrisScore: 0.1, calculusScore: 0.1, totalScore: 0.2, ratingText: "Хорошая" },
		biteType: "orthognathic",
		biteDescription: "Ортогнатический",
		oralMucosaStatus: {
			color: "pale_pink_normal",
			moisture: "normal",
			gingivalPapillae: "normal_pointed",
			bleedingPBI: "grade_0",
			tongueStatus: "Язык чистый, влажный",
			regionalLymphNodes: "Лимфоузлы не увеличены",
			tmjFunction: "Движения в ВНЧС в полном объеме",
		},
		xrayFindingsDescription: "Дефект дентина зуба 2.4 в пределах средних слоев.",
		xrayRadiationDoseMsv: 0.003,
	},
	generalTreatmentPlan: "1. Препарирование и пломбирование 2.4. 2. Осмотр через 6 мес.",
	visitDiaries: [
		{
			id: "vd-01",
			entryDate: "2026-08-20",
			toothNumber: "24",
			subjectiveComplaints: "Жалобы на кратковременные боли от температурных раздражителей.",
			objectiveStatusLocalis: "Кариозная полость средней глубины на окклюзионной поверхности зуба 2.4, зондирование болезненно по ЭДГ.",
			assessmentDiagnosisText: "Кариес дентина зуба 2.4",
			assessmentIcd10Code: "K02.1",
			procedureProtocol: "Инфильтрационная анестезия Sol. Ubistesini 4% 1.7 мл. Препарирование кариозной полости, медикаментозная обработка, бондинг, пломбирование композитом Ceram.x Spectra ST A2.",
			anesthesiaDetails: "Sol. Ubistesini 4% 1.7 мл инфильтрационно",
			appliedMaterials: "Ceram.x Spectra ST A2",
			doctorFullName: "Волкова Екатерина Сергеевна",
			isSignedWithUkep: true,
			digitalSignatureHash: "1234567890abcdef1234567890abcdef",
		},
	],
	epicrisis: {
		treatmentSummary: "Лечение кариеса дентина 2.4 завершено.",
		treatmentOutcome: "complete_cure",
		treatmentOutcomeLabel: "Выздоровление",
		dispensaryGroup: "D_I_healthy",
		dispensaryGroupLabel: "Д-I (Здоровые)",
		plannedRecallIntervalMonths: 6,
		preventivePlanRecommendations: "Гигиена полости рта.",
		dateCompleted: "2026-08-20",
		attendingDoctorFullName: "Волкова Е.С.",
	},
};

describe("CMO EMR Quality Audit Engine", () => {
	it("validates ICD-10 codes correctly according to WHO format", () => {
		assert.equal(isValidIcd10Code("K02.1"), true);
		assert.equal(isValidIcd10Code("K04.0"), true);
		assert.equal(isValidIcd10Code("K05.31"), true);
		assert.equal(isValidIcd10Code("k02"), true);
		assert.equal(isValidIcd10Code("INVALID"), false);
		assert.equal(isValidIcd10Code("123"), false);
		assert.equal(isValidIcd10Code(""), false);
		assert.equal(isValidIcd10Code(null), false);
	});

	it("passes 100% automated audit for a compliant Form 043/u record", () => {
		const record = createAuditRecord({
			cardData: MOCK_CARD_PERFECT,
			attachedDocuments: [
				{ id: "d1", type: "ids_323fz", title: "ИДС на лечение", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-20" },
			],
			completedActItems: [
				{ serviceCode: "A16.07.002", serviceName: "Восстановление зуба пломбой", toothNumber: "24", quantity: 1, priceRub: 5000 },
			],
			treatmentPlanItems: [
				{ serviceCode: "A16.07.002", serviceName: "Восстановление зуба пломбой", toothNumber: "24", stage: "Терапия" },
			],
		});

		const audit = runAutomatedEmrAudit(record);
		assert.equal(audit.failedCount, 0);
		assert.equal(audit.score, 100);
		assert.equal(audit.isAutoApprovedEligible, true);
		assert.equal(audit.results.length, 8);
	});

	it("detects missing Informed Consent (ИДС 323-ФЗ) and penalizes quality score", () => {
		const record = createAuditRecord({
			cardData: MOCK_CARD_PERFECT,
			attachedDocuments: [], // Нет ИДС
		});

		const audit = runAutomatedEmrAudit(record);
		const idsCheck = audit.results.find((r) => r.ruleId === "AUTO-IDS-01");
		assert.ok(idsCheck);
		assert.equal(idsCheck.passed, false);
		assert.equal(idsCheck.deduction, 25);
		assert.ok(audit.score <= 75);
		assert.equal(audit.isAutoApprovedEligible, false);
	});

	it("detects missing anesthesia protocol during invasive procedures", () => {
		const badCard: MedicalCardForm043uData = {
			...MOCK_CARD_PERFECT,
			visitDiaries: [
				{
					id: "vd-01",
					entryDate: "2026-08-20",
					toothNumber: "24",
					subjectiveComplaints: "Жалобы на боли.",
					objectiveStatusLocalis: "Кариозная полость.",
					assessmentDiagnosisText: "Кариес 2.4",
					assessmentIcd10Code: "K02.1",
					doctorFullName: "Волкова Е.С.",
					procedureProtocol: "Проведено сложное удаление зуба 2.4 элеватором.",
					anesthesiaDetails: "", // Дефект: нет анестезии
				},
			],
		};

		const record = createAuditRecord({
			cardData: badCard,
			attachedDocuments: [{ id: "d1", type: "ids_323fz", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true }],
		});

		const audit = runAutomatedEmrAudit(record);
		const anesCheck = audit.results.find((r) => r.ruleId === "AUTO-ANES-01");
		assert.ok(anesCheck);
		assert.equal(anesCheck.passed, false);
		assert.equal(anesCheck.deduction, 20);
	});

	it("detects discrepancy between completed works act and treatment plan", () => {
		const record = createAuditRecord({
			cardData: MOCK_CARD_PERFECT,
			attachedDocuments: [{ id: "d1", type: "ids_323fz", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true }],
			completedActItems: [
				{ serviceCode: "A16.07.024", serviceName: "Удаление зуба сложное", toothNumber: "48", quantity: 1, priceRub: 9000 },
			],
			treatmentPlanItems: [
				{ serviceCode: "A16.07.002", serviceName: "Восстановление зуба пломбой", stage: "Терапия" },
			],
		});

		const audit = runAutomatedEmrAudit(record);
		const actCheck = audit.results.find((r) => r.ruleId === "AUTO-ACT-01");
		assert.ok(actCheck);
		assert.equal(actCheck.passed, false);
		assert.equal(actCheck.deduction, 15);
	});

	it("calculates quality score with manual CMO remarks and deductions", () => {
		const record = createAuditRecord({
			cardData: MOCK_CARD_PERFECT,
			attachedDocuments: [{ id: "d1", type: "ids_323fz", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true }],
		});

		// Добавляем замечание начмеда
		const withRemark = addCmoRemark(record, {
			category: "CLINICAL_DIARY_SOAP",
			severity: "major",
			title: "Неполный протокол препарирования",
			comment: "Не указан кариес-маркер и прокладка.",
			affectedSection: "diaries",
		});

		assert.equal(withRemark.status, "rejected_with_remarks");
		assert.equal(withRemark.cmoRemarks.length, 1);
		assert.equal(withRemark.automatedQualityScore, 85); // 100 - 15 = 85
	});

	it("resolves CMO remark by doctor and restores score and status", () => {
		const record = createAuditRecord({
			cardData: MOCK_CARD_PERFECT,
			attachedDocuments: [{ id: "d1", type: "ids_323fz", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true }],
		});

		const withRemark = addCmoRemark(record, {
			category: "CLINICAL_DIARY_SOAP",
			severity: "major",
			title: "Неполный протокол препарирования",
			comment: "Не указан кариес-маркер.",
			affectedSection: "diaries",
		});

		assert.ok(withRemark.cmoRemarks[0]);
		const remarkId = withRemark.cmoRemarks[0].id;
		const resolved = resolveCmoRemark(withRemark, remarkId, "Протокол дополнен данными о применении Kuraray Caries Detector", "Волкова Е.С.");

		assert.ok(resolved.cmoRemarks[0]);
		assert.equal(resolved.cmoRemarks[0].isResolved, true);
		assert.equal(resolved.status, "pending_review");
		assert.equal(resolved.automatedQualityScore, 100);
	});

	it("applies CMO approval decision and records audit history", () => {
		const record = createAuditRecord({
			cardData: MOCK_CARD_PERFECT,
			attachedDocuments: [{ id: "d1", type: "ids_323fz", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true }],
		});

		const approved = applyCmoAuditDecision(record, "approved", {
			fullName: "Прохоров К.И.",
			role: "chief_medical_officer",
			comment: "Карта 043/у утверждена.",
		});

		assert.equal(approved.status, "approved");
		assert.equal(approved.cmoResolution?.decision, "approved");
		assert.equal(approved.cmoResolution?.auditorFullName, "Прохоров К.И.");
		assert.ok(approved.auditHistory.some((h) => h.action === "approved"));
	});

	it("filters audit records correctly by doctor, status, and search query", () => {
		const rec1 = createAuditRecord({
			doctorStaffId: "doc-1",
			doctorFullName: "Волкова Е.С.",
			patientFullName: "Смирнов Алексей",
			status: "pending_review",
			cardData: MOCK_CARD_PERFECT,
		});

		const rec2 = createAuditRecord({
			doctorStaffId: "doc-2",
			doctorFullName: "Кузнецов Д.И.",
			patientFullName: "Иванова Марина",
			status: "rejected_with_remarks",
			cardData: MOCK_CARD_PERFECT,
		});

		const filteredByDoc = filterAuditRecords([rec1, rec2], { doctorStaffId: "doc-1" });
		assert.equal(filteredByDoc.length, 1);
		assert.ok(filteredByDoc[0]);
		assert.equal(filteredByDoc[0].patientFullName, "Смирнов Алексей");

		const filteredByStatus = filterAuditRecords([rec1, rec2], { status: "rejected_with_remarks" });
		assert.equal(filteredByStatus.length, 1);
		assert.ok(filteredByStatus[0]);
		assert.equal(filteredByStatus[0].doctorFullName, "Кузнецов Д.И.");

		const filteredBySearch = filterAuditRecords([rec1, rec2], { search: "марина" });
		assert.equal(filteredBySearch.length, 1);
		assert.ok(filteredBySearch[0]);
		assert.equal(filteredBySearch[0].patientFullName, "Иванова Марина");
	});

	it("aggregates doctor quality metrics and calculates compliance ratings", () => {
		const recApproved = createAuditRecord({
			doctorStaffId: "doc-1",
			doctorFullName: "Волкова Е.С.",
			doctorSpecialty: "Терапевт",
			status: "approved",
			cardData: MOCK_CARD_PERFECT,
			attachedDocuments: [{ id: "d1", type: "ids_323fz", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true }],
		});

		const recRejected = createAuditRecord({
			doctorStaffId: "doc-2",
			doctorFullName: "Кузнецов Д.И.",
			doctorSpecialty: "Хирург",
			status: "rejected_with_remarks",
			cardData: MOCK_CARD_PERFECT,
		});

		const metrics = calculateDoctorQualityMetrics([recApproved, recRejected]);
		assert.equal(metrics.length, 2);

		const doc1 = metrics.find((m) => m.doctorStaffId === "doc-1");
		assert.ok(doc1);
		assert.equal(doc1.firstTimeApprovalRate, 100);
		assert.equal(doc1.complianceRating, "excellent");

		const doc2 = metrics.find((m) => m.doctorStaffId === "doc-2");
		assert.ok(doc2);
		assert.equal(doc2.rejectedCount, 1);
	});

	it("generates CMO audit summary report and top defect rankings", () => {
		const rec = createAuditRecord({
			cardData: MOCK_CARD_PERFECT,
			attachedDocuments: [], // Missing IDS
		});

		const report = generateCmoAuditSummaryReport([rec]);
		assert.equal(report.totalAudited, 1);
		assert.ok(report.topDefects.length > 0);
		assert.ok(report.topDefects[0]);
		assert.equal(report.topDefects[0].category, "INFORMED_CONSENT_323FZ");
	});

	it("exports printable CMO audit protocol text conforming to Order 203n", () => {
		const record = createAuditRecord({
			recordNumber: "КЭР-2026-0099",
			cardData: MOCK_CARD_PERFECT,
			attachedDocuments: [{ id: "d1", type: "ids_323fz", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true }],
		});

		const protocolText = exportCmoAuditProtocolText(record);
		assert.ok(protocolText.includes("ПРОТОКОЛ КЛИНИКО-ЭКСПЕРТНОЙ ОЦЕНКИ"));
		assert.ok(protocolText.includes("КЭР-2026-0099"));
		assert.ok(protocolText.includes("Иванов Иван Иванович"));
		assert.ok(protocolText.includes("РЕЗУЛЬТАТЫ АВТОМАТИЧЕСКОГО КОНТРОЛЯ"));
	});
});
