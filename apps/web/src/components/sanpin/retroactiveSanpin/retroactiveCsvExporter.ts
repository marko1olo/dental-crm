import type { RetroactiveDayRecord } from "./types.js";

/**
 * Exports batch records to standard RFC 4180 CSV with UTF-8 BOM
 */
export function exportRetroactiveBatchToCsv(days: readonly RetroactiveDayRecord[]): string {
	const BOM = "\uFEFF";
	const headers = [
		"Дата",
		"День недели",
		"Рабочий день",
		"Кабинеты",
		"Приемов",
		"Лотков всего",
		"Выборка ПСО (шт)",
		"Азопирам проба",
		"Фенолфталеин проба",
		"ПСО Допуск",
		"Моющее средство",
		"Циклов автоклава",
		"Режим автоклава",
		"Температура (°C)",
		"Давление (бар)",
		"5 точек камеры (КТ-1..5)",
		"Индикатор",
		"Наработка рециркуляторов (ч)",
		"Вид уборки",
		"Дезсредство уборки",
		"Готовность кабинетов",
		"Отходы Класс Б (кг)",
		"Отходы Класс А (кг)",
		"Холодильник T° утро (°C)",
		"Холодильник T° вечер (°C)",
		"Кабинет T° (°C)",
		"Влажность (%)",
		"Дежурная медсестра",
		"Штамп ЭЦП",
		"Примечания",
	];

	const rows = days.map((d) => [
		d.date,
		d.dayOfWeekRu,
		d.isWorkingDay ? "Да" : "Нет",
		`"${d.cabinetsListRu}"`,
		d.visitsCount,
		d.traysProcessedCount,
		d.psoSampleCount,
		d.isAzopyramNegative ? "Отрицательная (Норма)" : "Положительная (Брак)",
		d.isPhenolphthaleinNegative ? "Отрицательная (Норма)" : "Положительная (Брак)",
		d.isPsoApproved ? "Допущено" : "Брак",
		`"${d.psoDetergent}"`,
		d.autoclaveCyclesCount,
		`"${d.autoclaveRegimeTitle}"`,
		d.autoclaveTemperature,
		d.autoclavePressure,
		d.points5Passed ? "100% СРАБОТКА (Норма)" : "Брак",
		`"${d.indicatorTradeName}"`,
		d.recirculatorOperatingHours,
		`"${d.cleaningTypeRu}"`,
		`"${d.cleaningDisinfectant}"`,
		`"${d.cabinetsReadinessMessageRu}"`,
		d.wasteClassBWeightKg,
		d.wasteClassAWeightKg,
		d.refrigeratorTempMorning,
		d.refrigeratorTempEvening,
		d.roomTempMorning,
		d.roomHumidityMorning,
		`"${d.nurseFullName}"`,
		`"${d.electronicStampHash}"`,
		`"${d.notes.replace(/"/g, '""')}"`,
	]);

	const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
	return BOM + csvContent;
}
