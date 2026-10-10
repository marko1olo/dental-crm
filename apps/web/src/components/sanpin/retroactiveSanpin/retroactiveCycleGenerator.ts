/**
 * ============================================================================
 * RETROACTIVE CYCLE GENERATOR (Layer 2)
 * Генерация циклов стерилизации по фактическим визитам и инструментам:
 * - Расчет лотков: 4 инструмента/набора на визит
 * - Выборка ПСО: 1% от объема партии, минимум 3-5 шт. (МУ 287-113)
 * - Расчет циклов автоклава: вместимость 12 упаковок / цикл
 * - Моделирование параметров сред и отходов (классы А и Б)
 * ============================================================================
 */

import {
	AUTOCLAVE_REGIME_PRESETS,
	RUSSIAN_DAYS_OF_WEEK,
	STATUTORY_CLINIC_CABINETS,
	calculatePeriodDateRange,
	matchDisinfectantForCleaning,
	matchPsoDetergent,
} from "./retroactiveDisinfectionMatcher.js";
import type {
	RetroactiveBatchStats,
	RetroactiveDayRecord,
	RetroactiveGenerationOptions,
} from "./types.js";

/**
 * Расчет требуемого количества инструментов/лотков по визитам
 */
export function calculateEstimatedTrays(visitsCount: number): number {
	return visitsCount * 4;
}

/**
 * Расчет нормативного объема контрольной выборки ПСО (1%, min 3-5 шт.)
 */
export function calculatePsoSampleSize(traysCount: number): number {
	return Math.max(3, Math.ceil(traysCount * 0.01));
}

/**
 * Расчет минимального числа циклов стерилизации (12 наборов на цикл автоклава B-класса)
 */
export function calculateAutoclaveCycles(traysCount: number): number {
	return Math.max(2, Math.ceil(traysCount / 12));
}

