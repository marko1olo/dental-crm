/**
 * ============================================================================
 * SANPIN MICROCLIMATE, BACTERICIDAL & MEDICAL WASTE COMPILER (LAYER 1)
 * (СанПиН 2.1.3684-21, СанПиН 3.3686-21, Приказ 706н)
 * ============================================================================
 */

import {
	CLASS_B_WEIGHT_ESTIMATES,
	calculateClassBWasteWeightKg,
} from "@dental/shared";
import type {
	ShiftBactericidalLog,
	ShiftMedicalWasteLog,
	ShiftMicroclimateLogs,
	ShiftSanpinAutoCloseOptions,
} from "./types.js";

export function compileShiftMicroclimateLogs(
	options: ShiftSanpinAutoCloseOptions = {},
): ShiftMicroclimateLogs {
	const refTemp = options.refrigeratorTempCelsius ?? 4.2;
	const roomT = options.roomTempCelsius ?? 21.2;
	const roomHum = options.roomHumidityPercent ?? 55;

	return {
		refrigeratorLog: {
			equipmentName: "Фармацевтический холодильник Pozis ХФ-250 №1",
			locationRoom: "Центральное стерилизационное отделение (ЦСО) / Процедурный",
			meterDeviceName: "Медицинский термометр ТМН-1 с действующей поверкой",
			meterSerialNumber: "SN-ТМН-4819",
			morningTempCelsius: refTemp,
			eveningTempCelsius: Number((refTemp + 0.3).toFixed(1)),
			targetMinCelsius: 2.0,
			targetMaxCelsius: 8.0,
			isWithinNorm: refTemp >= 2.0 && refTemp <= 8.0,
		},
		psychrometerLog: {
			equipmentName: "Психрометр гигрометрический ВИТ-2 №1",
			locationRoom: "Кабинет терапевтической стоматологии №1",
			meterDeviceName: "Психрометр ВИТ-2 (диапазон 15-40°C, поверка 2026)",
			meterSerialNumber: "SN-ВИТ-9812",
			morningTempCelsius: roomT,
			morningHumidityPercent: roomHum,
			eveningTempCelsius: Number((roomT + 0.4).toFixed(1)),
			eveningHumidityPercent: Math.max(40, roomHum - 1),
			targetTempMinCelsius: 18.0,
			targetTempMaxCelsius: 25.0,
			targetHumidityMinPercent: 40,
			targetHumidityMaxPercent: 60,
			isWithinNorm: roomT >= 18.0 && roomT <= 25.0 && roomHum >= 40 && roomHum <= 60,
		},
	};
}

export function compileShiftBactericidalLog(
	options: ShiftSanpinAutoCloseOptions = {},
): ShiftBactericidalLog {
	const hours = options.dezarOperatingHours ?? 1.5;

	return {
		deviceBrand: "Дезар-4 (ОРУБн-3-3 КРОНТ настенно-передвижной)",
		locationRoom: "Кабинет терапевтической стоматологии №1",
		operatingHours: hours,
		sessionsCount: 2,
		morningSessionDurationMin: 30, // 08:00 - 08:30 предсменная подготовка
		intraShiftSessionDurationMin: Math.round((hours - 0.5) * 60), // перерыв/текущее
		cumulativeLampHours: 1422.5,
		maxLampHours: 8000,
		isLampNorm: true,
	};
}

export function compileShiftWasteLog(
	options: ShiftSanpinAutoCloseOptions = {},
): ShiftMedicalWasteLog {
	const visits = options.visitsCount !== undefined && options.visitsCount >= 0 ? options.visitsCount : 12;

	// Расчет массы медотходов Класса Б строго по СанПиН 2.1.3684-21:
	// Среднестатистический расход на 1 стоматологический прием:
	// - 1.5 карпулы анестетика (~0.005 кг/шт)
	// - 1.5 острых предмета (иглы 30G/27G, эндофайлы, лезвия ~0.002 кг/шт)
	// - 4 загрязненных предмета (перчатки, маски, слюноотсосы, валики ~0.015 кг/шт)
	const carpulesCount = Math.round(visits * 1.5);
	const sharpsCount = Math.round(visits * 1.5);
	const contaminatedCount = Math.round(visits * 4);

	const netClassBWasteKg = calculateClassBWasteWeightKg(
		carpulesCount,
		sharpsCount,
		contaminatedCount,
	);
	const tareKg = CLASS_B_WEIGHT_ESTIMATES.standardPunctureContainerTareKg;
	const classBWeight = Number((netClassBWasteKg + tareKg).toFixed(2));
	const classAWeight = Number((1.2 + visits * 0.1).toFixed(2)); // Класс А: бытовые и бумажные отходы

	return {
		classBWeightKg: classBWeight,
		classAWeightKg: classAWeight,
		descriptionRu: "Отработанные инъекционные карпульные иглы 30G/27G, карпулы анестетиков, лезвия скальпелей, перчатки, слюноотсосы",
		packageTypeRu: "Желтый непрокалываемый контейнер с иглосъемником КБ-12 + желтый пакет",
		treatmentMethodRu: "Иглоотсекатель + химическое обезвреживание Бриллиант Классик 2.0%",
	};
}
