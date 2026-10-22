import type { SterilizationRegimeId } from "../autoclaveLogPresets.js";
import { createForm257Record } from "./form257RecordFactory.js";
import { createDefault5ChamberPoints } from "./sterilizationCycleValidator.js";
import type { Form257Record, GenerateBatchForm257Options } from "./types.js";

export function generateBatchForm257Records(options: GenerateBatchForm257Options): Form257Record[] {
	const {
		startDate, endDate, targetDates, excludeSundays = true, cyclesPerDay = 2, packsPerCycle = 14,
		sterilizerId = "autoclave-melag-vacuklav-23b",
		operatorStaffFullName = "Сотрудник ЦСО / Медсестра",
		operatorStaffPosition = "Сотрудник ЦСО / Медсестра",
		headNurseSignatureFullName = "Главная медсестра / Ответственный по СанПиН",
		isHeadNurseVerified = true,
	} = options;

	const datesToProcess: string[] = [];

	if (targetDates && targetDates.length > 0) {
		const uniqueSorted = Array.from(new Set(targetDates.map((d) => d.slice(0, 10)))).sort();
		for (const dStr of uniqueSorted) {
			const [y, m, d] = dStr.split("-").map(Number);
			if (y && m && d) {
				const curDate = new Date(Date.UTC(y, m - 1, d));
				if (excludeSundays && curDate.getUTCDay() === 0) continue;
				datesToProcess.push(dStr);
			}
		}
	} else if (startDate && endDate) {
		const [startY, startM, startD] = startDate.split("-").map(Number);
		const [endY, endM, endD] = endDate.split("-").map(Number);
		if (!startY || !startM || !startD || !endY || !endM || !endD) return [];

		const startUtc = Date.UTC(startY, startM - 1, startD);
		const endUtc = Date.UTC(endY, endM - 1, endD);
		if (startUtc > endUtc) return [];

		const MS_PER_DAY = 24 * 60 * 60 * 1000;
		for (let time = startUtc; time <= endUtc; time += MS_PER_DAY) {
			const curDate = new Date(time);
			if (excludeSundays && curDate.getUTCDay() === 0) continue;
			const yyyy = curDate.getUTCFullYear();
			const mm = String(curDate.getUTCMonth() + 1).padStart(2, "0");
			const dd = String(curDate.getUTCDate()).padStart(2, "0");
			datesToProcess.push(`${yyyy}-${mm}-${dd}`);
		}
	}

	if (datesToProcess.length === 0) return [];
	const records: Form257Record[] = [];

	for (const dateStr of datesToProcess) {
		const count = Math.max(1, cyclesPerDay);
		for (let cycleNum = 1; cycleNum <= count; cycleNum++) {
			const isSurgical = cycleNum === 2 && count > 1;
			const regimeId: SterilizationRegimeId = isSurgical ? "steam_134_20min_prion" : "steam_134_5min";
			const exposureTime = isSurgical ? 20.0 : 5.5;
			const actualTemp = Number((134.2 + cycleNum * 0.1).toFixed(1));
			const actualPressure = 2.15;
			const currentCyclePacks = isSurgical ? Math.max(4, Math.round(packsPerCycle * 0.7)) : packsPerCycle;
			const itemsDescriptionRu = isSurgical
				? `Хирургический и имплантологический инструментарий: элеваторы, кюреты Грейси, щипцы (${currentCyclePacks} упак.)`
				: `Терапевтические наборы (зеркала, зонды, пинцеты), наконечники турбинные NSK Ti-Max (${currentCyclePacks} упак.)`;
			const chamberPoints = createDefault5ChamberPoints("intetest_v_134_5", true);

			const rec = createForm257Record({
				date: dateStr, cycleNumber: cycleNum, sterilizerId,
				sterilizerCode: options.sterilizerCode, sterilizerBrandModel: options.sterilizerBrandModel,
				sterilizerSerialNumber: options.sterilizerSerialNumber, regimeId,
				sensors: { actualTemperatureCelsius: actualTemp, actualPressureBar: actualPressure, actualExposureMinutes: exposureTime },
				itemsDescriptionRu, packsCount: currentCyclePacks, packagingType: isSurgical ? "cassette_bipack" : "kraft_pouch_sealed",
				chamberPoints, operatorStaffFullName, operatorStaffPosition, headNurseSignatureFullName, isHeadNurseVerified,
				notes: isSurgical ? "Хирургический усиленный цикл (20 мин), тест индикаторов 5 точек КТ в норме." : "Утренний плановый цикл, тест Бови-Дика пройден перед сменой (Норма).",
			});
			records.push(rec);
		}
	}

	return records;
}
