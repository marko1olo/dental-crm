/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL AUDIT BOARD & 5-STAGE LIFECYCLE ENGINE TESTS (Feature #45)
 * Statutory Verification: Orders 804n, 834n, 203n, 323-FZ, 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type EmrAuditRecord,
	type EmrAuditStatus,
	analyzeAnesthesiaProtocol,
	batchApproveCmoRecords,
	calculateDoctorQualityMetrics,
	createAuditRecord,
	filterAuditRecords,
	generateCmoAuditSummaryReport,
	getCanonicalAuditStage,
	isValidIcd10Code,
	isValidOrder804nServiceCode,
	returnRecordForRevision,
	runAutomatedEmrAudit,
} from "../cmoEmrAuditEngine.js";

describe("ClinicalAuditBoard Engine — 5-Stage Lifecycle & Canonical Statuses", () => {
	it("getCanonicalAuditStage maps all statuses to exactly 5 canonical stages", () => {
		// 1. not_filled (Не заполнен)
		assert.equal(getCanonicalAuditStage("not_filled"), "not_filled");
		assert.equal(getCanonicalAuditStage("draft"), "not_filled");

		// 2. in_progress (В работе)
		assert.equal(getCanonicalAuditStage("in_progress"), "in_progress");

		// 3. under_review (На проверке)
		assert.equal(getCanonicalAuditStage("under_review"), "under_review");
		assert.equal(getCanonicalAuditStage("pending_review"), "under_review");

		// 4. revision_required (На доработке)
		assert.equal(getCanonicalAuditStage("revision_required"), "revision_required");
		assert.equal(getCanonicalAuditStage("rejected_with_remarks"), "revision_required");

		// 5. approved_by_cmo (Утверждено главврачом)
		assert.equal(getCanonicalAuditStage("approved_by_cmo"), "approved_by_cmo");
		assert.equal(getCanonicalAuditStage("approved"), "approved_by_cmo");
		assert.equal(getCanonicalAuditStage("archived"), "approved_by_cmo");
	});

	it("filterAuditRecords correctly matches by canonical stages and search terms", () => {
		const rec1 = createAuditRecord({
			id: "r1",
			patientFullName: "Иванов Иван",
			status: "pending_review",
			cardData: {
				passport: { primaryDiagnosisIcd10: "K02.1", primaryDiagnosisText: "Кариес дентина" },
				anamnesis: {},
				dentalStatus: {},
				visitDiaries: [],
			},
		} as any);

		const rec2 = createAuditRecord({
			id: "r2",
			patientFullName: "Петрова Анна",
			status: "rejected_with_remarks",
			cardData: {
				passport: { primaryDiagnosisIcd10: "K04.0", primaryDiagnosisText: "Пульпит" },
				anamnesis: {},
				dentalStatus: {},
				visitDiaries: [],
			},
		} as any);

		// Фильтр по канонической стадии under_review должен найти rec1 со статусом pending_review
		const underReview = filterAuditRecords([rec1, rec2], { status: "under_review" });
		assert.equal(underReview.length, 1);
		assert.equal(underReview[0]?.id, "r1");

		// Фильтр по канонической стадии revision_required должен найти rec2 со статусом rejected_with_remarks
		const revision = filterAuditRecords([rec1, rec2], { status: "revision_required" });
		assert.equal(revision.length, 1);
		assert.equal(revision[0]?.id, "r2");

		// Поиск по диагнозу МКБ-10
		const searchRes = filterAuditRecords([rec1, rec2], { search: "Пульпит" });
		assert.equal(searchRes.length, 1);
		assert.equal(searchRes[0]?.id, "r2");
	});
});

