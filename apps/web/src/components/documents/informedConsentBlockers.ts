export interface InformedConsentBlocker {
	field: string;
	label: string;
	hint: string;
}

export interface InformedConsentBlockersReview {
	requiredCount: number;
	blockers: InformedConsentBlocker[];
}

export interface InformedConsentBlockersInput {
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

function filled(value: string): string {
	return String(value ?? "").trim();
}

function textLines(value: string): string[] {
	return String(value ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function informedConsentBlockersReview(
	input: InformedConsentBlockersInput,
	options?: { allowBlankForPrint?: boolean; isCito?: boolean },
): InformedConsentBlockersReview {
	if (options?.allowBlankForPrint || options?.isCito) {
		return { requiredCount: 11, blockers: [] };
	}
	const area = filled(input.toothOrArea) || filled(input.inferredTreatmentArea);
	const indication = filled(input.diagnosisOrIndication) || filled(input.activeVisitComplaint);
	const doctor = filled(input.doctorFullName) || filled(input.activeDoctorFullName);

	const checks: Array<InformedConsentBlocker & { ok: boolean }> = [
		{ field: "informedConsentIntervention", label: "Планируемое вмешательство", hint: "впишите вмешательство", ok: filled(input.intervention) !== "" },
		{ field: "informedConsentToothOrArea", label: "Область или зубы", hint: "впишите номер зуба или зону", ok: area !== "" },
		{ field: "informedConsentDiagnosisOrIndication", label: "Диагноз или клиническое показание", hint: "впишите показание", ok: indication !== "" },
		{ field: "informedConsentExpectedBenefit", label: "Ожидаемая польза", hint: "впишите ожидаемую пользу", ok: filled(input.expectedBenefit) !== "" },
		{ field: "informedConsentRisks", label: "Разъясненные риски", hint: "впишите риски", ok: textLines(input.risks).length > 0 },
		{ field: "informedConsentAlternatives", label: "Альтернативы", hint: "впишите альтернативы", ok: textLines(input.alternatives).length > 0 },
		{ field: "informedConsentAftercare", label: "После вмешательства", hint: "впишите рекомендации", ok: textLines(input.aftercare).length > 0 },
		{ field: "informedConsentDoctorFullName", label: "Врач", hint: "впишите ФИО врача", ok: options?.allowBlankForPrint ? true : doctor !== "" },
		{ field: "informedConsentQuestionsAnswered", label: "Пациент получил ответы на вопросы", hint: "отметка об ответах", ok: input.questionsAnswered ?? true },
		{ field: "informedConsentRisksUnderstood", label: "Пациент понял риски, ограничения и прогноз", hint: "отметка о понимании", ok: input.risksUnderstood ?? true },
		{ field: "informedConsentWithdrawUnderstood", label: "Пациенту объяснено право отказаться", hint: "отметка о праве отказа", ok: input.withdrawUnderstood ?? true },
	];

	return {
		requiredCount: checks.length,
		blockers: checks.filter((c) => !c.ok).map(({ field, label, hint }) => ({ field, label, hint })),
	};
}
