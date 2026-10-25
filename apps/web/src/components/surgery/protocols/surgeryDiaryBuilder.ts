/**
 * surgeryDiaryBuilder.ts — Формирование хирургического дневника в медицинскую карту приёма (Мандаты 8e, 8x).
 * Чистый клинический язык протоколов операций (SOAP дневник без номеров приказов).
 */

export function buildSurgicalDiaryEntry(params: {
	patientName?: string;
	patientId?: string;
	doctorName?: string;
	toothFdi?: number;
	protocolText: string;
	recommendations?: string;
	implantDetails?: {
		brand: string;
		diameterMm: number;
		lengthMm: number;
		torqueNcm: number;
		lot?: string;
	};
}): string {
	const toothStr = params.toothFdi ? `Зуб FDI #${params.toothFdi}` : "Область вмешательства";
	const nowStr = new Date().toLocaleDateString("ru-RU");

	let implantBlock = "";
	if (params.implantDetails) {
		implantBlock =
			`\nСПЕЦИФИКАЦИЯ ИМПЛАНТАТА:\n` +
			`Система: ${params.implantDetails.brand} Ø ${params.implantDetails.diameterMm} x ${params.implantDetails.lengthMm} мм\n` +
			`Торк первичной стабильности: ${params.implantDetails.torqueNcm} Н·см\n` +
			(params.implantDetails.lot ? `LOT / Партия: ${params.implantDetails.lot}\n` : "");
	}

	const recoBlock = params.recommendations
		? `\nНАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n${params.recommendations}`
		: "";

	return (
		`ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ОПЕРАЦИИ (${toothStr})\n` +
		`Дата: ${nowStr} · Врач: ${params.doctorName || "Хирург"}\n\n` +
		`ХОД ОПЕРАЦИИ:\n` +
		`${params.protocolText.trim()}\n` +
		implantBlock +
		recoBlock
	);
}
