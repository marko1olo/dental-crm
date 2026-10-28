/**
 * packages/shared/src/sanpin/shiftAutopilot/secondaryLogsShiftGenerator.ts
 * Генераторы вторичных журналов: кварцевание ламп, уборки, дезсредства, термометрия, отходы.
 * Мандат 8b: строго <= 120 строк.
 */

import {
	calculateRequiredConcentrateForVolume,
	type BactericidalSessionRecord,
	type DisinfectantJournalRecord,
	type GeneralCleaningJournalRecord,
} from "../sanpinRegistryEngine.js";
import type { ShiftAutopilotTemperatureRecord, ShiftAutopilotWasteRecord } from "./types.js";

export function generateShiftBactericidalSessions(date: string, operatorFullName: string): BactericidalSessionRecord[] {
	return [
		{
			id: `bac-${date}-01`,
			equipmentId: "BAC-DEZAR4-01",
			roomName: "Кабинет №1 (Терапевтическая стоматология)",
			deviceBrand: "Дезар-4 (КРОНТ-802)",
			date,
			sessionStartTime: "08:00",
			sessionEndTime: "08:30",
			durationMinutes: 30,
			durationHours: 0.5,
			operatingMode: "pre_op_preparation",
			cumulativeHoursAfterSession: 1421.0,
			operatorStaffFullName: operatorFullName,
			notes: "Предсменная подготовка воздуха. Наработка ламп 1421/8000 ч (Норма).",
		},
		{
			id: `bac-${date}-02`,
			equipmentId: "BAC-DEZAR7-02",
			roomName: "Кабинет №2 (Хирургическая стоматология / Имплантация)",
			deviceBrand: "Дезар-7 (КРОНТ-803 настенный)",
			date,
			sessionStartTime: "14:00",
			sessionEndTime: "14:30",
			durationMinutes: 30,
			durationHours: 0.5,
			operatingMode: "post_cleaning",
			cumulativeHoursAfterSession: 981.0,
			operatorStaffFullName: operatorFullName,
			notes: "Заключительное УФ-обеззараживание после уборки. Наработка 981/8000 ч (Норма).",
		},
	];
}

export function generateShiftCleaningRecords(
	date: string,
	operatorFullName: string,
	inspectorFullName: string,
): GeneralCleaningJournalRecord[] {
	return [
		{
			id: `clean-${date}-01`,
			roomType: "surgical",
			roomName: "Хирургический кабинет №2",
			scheduledDate: date,
			actualDateTime: `${date}T08:00:00Z`,
			treatedAreaM2: 28.5,
			disinfectantName: "Аламинол 1.5%",
			activeIngredient: "Алкилдиметилбензиламмоний хлорид (ЧАС) + Глутаровый альдегид",
			solutionConcentrationPercent: 1.5,
			applicationMethodRu: "Двукратное протирание поверхностей",
			exposureTimeMinutes: 60,
			uvIrradiationMinutes: 60,
			ventilationMinutes: 15,
			operatorStaffFullName: operatorFullName,
			inspectorStaffFullName: inspectorFullName,
			isInspectorVerified: true,
			status: "verified_by_inspector",
			notes: "Регламентная санитарная обработка поверхностей кабинета и стоматологической установки.",
		},
	];
}

export function generateShiftDisinfectantRecords(date: string, operatorFullName: string): DisinfectantJournalRecord[] {
	const disMath = calculateRequiredConcentrateForVolume(10, 1.5);
	return [
		{
			id: `dis-${date}-01`,
			timestamp: `${date}T08:00:00Z`,
			operationType: "consumption",
			tradeName: "Аламинол (концентрат)",
			amount: disMath.concentrateLiters,
			unit: "л",
			invoiceOrObjectInfo: "Приготовление 10 л рабочего раствора 1.5% для генеральной уборки",
			batchOrExpirationDate: "ПАРТ-2026/08",
			solutionPreparedLiters: 10.0,
			concentrationPercent: 1.5,
			isConcentrationNormal: true,
			resultingStockBalance: 8.5,
			operatorStaffFullName: operatorFullName,
			notes: `Срок годности рабочего раствора — 10 суток. Дезиконт-Аламинол норма 1.5%. ${disMath.formulaRu}`,
		},
	];
}

export function generateShiftTemperatureRecords(date: string, operatorFullName: string): ShiftAutopilotTemperatureRecord[] {
	return [
		{
			id: `temp-${date}-01`,
			measurementDate: date,
			measurementPeriod: "morning",
			equipmentName: "Фармацевтический холодильник Pozis ХФ-250 №1",
			location: "Центральное стерилизационное отделение (ЦСО)",
			meterDeviceName: "Термометр ТМН-1 с поверкой",
			meterSerialNumber: "SN-ТМН-4819",
			temperatureCelsius: 4.2,
			relativeHumidityPercent: 55,
			targetTempMinCelsius: 2.0,
			targetTempMaxCelsius: 8.0,
			isWithinNorm: true,
			operatorStaffFullName: operatorFullName,
		},
		{
			id: `temp-${date}-02`,
			measurementDate: date,
			measurementPeriod: "evening",
			equipmentName: "Фармацевтический холодильник Pozis ХФ-250 №1",
			location: "Центральное стерилизационное отделение (ЦСО)",
			meterDeviceName: "Термометр ТМН-1 с поверкой",
			meterSerialNumber: "SN-ТМН-4819",
			temperatureCelsius: 4.5,
			relativeHumidityPercent: 54,
			targetTempMinCelsius: 2.0,
			targetTempMaxCelsius: 8.0,
			isWithinNorm: true,
			operatorStaffFullName: operatorFullName,
		},
	];
}

export function generateShiftWasteRecords(date: string, operatorFullName: string): ShiftAutopilotWasteRecord[] {
	return [
		{
			id: `waste-${date}-01`,
			date: `${date}T17:00:00Z`,
			wasteClass: "class_B",
			wasteDescription: "Отработанные инъекционные карпульные иглы 30G/27G, карпулы анестетиков, лезвия скальпелей",
			packageType: "yellow_sharps_container",
			packageCount: 1,
			weightKg: 1.25,
			disinfectionMethod: "chemical_soaking",
			disinfectantUsed: "Бриллиант Классик 2.0%",
			responsibleStaffFullName: operatorFullName,
		},
	];
}
