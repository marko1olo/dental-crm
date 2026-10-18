export interface PaidContractMissingField {
	field: string;
	label: string;
	hint: string;
}

export interface PaidContractRequiredFieldsInput {
	contractNumber: string;
	serviceStart: string;
	serviceEnd: string;
	customerFullName: string;
	patientFullName: string;
	careReason: string;
	visitComplaint: string;
	serviceScope: string;
	visitTreatmentPlan: string;
	visitDoctorSummary: string;
	totalRub: number;
	paymentTerms: string;
	priceChangeRules: string;
	freeCareNotice: string;
	recommendationWarning: string;
	refundTerms: string;
	warrantyTerms: string;
	doctorFullName: string;
	activeDoctorFullName: string;
	clinicInfoConfirmed: boolean;
	serviceListConfirmed: boolean;
	paidBasisConfirmed: boolean;
	writtenChangesConfirmed: boolean;
}

export interface PaidContractRequiredFieldsReview {
	requiredCount: number;
	missing: PaidContractMissingField[];
}

export interface PaidContractRequiredFieldsOptions {
	allowBlankForPrint?: boolean;
}

const CARE_REASON_FALLBACK = "плановое стоматологическое лечение по результатам осмотра";

function filled(value: string): string {
	return String(value ?? "").trim();
}

export function paidContractRequiredFieldsReview(
	input: PaidContractRequiredFieldsInput,
	options?: PaidContractRequiredFieldsOptions,
): PaidContractRequiredFieldsReview {
	const customer = filled(input.customerFullName) || filled(input.patientFullName);
	const careReason = filled(input.careReason) || filled(input.visitComplaint) || CARE_REASON_FALLBACK;
	const serviceScope = filled(input.serviceScope) || filled(input.visitTreatmentPlan) || filled(input.visitDoctorSummary);
	const doctor = filled(input.doctorFullName) || filled(input.activeDoctorFullName);

	const checks: Array<PaidContractMissingField & { ok: boolean }> = [
		{ field: "paidContractNumber", label: "Номер договора", hint: "номер по журналу договоров", ok: filled(input.contractNumber) !== "" },
		{ field: "paidContractServiceStart", label: "Начало оказания", hint: "дата первого этапа", ok: filled(input.serviceStart) !== "" },
		{ field: "paidContractServiceEnd", label: "Завершение", hint: "дата окончания или до акта", ok: filled(input.serviceEnd) !== "" },
		{ field: "paidContractCustomerFullName", label: "Заказчик", hint: "ФИО заказчика", ok: customer !== "" },
		{ field: "paidContractCareReason", label: "Основание обращения", hint: "жалоба или диагноз", ok: careReason !== "" },
		{ field: "paidContractServiceScope", label: "Состав услуг", hint: "перечень согласованных услуг", ok: serviceScope !== "" },
		{ field: "paidContractTotalRub", label: "Сумма договора", hint: "стоимость цифрами", ok: options?.allowBlankForPrint ? input.totalRub >= 0 : input.totalRub > 0 },
		{ field: "paidContractPaymentTerms", label: "Порядок оплаты", hint: "условия оплаты", ok: filled(input.paymentTerms) !== "" },
		{ field: "paidContractPriceChangeRules", label: "Изменение цены и объема", hint: "правила изменения цен", ok: filled(input.priceChangeRules) !== "" },
		{ field: "paidContractFreeCareNotice", label: "Уведомление о бесплатной помощи", hint: "разъяснение госгарантий", ok: filled(input.freeCareNotice) !== "" },
		{ field: "paidContractRecommendationWarning", label: "Предупреждение о рекомендациях", hint: "последствия нарушения режима", ok: filled(input.recommendationWarning) !== "" },
		{ field: "paidContractRefundTerms", label: "Отказ и возврат", hint: "порядок возврата", ok: filled(input.refundTerms) !== "" },
		{ field: "paidContractWarrantyTerms", label: "Гарантия и претензии", hint: "гарантийный срок", ok: filled(input.warrantyTerms) !== "" },
		{ field: "paidContractDoctorFullName", label: "Ответственный врач", hint: "ФИО врача", ok: options?.allowBlankForPrint ? true : doctor !== "" },
		{ field: "paidContractClinicInfoConfirmed", label: "Сведения о клинике переданы", hint: "отметка", ok: input.clinicInfoConfirmed },
		{ field: "paidContractServiceListConfirmed", label: "Перечень услуг передан", hint: "отметка", ok: input.serviceListConfirmed },
		{ field: "paidContractPaidBasisConfirmed", label: "Платная основа понятна", hint: "отметка", ok: input.paidBasisConfirmed },
		{ field: "paidContractWrittenChangesConfirmed", label: "Письменные изменения согласованы", hint: "отметка", ok: input.writtenChangesConfirmed },
	];

	return {
		requiredCount: checks.length,
		missing: checks.filter((c) => !c.ok).map(({ field, label, hint }) => ({ field, label, hint })),
	};
}
