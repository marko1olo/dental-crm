/**
 * informedConsentGuiding.ts
 *
 * Soft Guiding & Safe Defaults Engine for Informed Consent (Mandate 8e, 8n & Anti-Blockers Law).
 */

export interface InformedConsentGuideItem {
	field: string;
	label: string;
	hint: string;
	isSoftGuide?: boolean | undefined;
}

export type InformedConsentBlocker = InformedConsentGuideItem;

export interface InformedConsentGuidanceReview {
	requiredCount: number;
	blockers: InformedConsentGuideItem[];
	canPrint: boolean;
	canSign: boolean;
	disabled: false;
	isSoftGuiding: boolean;
}

export type InformedConsentBlockersReview = InformedConsentGuidanceReview;

export interface InformedConsentGuideInput {
	intervention: string;
	toothOrArea: string;
	inferredTreatmentArea: string;
	diagnosisOrIndication: string;
	activeVisitComplaint: string;
	expectedBenefit: string;
	risks: string;
	alternatives: string;
	aftercare: string;
	doctorFullName: string;
	activeDoctorFullName: string;
	questionsAnswered?: boolean;
	risksUnderstood?: boolean;
	withdrawUnderstood?: boolean;
}

export type InformedConsentBlockersInput = InformedConsentGuideInput;

export const INFORMED_CONSENT_SAFE_DEFAULTS = {
	intervention: "Стоматологический осмотр, диагностика и согласованный объем вмешательств",
	toothOrArea: "По плану лечения",
	diagnosisOrIndication: "Санация полости рта",
	expectedBenefit: "Купирование болевого синдрома, восстановление анатомической формы и функции зубочелюстной системы",
	risks: "Кратковременная температурная или жевательная чувствительность",
	alternatives: "Отказ от медицинского вмешательства с разъяснением возможных осложнений",
	aftercare: "Соблюдение гигиены полости рта, щадящая диета, контрольный осмотр по назначению врача",
	doctorFullName: "Лечащий врач-стоматолог",
} as const;

export function resolveInformedConsentSafeDefaults(
	input: Partial<InformedConsentGuideInput>,
): InformedConsentGuideInput {
	return {
		intervention: filled(input.intervention) || INFORMED_CONSENT_SAFE_DEFAULTS.intervention,
		toothOrArea: filled(input.toothOrArea) || filled(input.inferredTreatmentArea) || INFORMED_CONSENT_SAFE_DEFAULTS.toothOrArea,
		inferredTreatmentArea: input.inferredTreatmentArea || "",
		diagnosisOrIndication: filled(input.diagnosisOrIndication) || filled(input.activeVisitComplaint) || INFORMED_CONSENT_SAFE_DEFAULTS.diagnosisOrIndication,
		activeVisitComplaint: input.activeVisitComplaint || "",
		expectedBenefit: filled(input.expectedBenefit) || INFORMED_CONSENT_SAFE_DEFAULTS.expectedBenefit,
		risks: filled(input.risks) || INFORMED_CONSENT_SAFE_DEFAULTS.risks,
		alternatives: filled(input.alternatives) || INFORMED_CONSENT_SAFE_DEFAULTS.alternatives,
		aftercare: filled(input.aftercare) || INFORMED_CONSENT_SAFE_DEFAULTS.aftercare,
		doctorFullName: filled(input.doctorFullName) || filled(input.activeDoctorFullName) || INFORMED_CONSENT_SAFE_DEFAULTS.doctorFullName,
		activeDoctorFullName: input.activeDoctorFullName || "",
		questionsAnswered: input.questionsAnswered ?? true,
		risksUnderstood: input.risksUnderstood ?? true,
		withdrawUnderstood: input.withdrawUnderstood ?? true,
	};
}

function filled(value: unknown): string { return String(value ?? "").trim(); }
function textLines(value: string): string[] { return String(value ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean); }

export function informedConsentGuidanceReview(
	input: InformedConsentGuideInput,
	options?: { allowBlankForPrint?: boolean; isCito?: boolean },
): InformedConsentGuidanceReview {
	if (options?.allowBlankForPrint || options?.isCito) {
		return { requiredCount: 11, blockers: [], canPrint: true, canSign: true, disabled: false, isSoftGuiding: true };
	}
	const area = filled(input.toothOrArea) || filled(input.inferredTreatmentArea);
	const indication = filled(input.diagnosisOrIndication) || filled(input.activeVisitComplaint);
	const doctor = filled(input.doctorFullName) || filled(input.activeDoctorFullName);

	const checks: Array<InformedConsentGuideItem & { ok: boolean }> = [
		{ field: "informedConsentIntervention", label: "Планируемое вмешательство", hint: "рекомендуется указать вмешательство (по умолчанию: по плану лечения)", isSoftGuide: true, ok: filled(input.intervention) !== "" },
		{ field: "informedConsentToothOrArea", label: "Область или зубы", hint: "рекомендуется указать номер зуба или зону (по умолчанию: полость рта)", isSoftGuide: true, ok: area !== "" },
		{ field: "informedConsentDiagnosisOrIndication", label: "Диагноз или клиническое показание", hint: "рекомендуется указать показание (по умолчанию: санация полости рта)", isSoftGuide: true, ok: indication !== "" },
		{ field: "informedConsentExpectedBenefit", label: "Ожидаемая польза", hint: "рекомендуется указать ожидаемую пользу", isSoftGuide: true, ok: filled(input.expectedBenefit) !== "" },
		{ field: "informedConsentRisks", label: "Разъясненные риски", hint: "рекомендуется указать риски", isSoftGuide: true, ok: textLines(input.risks).length > 0 },
		{ field: "informedConsentAlternatives", label: "Альтернативы", hint: "рекомендуется указать альтернативы", isSoftGuide: true, ok: textLines(input.alternatives).length > 0 },
		{ field: "informedConsentAftercare", label: "После вмешательства", hint: "рекомендуется указать рекомендации", isSoftGuide: true, ok: textLines(input.aftercare).length > 0 },
		{ field: "informedConsentDoctorFullName", label: "Врач", hint: "рекомендуется указать ФИО врача", isSoftGuide: true, ok: options?.allowBlankForPrint ? true : doctor !== "" },
		{ field: "informedConsentQuestionsAnswered", label: "Пациент получил ответы на вопросы", hint: "рекомендуется отметить ответы", isSoftGuide: true, ok: input.questionsAnswered ?? true },
		{ field: "informedConsentRisksUnderstood", label: "Пациент понял риски, ограничения и прогноз", hint: "рекомендуется отметить понимание", isSoftGuide: true, ok: input.risksUnderstood ?? true },
		{ field: "informedConsentWithdrawUnderstood", label: "Пациенту объяснено право отказаться", hint: "рекомендуется отметить право отказа", isSoftGuide: true, ok: input.withdrawUnderstood ?? true },
	];

	return {
		requiredCount: checks.length,
		blockers: checks.filter((c) => !c.ok).map(({ field, label, hint, isSoftGuide }) => ({ field, label, hint, isSoftGuide })),
		canPrint: true,
		canSign: true,
		disabled: false,
		isSoftGuiding: true,
	};
}

export const informedConsentBlockersReview = informedConsentGuidanceReview;
