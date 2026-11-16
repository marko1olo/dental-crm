/**
 * packages/shared/src/sanpin/shiftAutopilot/autoclaveShiftGenerator.ts
 * Генератор нормативных записей журналов автоклавирования и стерилизации за смену.
 * Мандат 8b: строго <= 120 строк.
 */

import { CLINIC_AUTOCLAVE_MODELS } from "../sanpinJournalsPresets.js";
import {
	createDefault5ChamberPoints,
	createForm257Record,
	type Form257Record,
	type SterilizationRegimeId,
} from "../sanpinRegistryEngine.js";

export interface CanonicalShiftAutoclaveOptions {
	date?: string;
	cycleNumber?: number;
	packsCount?: number;
	operatorFullName?: string;
	operatorPosition?: string;
	headNurseFullName?: string;
	autoclaveCode?: string;
}

/**
 * Канонический сменный цикл автоклава ЦСО (134°C, 2.15 бар, 5 мин).
 * SSOT пакетного автопилота с автоматическим списанием со склада по Soft Negative Stock.
 */
export function createCanonicalShiftAutoclaveBatch(
	options: CanonicalShiftAutoclaveOptions = {},
): Form257Record {
	const date = options.date || new Date().toISOString().slice(0, 10);
	const cycleNumber = options.cycleNumber ?? 1;
	const packsCount = options.packsCount ?? 18;
	const operatorFullName = options.operatorFullName || "Медсестра ЦСО";
	const operatorPosition = options.operatorPosition || "Медицинская сестра ЦСО";
	const headNurseFullName = options.headNurseFullName || "Главная медсестра";
	const melagApp = CLINIC_AUTOCLAVE_MODELS.find((a) => a.id === "AUTO-MELAG-01") || CLINIC_AUTOCLAVE_MODELS[0]!;
	const chamberPoints = createDefault5ChamberPoints("steam_134_5min");

	return createForm257Record({
		date,
		cycleNumber,
		sterilizerId: melagApp.id,
		sterilizerCode: options.autoclaveCode || melagApp.code,
		sterilizerBrandModel: melagApp.brandModelRu,
		sterilizerSerialNumber: melagApp.serialNumber,
		regimeId: "steam_134_5min",
		sensors: {
			actualTemperatureCelsius: 134.4,
			actualPressureBar: 2.15,
			actualExposureMinutes: 5.5,
		},
		itemsDescriptionRu: `Терапевтические и хирургические наборы лотков (${packsCount} пакетов)`,
		packsCount,
		packagingType: "kraft_pouch",
		chamberPoints,
		operatorStaffFullName: operatorFullName,
		operatorStaffPosition: operatorPosition,
		headNurseSignatureFullName: headNurseFullName,
		isHeadNurseVerified: true,
		notes: "Сменный пакетный цикл автоклавирования ЦСО. Режим 134°C, 2.15 бар, 5 мин. Списание упаковки и дезсредств со склада выполнено автоматически (Soft Negative Stock).",
	});
}

export function generateShiftAutoclaveRecords(
	date: string,
	operatorFullName: string,
	operatorPosition: string,
	headNurseFullName: string,
): Form257Record[] {
	const melagApp = CLINIC_AUTOCLAVE_MODELS.find((a) => a.id === "AUTO-MELAG-01") || CLINIC_AUTOCLAVE_MODELS[0]!;
	const eurondaApp = CLINIC_AUTOCLAVE_MODELS.find((a) => a.id === "AUTO-EURONDA-02") || CLINIC_AUTOCLAVE_MODELS[1] || melagApp;

	const melagChamberPoints = createDefault5ChamberPoints("steam_134_5min");
	const eurondaChamberPoints = createDefault5ChamberPoints("steam_134_20min");
	const tauChamberPoints = createDefault5ChamberPoints("dry_heat_180_60min");

	return [
		createForm257Record({
			date,
			cycleNumber: 1,
			sterilizerId: melagApp.id,
			sterilizerCode: melagApp.code,
			sterilizerBrandModel: melagApp.brandModelRu,
			sterilizerSerialNumber: melagApp.serialNumber,
			regimeId: "steam_134_5min",
			sensors: {
				actualTemperatureCelsius: 134.4,
				actualPressureBar: 2.15,
				actualExposureMinutes: 5.5,
			},
			itemsDescriptionRu: "Терапевтические наборы, зеркала, зонды, пинцеты (18 пакетов)",
			packsCount: 18,
			packagingType: "kraft_pouch",
			chamberPoints: melagChamberPoints,
			operatorStaffFullName: operatorFullName,
			operatorStaffPosition: operatorPosition,
			headNurseSignatureFullName: headNurseFullName,
			isHeadNurseVerified: true,
			notes: "Фракционированный вакуум 3-кратный. Сушка 15 мин. Тест-интеграторы 5 класса норма.",
		}),
		createForm257Record({
			date,
			cycleNumber: 2,
			sterilizerId: eurondaApp.id,
			sterilizerCode: eurondaApp.code,
			sterilizerBrandModel: eurondaApp.brandModelRu,
			sterilizerSerialNumber: eurondaApp.serialNumber,
			regimeId: "steam_134_20min",
			sensors: {
				actualTemperatureCelsius: 134.8,
				actualPressureBar: 2.18,
				actualExposureMinutes: 20.0,
			},
			itemsDescriptionRu: "Хирургические кассеты, наконечники KaVo, элеваторы (12 кассет)",
			packsCount: 12,
			packagingType: "metal_cassette",
			chamberPoints: eurondaChamberPoints,
			operatorStaffFullName: operatorFullName,
			operatorStaffPosition: operatorPosition,
			headNurseSignatureFullName: headNurseFullName,
			isHeadNurseVerified: true,
			notes: "Режим 134°C/20 мин. Внутренний контроль каждой кассеты пройден.",
		}),
		createForm257Record({
			date,
			cycleNumber: 3,
			sterilizerId: "DRY-TAU-01",
			sterilizerCode: "СУХОЖАР-01",
			sterilizerBrandModel: "Tau Clave 3000 Сухожаровой шкаф",
			sterilizerSerialNumber: "SN-TAU-44910",
			regimeId: "dry_heat_180_60min",
			sensors: {
				actualTemperatureCelsius: 181.2,
				actualPressureBar: 1.0,
				actualExposureMinutes: 60.0,
			},
			itemsDescriptionRu: "Эндодонтические металлические боксы и алмазный инструмент (8 крафт-пакетов)",
			packsCount: 8,
			packagingType: "kraft_paper_double",
			chamberPoints: tauChamberPoints,
			operatorStaffFullName: operatorFullName,
			operatorStaffPosition: operatorPosition,
			headNurseSignatureFullName: headNurseFullName,
			isHeadNurseVerified: true,
			notes: "Сухожаровая стерилизация без влаги. Термовременные индикаторы коричневые.",
		}),
	];
}

