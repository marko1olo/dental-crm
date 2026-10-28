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
} from "../sanpinRegistryEngine.js";

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
