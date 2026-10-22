import type { Form257Record } from "./types";

function escapeCsvField(value: unknown): string {
	if (value === null || value === undefined) {
		return '""';
	}
	const str = String(value);
	if (str.includes('"') || str.includes(",") || str.includes(";") || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return `"${str}"`;
}

export function exportForm257ToCsv(records: readonly Form257Record[]): string {
	const BOM = "\uFEFF";
	const headers = [
		"ID Записи", "Дата", "Номер цикла", "Код аппарата",
		"Марка и модель стерилизатора", "Заводской номер", "Режим стерилизации",
		"T° заданная (°C)", "T° фактическая (°C)", "Давление заданное (бар)",
		"Давление фактическое (бар)", "Время выдержки (мин)", "Наименование изделий",
		"Кол-во упаковок", "Номер бикса / упаковки", "Тип упаковки",
		"Срок годности (дней)", "Хим. индикатор", "КТ-1 (Верхний угол)",
		"КТ-2 (Нижний угол)", "КТ-3 (Центр камеры)", "КТ-4 (У дверцы)",
		"КТ-5 (Задняя стенка)", "Все 5 точек ОК", "Результат цикла",
		"Причина брака", "Ответственный сотрудник (ЦСО / Врач)",
		"Контрольная заверка (СанПиН)", "Цифровой штамп валидации", "Примечания",
	];

	const rows: string[] = [headers.map(escapeCsvField).join(";")];

	for (const rec of records) {
		const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "ОК" : "БРАК";
		const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "ОК" : "БРАК";
		const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "ОК" : "БРАК";
		const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "ОК" : "БРАК";
		const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "ОК" : "БРАК";

		const row = [
			rec.id, rec.date, rec.cycleNumber, rec.sterilizerCode,
			rec.sterilizerBrandModel, rec.sterilizerSerialNumber, rec.regimeNameRu,
			rec.targetTemperatureCelsius, rec.actualTemperatureCelsius, rec.targetPressureBar,
			rec.actualPressureBar, rec.actualExposureMinutes, rec.itemsDescriptionRu,
			rec.packsCount, rec.bixNumber ?? "", rec.packagingNameRu,
			rec.shelfLifeDays, rec.chemicalIndicatorNameRu, pt1, pt2, pt3, pt4, pt5,
			rec.areAllPointsPassed ? "Да" : "Нет", rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК",
			rec.rejectionReason ?? "", rec.operatorStaffFullName,
			rec.isHeadNurseVerified ? `Да (${rec.headNurseSignatureFullName ?? ""})` : "Нет",
			rec.digitalStampHash, rec.notes ?? "",
		];

		rows.push(row.map(escapeCsvField).join(";"));
	}

	return BOM + rows.join("\r\n");
}
