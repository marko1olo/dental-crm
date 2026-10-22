import {
	matchDisinfectantForCleaning,
	matchPsoDetergent,
} from "./retroactiveDisinfectionMatcher.js";
import {
	calculateAutoclaveCycles,
	calculateEstimatedTrays,
	calculatePsoSampleSize,
} from "./retroactiveDayCalculators.js";
import type {
	RetroactiveDayRecord,
	RetroactiveGenerationOptions,
} from "./types.js";

export { buildRetroactiveOffDay } from "./retroactiveOffDayBuilder.js";

export function buildRetroactiveWorkDay(
	dateStr: string,
	dayOfWeekRu: string,
	current: Date,
	dayOfWeekIndex: number,
	activeCabCount: number,
	activeCabinetsList: string,
	visitsPerCab: number,
	regime: any,
	options: RetroactiveGenerationOptions,
): RetroactiveDayRecord {
	const isSaturday = dayOfWeekIndex === 6;
	const isGeneralCleaningDay = dayOfWeekIndex === 5;

	const dayVisits = isSaturday
		? Math.round(activeCabCount * visitsPerCab * 0.7)
		: activeCabCount * visitsPerCab;

	const traysCount = calculateEstimatedTrays(dayVisits);
	const sampleCount = calculatePsoSampleSize(traysCount);
	const cyclesCount = calculateAutoclaveCycles(traysCount);

	const dateSeed = (current.getDate() * 17 + current.getMonth() * 31) % 100;
	const tempFrigMorn = Number((3.8 + (dateSeed % 12) * 0.1).toFixed(1));
	const tempFrigEve = Number((4.1 + ((dateSeed + 3) % 11) * 0.1).toFixed(1));
	const roomTemp = Number((21.0 + (dateSeed % 15) * 0.1).toFixed(1));
	const roomHum = 44 + (dateSeed % 14);

	const wasteB = Number((1.2 + activeCabCount * 0.35 + (dateSeed % 8) * 0.1).toFixed(2));
	const wasteA = Number((2.0 + activeCabCount * 0.5 + (dateSeed % 10) * 0.15).toFixed(2));
	const recircHours = Number((activeCabCount * 2.5).toFixed(1));
	const cleaning = matchDisinfectantForCleaning(isGeneralCleaningDay);

	return {
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
	};
}