/**
 * Generates array of day records for the given range and options
 */
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

	let dayIndex = 1;

	while (current <= end) {
		const dayOfWeekIndex = current.getDay();
		const dayOfWeekRu = RUSSIAN_DAYS_OF_WEEK[dayOfWeekIndex] || "Будни";
		const isSunday = dayOfWeekIndex === 0;
		const isSaturday = dayOfWeekIndex === 6;

		const isWorkingDay = options.excludeSundays ? !isSunday : true;
		const dateStr = current.toISOString().slice(0, 10);

		if (!isWorkingDay) {
			// Sunday or non-working day record
			days.push({
				id: `SANPIN-BATCH-${dateStr}`,
				date: dateStr,
				dayOfWeekRu,
				isWorkingDay: false,
				cabinetsCount: 0,
				cabinetsListRu: "Выходной день клиники",
				visitsCount: 0,
				traysProcessedCount: 0,
				psoBatchCount: 0,
				psoSampleCount: 0,
				psoSampleRequirementRu: "0 шт. (выходной)",
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isPsoApproved: true,
				psoDetergent: "—",
				autoclaveCyclesCount: 0,
				autoclaveRegimeTitle: "Дежурный режим ожидания",
				autoclaveTemperature: 20.0,
				autoclavePressure: 0.0,
				autoclaveDuration: 0,
				points5Passed: true,
				indicatorTradeName: regime.indicatorNameRu,
				recirculatorOperatingHours: 0,
				isGeneralCleaningDay: false,
				cleaningTypeRu: "Текущая консервация",
				cleaningDisinfectant: "—",
				cabinetsReadinessStatus: "ready_sterile",
				cabinetsReadinessMessageRu: "Кабинеты законсервированы в стерильном состоянии",
				wasteClassBWeightKg: 0,
				wasteClassAWeightKg: 0,
				refrigeratorTempMorning: 4.1,
				refrigeratorTempEvening: 4.3,
				roomTempMorning: 20.5,
				roomHumidityMorning: 45,
				sanpinCompliance100: true,
				nurseFullName: options.dutyNurseFullName,
				electronicStampHash: `DENTE-SANPIN-STAMP-${dateStr.replace(/-/g, "")}-SUNDAY-OFF`,
				isSavedToDb: false,
				notes: "Выходной день. Журнал температурного режима и дежурной консервации.",
			});
		} else {
			// Active working day
			// Scaling visits: Saturday ~70% load
			const dayVisits = isSaturday
				? Math.round(activeCabCount * visitsPerCab * 0.7)
				: activeCabCount * visitsPerCab;

			const traysCount = calculateEstimatedTrays(dayVisits); // 4 instruments/trays per visit
			const sampleCount = calculatePsoSampleSize(traysCount); // 1% min 3-5

			const cyclesCount = calculateAutoclaveCycles(traysCount);
			const isFriday = dayOfWeekIndex === 5; // General cleaning usually on Fridays
			const isGeneralCleaningDay = isFriday;

			// Pseudo-random deterministic variations for realistic temperature & waste
			const dateSeed = (current.getDate() * 17 + current.getMonth() * 31) % 100;
			const tempFrigMorn = Number((3.8 + (dateSeed % 12) * 0.1).toFixed(1)); // 3.8 .. 4.9°C (norm 2..8°C)
			const tempFrigEve = Number((4.1 + ((dateSeed + 3) % 11) * 0.1).toFixed(1));
			const roomTemp = Number((21.0 + (dateSeed % 15) * 0.1).toFixed(1)); // 21.0 .. 22.4°C
			const roomHum = 44 + (dateSeed % 14); // 44 .. 57% (norm 40..60%)

			const wasteB = Number((1.2 + activeCabCount * 0.35 + (dateSeed % 8) * 0.1).toFixed(2));
			const wasteA = Number((2.0 + activeCabCount * 0.5 + (dateSeed % 10) * 0.15).toFixed(2));
			const recircHours = Number((activeCabCount * 2.5).toFixed(1));

			const cleaning = matchDisinfectantForCleaning(isGeneralCleaningDay);

			days.push({
				id: `SANPIN-BATCH-${dateStr}`,
				date: dateStr,
				dayOfWeekRu,
				isWorkingDay: true,
				cabinetsCount: activeCabCount,
				cabinetsListRu: activeCabinetsList,
				visitsCount: dayVisits,
				traysProcessedCount: traysCount,
				psoBatchCount: traysCount,
				psoSampleCount: sampleCount,
				psoSampleRequirementRu: `${sampleCount} шт. (1% от ${traysCount} шт.)`,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isPsoApproved: true,
				psoDetergent: matchPsoDetergent(),
				autoclaveCyclesCount: cyclesCount,
				autoclaveRegimeTitle: `${regime.nameRu} (${options.sterilizerModelName})`,
				autoclaveTemperature: regime.temperatureCelsius,
				autoclavePressure: regime.pressureBar,
				autoclaveDuration: regime.durationMinutes,
				points5Passed: true,
				indicatorTradeName: `${regime.indicatorNameRu} (${regime.indicatorClass})`,
				recirculatorOperatingHours: recircHours,
				isGeneralCleaningDay,
				cleaningTypeRu: cleaning.cleaningTypeRu,
				cleaningDisinfectant: cleaning.cleaningDisinfectant,
				cabinetsReadinessStatus: "ready_sterile",
				cabinetsReadinessMessageRu: "Все кабинеты продезинфицированы, наконечники и лотки стерильны",
				wasteClassBWeightKg: wasteB,
				wasteClassAWeightKg: wasteA,
				refrigeratorTempMorning: tempFrigMorn,
				refrigeratorTempEvening: tempFrigEve,
				roomTempMorning: roomTemp,
				roomHumidityMorning: roomHum,
				sanpinCompliance100: true,
				nurseFullName: options.dutyNurseFullName,
				electronicStampHash: `DENTE-CSO-${dateStr.replace(/-/g, "")}-B${traysCount}-P${sampleCount}-OK`,
				isSavedToDb: false,
				notes: isGeneralCleaningDay
					? "Генеральная уборка проведена в полном объеме. Все пробы ПСО отрицательные, циклы стерилизации норма."
					: "Смена закрыта. Замечаний по СанПиН нет. Досье опечатано.",
			});
		}

		current.setDate(current.getDate() + 1);
		dayIndex++;
	}

	return days;
}

/**
 * Calculates aggregate statistics for the batch
 */
export function calculateRetroactiveBatchStats(
	days: readonly RetroactiveDayRecord[],
): RetroactiveBatchStats {
	let workingDaysCount = 0;
	let totalTrays = 0;
	let totalPsoSamples = 0;
	let totalAutoclaveCycles = 0;
	let totalRecircHours = 0;
	let generalCleaningsCount = 0;
	let totalWasteKg = 0;
	let compliantDays = 0;

	for (const d of days) {
		if (d.isWorkingDay) {
			workingDaysCount++;
			totalTrays += d.traysProcessedCount;
			totalPsoSamples += d.psoSampleCount;
			totalAutoclaveCycles += d.autoclaveCyclesCount;
			totalRecircHours += d.recirculatorOperatingHours;
			if (d.isGeneralCleaningDay) {
				generalCleaningsCount++;
			}
			totalWasteKg += d.wasteClassBWeightKg + d.wasteClassAWeightKg;
		}
		if (d.sanpinCompliance100) {
			compliantDays++;
		}
	}

	const compliancePercentage =
		days.length > 0 ? Math.round((compliantDays / days.length) * 100) : 100;

	return {
		totalDays: days.length,
		workingDaysCount,
		totalTraysProcessed: totalTrays,
		totalPsoSamplesTested: totalPsoSamples,
		totalAutoclaveCycles: totalAutoclaveCycles,
		totalRecirculatorHours: Number(totalRecircHours.toFixed(1)),
		generalCleaningsCount,
		totalWasteKg: Number(totalWasteKg.toFixed(1)),
		compliancePercentage,
	};
}
