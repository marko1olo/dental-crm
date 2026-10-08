/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Statutory EMR Form 043/у Completeness Evaluation (Layer 1)
 *
 * Statutory EMR Form 043/у Completeness Evaluation (0..100%):
 * 1. Complaints (Жалобы, Subjective) — 15% (Приказы 1030 / 834н)
 * 2. Anamnesis (Анамнез, Objective) — 15% (Приказ 834н, аллергии, соматика)
 * 3. Dental Formula (Зубная формула, FDI) — 15% (Клин. рек. СтАР)
 * 4. ICD-10 Diagnosis (Диагноз МКБ-10, K00-K14) — 15%
 * 5. Treatment Plan & Protocol (План лечения / Дневник SOAP) — 15% (Приказ 834н)
 * 6. Services Rendered (Наряд-заказ 804н) — 15% (Приказ Минздрава РФ 804н)
 * 7. Doctor Signature (Подпись врача / ПЭП 63-ФЗ) — 10% (63-ФЗ ст. 9 + Приказ 947н)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type {
	DoctorShiftServiceItem,
	Emr043CardStatus,
} from "../../doctor-portal/doctorShiftEngine.js";

export const emr043SectionIdSchema = z.enum([
	"complaints",
	"anamnesis",
	"dental_formula",
	"icd10_diagnosis",
	"treatment_plan",
	"services_rendered",
	"doctor_signature",
]);
export type Emr043SectionId = z.infer<typeof emr043SectionIdSchema>;

export interface Emr043SectionConfig {
	readonly sectionId: Emr043SectionId;
	readonly nameRu: string;
	readonly weightPercent: number;
	readonly isMandatoryForSigning: boolean;
	readonly statutoryBasisRu: string;
}

export const EMR_043_SECTIONS_CONFIG: readonly Emr043SectionConfig[] = [
	{
		sectionId: "complaints",
		nameRu: "Жалобы пациента (Subjective)",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Приказ Минздрава СССР № 1030 / Приказ Минздрава РФ № 834н",
	},
	{
		sectionId: "anamnesis",
		nameRu: "Анамнез заболевания и жизни",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Приказ Минздрава РФ № 834н, учет аллергий и соматики",
	},
	{
		sectionId: "dental_formula",
		nameRu: "Зубная формула (FDI 11-48 / 51-85)",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Клинические рекомендации СтАР, формула зубов и индексы",
	},
	{
		sectionId: "icd10_diagnosis",
		nameRu: "Диагноз по МКБ-10",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "МКБ-10 (Класс XI, K00–K14 Болезни органов пищеварения)",
	},
	{
		sectionId: "treatment_plan",
		nameRu: "План лечения и протокол манипуляций",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Приказ Минздрава РФ № 834н, дневник SOAP",
	},
	{
		sectionId: "services_rendered",
		nameRu: "Наряд-заказ / оказанные услуги (Номенклатура 804н)",
		weightPercent: 15,
		isMandatoryForSigning: true,
		statutoryBasisRu: "Приказ Минздрава РФ № 804н от 13.10.2017",
	},
	{
		sectionId: "doctor_signature",
		nameRu: "Подпись врача (ПЭП / 63-ФЗ)",
		weightPercent: 10,
		isMandatoryForSigning: false,
		statutoryBasisRu: "Федеральный закон № 63-ФЗ ст. 9 (ПЭП) + Приказ 947н",
	},
] as const;

export const emr043SectionEvaluationSchema = z.object({
	sectionId: emr043SectionIdSchema,
	nameRu: z.string(),
	weightPercent: z.number().int().min(1).max(100),
	isComplete: z.boolean(),
	earnedScore: z.number().int().min(0).max(100),
	missingDetailsRu: z.array(z.string()),
});
export type Emr043SectionEvaluation = z.infer<typeof emr043SectionEvaluationSchema>;

export const emr043CompletenessResultSchema = z.object({
	totalScore: z.number().int().min(0).max(100),
	readinessStatus: z.enum([
		"incomplete",
		"draft",
		"ready_for_signing",
		"fully_signed",
	]),
	isReadyForSigning: z.boolean(),
	isFullySigned: z.boolean(),
	sections: z.array(emr043SectionEvaluationSchema),
	missingSectionsCount: z.number().int().min(0),
	blockingIssuesRu: z.array(z.string()),
	evaluationSummaryRu: z.string(),
});
export type Emr043CompletenessResult = z.infer<typeof emr043CompletenessResultSchema>;

