/**
 * ============================================================================
 * SANPIN 3.3686-21 RFC 4180 CSV EXPORTERS (LAYER 3)
 * Все файлы выгружаются с UTF-8 BOM (\uFEFF) и валидным экранированием кавычек.
 * ============================================================================
 */

import { escapeCsvField } from "./sanpinNorms.js";
import type {
	BactericidalSessionRecord,
	CabinetReadinessRecord,
	DisinfectantJournalRecord,
	Form257Record,
	GeneralCleaningJournalRecord,
	PsoJournalRecord,
	TemperatureHumidityLogRecord,
} from "./types.js";

export function exportPsoJournalToCsv(records: readonly PsoJournalRecord[]): string {
	const headers = [
		"ID записи",
		"Дата и время",
		"Наименование изделий",
		"Количество в партии",
		"Количество проб (1%)",
		"Азопирамовая проба (кровь)",
		"Фенолфталеиновая проба (щелочь)",
		"Проба с Суданом III",
		"Моющее средство",
		"Результат контроля",
		"Причина брака",
		"ФИО исполнителя",
		"ЭЦП заверен",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(r.timestamp),
		escapeCsvField(r.instrumentName),
		escapeCsvField(r.batchItemCount),
		escapeCsvField(r.testedSampleCount),
		escapeCsvField(r.isAzopyramNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"),
		escapeCsvField(r.isPhenolphthaleinNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"),
		escapeCsvField(r.isSudanNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Масло)"),
		escapeCsvField(r.detergentBrand),
		escapeCsvField(r.isBatchApproved ? "Допущено" : "БРАК"),
		escapeCsvField(r.rejectionReason ?? ""),
		escapeCsvField(r.operatorStaffFullName),
		escapeCsvField(r.electronicStampVerified ? "ДА" : "НЕТ"),
		escapeCsvField(r.notes ?? ""),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function exportForm257ToCsv(records: readonly Form257Record[]): string {
	const headers = [
		"ID Записи",
		"Дата",
		"Номер цикла",
		"Код аппарата",
		"Марка и модель стерилизатора",
		"Заводской номер",
		"Режим стерилизации",
		"T° заданная (°C)",
		"T° фактическая (°C)",
		"Давление заданное (бар)",
		"Давление фактическое (бар)",
		"Время выдержки (мин)",
		"Наименование изделий",
		"Кол-во упаковок",
		"Тип упаковки",
		"Срок годности (дней)",
		"Хим. индикатор",
		"КТ-1",
		"КТ-2",
		"КТ-3",
		"КТ-4",
		"КТ-5",
		"Все 5 точек ОК",
		"Результат цикла",
		"Причина брака",
		"Медсестра ЦСО",
		"Проверено главной медсестрой",
		"Цифровой штамп валидации",
		"Примечания",
	];

	const rows = records.map((rec) => {
		const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "ОК" : "БРАК";
		const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "ОК" : "БРАК";
		const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "ОК" : "БРАК";
		const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "ОК" : "БРАК";
		const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "ОК" : "БРАК";

		return [
			escapeCsvField(rec.id),
			escapeCsvField(rec.date),
			escapeCsvField(rec.cycleNumber),
			escapeCsvField(rec.sterilizerCode),
			escapeCsvField(rec.sterilizerBrandModel),
			escapeCsvField(rec.sterilizerSerialNumber),
			escapeCsvField(rec.regimeNameRu),
			escapeCsvField(rec.targetTemperatureCelsius),
			escapeCsvField(rec.actualTemperatureCelsius),
			escapeCsvField(rec.targetPressureBar),
			escapeCsvField(rec.actualPressureBar),
			escapeCsvField(rec.actualExposureMinutes),
			escapeCsvField(rec.itemsDescriptionRu),
			escapeCsvField(rec.packsCount),
			escapeCsvField(rec.packagingNameRu),
			escapeCsvField(rec.shelfLifeDays),
			escapeCsvField(rec.chemicalIndicatorNameRu),
			escapeCsvField(pt1),
			escapeCsvField(pt2),
			escapeCsvField(pt3),
			escapeCsvField(pt4),
			escapeCsvField(pt5),
			escapeCsvField(rec.areAllPointsPassed ? "Да" : "Нет"),
			escapeCsvField(rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК"),
			escapeCsvField(rec.rejectionReason ?? ""),
			escapeCsvField(rec.operatorStaffFullName),
			escapeCsvField(rec.isHeadNurseVerified ? `Да (${rec.headNurseSignatureFullName ?? ""})` : "Нет"),
			escapeCsvField(rec.digitalStampHash),
			escapeCsvField(rec.notes ?? ""),
		];
	});

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function exportBactericidalJournalToCsv(sessions: readonly BactericidalSessionRecord[]): string {
	const headers = [
		"ID",
		"Дата",
		"ID оборудования",
		"Помещение",
		"Марка аппарата",
		"Время начала",
		"Время окончания",
		"Длительность (мин)",
		"Длительность (ч)",
		"Режим работы",
		"Суммарная наработка (ч)",
		"Оператор",
	];

	const rows = sessions.map((s) => [
		escapeCsvField(s.id),
		escapeCsvField(s.date),
		escapeCsvField(s.equipmentId),
		escapeCsvField(s.roomName),
		escapeCsvField(s.deviceBrand),
		escapeCsvField(s.sessionStartTime),
		escapeCsvField(s.sessionEndTime),
		escapeCsvField(s.durationMinutes),
		escapeCsvField(s.durationHours),
		escapeCsvField(s.operatingMode),
		escapeCsvField(s.cumulativeHoursAfterSession),
		escapeCsvField(s.operatorStaffFullName),
	]);

	return `\uFEFF${[headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n")}`;
}

export function exportGeneralCleaningJournalToCsv(records: readonly GeneralCleaningJournalRecord[]): string {
	const headers = [
		"ID",
		"План дата",
		"Факт дата",
		"Помещение",
		"Тип помещения",
		"Площадь (м²)",
		"Дезсредство",
		"Концентрация (%)",
		"Экспозиция (мин)",
		"УФ-лучи (мин)",
		"Проветривание (мин)",
		"Исполнитель",
		"Контроль заверен",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(r.scheduledDate),
		escapeCsvField(r.actualDateTime),
		escapeCsvField(r.roomName),
		escapeCsvField(r.roomType),
		escapeCsvField(r.treatedAreaM2),
		escapeCsvField(r.disinfectantName),
		escapeCsvField(r.solutionConcentrationPercent),
		escapeCsvField(r.exposureTimeMinutes),
		escapeCsvField(r.uvIrradiationMinutes),
		escapeCsvField(r.ventilationMinutes),
		escapeCsvField(r.operatorStaffFullName),
		escapeCsvField(r.isInspectorVerified ? "ДА" : "НЕТ"),
	]);

	return `\uFEFF${[headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n")}`;
}

export function exportDisinfectantJournalToCsv(records: readonly DisinfectantJournalRecord[]): string {
	const headers = [
		"ID",
		"Дата и время",
		"Тип операции",
		"Торговое название",
		"Количество",
		"Единица",
		"Накладная / Объект обработки",
		"Остаток на складе",
		"Ответственный",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(r.timestamp),
		escapeCsvField(r.operationType === "receipt" ? "Приход" : "Расход"),
		escapeCsvField(r.tradeName),
		escapeCsvField(r.amount),
		escapeCsvField(r.unit),
		escapeCsvField(r.invoiceOrObjectInfo),
		escapeCsvField(r.resultingStockBalance),
		escapeCsvField(r.operatorStaffFullName),
	]);

	return `\uFEFF${[headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n")}`;
}

export function exportCabinetReadinessToCsv(records: readonly CabinetReadinessRecord[]): string {
	const headers = [
		"ID Записи",
		"Дата и время",
		"Кабинет",
		"Профиль приёма",
		"Статус готовности",
		"Дезинфекция поверхностей",
		"Дезсредство и экспозиция",
		"Стерильные наконечники (индикаторы 5 кл.)",
		"Базовый стерильный лоток",
		"Аспирация (слюноотсос/пылесос)",
		"Коффердам",
		"Замечания / Отсутствующие позиции",
		"Исполнитель (медсестра/ассистент)",
		"Цифровой штамп ЭЦП",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(new Date(r.timestamp).toLocaleString("ru-RU")),
		escapeCsvField(r.cabinetNumber),
		escapeCsvField(r.appointmentTypeTitleRu),
		escapeCsvField(r.isFullyReady ? "ГОТОВ К ПРИЁМУ" : "НЕ ГОТОВ"),
		escapeCsvField(r.surfaceDisinfection.isCompleted ? "ДА" : "НЕТ"),
		escapeCsvField(`${r.surfaceDisinfection.disinfectantBrand} (${r.surfaceDisinfection.exposureMinutes} мин)`),
		escapeCsvField(r.handpiecesSterility.isCompleted && r.handpiecesSterility.class5IndicatorsVerified ? "ДА (5 кл. ОК)" : "НЕТ"),
		escapeCsvField(r.sterileTray.isCompleted ? "ДА (Укомплектован)" : "НЕТ"),
		escapeCsvField(r.aspirationSystem.isCompleted ? "ДА (Подключена)" : "НЕТ"),
		escapeCsvField(r.isolationCofferdam.isCompleted ? "ДА" : r.isolationCofferdam.isNotRequiredForProfile ? "Не требуется" : "НЕТ"),
		escapeCsvField(r.missingItems.join("; ") || "Замечаний нет"),
		escapeCsvField(`${r.operatorStaffFullName} (${r.operatorStaffPosition})`),
		escapeCsvField(r.digitalStampHash),
		escapeCsvField(r.notes ?? ""),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function exportTemperatureHumidityJournalToCsv(records: readonly TemperatureHumidityLogRecord[]): string {
	const headers = [
		"ID",
		"Дата замера",
		"Период",
		"Объект контроля",
		"Место установки",
		"Прибор учета",
		"Фактическая T° (°C)",
		"Влажность (%)",
		"Норматив T° (°C)",
		"В пределах нормы",
		"Причина отклонения / Меры",
		"Ответственный",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(r.measurementDate),
		escapeCsvField(r.measurementPeriod === "morning" ? "Утро (09:00)" : r.measurementPeriod === "evening" ? "Вечер (18:00)" : r.measurementPeriod),
		escapeCsvField(r.equipmentName),
		escapeCsvField(r.location),
		escapeCsvField(r.meterSerialNumber ? `${r.meterDeviceName} (№${r.meterSerialNumber})` : r.meterDeviceName),
		escapeCsvField(r.temperatureCelsius),
		escapeCsvField(r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? r.relativeHumidityPercent : ""),
		escapeCsvField(`${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}`),
		escapeCsvField(r.isWithinNorm ? "ДА" : "ОТКЛОНЕНИЕ"),
		escapeCsvField(r.correctiveAction || r.deviationReason || ""),
		escapeCsvField(r.operatorStaffFullName),
		escapeCsvField(r.notes || ""),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}
