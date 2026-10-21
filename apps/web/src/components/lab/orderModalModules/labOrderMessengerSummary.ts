export interface LabOrderMessengerParams {
	clinicName: string;
	clinicPhone?: string | undefined;
	gostOrderNumber: string;
	patientName: string;
	doctorName: string;
	teethOrJaw: string;
	constructionTypeTitle: string;
	materialTitle: string;
	shade: string;
	dueDate: string;
	frameworkTrialDate?: string | undefined;
	ceramicTrialDate?: string | undefined;
	clinicalNotes?: string | undefined;
}

export function buildLabOrderMessengerSummary(params: LabOrderMessengerParams): string {
	const lines: string[] = [
		`Заказ-наряд в зуботехническую лабораторию (клиника «${params.clinicName}»):`,
		`Наряд: ${params.gostOrderNumber}`,
		`Пациент: ${params.patientName}`,
		`Лечащий врач: ${params.doctorName}`,
		`Область: ${params.teethOrJaw}`,
		`Конструкция: ${params.constructionTypeTitle}`,
		`Материал: ${params.materialTitle}`,
		`Цвет: ${params.shade}`,
		`Срок сдачи (Due date): ${params.dueDate}`,
	];

	if (params.frameworkTrialDate && params.frameworkTrialDate.trim()) {
		lines.push(`Примерка каркаса: ${params.frameworkTrialDate.trim()}`);
	}
	if (params.ceramicTrialDate && params.ceramicTrialDate.trim()) {
		lines.push(`Примерка керамики: ${params.ceramicTrialDate.trim()}`);
	}

	const notes = params.clinicalNotes?.trim() || "Без особенностей";
	lines.push(`Особые указания: ${notes}`);

	const phone = params.clinicPhone?.trim() || "не указан";
	const formattedPhone = phone.endsWith(".") ? phone : `${phone}.`;
	lines.push(`Курьерская доставка / Связь с клиникой: ${formattedPhone}`);

	return lines.join("\n");
}
