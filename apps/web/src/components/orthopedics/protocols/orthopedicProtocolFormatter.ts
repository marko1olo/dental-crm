import type {
	OrthopedicProtocolPreset,
	FormatOrthopedicProtocolOptions,
	DoctorClinicalOverrideResult,
} from "./orthopedicProtocolTypes.js";

/**
 * Форматирует клиническую запись для дневника с учетом номеров зубов и челюсти
 */
export function formatOrthopedicProtocolStatement(
	protocol: OrthopedicProtocolPreset,
	options?: FormatOrthopedicProtocolOptions,
): {
	anamnesis: string;
	objective: string;
	treatment: string;
	recommendations: string;
	summaryLine: string;
} {
	const teethList =
		options?.teethFdi && options.teethFdi.length > 0
			? options.teethFdi.map(String).join(", ")
			: options?.toothFdi
				? String(options.toothFdi).trim()
				: "";

	const jawLabel =
		options?.jawScope === "upper"
			? "Верхняя челюсть"
			: options?.jawScope === "lower"
				? "Нижняя челюсть"
				: options?.jawScope === "both"
					? "Обе челюсти"
					: "";

	const scopeItems: string[] = [];
	if (teethList) scopeItems.push(`Зуб(ы): ${teethList}`);
	if (jawLabel) scopeItems.push(`Область: ${jawLabel}`);
	if (options?.material) scopeItems.push(`Материал: ${options.material}`);
	if (options?.colorVita) scopeItems.push(`Цвет: ${options.colorVita}`);
	if (options?.labOrderNumber) scopeItems.push(`Наряд ЗТЛ: ${options.labOrderNumber}`);
	if (options?.technicianName) scopeItems.push(`Техник: ${options.technicianName}`);
	if (options?.warrantyPassport) scopeItems.push(`Гарантийный паспорт: ${options.warrantyPassport}`);

	const scopeHeader = scopeItems.length > 0 ? `[${scopeItems.join(" · ")}]\n` : "";
	const objective = `${scopeHeader}${protocol.objective}`;
	const treatment = `${scopeHeader}${protocol.treatment}`;
	const summaryLine = `[Ортопедия: ${protocol.shortLabel}] ${teethList ? `Зуб ${teethList}` : jawLabel || "Полость рта"}`;

	return {
		anamnesis: protocol.anamnesis,
		objective,
		treatment,
		recommendations: protocol.recommendations,
		summaryLine,
	};
}

/**
 * Создает клинический оверрайд врача (Мандат 8e п. 7, 8n) для беспрепятственного наряда ЗТЛ
 * при авансе < 50% или срочных клинических показаниях.
 */
export function createDoctorClinicalOverride(options?: {
	reason?: string;
	doctorName?: string;
}): DoctorClinicalOverrideResult {
	const reason =
		options?.reason?.trim() ||
		"Клинические показания: обеспечение непрерывности лечебного процесса, срочное изготовление";
	return {
		doctorClinicalOverride: true,
		doctorOverrideReason: reason,
		doctorName: options?.doctorName,
		timestampIso: new Date().toISOString(),
		mandate8e: true,
		notice: "Клинический оверрайд врача применён: наряд ЗТЛ отправлен в лабораторию без задержек и согласований.",
	};
}
