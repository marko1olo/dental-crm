/**
 * cmoEmkQualityAuditEngine.ts
 * Shared clinical audit and EMR Form 043/u quality control engine for the Chief Medical Officer (Главный врач).
 *
 * Statutory & Quality Standards:
 * - Order of the USSR Ministry of Health No. 1030 / Order of the RF Ministry of Health No. 834n (Form 043/u).
 * - Federal Law No. 323-FZ "On Fundamentals of Health Protection of Citizens in the Russian Federation" (Art. 64 - Quality and Safety Control of Medical Care).
 * - Federal Law No. 63-FZ "On Electronic Digital Signatures" (Art. 9 - Simple Electronic Signature PEP).
 * - Nomenclature of Medical Services (Order No. 804n).
 * - ICD-10 Class XI (Stomatological codes K00–K14).
 * - Clinical recommendations of the Dental Association of Russia (СтАР).
 */

import { z } from "zod";
import {
	type DoctorShiftServiceItem,
	type Emr043CardEvaluationInput,
	type Emr043CompletenessResult,
	evaluateEmr043Completeness,
} from "../doctor/doctorShiftCockpitEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD SCHEMAS & CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export const emkQualityStatusSchema = z.enum([
	"draft", // Не заполнен / черновик (< 50% готовности)
	"in_progress", // В работе у лечащего врача
	"pending", // На проверке у Главного врача
	"needs_correction", // Возвращено на доработку с замечаниями
	"approved", // Утверждено Главным врачом
]);
export type EmkQualityStatus = z.infer<typeof emkQualityStatusSchema>;

export const emkDefectTagSchema = z.enum([
	"missing_complaints", // Отсутствуют субъективные жалобы
	"missing_anamnesis", // Не собран анамнез жизни/заболевания, нет аллергостатуса
	"missing_dental_formula", // Не заполнена зубная формула FDI
	"missing_icd10_diagnosis", // Отсутствует диагноз по МКБ-10 (K00-K14)
	"missing_treatment_protocol", // Нет протокола манипуляций SOAP
	"missing_804n_services", // Наряд-заказ пуст, нет услуг по Номенклатуре 804н
	"missing_pep_signature", // Нет подписи врача (ПЭП)
	"discrepancy_with_xray", // Расхождение диагноза с рентгенологической картиной (Diagnocat/КЛКТ)
	"unreasonable_antibiotics", // Необоснованное назначение антибиотиков без показаний
	"price_discrepancy", // Несоответствие суммы наряда прейскуранту клиники
]);
export type EmkDefectTag = z.infer<typeof emkDefectTagSchema>;

export interface EmkDefectTagMeta {
	readonly tag: EmkDefectTag;
	readonly labelRu: string;
	readonly sectionIndex: number;
	readonly severity: "critical" | "warning";
}

export const EMK_DEFECT_TAGS_CATALOG: readonly EmkDefectTagMeta[] = [
	{
		tag: "missing_complaints",
		labelRu: "Не заполнены жалобы пациента (Раздел 1)",
		sectionIndex: 1,
		severity: "critical",
	},
	{
		tag: "missing_anamnesis",
		labelRu: "Отсутствует анамнез / аллергостатус (Раздел 2)",
		sectionIndex: 2,
		severity: "critical",
	},
	{
		tag: "missing_dental_formula",
		labelRu: "Не заполнена зубная формула FDI (Раздел 3)",
		sectionIndex: 3,
		severity: "critical",
	},
	{
		tag: "missing_icd10_diagnosis",
		labelRu: "Нет диагноза по МКБ-10 (Раздел 4)",
		sectionIndex: 4,
		severity: "critical",
	},
	{
		tag: "missing_treatment_protocol",
		labelRu: "Не описан протокол манипуляций (Раздел 5)",
		sectionIndex: 5,
		severity: "critical",
	},
	{
		tag: "missing_804n_services",
		labelRu: "Пустой наряд-заказ / нет услуг 804н (Раздел 6)",
		sectionIndex: 6,
		severity: "critical",
	},
	{
		tag: "missing_pep_signature",
		labelRu: "Карта не подписана врачом ПЭП (Раздел 7)",
		sectionIndex: 7,
		severity: "critical",
	},
	{
		tag: "discrepancy_with_xray",
		labelRu: "Расхождение диагноза с КТ/Diagnocat AI",
		sectionIndex: 4,
		severity: "warning",
	},
	{
		tag: "unreasonable_antibiotics",
		labelRu: "Необоснованное назначение антибактериальной терапии",
		sectionIndex: 5,
		severity: "warning",
	},
	{
		tag: "price_discrepancy",
		labelRu: "Несоответствие наряда плану лечения",
		sectionIndex: 6,
		severity: "warning",
	},
] as const;

