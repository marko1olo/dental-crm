/**
 * cmoEmkQualityAuditEngine.test.ts
 * Unit tests for Chief Medical Officer (Главврач) EMR quality audit engine.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type CmoAuditVisitItem,
	EMK_DEFECT_TAGS_CATALOG,
	buildCmoApprovalPayload,
	buildCmoRejectionPayload,
	calculateCmoAuditSummary,
	emkDefectTagSchema,
	emkQualityStatusSchema,
	evaluateVisitForCmoAudit,
} from "../clinical/cmoEmkQualityAuditEngine.js";

describe("Wave 30 — Feature #49: CMO EMR Quality Audit Engine (cmoEmkQualityAuditEngine.ts)", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. Zod Schemas & Metadata
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Zod Schemas & Metadata", () => {
		it("1.1 validates emkQualityStatusSchema enum states", () => {
			const validStatuses = ["draft", "in_progress", "pending", "needs_correction", "approved"];
			for (const st of validStatuses) {
				assert.ok(emkQualityStatusSchema.safeParse(st).success);
			}
			assert.equal(emkQualityStatusSchema.safeParse("unknown_status").success, false);
		});

		it("1.2 validates emkDefectTagSchema enum values", () => {
			const validTags = [
				"missing_complaints",
				"missing_anamnesis",
				"missing_dental_formula",
				"missing_icd10_diagnosis",
				"missing_treatment_protocol",
				"missing_804n_services",
				"missing_pep_signature",
				"discrepancy_with_xray",
				"unreasonable_antibiotics",
				"price_discrepancy",
			];
			for (const tag of validTags) {
				assert.ok(emkDefectTagSchema.safeParse(tag).success);
			}
		});

		it("1.3 verifies EMK_DEFECT_TAGS_CATALOG completeness", () => {
			assert.equal(EMK_DEFECT_TAGS_CATALOG.length, 10);
			for (const meta of EMK_DEFECT_TAGS_CATALOG) {
				assert.ok(meta.labelRu.length > 0);
				assert.ok(meta.sectionIndex >= 1 && meta.sectionIndex <= 7);
				assert.ok(meta.severity === "critical" || meta.severity === "warning");
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. Single Visit Evaluation & Defect Detection
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Single Visit Evaluation & Defect Detection", () => {
		it("2.1 evaluates fully compliant 100% card as instant approval eligible", () => {
			const visit: CmoAuditVisitItem = {
				id: "v-101",
				organizationId: "org-1",
				patientId: "pat-1",
				patientFullName: "Алексеев Михаил Юрьевич",
				patientCardCode: "К-2026/045",
				doctorUserId: "doc-1",
				doctorFullName: "Д-р Смирнов А.П.",
				visitDateIso: "2026-08-30T10:00:00.000Z",
				status: "signed",
				qualityControlStatus: "pending",
				chiefComplaint: "Острая боль в зубе 1.6 при приеме холодной воды",
				anamnesis: "Заболел 3 дня назад, аллергологический анамнез не отягощен",
				objectiveStatus: "Зуб 1.6: глубокая кариозная полость на окклюзионной поверхности",
				diagnosis: "K04.0 Острый пульпит",
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "16",
				treatmentPlan: "Экстирпация пульпы, обработка 3-х каналов NaOCl 3%, пломбирование Calcept",
				doctorSummary: "Каналы пройдены до апекса, временная пломба Septo-pack",
				emrSignedAtIso: "2026-08-30T10:45:00.000Z",
				emrPepProtocolHash: "PEP-HASH-ABC123456",
				servicesCount: 3,
				odontogramTeeth: ["16"],
			};

			const evaluated = evaluateVisitForCmoAudit(visit);

			assert.equal(evaluated.completeness.totalScore, 100);
			assert.equal(evaluated.isCompliantWithStandards, true);
			assert.equal(evaluated.canBeApprovedInstantly, true);
			assert.equal(evaluated.detectedDefects.length, 0);
		});

		it("2.2 detects missing anamnesis and missing ICD-10 defects", () => {
			const visit: CmoAuditVisitItem = {
				id: "v-102",
				organizationId: "org-1",
				patientId: "pat-2",
				patientFullName: "Сидорова Анна Павловна",
				patientCardCode: "К-2026/088",
				doctorUserId: "doc-2",
				doctorFullName: "Д-р Кузнецова Е.В.",
				visitDateIso: "2026-08-30T11:00:00.000Z",
				status: "in_progress",
				qualityControlStatus: "pending",
				chiefComplaint: "Ноет зуб 2.1",
				anamnesis: "", // MISSING
				diagnosis: "", // MISSING
				diagnosisIcd10: "", // MISSING
				treatmentPlan: "Промыли антисептиком",
				servicesCount: 0, // MISSING
				odontogramTeeth: [],
			};

			const evaluated = evaluateVisitForCmoAudit(visit);

			assert.ok(evaluated.completeness.totalScore < 50);
			assert.equal(evaluated.isCompliantWithStandards, false);
			assert.equal(evaluated.canBeApprovedInstantly, false);
			assert.ok(evaluated.detectedDefects.includes("missing_anamnesis"));
			assert.ok(evaluated.detectedDefects.includes("missing_icd10_diagnosis"));
			assert.ok(evaluated.detectedDefects.includes("missing_804n_services"));
			assert.ok(evaluated.detectedDefects.includes("missing_pep_signature"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. Summary Metrics & Batch Calculations
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Summary Metrics & Batch Calculations", () => {
		it("3.1 computes accurate counts and average completeness across visit list", () => {
			const visits: CmoAuditVisitItem[] = [
				{
					id: "v-1",
					organizationId: "org-1",
					patientId: "pat-1",
					patientFullName: "Пациент 1",
					patientCardCode: "К-1",
					doctorUserId: "doc-1",
					doctorFullName: "Д-р Смирнов",
					visitDateIso: "2026-08-30T09:00:00Z",
					status: "signed",
					qualityControlStatus: "pending",
					chiefComplaint: "Боль в зубе 1.1",
					anamnesis: "Здоров",
					diagnosisIcd10: "K02.1",
					diagnosisTooth: "11",
					treatmentPlan: "Пломбирование зуба",
					emrSignedAtIso: "2026-08-30T09:30:00Z",
					emrPepProtocolHash: "PEP-1",
					servicesCount: 1,
					odontogramTeeth: ["11"],
				},
				{
					id: "v-2",
					organizationId: "org-1",
					patientId: "pat-2",
					patientFullName: "Пациент 2",
					patientCardCode: "К-2",
					doctorUserId: "doc-1",
					doctorFullName: "Д-р Смирнов",
					visitDateIso: "2026-08-30T10:00:00Z",
					status: "in_progress",
					qualityControlStatus: "needs_correction",
					chiefComplaint: "Осмотр",
					anamnesis: "",
					diagnosisIcd10: "",
					treatmentPlan: "",
					servicesCount: 0,
				},
				{
					id: "v-3",
					organizationId: "org-1",
					patientId: "pat-3",
					patientFullName: "Пациент 3",
					patientCardCode: "К-3",
					doctorUserId: "doc-2",
					doctorFullName: "Д-р Кузнецова",
					visitDateIso: "2026-08-30T11:00:00Z",
					status: "signed",
					qualityControlStatus: "approved",
					chiefComplaint: "Профгигиена",
					anamnesis: "Без особенностей",
					diagnosisIcd10: "K03.6",
					diagnosisTooth: "11-48",
					treatmentPlan: "AirFlow + ультразвук",
					emrSignedAtIso: "2026-08-30T11:45:00Z",
					emrPepProtocolHash: "PEP-3",
					servicesCount: 2,
					odontogramTeeth: ["11"],
				},
			];

			const summary = calculateCmoAuditSummary(visits);

			assert.equal(summary.metrics.totalVisitsCount, 3);
			assert.equal(summary.metrics.pendingReviewCount, 1);
			assert.equal(summary.metrics.needsCorrectionCount, 1);
			assert.equal(summary.metrics.approvedCount, 1);
			assert.ok(summary.metrics.averageCompletenessScore > 0);
			assert.ok(summary.metrics.instantApprovalEligibleCount >= 1);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. Decision Payloads (Approve / Reject)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Decision Payloads (Approve / Reject)", () => {
		it("4.1 builds valid approval payload", () => {
			const payload = buildCmoApprovalPayload("v-101", "cmo-1", "Главврач Кузнецова Е.В.");
			assert.equal(payload.visitId, "v-101");
			assert.equal(payload.cmoUserId, "cmo-1");
			assert.equal(payload.cmoName, "Главврач Кузнецова Е.В.");
			assert.ok(payload.approvalNote?.includes("СтАР"));
			assert.ok(Boolean(payload.approvedAtIso));
		});

		it("4.2 builds valid rejection payload with defect tags", () => {
			const payload = buildCmoRejectionPayload(
				"v-102",
				"cmo-1",
				"Главврач Кузнецова Е.В.",
				"Не указан протокол механической обработки каналов и аллергологический статус",
				["missing_anamnesis", "missing_treatment_protocol"],
			);

			assert.equal(payload.visitId, "v-102");
			assert.equal(payload.defectTags.length, 2);
			assert.ok(payload.rejectionReasonRu.includes("аллергологический статус"));
		});

		it("4.3 throws on invalid empty rejection reason", () => {
			assert.throws(() => {
				buildCmoRejectionPayload("v-103", "cmo-1", "Главврач", "", []);
			}, /мотивированное замечание/);
		});
	});
});
