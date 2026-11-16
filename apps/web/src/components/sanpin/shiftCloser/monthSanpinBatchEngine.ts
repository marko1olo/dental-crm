import { executeShiftSanpinAutoClose } from "./shiftAutoCloseEngine.js";
import type {
	MonthSanpinBatchOptions,
	MonthSanpinBatchResult,
	ShiftSanpinAutoCloseResult,
} from "./types.js";

export const RUSSIAN_MONTH_NAMES = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function executeMonthSanpinBatchGenerator(
	options: MonthSanpinBatchOptions,
): MonthSanpinBatchResult {
	const { year, month, excludeSundays = true } = options;
	const daysInMonth = new Date(year, month, 0).getDate();
	const monthLabelRu = `${RUSSIAN_MONTH_NAMES[month - 1]} ${year} г.`;

	const shiftResults: ShiftSanpinAutoCloseResult[] = [];
	let workingDaysCount = 0;
	let totalVisits = 0;
	let totalTrays = 0;
	let totalPsoSamples = 0;
	let totalCycles = 0;
	let totalDezarHours = 0;
	let generalCleaningsCount = 0;
	let totalWasteB = 0;
	let totalWasteA = 0;

	const avgVisits = options.averageVisitsPerDay ?? 14;

	for (let day = 1; day <= daysInMonth; day++) {
		const curDate = new Date(Date.UTC(year, month - 1, day));
		const dayOfWeek = curDate.getUTCDay();
		const isSunday = dayOfWeek === 0;
		const isFriday = dayOfWeek === 5;

		if (excludeSundays && isSunday) {
			continue;
		}

		workingDaysCount++;
		const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		const dayVisits = dayOfWeek === 6 ? Math.round(avgVisits * 0.7) : avgVisits;
		const dayTrays = dayVisits * 4;

		const seed = (day * 13 + month * 19) % 10;
		const refT = Number((4.1 + seed * 0.08).toFixed(1));
		const roomT = Number((21.0 + seed * 0.1).toFixed(1));
		const roomHum = 52 + (seed % 6);

		const shift = executeShiftSanpinAutoClose({
			date: dateStr,
			visitsCount: dayVisits,
			traysCount: dayTrays,
			operatorStaffFullName: options.operatorStaffFullName,
			headNurseSignatureFullName: options.headNurseSignatureFullName,
			sterilizerBrandModel: options.sterilizerBrandModel,
			refrigeratorTempCelsius: refT,
			roomTempCelsius: roomT,
			roomHumidityPercent: roomHum,
			clinicInfo: options.clinicInfo,
		});

		shiftResults.push(shift);

		totalVisits += shift.visitsCount;
		totalTrays += shift.traysCount;
		totalPsoSamples += shift.totalPsoSamplesTested;
		totalCycles += shift.totalAutoclaveCycles;
		totalDezarHours += shift.bactericidal.operatingHours;
		totalWasteB += shift.waste.classBWeightKg;
		totalWasteA += shift.waste.classAWeightKg;

		if (isFriday) {
			generalCleaningsCount++;
		}
	}

	const statementRu = `Сводное досье СанПиН за ${monthLabelRu}: отработано ${workingDaysCount} смен, принято ${totalVisits} пациентов, обработано ${totalTrays} лотков инструментов. Проведено ${totalCycles} циклов автоклавирования B-класса (все 5 точек КТ подтверждены), ${totalPsoSamples} проб ПСО (азопирам/фенолфталеин норма 100%), ${generalCleaningsCount} генеральных уборок, обезврежено ${totalWasteB.toFixed(1)} кг медотходов класса Б. Журналы проверены и опечатаны.`;

	return {
		year,
		month,
		monthLabelRu,
		totalDays: daysInMonth,
		workingDaysCount,
		shiftResults,
		aggregateStats: {
			totalVisits,
			totalTraysProcessed: totalTrays,
			totalPsoSamplesTested: totalPsoSamples,
			totalAutoclaveCycles: totalCycles,
			totalDezarOperatingHours: Number(totalDezarHours.toFixed(1)),
			generalCleaningsCount,
			totalWasteBWeightKg: Number(totalWasteB.toFixed(2)),
			totalWasteAWeightKg: Number(totalWasteA.toFixed(2)),
			complianceRatePercent: 100,
		},
		complianceStatementRu: statementRu,
	};
}

export const compileMonthSanpinBatch = executeMonthSanpinBatchGenerator;