export interface CmoAuditVisitItem {
	readonly id: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientCardCode: string;
	readonly patientBirthDate?: string | null;
	readonly patientPhone?: string | null;
	readonly doctorUserId: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | null;
	readonly chairName?: string | null;
	readonly visitDateIso: string;
	readonly status: "draft" | "in_progress" | "signed" | "completed" | "cancelled";
	readonly qualityControlStatus: EmkQualityStatus;
	readonly chiefComplaint?: string | null;
	readonly anamnesis?: string | null;
	readonly objectiveStatus?: string | null;
	readonly diagnosis?: string | null;
	readonly diagnosisIcd10?: string | null;
	readonly diagnosisTooth?: string | null;
	readonly treatmentPlan?: string | null;
	readonly doctorSummary?: string | null;
	readonly emrSignedAtIso?: string | null;
	readonly emrPepProtocolHash?: string | null;
	readonly cmoReviewedAtIso?: string | null;
	readonly cmoReviewedByUserId?: string | null;
	readonly cmoReviewedByName?: string | null;
	readonly cmoRemarks?: string | null;
	readonly cmoDefectTags?: readonly EmkDefectTag[];
	readonly totalRevenueKop?: number;
	readonly servicesCount?: number;
	readonly services?: readonly DoctorShiftServiceItem[];
	readonly odontogramTeeth?: readonly string[];
	readonly aiReportsCount?: number;
}

export interface CmoAuditEvaluatedVisit extends CmoAuditVisitItem {
	readonly completeness: Emr043CompletenessResult;
	readonly isCompliantWithStandards: boolean;
	readonly canBeApprovedInstantly: boolean;
	readonly detectedDefects: readonly EmkDefectTag[];
}