describe("ClinicalAuditBoard Engine — Statutory Order 804n & Anesthesia Analysis", () => {
	it("isValidOrder804nServiceCode correctly validates Russian medical nomenclature codes", () => {
		// Valid 804n codes
		assert.equal(isValidOrder804nServiceCode("A16.07.002"), true);
		assert.equal(isValidOrder804nServiceCode("A16.07.002.001"), true);
		assert.equal(isValidOrder804nServiceCode("B01.003.004.001"), true);
		assert.equal(isValidOrder804nServiceCode("A11.07.012"), true);
		assert.equal(isValidOrder804nServiceCode("A06.07.004"), true);

		// Invalid codes
		assert.equal(isValidOrder804nServiceCode("12345"), false);
		assert.equal(isValidOrder804nServiceCode("C16.07"), false);
		assert.equal(isValidOrder804nServiceCode(""), false);
		assert.equal(isValidOrder804nServiceCode(null), false);
		assert.equal(isValidOrder804nServiceCode(undefined), false);
	});

	it("isValidIcd10Code validates dental ICD-10 diagnosis codes", () => {
		assert.equal(isValidIcd10Code("K02.1"), true);
		assert.equal(isValidIcd10Code("K04.0"), true);
		assert.equal(isValidIcd10Code("K05.3"), true);
		assert.equal(isValidIcd10Code("Z01.2"), true);

		assert.equal(isValidIcd10Code("123"), false);
		assert.equal(isValidIcd10Code(""), false);
	});

	it("analyzeAnesthesiaProtocol evaluates drug name, volume, dosage, and batch series", () => {
		const diaryWithFullAnesthesia = {
			visitDate: "2026-09-01",
			visitNumber: 1,
			subjectiveComplaints: "Боль в зубе",
			objectiveStatusLocalis: "Кариозная полость",
			procedureProtocol: "Инфильтрационная анестезия Sol. Ultracaini DS 1.7 мл (серия 250912). Препарирование.",
			anesthesiaDetails: "Ультракаин ДС 1.7 мл серия 250912",
		};

		const fullAnalysis = (analyzeAnesthesiaProtocol as any)(diaryWithFullAnesthesia);
		assert.equal(fullAnalysis.hasAnesthesiaMentioned, true);
		assert.equal(fullAnalysis.hasDrugName, true);
		assert.equal(fullAnalysis.hasDosageOrVolume, true);
		assert.equal(fullAnalysis.hasSeriesOrLot, true);
		assert.equal(fullAnalysis.isCompliant, true);

		const diaryWithDeficientAnesthesia = {
			visitDate: "2026-09-01",
			visitNumber: 1,
			procedureProtocol: "Сделана анестезия. Проведено препарирование.",
		};

		const deficientAnalysis = (analyzeAnesthesiaProtocol as any)(diaryWithDeficientAnesthesia);
		assert.equal(deficientAnalysis.hasAnesthesiaMentioned, true);
		assert.equal(deficientAnalysis.hasDrugName, false);
		assert.equal(deficientAnalysis.isCompliant, false);
	});
});

