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
	type EmrAuditRecord,
} from "../cmoEmrAuditEngine";
import { CMO_STATUTORY_DEFECT_PRESETS } from "../cmoEmrAuditPresets";

const BASE_VALID_AUDIT_RECORD: EmrAuditRecord = {
	id: "audit-test-01",
	medicalCardId: "СТ-2026-0843",
	recordNumber: "КЭР-2026-1001",
	patientId: "pat-01",
	patientFullName: "Смирнов Алексей Владимирович",
	patientBirthDate: "1990-05-15",
	patientGender: "male",
	patientPhone: "+7 (916) 555-43-21",
	doctorStaffId: "doc-01",
	doctorFullName: "Волкова Екатерина Сергеевна",
	doctorSpecialty: "Врач-стоматолог-терапевт",
	visitDate: "2026-08-20",
	status: "pending_review",
	cardData: {
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
			medicalCardNumber: "СТ-2026-0843",
			cardOpenedDate: "2026-08-20",
			patientFullName: "Смирнов Алексей Владимирович",
			patientBirthDate: "1990-05-15",
			patientSex: "male",
			patientAddressRegistration: "г. Москва, ул. Ленина, д. 10, кв. 5",
			patientIdentityDocument: "Паспорт РФ 4510 123456, выдан ТП УФМС 10.05.2010",
			primaryDiagnosisText: "Кариес дентина зуба 1.6",
			primaryDiagnosisIcd10: "K02.1",
			attendingDoctorFullName: "Волкова Екатерина Сергеевна",
			attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
		},
		anamnesis: {
			chiefComplaint: "Кратковременные боли от холодного и сладкого в зубе 1.6.",
			historyOfPresentIllness: "Появились боли 3 дня назад.",
			medicalHistoryVitae: "Хронических заболеваний не отмечает.",
			allergologicalHistory: "Аллергических реакций нет.",
			concomitantSomaticDiseases: "Не выявлено.",
			currentSystemicMedications: "Не принимает.",
			pregnancyLactationStatus: "Не применимо.",
			pastDentalInterventions: "Лечение кариеса ранее.",
		},
		dentalStatus: {
			odontogramTeeth: [],
			dmftIndex: { decayed: 1, filled: 0, missing: 0, totalDmft: 1, decayedSurfaces: 1, filledSurfaces: 0, totalDmfs: 1, deciduousDecayed: 0, deciduousFilled: 0, deciduousExtracted: 0, totalDft: 0, intensityLevel: "very_low" },
			cpitnIndex: { sextant18_14: "0_healthy", sextant13_23: "0_healthy", sextant24_28: "0_healthy", sextant48_44: "0_healthy", sextant43_33: "0_healthy", sextant34_38: "0_healthy", treatmentNeedCategory: "0_none" },
			hygieneIndexOhiS: { debrisScore: 0.2, calculusScore: 0.2, totalScore: 0.4, ratingText: "Хорошая" },
			biteType: "orthognathic",
			biteDescription: "Ортогнатический",
			oralMucosaStatus: { color: "pale_pink_normal", moisture: "normal", gingivalPapillae: "normal_pointed", bleedingPBI: "grade_0", tongueStatus: "Язык чистый", regionalLymphNodes: "Не увеличены", tmjFunction: "Норма" },
			xrayFindingsDescription: "Дефект дентина жевательной поверхности 1.6.",
			xrayRadiationDoseMsv: 0.004,
		},
		generalTreatmentPlan: "Лечение кариеса 1.6",
		visitDiaries: [
			{
				id: "vd-01",
				entryDate: "2026-08-20",
				toothNumber: "16",
				subjectiveComplaints: "Жалобы на кратковременные боли от холодного.",
				objectiveStatusLocalis: "Кариозная полость средней глубины на жевательной поверхности зуба 1.6.",
				assessmentDiagnosisText: "Кариес дентина зуба 1.6",
				assessmentIcd10Code: "K02.1",
				procedureProtocol: "Инфильтрационная анестезия Sol. Ubistesini 4% 1.7 мл. Препарирование, медикаментозная обработка, бондинг, пломба Ceram.x, шлифовка, полировка.",
				anesthesiaDetails: "Sol. Ubistesini 4% 1.7 мл инфильтрационно",
				appliedMaterials: "Ceram.x Spectra ST A2, OptiBond FL",
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
			preventivePlanRecommendations: "Профосмотр и гигиена 2 раза в год.",
			dateCompleted: "2026-08-20",
			attendingDoctorFullName: "Волкова Е.С.",
		},
	},
	attachedDocuments: [
		{ id: "doc-ids-1", type: "ids_323fz", title: "ИДС на стоматологическое терапевтическое лечение", isSigned: true, signedByPatient: true, signedByDoctorUkep: true, signedAt: "2026-08-20" },
		{ id: "doc-tp-1", type: "treatment_plan", title: "План лечения № ТП-843", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
	],
	completedActItems: [
		{ serviceCode: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (кариес дентина)", toothNumber: "16", quantity: 1, priceRub: 5500 },
	],
	treatmentPlanItems: [
		{ serviceCode: "A16.07.002.001", serviceName: "Восстановление зуба пломбой (кариес дентина)", toothNumber: "16", stage: "Терапевтический этап" },
	],
	automatedCheckResults: [],
	automatedQualityScore: 100,
	cmoRemarks: [],
	auditHistory: [],
};

describe("CMO EMR Quality Audit Engine — ICD-10 & Automated Checks (Order 203n)", () => {
	it("validates ICD-10 code format strictly", () => {
		assert.equal(isValidIcd10Code("K02.1"), true);
		assert.equal(isValidIcd10Code("K04.0"), true);
		assert.equal(isValidIcd10Code("K05.31"), true);
		assert.equal(isValidIcd10Code("K08.1"), true);
		assert.equal(isValidIcd10Code("Z01.2"), true);

		assert.equal(isValidIcd10Code(""), false);
		assert.equal(isValidIcd10Code("invalid"), false);
		assert.equal(isValidIcd10Code("123"), false);
		assert.equal(isValidIcd10Code(null), false);
	});

	it("runs automated audit on fully compliant record with 100 score", () => {
		const audit = runAutomatedEmrAudit(BASE_VALID_AUDIT_RECORD);
		assert.equal(audit.score, 100);
		assert.equal(audit.failedCount, 0);
		assert.equal(audit.isAutoApprovedEligible, true);
		assert.ok(audit.results.every((r) => r.passed));
	});

	it("detects missing Informed Consent (323-FZ) and deducts 25 points", () => {
		const recordWithoutIds: EmrAuditRecord = {
			...BASE_VALID_AUDIT_RECORD,
			attachedDocuments: [], // No signed IDS
		};

		const audit = runAutomatedEmrAudit(recordWithoutIds);
		const idsCheck = audit.results.find((r) => r.ruleCategory === "INFORMED_CONSENT_323FZ");
		assert.ok(idsCheck);
		assert.equal(idsCheck.passed, false);
		assert.equal(idsCheck.severity, "critical");
		assert.equal(idsCheck.deduction, 25);
		assert.equal(audit.isAutoApprovedEligible, false);
		assert.equal(audit.score, 75);
	});

	it("detects lack of anesthesia documentation in invasive procedures", () => {
		const recordNoAnesthesia: EmrAuditRecord = {
			...BASE_VALID_AUDIT_RECORD,
			cardData: {
				...BASE_VALID_AUDIT_RECORD.cardData,
				visitDiaries: [
					{
						...BASE_VALID_AUDIT_RECORD.cardData.visitDiaries[0]!,
						procedureProtocol: "Проведено препарирование кариозной полости и пломбирование.", // No anesthesia mentioned
						anesthesiaDetails: "",
					},
				],
			},
		};

		const audit = runAutomatedEmrAudit(recordNoAnesthesia);
		const anesthCheck = audit.results.find((r) => r.ruleCategory === "ANESTHESIA_SAFETY");
		assert.ok(anesthCheck);
		assert.equal(anesthCheck.passed, false);
		assert.equal(anesthCheck.deduction, 20);
	});

	it("detects lack of UKEP digital signature on visit diaries", () => {
		const recordNoUkep: EmrAuditRecord = {
			...BASE_VALID_AUDIT_RECORD,
			cardData: {
				...BASE_VALID_AUDIT_RECORD.cardData,
				visitDiaries: [
					{
						...BASE_VALID_AUDIT_RECORD.cardData.visitDiaries[0]!,
						isSignedWithUkep: false,
						digitalSignatureHash: null,
					},
				],
			},
		};

		const audit = runAutomatedEmrAudit(recordNoUkep);
		const ukepCheck = audit.results.find((r) => r.ruleCategory === "UKEP_DIGITAL_SIGNATURE");
		assert.ok(ukepCheck);
		assert.equal(ukepCheck.passed, false);
		assert.equal(ukepCheck.deduction, 20);
	});
});

describe("CMO EMR Quality Audit Engine — Remarks & Resolution Workflow", () => {
	it("adds remark from CMO and updates status to rejected_with_remarks", () => {
		const initial = createAuditRecord({ cardData: BASE_VALID_AUDIT_RECORD.cardData, attachedDocuments: BASE_VALID_AUDIT_RECORD.attachedDocuments });
		assert.equal(initial.cmoRemarks.length, 0);

		const updated = addCmoRemark(initial, {
			category: "CLINICAL_DIARY_SOAP",
			severity: "major",
			title: "Неполный протокол лечебных манипуляций",
			comment: "Не указана глубина препарирования дентина.",
			affectedSection: "diaries",
		});

		assert.equal(updated.status, "rejected_with_remarks");
		assert.equal(updated.cmoRemarks.length, 1);
		assert.equal(updated.cmoRemarks[0]?.isResolved, false);
		assert.ok(updated.automatedQualityScore < 100);
	});

	it("resolves remark by attending doctor and transitions to pending_review", () => {
		const initial = createAuditRecord({ cardData: BASE_VALID_AUDIT_RECORD.cardData, attachedDocuments: BASE_VALID_AUDIT_RECORD.attachedDocuments });
		const withRemark = addCmoRemark(initial, {
			category: "CLINICAL_DIARY_SOAP",
			severity: "major",
			title: "Неполный протокол",
			comment: "Дополнить протокол.",
			affectedSection: "diaries",
		});

		const remarkId = withRemark.cmoRemarks[0]!.id;
		const resolved = resolveCmoRemark(withRemark, remarkId, "Протокол дополнен указанием глубины полости.");

		assert.equal(resolved.cmoRemarks[0]?.isResolved, true);
		assert.equal(resolved.status, "pending_review");
		assert.equal(resolved.cmoRemarks[0]?.resolutionComment, "Протокол дополнен указанием глубины полости.");
	});

	it("applies CMO approved decision and creates official resolution", () => {
		const initial = createAuditRecord({ cardData: BASE_VALID_AUDIT_RECORD.cardData, attachedDocuments: BASE_VALID_AUDIT_RECORD.attachedDocuments });
		const approved = applyCmoAuditDecision(initial, "approved", {
			fullName: "Прохоров К.И.",
			role: "chief_medical_officer",
			comment: "Медицинская карта проверена. Дефектов не обнаружено. Соответствует Приказу 203н.",
		});

		assert.equal(approved.status, "approved");
		assert.ok(approved.cmoResolution);
		assert.equal(approved.cmoResolution.decision, "approved");
		assert.equal(approved.cmoResolution.finalQualityScore, 100);
	});
});

describe("CMO EMR Quality Audit Engine — Reports & Metrics", () => {
	it("calculates doctor quality metrics and compliance ratings", () => {
		const rec1: EmrAuditRecord = { ...BASE_VALID_AUDIT_RECORD, id: "r1", status: "approved", automatedQualityScore: 100 };
		const rec2: EmrAuditRecord = { ...BASE_VALID_AUDIT_RECORD, id: "r2", status: "rejected_with_remarks", automatedQualityScore: 70 };

		const metrics = calculateDoctorQualityMetrics([rec1, rec2]);
		assert.equal(metrics.length, 1);
		const doc = metrics[0]!;
		assert.equal(doc.doctorFullName, "Волкова Екатерина Сергеевна");
		assert.equal(doc.totalRecordsAudited, 2);
		assert.equal(doc.approvedFirstAttempt, 1);
		assert.equal(doc.firstTimeApprovalRate, 50);
		assert.equal(doc.overallQualityScoreAvg, 85);
		assert.equal(doc.complianceRating, "good");
	});

	it("generates comprehensive CMO audit summary report", () => {
		const rec1: EmrAuditRecord = { ...BASE_VALID_AUDIT_RECORD, id: "r1", status: "approved", automatedQualityScore: 100 };
		const rec2: EmrAuditRecord = { ...BASE_VALID_AUDIT_RECORD, id: "r2", status: "rejected_with_remarks", automatedQualityScore: 75 };

		const summary = generateCmoAuditSummaryReport([rec1, rec2]);
		assert.equal(summary.totalAudited, 2);
		assert.equal(summary.approvedCount, 1);
		assert.equal(summary.rejectedCount, 1);
		assert.equal(summary.averageQualityScore, 88);
	});

	it("exports printable statutory clinical expert review protocol text", () => {
		const approved = applyCmoAuditDecision(BASE_VALID_AUDIT_RECORD, "approved", {
			fullName: "Прохоров К.И.",
			role: "chief_medical_officer",
			comment: "Карта утверждена без замечаний.",
		});

		const text = exportCmoAuditProtocolText(approved);
		assert.ok(text.includes("ПРОТОКОЛ КЛИНИКО-ЭКСПЕРТНОЙ ОЦЕНКИ КАЧЕСТВА МЕДИЦИНСКОЙ КАРТЫ ФОРМЫ 043/у"));
		assert.ok(text.includes("Приказ Минздрава № 203н"));
		assert.ok(text.includes("Смирнов Алексей Владимирович"));
		assert.ok(text.includes("УТВЕРЖДЕНО К ЭКСПОРТУ В ЕГИСЗ"));
		assert.ok(text.includes("Прохоров К.И."));
	});
});