export interface CmoAuditSummaryMetrics {
	readonly totalVisitsCount: number;
	readonly pendingReviewCount: number;
	readonly needsCorrectionCount: number;
	readonly approvedCount: number;
	readonly draftIncompleteCount: number;
	readonly averageCompletenessScore: number;
	readonly complianceRatePercent: number;
	readonly instantApprovalEligibleCount: number;
	readonly criticalDefectsCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CORE EVALUATION & AUTOMATIC DEFECT DETECTION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates a single visit for CMO quality control audit.
 */
export function evaluateVisitForCmoAudit(
	visit: CmoAuditVisitItem,
): CmoAuditEvaluatedVisit {
	const effectiveServicesCount = visit.servicesCount ?? (visit.services ? visit.services.length : 0);

	const evalInput: Emr043CardEvaluationInput = {
		chiefComplaint: visit.chiefComplaint || "",
		historyOfPresentIllness: visit.anamnesis || "",
		diagnosisTooth: visit.diagnosisTooth || "",
		diagnosisIcd10: visit.diagnosisIcd10 || (visit.diagnosis?.split(" ")[0] || ""),
		treatmentDescription: [visit.treatmentPlan, visit.doctorSummary].filter(Boolean).join(" "),
		services: visit.services,
		servicesCount: effectiveServicesCount,
		emrCard043uStatus: visit.emrSignedAtIso ? "signed" : "draft",
		emrSignedAtIso: visit.emrSignedAtIso || null,
		emrPepProtocolHash: visit.emrPepProtocolHash || null,
		odontogramTeeth: visit.odontogramTeeth || [],
	};

	const completeness = evaluateEmr043Completeness(evalInput);

	// Detect automated defects based on clinical rules
	const detectedDefects: EmkDefectTag[] = [];

	if (!evalInput.chiefComplaint || evalInput.chiefComplaint.trim().length < 5) {
		detectedDefects.push("missing_complaints");
	}
	if (!evalInput.historyOfPresentIllness || evalInput.historyOfPresentIllness.trim().length < 5) {
		detectedDefects.push("missing_anamnesis");
	}
	if (!evalInput.diagnosisTooth && (evalInput.odontogramTeeth?.length ?? 0) === 0) {
		detectedDefects.push("missing_dental_formula");
	}
	if (!evalInput.diagnosisIcd10 || !/^K\d{2}/i.test(evalInput.diagnosisIcd10)) {
		detectedDefects.push("missing_icd10_diagnosis");
	}
	if (!evalInput.treatmentDescription || evalInput.treatmentDescription.trim().length < 5) {
		detectedDefects.push("missing_treatment_protocol");
	}
	if (effectiveServicesCount === 0) {
		detectedDefects.push("missing_804n_services");
	}
	if (!visit.emrSignedAtIso && !visit.emrPepProtocolHash) {
		detectedDefects.push("missing_pep_signature");
	}

	const isCompliantWithStandards = completeness.totalScore >= 85 && detectedDefects.length === 0;
	const canBeApprovedInstantly = completeness.totalScore >= 90 && visit.qualityControlStatus === "pending";

	return {
		...visit,
		completeness,
		isCompliantWithStandards,
		canBeApprovedInstantly,
		detectedDefects,
	};
}

/**
 * Evaluates a list of visits and calculates aggregate CMO audit metrics.
 */
export function calculateCmoAuditSummary(
	visits: readonly CmoAuditVisitItem[],
): {
	evaluatedVisits: CmoAuditEvaluatedVisit[];
	metrics: CmoAuditSummaryMetrics;
} {
	const evaluatedVisits = visits.map(evaluateVisitForCmoAudit);

	const totalVisitsCount = evaluatedVisits.length;
	let pendingReviewCount = 0;
	let needsCorrectionCount = 0;
	let approvedCount = 0;
	let draftIncompleteCount = 0;
	let totalScoreSum = 0;
	let compliantCount = 0;
	let instantApprovalEligibleCount = 0;
	let criticalDefectsCount = 0;

	for (const v of evaluatedVisits) {
		totalScoreSum += v.completeness.totalScore;

		if (v.qualityControlStatus === "pending") pendingReviewCount++;
		else if (v.qualityControlStatus === "needs_correction") needsCorrectionCount++;
		else if (v.qualityControlStatus === "approved") approvedCount++;
		else if (v.qualityControlStatus === "draft" || v.qualityControlStatus === "in_progress") {
			draftIncompleteCount++;
		}

		if (v.isCompliantWithStandards) compliantCount++;
		if (v.canBeApprovedInstantly) instantApprovalEligibleCount++;
		criticalDefectsCount += v.detectedDefects.length;
	}

	const averageCompletenessScore = totalVisitsCount > 0 ? Math.round(totalScoreSum / totalVisitsCount) : 0;
	const complianceRatePercent = totalVisitsCount > 0 ? Math.round((compliantCount / totalVisitsCount) * 100) : 0;

	return {
		evaluatedVisits,
		metrics: {
			totalVisitsCount,
			pendingReviewCount,
			needsCorrectionCount,
			approvedCount,
			draftIncompleteCount,
			averageCompletenessScore,
			complianceRatePercent,
			instantApprovalEligibleCount,
			criticalDefectsCount,
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CMO DECISION PROTOCOLS (APPROVE / REJECT / BATCH)
// ─────────────────────────────────────────────────────────────────────────────

export interface CmoApprovalPayload {
	readonly visitId: string;
	readonly cmoUserId: string;
	readonly cmoName: string;
	readonly approvalNote?: string | null;
	readonly approvedAtIso: string;
}

export interface CmoRejectionPayload {
	readonly visitId: string;
	readonly cmoUserId: string;
	readonly cmoName: string;
	readonly rejectionReasonRu: string;
	readonly defectTags: readonly EmkDefectTag[];
	readonly rejectedAtIso: string;
}

/**
 * Builds standard approval payload for CMO EMR verification.
 */
export function buildCmoApprovalPayload(
	visitId: string,
	cmoUserId: string,
	cmoName: string,
	approvalNote?: string,
): CmoApprovalPayload {
	if (!visitId || !cmoUserId || !cmoName) {
		throw new Error("Не указаны обязательные идентификаторы для утверждения ЭМК Главврачом");
	}
	return {
		visitId,
		cmoUserId,
		cmoName,
		approvalNote: approvalNote || "ЭМК проверена и соответствует клиническим рекомендациям СтАР и Приказу № 834н.",
		approvedAtIso: new Date().toISOString(),
	};
}

/**
 * Builds rejection with remarks payload for CMO EMR verification.
 */
export function buildCmoRejectionPayload(
	visitId: string,
	cmoUserId: string,
	cmoName: string,
	rejectionReasonRu: string,
	defectTags: readonly EmkDefectTag[],
): CmoRejectionPayload {
	if (!visitId || !cmoUserId || !cmoName || !rejectionReasonRu.trim()) {
		throw new Error("Для возврата карты на доработку необходимо указать мотивированное замечание Главврача.");
	}
	return {
		visitId,
		cmoUserId,
		cmoName,
		rejectionReasonRu: rejectionReasonRu.trim(),
		defectTags: defectTags.length > 0 ? defectTags : ["missing_treatment_protocol"],
		rejectedAtIso: new Date().toISOString(),
	};
}