export interface Emr043CardEvaluationInput {
	readonly chiefComplaint?: string | null | undefined;
	readonly subjectiveComplaints?: string | null | undefined;
	readonly historyOfPresentIllness?: string | null | undefined;
	readonly allergologicalHistory?: string | null | undefined;
	readonly concomitantDiseases?: string | null | undefined;
	readonly odontogramTeeth?: readonly any[] | null | undefined;
	readonly diagnosisTooth?: string | null | undefined;
	readonly diagnosisIcd10?: string | null | undefined;
	readonly treatmentDescription?: string | null | undefined;
	readonly generalTreatmentPlan?: string | null | undefined;
	readonly procedureProtocol?: string | null | undefined;
	readonly services?: readonly DoctorShiftServiceItem[] | null | undefined;
	readonly servicesCount?: number | null | undefined;
	readonly emrCard043uStatus?: Emr043CardStatus | null | undefined;
	readonly emrSignedAtIso?: string | null | undefined;
	readonly emrPepProtocolHash?: string | null | undefined;
}

/**
 * Evaluates the statutory completeness of Form 043/у outpatient card (0..100%).
 * Inspects all 7 core medical sections with zero loose assumptions.
 */
export function evaluateEmr043Completeness(
	input: Emr043CardEvaluationInput,
): Emr043CompletenessResult {
	const sections: Emr043SectionEvaluation[] = [];
	const blockingIssuesRu: string[] = [];

	// 1. Complaints (Жалобы) — 15%
	const complaintsText = (input.chiefComplaint || input.subjectiveComplaints || "").trim();
	const isComplaintsComplete = complaintsText.length >= 3;
	const complaintsMissing: string[] = [];
	if (!isComplaintsComplete) {
		complaintsMissing.push("Не заполнены субъективные жалобы пациента");
		blockingIssuesRu.push("Отсутствуют жалобы пациента (Раздел 1 ф. 043/у)");
	}
	sections.push({
		sectionId: "complaints",
		nameRu: "Жалобы пациента (Subjective)",
		weightPercent: 15,
		isComplete: isComplaintsComplete,
		earnedScore: isComplaintsComplete ? 15 : 0,
		missingDetailsRu: complaintsMissing,
	});

	// 2. Anamnesis (Анамнез) — 15%
	const anamnesisText = [
		input.historyOfPresentIllness,
		input.allergologicalHistory,
		input.concomitantDiseases,
	]
		.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
		.join(" ")
		.trim();
	const isAnamnesisComplete = anamnesisText.length >= 5;
	const anamnesisMissing: string[] = [];
	if (!isAnamnesisComplete) {
		anamnesisMissing.push("Не указан анамнез заболевания или аллергологический статус");
		blockingIssuesRu.push("Отсутствует анамнез настоящего заболевания (Раздел 2 ф. 043/у)");
	}
	sections.push({
		sectionId: "anamnesis",
		nameRu: "Анамнез заболевания и жизни",
		weightPercent: 15,
		isComplete: isAnamnesisComplete,
		earnedScore: isAnamnesisComplete ? 15 : 0,
		missingDetailsRu: anamnesisMissing,
	});

	// 3. Dental Formula (Зубная формула) — 15%
	const hasOdontogram = Array.isArray(input.odontogramTeeth) && input.odontogramTeeth.length > 0;
	const hasToothDiagnosis = typeof input.diagnosisTooth === "string" && input.diagnosisTooth.trim().length > 0;
	const isFormulaComplete = hasOdontogram || hasToothDiagnosis;
	const formulaMissing: string[] = [];
	if (!isFormulaComplete) {
		formulaMissing.push("Не отмечен причинный зуб или отсутствует зубная формула FDI");
		blockingIssuesRu.push("Не заполнена зубная формула / статус зуба (Раздел 3 ф. 043/у)");
	}
	sections.push({
		sectionId: "dental_formula",
		nameRu: "Зубная формула (FDI 11-48 / 51-85)",
		weightPercent: 15,
		isComplete: isFormulaComplete,
		earnedScore: isFormulaComplete ? 15 : 0,
		missingDetailsRu: formulaMissing,
	});

	// 4. Diagnosis ICD-10 (Диагноз по МКБ-10) — 15%
	const icd10 = (input.diagnosisIcd10 || "").trim();
	const isIcd10Complete = /^K\d{2}(\.\d{1,2})?$/i.test(icd10) || icd10.length >= 3;
	const icd10Missing: string[] = [];
	if (!isIcd10Complete) {
		icd10Missing.push("Не указан клинический диагноз по МКБ-10 (рубрика K00-K14)");
		blockingIssuesRu.push("Отсутствует диагноз по МКБ-10 (Раздел 4 ф. 043/у)");
	}
	sections.push({
		sectionId: "icd10_diagnosis",
		nameRu: "Диагноз по МКБ-10",
		weightPercent: 15,
		isComplete: isIcd10Complete,
		earnedScore: isIcd10Complete ? 15 : 0,
		missingDetailsRu: icd10Missing,
	});

	// 5. Treatment Plan & Protocol (План лечения / Протокол) — 15%
	const treatmentText = (
		input.treatmentDescription ||
		input.generalTreatmentPlan ||
		input.procedureProtocol ||
		""
	).trim();
	const isTreatmentComplete = treatmentText.length >= 5;
	const treatmentMissing: string[] = [];
	if (!isTreatmentComplete) {
		treatmentMissing.push("Не описан протокол манипуляций или план лечения");
		blockingIssuesRu.push("Не заполнен протокол лечения / план (Раздел 5 ф. 043/у)");
	}
	sections.push({
		sectionId: "treatment_plan",
		nameRu: "План лечения и протокол манипуляций",
		weightPercent: 15,
		isComplete: isTreatmentComplete,
		earnedScore: isTreatmentComplete ? 15 : 0,
		missingDetailsRu: treatmentMissing,
	});

	// 6. Rendered Services 804n (Наряд-заказ) — 15%
	const hasServices =
		(Array.isArray(input.services) && input.services.length > 0) ||
		(typeof input.servicesCount === "number" && input.servicesCount > 0);
	const servicesMissing: string[] = [];
	if (!hasServices) {
		servicesMissing.push("В наряд-заказ не добавлено ни одной медицинской услуги");
		blockingIssuesRu.push("Отсутствуют медицинские услуги в наряд-заказе (Приказ 804н)");
	}
	sections.push({
		sectionId: "services_rendered",
		nameRu: "Наряд-заказ / оказанные услуги (Номенклатура 804н)",
		weightPercent: 15,
		isComplete: hasServices,
		earnedScore: hasServices ? 15 : 0,
		missingDetailsRu: servicesMissing,
	});

	// 7. Doctor Signature (Подпись врача / ПЭП) — 10%
	const isSigned =
		input.emrCard043uStatus === "signed" ||
		(Boolean(input.emrSignedAtIso) && Boolean(input.emrPepProtocolHash));
	const signatureMissing: string[] = [];
	if (!isSigned) {
		signatureMissing.push("Карта не заверена подписью врача (ПЭП 63-ФЗ)");
	}
	sections.push({
		sectionId: "doctor_signature",
		nameRu: "Подпись врача (ПЭП / 63-ФЗ)",
		weightPercent: 10,
		isComplete: isSigned,
		earnedScore: isSigned ? 10 : 0,
		missingDetailsRu: signatureMissing,
	});

	const totalScore = sections.reduce((sum, sec) => sum + sec.earnedScore, 0);

	const clinicalSectionsComplete =
		isComplaintsComplete &&
		isAnamnesisComplete &&
		isFormulaComplete &&
		isIcd10Complete &&
		isTreatmentComplete &&
		hasServices;

	let readinessStatus: Emr043CompletenessResult["readinessStatus"] = "incomplete";
	if (isSigned && totalScore === 100) {
		readinessStatus = "fully_signed";
	} else if (clinicalSectionsComplete && totalScore >= 90) {
		readinessStatus = "ready_for_signing";
	} else if (totalScore >= 45) {
		readinessStatus = "draft";
	} else {
		readinessStatus = "incomplete";
	}

	const missingSectionsCount = sections.filter((s) => !s.isComplete).length;

	let evaluationSummaryRu = "";
	if (readinessStatus === "fully_signed") {
		evaluationSummaryRu = "ЭМК 043/у полностью заполнена и заверена подписью ПЭП (100%).";
	} else if (readinessStatus === "ready_for_signing") {
		evaluationSummaryRu = "Все клинические разделы заполнены (90%). Карта готова к заверению ПЭП.";
	} else if (readinessStatus === "draft") {
		evaluationSummaryRu = `Черновик карты заполнен на ${totalScore}%. Не заполнено ${missingSectionsCount} разд.`;
	} else {
		evaluationSummaryRu = `Критическая неполнота карты (${totalScore}%). Заполните обязательные разделы.`;
	}

	return {
		totalScore,
		readinessStatus,
		isReadyForSigning: clinicalSectionsComplete,
		isFullySigned: isSigned && totalScore === 100,
		sections,
		missingSectionsCount,
		blockingIssuesRu,
		evaluationSummaryRu,
	};
}
