import {
	AUTOCLAVE_REGIME_PRESETS,
	RUSSIAN_DAYS_OF_WEEK,
	STATUTORY_CLINIC_CABINETS,
	calculatePeriodDateRange,
} from "./retroactiveDisinfectionMatcher.js";
import {
	buildRetroactiveOffDay,
	buildRetroactiveWorkDay,
} from "./retroactiveSingleDayBuilder.js";
import type {
	RetroactiveDayRecord,
	RetroactiveGenerationOptions,
} from "./types.js";

export {
	calculateAutoclaveCycles,
	calculateEstimatedTrays,
	calculatePsoSampleSize,
	calculateRetroactiveBatchStats,
} from "./retroactiveDayCalculators.js";

export function generateRetroactiveSanpinDays(
	options: RetroactiveGenerationOptions,
	referenceDateStr?: string,
): RetroactiveDayRecord[] {
	const { startDate, endDate } = calculatePeriodDateRange(
		options.preset,
		options.startDate,
		options.endDate,
		referenceDateStr,
	);

	const start = new Date(startDate);
	const end = new Date(endDate);
	const regime =
		AUTOCLAVE_REGIME_PRESETS.find((r) => r.id === options.autoclaveRegimeId) ||
		AUTOCLAVE_REGIME_PRESETS[0]!;

	const selectedCabinets = STATUTORY_CLINIC_CABINETS.filter((c) =>
		options.selectedCabinets.includes(c.id),
	);
	const activeCabinetsList =
		selectedCabinets.length > 0
			? selectedCabinets.map((c) => c.shortName).join(", ")
			: "Все кабинеты (1, 2, 3, ЦСО)";

	const activeCabCount = Math.max(1, selectedCabinets.length);
	const visitsPerCab = options.averageVisitsPerCabinetDay ?? 6;
	const days: RetroactiveDayRecord[] = [];
	const current = new Date(start);

	while (current <= end) {
		const dayOfWeekIndex = current.getDay();
		const dayOfWeekRu = RUSSIAN_DAYS_OF_WEEK[dayOfWeekIndex] || "Будни";
		const isSunday = dayOfWeekIndex === 0;
		const isWorkingDay = options.excludeSundays ? !isSunday : true;
		const dateStr = current.toISOString().slice(0, 10);

		if (!isWorkingDay) {
			days.push(buildRetroactiveOffDay(dateStr, dayOfWeekRu, options.dutyNurseFullName, regime.indicatorNameRu));
		} else {
			days.push(buildRetroactiveWorkDay(
				dateStr,
				dayOfWeekRu,
				current,
				dayOfWeekIndex,
				activeCabCount,
				activeCabinetsList,
				visitsPerCab,
				regime,
				options,
			));
		}

		current.setDate(current.getDate() + 1);
	}

	return days;
}
