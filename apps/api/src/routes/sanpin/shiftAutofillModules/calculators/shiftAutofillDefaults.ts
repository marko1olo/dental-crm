import type { PsoBatchItem, SterilizationBatchItem } from "../shiftAutofillSchemas.js";

export * from "./shiftAutofillEquipments.js";

export function getShiftPsoBatches(providedRecords?: PsoBatchItem[] | any[]): any[] {
	if (Array.isArray(providedRecords) && providedRecords.length > 0) {
		return providedRecords;
	}
	return [
		{
			instrumentName: "Терапевтический смотровой инструментарий (зеркала, зонды, пинцеты)",
			batchItemCount: 120,
			testedSampleCount: 5,
			detergentBrand: "Биолот 0.5% + Аламинол 1%",
			notes: "СанПиН 3.3686-21. 1% от партии проверен. Азопирам/фенолфталеин отрицательны.",
		},
		{
			instrumentName: "Хирургический инструментарий (щипцы, элеваторы)",
			batchItemCount: 40,
			testedSampleCount: 4,
			detergentBrand: "Оптимакс Про 1.5%",
			notes: "Кровь и белковые загрязнения отсутствуют.",
		},
		{
			instrumentName: "Эндодонтический инструментарий и боры",
			batchItemCount: 150,
			testedSampleCount: 5,
			detergentBrand: "Биолот 0.5%",
			notes: "УЗ-мойка 15 мин. Пробы отрицательные.",
		},
	];
}

export function getShiftSterilizationRecords(
	sterilizationRecords?: SterilizationBatchItem[] | any[],
	form257Fallback?: any[],
): any[] {
	if (Array.isArray(sterilizationRecords) && sterilizationRecords.length > 0) {
		return sterilizationRecords;
	}
	if (Array.isArray(form257Fallback) && form257Fallback.length > 0) {
		return form257Fallback;
	}
	return [
		{
			sterilizerBrandModel: "Автоклав Euronda E9 Next (Класс B)",
			sterilizerId: "АК-01",
			cycleNumber: 1,
			itemsDescription: "Стоматологический инструментарий смены",
			packagingType: "kraft_bag",
			temperatureCelsius: "134",
			pressureBar: "2.15",
			durationMin: 5,
		},
		{
			sterilizerBrandModel: "Автоклав Euronda E9 Next (Класс B)",
			sterilizerId: "АК-01",
			cycleNumber: 2,
			itemsDescription: "Хирургические наконечники и турбины",
			packagingType: "kraft_bag",
			temperatureCelsius: "134",
			pressureBar: "2.15",
			durationMin: 5,
		},
	];
}