describe("ClinicalAuditBoard Engine — Return for Revision & Batch Approval", () => {
	it("returnRecordForRevision blocks submit when comment is shorter than 5 characters", () => {
		const rec = (createAuditRecord as any)({
			id: "test-rec",
			patientFullName: "Сидоров С.С.",
			status: "under_review",
			cardData: {
				passport: { primaryDiagnosisIcd10: "K02.1", primaryDiagnosisText: "Кариес" },
				anamnesis: {},
				dentalStatus: {},
				visitDiaries: [],
			},
		});

		const failResult = returnRecordForRevision(rec, { clinicalComment: "нет" });
		assert.equal(failResult.success, false);
		assert.ok(failResult.errorMessage?.includes("минимум 5 символов"));

		const passResult = returnRecordForRevision(rec, {
			clinicalComment: "Не заполнен протокол анестезии и отсутствует ИДС.",
			presetId: "DEF-ANES-01",
			auditorFullName: "Главный врач Петров П.П.",
		});
		assert.equal(passResult.success, true);
		assert.equal(passResult.record.status, "revision_required");
		assert.equal(passResult.record.cmoRemarks.length, 1);
		assert.ok(passResult.record.cmoRemarks[0]?.comment.includes("Не заполнен"));
	});

	it("batchApproveCmoRecords approves valid cards and blocks cards with critical defects", () => {
		// Valid card
		const cleanRec = (createAuditRecord as any)({
			id: "clean-01",
			patientFullName: "Васильев В.В.",
			status: "under_review",
			cardData: {
				passport: { primaryDiagnosisIcd10: "K02.1", primaryDiagnosisText: "Кариес" },
				anamnesis: {},
				dentalStatus: {},
				visitDiaries: [
					{
						visitDate: "2026-09-01",
						visitNumber: 1,
						subjectiveComplaints: "Жалобы на боли",
						objectiveStatusLocalis: "Кариозная полость глубокая",
						procedureProtocol: "Препарирование и пломбирование",
						assessmentIcd10Code: "K02.1",
						isSignedWithUkep: true,
					},
				],
			},
			attachedDocuments: [
				{ id: "d1", type: "ids_323fz", title: "ИДС", isSigned: true, signedByPatient: true, signedByDoctorUkep: true },
			],
		});

		// Defective card with unresolved critical remark
		const defectRec = (createAuditRecord as any)({
			id: "defect-02",
			patientFullName: "Николаев Н.Н.",
			status: "under_review",
			cardData: {
				passport: { primaryDiagnosisIcd10: "K04.0", primaryDiagnosisText: "Пульпит" },
				anamnesis: {},
				dentalStatus: {},
				visitDiaries: [],
			},
			cmoRemarks: [
				{
					id: "rem-1",
					defectCategoryId: "defect_no_ids",
					severity: "critical",
					defectTitle: "Отсутствует ИДС",
					defectDescription: "Критический дефект",
					affectedSection: "ids",
					createdAt: new Date().toISOString(),
					isResolved: false,
				},
			],
		});

		const batchResult = batchApproveCmoRecords([cleanRec, defectRec], ["clean-01", "defect-02"], {
			auditorFullName: "Главврач Смирнов А.А.",
			certificateThumbprint: "4A7B9C1D2E3F",
			certificateSubject: "Гл. врач Смирнов А.А.",
		});

		assert.equal(batchResult.totalRequested, 2);
		assert.equal(batchResult.approvedCount, 1);
		assert.equal(batchResult.skippedCount, 1);
		assert.equal(batchResult.errors.length, 1);
		assert.ok(batchResult.errors[0]?.reason.includes("критические замечания"));

		const approvedClean = batchResult.approvedRecords.find((r) => r.id === "clean-01");
		assert.equal(approvedClean?.status, "approved_by_cmo");
		assert.ok(approvedClean?.cmoResolution?.cmoComment.includes("Сертификат ЭЦП: Гл. врач Смирнов А.А."));
	});

	it("generateCmoAuditSummaryReport aggregates canonical stages and calculates KPIs", () => {
		const recs: any[] = [
			(createAuditRecord as any)({
				id: "r1",
				status: "approved_by_cmo",
				cardData: { passport: { primaryDiagnosisIcd10: "K02.1", primaryDiagnosisText: "Кариес" }, anamnesis: {}, dentalStatus: {}, visitDiaries: [] },
			}),
			(createAuditRecord as any)({
				id: "r2",
				status: "revision_required",
				cardData: { passport: { primaryDiagnosisIcd10: "K04.0", primaryDiagnosisText: "Пульпит" }, anamnesis: {}, dentalStatus: {}, visitDiaries: [] },
			}),
		];

		const report = generateCmoAuditSummaryReport(recs as any);
		assert.equal(report.totalAudited, 2);
		assert.equal(report.approvedCount, 1);
		assert.equal(report.rejectedCount, 1);
		assert.ok(report.averageQualityScore > 0);
	});

});
