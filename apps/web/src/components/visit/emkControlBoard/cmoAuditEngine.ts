/**
 * apps/web/src/components/visit/emkControlBoard/cmoAuditEngine.ts
 *
 * Локальный движок контроля качества заполнения ЭМК для доски мониторинга приёмов.
 */

import { z } from "zod";
import {
	type DoctorShiftServiceItem,
	type Emr043CardEvaluationInput,
	type Emr043CompletenessResult,
	evaluateEmr043Completeness,
} from "@dental/shared";

export const emkQualityStatusSchema = z.enum([
	"draft",
	"in_progress",
	"pending",
	"needs_correction",
	"approved",
]);
export type EmkQualityStatus = z.infer<typeof emkQualityStatusSchema>;

export const emkDefectTagSchema = z.enum([
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
		labelRu: "Пустой наряд-заказ / нет услуг из прейскуранта (Раздел 6)",
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
		labelRu: "Расхождение диагноза с КТ / ИИ-скринингом снимков",
		sectionIndex: 4,
		severity: "warning",
	},
	{
		tag: "unreasonable_antibiotics",
		labelRu: "Необоснованное назначение системных антибиотиков",
		sectionIndex: 5,
		severity: "warning",
	},
	{
		tag: "price_discrepancy",
		labelRu: "Расхождение стоимости манипуляций с прейскурантом",
		sectionIndex: 6,
		severity: "warning",
	},
];

export interface CmoAuditVisitItem {
	readonly id: string;
	readonly organizationId?: string | undefined;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientCardCode?: string | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly doctorUserId: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly chairName?: string | undefined;
	readonly visitDateIso?: string | undefined;
	readonly visitDateTimeIso?: string | undefined;
	readonly status?: string | undefined;
	readonly qualityControlStatus: EmkQualityStatus;
	readonly complaint?: string | null | undefined;
	readonly chiefComplaint?: string | null | undefined;
	readonly anamnesis?: string | null | undefined;
	readonly objectiveStatus?: string | null | undefined;
	readonly statusLocalis?: string | null | undefined;
	readonly dentalFormulaFilled?: boolean | undefined;
	readonly odontogramTeeth?: readonly unknown[] | null | undefined;
	readonly diagnosis?: string | null | undefined;
	readonly diagnosisIcd10?: string | null | undefined;
	readonly diagnosisTooth?: string | null | undefined;
	readonly treatmentPlan?: string | null | undefined;
	readonly treatmentDescription?: string | null | undefined;
	readonly doctorSummary?: string | null | undefined;
	readonly servicesCount?: number | undefined;
	readonly services?: readonly DoctorShiftServiceItem[] | undefined;
	readonly emrSignedAtIso?: string | null | undefined;
	readonly emrPepProtocolHash?: string | null | undefined;
	readonly cmoApprovalNote?: string | null | undefined;
	readonly cmoRejectionReason?: string | null | undefined;
	readonly cmoRemarks?: string | null | undefined;
	readonly cmoReviewedAtIso?: string | null | undefined;
	readonly cmoReviewerUserId?: string | null | undefined;
	readonly cmoReviewerName?: string | null | undefined;
	readonly cmoReviewedByName?: string | null | undefined;
	readonly cmoDefectTags?: readonly EmkDefectTag[] | undefined;
	readonly aiRadiologyDiscrepancyDetected?: boolean | undefined;
	readonly prescribedAntibiotics?: boolean | undefined;
	readonly prescribedAntibioticsJustified?: boolean | undefined;
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

export function evaluateVisitForCmoAudit(
	visit: CmoAuditVisitItem,
): CmoAuditEvaluatedVisit {
	const effectiveServicesCount = visit.servicesCount ?? (visit.services?.length || 0);

	const complaintsText = visit.complaint || visit.chiefComplaint || undefined;
	const objectiveText = visit.statusLocalis || visit.objectiveStatus || undefined;
	const treatmentText = visit.treatmentDescription || visit.treatmentPlan || undefined;
	const dentalFormulaPresent =
		visit.dentalFormulaFilled ??
		(Array.isArray(visit.odontogramTeeth) && visit.odontogramTeeth.length > 0);

	const evalInput: Emr043CardEvaluationInput = {
		chiefComplaint: complaintsText,
		subjectiveComplaints: complaintsText,
		historyOfPresentIllness: visit.anamnesis || undefined,
		odontogramTeeth: dentalFormulaPresent ? (visit.odontogramTeeth ?? [{ toothNumber: 11 }]) : [],
		diagnosisIcd10: visit.diagnosisIcd10 || undefined,
		treatmentDescription: treatmentText,
		servicesCount: effectiveServicesCount,
		emrSignedAtIso: visit.emrSignedAtIso || undefined,
		emrPepProtocolHash: visit.emrPepProtocolHash || undefined,
	};

	const completeness = evaluateEmr043Completeness(evalInput);
	const detectedDefects: EmkDefectTag[] = [];

	if (!complaintsText || complaintsText.trim().length < 5) {
		detectedDefects.push("missing_complaints");
	}
	if (!visit.anamnesis || visit.anamnesis.trim().length < 5) {
		detectedDefects.push("missing_anamnesis");
	}
	if (!dentalFormulaPresent) {
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

export function buildCmoApprovalPayload(
	visitId: string,
	cmoUserId: string,
	cmoName: string,
	approvalNote?: string,
): CmoApprovalPayload {
	return {
		visitId,
		cmoUserId,
		cmoName,
		approvalNote: approvalNote || "ЭМК проверена и соответствует клиническим рекомендациям СтАР и Приказу № 834н.",
		approvedAtIso: new Date().toISOString(),
	};
}

export function buildCmoRejectionPayload(
	visitId: string,
	cmoUserId: string,
	cmoName: string,
	rejectionReasonRu: string,
	defectTags: readonly EmkDefectTag[],
): CmoRejectionPayload {
	return {
		visitId,
		cmoUserId,
		cmoName,
		rejectionReasonRu: rejectionReasonRu.trim(),
		defectTags: defectTags.length > 0 ? defectTags : ["missing_treatment_protocol"],
		rejectedAtIso: new Date().toISOString(),
	};
}