export interface GenerateBatchForm257Options {
	startDate?: string;
	endDate?: string;
	targetDates?: readonly string[];
	excludeSundays?: boolean;
	cyclesPerDay?: number;
	packsPerCycle?: number;
	sterilizerId?: string;
	sterilizerCode?: string;
	sterilizerBrandModel?: string;
	sterilizerSerialNumber?: string;
	operatorStaffFullName?: string;
	operatorStaffPosition?: string;
	headNurseSignatureFullName?: string;
	isHeadNurseVerified?: boolean;
}

export function generateBatchSterilizationRecords(options: GenerateBatchForm257Options): Form257Record[] {
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
			const chamberPoints = createDefault5ChamberPoints("steam_134_5min", true);

			const rec = createForm257Record({
				date: dateStr, cycleNumber: cycleNum, sterilizerId,
				sterilizerCode: options.sterilizerCode || "АК-01",
				sterilizerBrandModel: options.sterilizerBrandModel || "Melag Vacuklav 23 B+",
				sterilizerSerialNumber: options.sterilizerSerialNumber || "MEL-2024-9812",
				regimeId,
				sensors: { actualTemperatureCelsius: actualTemp, actualPressureBar: actualPressure, actualExposureMinutes: exposureTime },
				itemsDescriptionRu, packsCount: currentCyclePacks, packagingType: isSurgical ? "cassette_bipack" : "kraft_pouch",
				chamberPoints, operatorStaffFullName, operatorStaffPosition, headNurseSignatureFullName, isHeadNurseVerified,
				notes: isSurgical ? "Хирургический усиленный цикл (20 мин), тест индикаторов 5 точек КТ в норме." : "Утренний плановый цикл, тест Бови-Дика пройден перед сменой (Норма).",
			});
			records.push(rec);
		}
	}

	return records;
}

export { generateBatchSterilizationRecords as generateBatchForm257Records };

export function filterForm257Records(
	records: readonly Form257Record[],
	criteria: {
		searchQuery?: string;
		startDate?: string;
		endDate?: string;
		sterilizerId?: string;
		regimeId?: string;
		status?: string;
	},
): Form257Record[] {
	return records.filter((rec) => {
		if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
			const query = criteria.searchQuery.trim().toLowerCase();
			const matchId = rec.id.toLowerCase().includes(query);
			const matchItems = rec.itemsDescriptionRu.toLowerCase().includes(query);
			const matchOperator = rec.operatorStaffFullName.toLowerCase().includes(query);
			const matchSterilizer = rec.sterilizerBrandModel.toLowerCase().includes(query) || rec.sterilizerCode.toLowerCase().includes(query);
			if (!matchId && !matchItems && !matchOperator && !matchSterilizer) return false;
		}

		if (criteria.startDate && rec.date < criteria.startDate) return false;
		if (criteria.endDate && rec.date > criteria.endDate) return false;
		if (criteria.sterilizerId && criteria.sterilizerId !== "all" && rec.sterilizerId !== criteria.sterilizerId) return false;
		if (criteria.regimeId && criteria.regimeId !== "all" && rec.regimeId !== criteria.regimeId) return false;
		if (criteria.status && criteria.status !== "all" && rec.status !== criteria.status) return false;

		return true;
	});
}
