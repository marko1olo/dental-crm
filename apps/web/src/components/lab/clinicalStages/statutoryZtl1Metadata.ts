export const FORM_ZTL_1_METADATA = {
	code: "Наряд-заказ в ЗТЛ",
	titleRu: "Наряд-заказ в зуботехническую лабораторию",
	blankHeaderRu: "Наряд-заказ в зуботехническую лабораторию",
	subtitleRu: "Клиническое задание на изготовление зубных протезов",
	treatmentPlanTermsNoticeRu: "Клинический регламент: Срок плана лечения не блокирует создание нарядов ЗТЛ и оказание услуг.",
	/** @deprecated Use treatmentPlanTermsNoticeRu (Mandate 8ap) */
	mandate8eClauseRu: "Клинический регламент: Срок плана лечения не блокирует создание нарядов ЗТЛ и оказание услуг.",
	sanpinClauseRu: "Дезинфекция оттисков, прикусных валиков и протезов проведена в клинике перед отправкой.",
	warrantyGostRu: "2 года гарантии (Стандарт клиники / Гарантия лаборатории)",
} as const;

export function formatPatientAnonymizedName(fullName?: string | null): {
	fullName: string;
	courierMaskedName: string;
} {
	if (!fullName || !fullName.trim()) {
		return { fullName: "Пациент", courierMaskedName: "Пациент" };
	}
	const trimmed = fullName.trim();
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length === 1) {
		return { fullName: trimmed, courierMaskedName: trimmed };
	}
	const surname = parts[0];
	const initials = parts
		.slice(1)
		.map((p) => (p[0] ? `${p[0].toUpperCase()}.` : ""))
		.join(" ");
	const courierMaskedName = `${surname} ${initials}`.trim();
	return { fullName: trimmed, courierMaskedName };
}

/**
 * @deprecated Use formatPatientAnonymizedName (Mandate 8ap)
 */
export const formatPatientName152Fz = formatPatientAnonymizedName;
