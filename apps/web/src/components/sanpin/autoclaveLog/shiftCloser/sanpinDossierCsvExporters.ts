import type { MonthSanpinBatchResult, ShiftSanpinAutoCloseResult } from "./types.js";

export function exportShiftSanpinDossierToCsv(shift: ShiftSanpinAutoCloseResult): string {
	const BOM = "\uFEFF";
	const headers = [
		"Дата", "Цикл автоклава", "Аппарат", "Режим", "Температура (°C)",
		"Давление (бар)", "Экспозиция (мин)", "5 точек (КТ-1..5)", "Пакеты (шт)",
		"Партия ПСО (шт)", "Выборка ПСО (шт)", "Азопирам", "Фенолфталеин",
		"Холодильник T° (°C)", "Кабинет T° / Влажность", "Дезар-4 (ч)",
		"Отходы Б (кг)", "Ответственный", "Штамп ЭЦП",
	];

	const rows = shift.form257Records.map((cycle, idx) => {
		const pso = shift.psoBatches[idx] || shift.psoBatches[0];
		return [
			shift.date,
			cycle.cycleNumber,
			`"${cycle.sterilizerBrandModel}"`,
			`"${cycle.regimeNameRu}"`,
			cycle.actualTemperatureCelsius,
			cycle.actualPressureBar,
			cycle.actualExposureMinutes,
			cycle.areAllPointsPassed ? "100% СРАБОТКА (Норма)" : "БРАК",
			cycle.packsCount,
			pso ? pso.batchItemCount : "—",
			pso ? pso.testedSampleCount : "—",
			pso?.isAzopyramNegative ? "Отрицательно (Норма)" : "Положительно",
			pso?.isPhenolphthaleinNegative ? "Отрицательно (Норма)" : "Положительно",
			`+${shift.microclimate.refrigeratorLog.morningTempCelsius}°C / +${shift.microclimate.refrigeratorLog.eveningTempCelsius}°C`,
			`+${shift.microclimate.psychrometerLog.morningTempCelsius}°C (${shift.microclimate.psychrometerLog.morningHumidityPercent}%)`,
			shift.bactericidal.operatingHours,
			shift.waste.classBWeightKg,
			`"${shift.operatorStaffFullName}"`,
			`"${cycle.digitalStampHash}"`,
		].join(";");
	});

	return BOM + [headers.join(";"), ...rows].join("\r\n");
}

export function exportMonthSanpinDossierToCsv(month: MonthSanpinBatchResult): string {
	const BOM = "\uFEFF";
	const headers = [
		"Дата", "Приемов", "Лотков всего", "Циклов автоклава", "Упаковок стерильно",
		"5 точек КТ", "Проб ПСО (шт)", "Азопирам", "Фенолфталеин",
		"Холодильник утро/вечер (°C)", "Кабинет T°/Влажность", "Дезар-4 (ч)",
		"Отходы Б (кг)", "Отходы А (кг)", "Штамп ЭЦП",
	];

	const rows = month.shiftResults.map((s) => [
		s.date,
		s.visitsCount,
		s.traysCount,
		s.totalAutoclaveCycles,
		s.totalSterilePacks,
		"100% СРАБОТКА (Норма)",
		s.totalPsoSamplesTested,
		"Отрицательно (Норма)",
		"Отрицательно (Норма)",
		`+${s.microclimate.refrigeratorLog.morningTempCelsius} / +${s.microclimate.refrigeratorLog.eveningTempCelsius}`,
		`+${s.microclimate.psychrometerLog.morningTempCelsius}°C (${s.microclimate.psychrometerLog.morningHumidityPercent}%)`,
		s.bactericidal.operatingHours,
		s.waste.classBWeightKg,
		s.waste.classAWeightKg,
		`"${s.digitalStampHash}"`,
	].join(";"));

	const summaryRow = [
		`ИТОГО ЗА МЕСЯЦ (${month.monthLabelRu})`,
		month.aggregateStats.totalVisits,
		month.aggregateStats.totalTraysProcessed,
		month.aggregateStats.totalAutoclaveCycles,
		month.aggregateStats.totalTraysProcessed,
		"100% НОРМА",
		month.aggregateStats.totalPsoSamplesTested,
		"100% НОРМА",
		"100% НОРМА",
		"+4.2°C (Норма 2..8°C)",
		"+21.2°C / 55% (Норма)",
		month.aggregateStats.totalDezarOperatingHours,
		month.aggregateStats.totalWasteBWeightKg,
		month.aggregateStats.totalWasteAWeightKg,
		"ОПЕЧАТАНО",
	].join(";");

	return BOM + [headers.join(";"), ...rows, summaryRow].join("\r\n");
}
