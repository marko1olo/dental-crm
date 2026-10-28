/**
 * packages/shared/src/sanpin/engine/autoclaveValidation/autoclaveRecordFactory.ts
 * Формирование записей журнала стерилизации и автоклавирования с цифровым штампом.
 * Мандат 8b: строго <= 120 строк.
 */

import { sha256Hex } from "../../../sync/hashing.js";
import { STATUTORY_STERILIZATION_REGIMES } from "../sanpinNorms.js";
import type { ChamberPointEvaluation, Form257Record, PhysicalSensorsData, SterilizationRegimeId } from "../types.js";
import { evaluate5ChamberPoints } from "./chamberPointsEvaluation.js";
import { evaluateCycleParameters } from "./cycleSensorsEvaluation.js";

export function generateForm257RecordId(date: string, cycleNumber: number, sterilizerCode: string): string {
	const cleanDate = date.replace(/[^0-9]/g, "").slice(0, 8);
	const paddedCycle = String(cycleNumber).padStart(2, "0");
	const cleanCode = sterilizerCode.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "").toUpperCase();
	return `F257-${cleanDate}-${cleanCode}-C${paddedCycle}`;
}

export function calculateDigitalStampHash(data: {
	id: string;
	date: string;
	cycleNumber: number;
	sterilizerCode: string;
	actualTemp: number;
	actualPressure: number;
	actualTime: number;
	isPassed: boolean;
	operatorName: string;
}): string {
	const raw = `${data.id}|${data.date}|${data.cycleNumber}|${data.sterilizerCode}|${data.actualTemp}|${data.actualPressure}|${data.actualTime}|${data.isPassed}|${data.operatorName}`;
	const hex = sha256Hex(raw).toUpperCase();
	return `DENTE-CSO-257-${hex}`;
}

export function createForm257Record(params: {
	date: string;
	cycleNumber: number;
	sterilizerId: string;
	sterilizerCode?: string | undefined;
	sterilizerBrandModel?: string | undefined;
	sterilizerSerialNumber?: string | undefined;
	regimeId: SterilizationRegimeId;
	sensors: PhysicalSensorsData;
	itemsDescriptionRu: string;
	packsCount: number;
	packagingType?: string | undefined;
	packagingNameRu?: string | undefined;
	shelfLifeDays?: number | undefined;
	chamberPoints: readonly ChamberPointEvaluation[];
	operatorStaffFullName: string;
	operatorStaffPosition?: string | undefined;
	headNurseSignatureFullName?: string | undefined;
	isHeadNurseVerified?: boolean | undefined;
	bioTestId?: string | undefined;
	bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
	notes?: string | undefined;
}): Form257Record {
	const regime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === params.regimeId) || STATUTORY_STERILIZATION_REGIMES[0]!;
	const cycleCompliance = evaluateCycleParameters(regime.id, params.sensors);
	const pointsEvaluation = evaluate5ChamberPoints(params.chamberPoints);

	const isCyclePassed = cycleCompliance.isCompliant && pointsEvaluation.areAllPointsPassed;
	const failureReasons: string[] = [...cycleCompliance.failureReasons];
	if (!pointsEvaluation.areAllPointsPassed) {
		failureReasons.push(pointsEvaluation.summaryRu);
	}

	const status = isCyclePassed ? "sterile_passed" : "rejected_defect";
	const rejectionReason = failureReasons.length > 0 ? failureReasons.join("; ") : undefined;
	const sterilizerCode = params.sterilizerCode || "АК-01";

	const id = generateForm257RecordId(params.date, params.cycleNumber, sterilizerCode);
	const digitalStampHash = calculateDigitalStampHash({
		id,
		date: params.date,
		cycleNumber: params.cycleNumber,
		sterilizerCode,
		actualTemp: params.sensors.actualTemperatureCelsius,
		actualPressure: params.sensors.actualPressureBar,
		actualTime: params.sensors.actualExposureMinutes,
		isPassed: isCyclePassed,
		operatorName: params.operatorStaffFullName,
	});

	const chemicalIndName = params.chamberPoints[0]?.indicatorTradeNameRu || "Интеграл-134 (Класс 5)";

	return {
		id,
		date: params.date,
		cycleNumber: params.cycleNumber,
		sterilizerId: params.sterilizerId,
		sterilizerCode,
		sterilizerBrandModel: params.sterilizerBrandModel || "Melag Vacuklav 23B+",
		sterilizerSerialNumber: params.sterilizerSerialNumber || "VK-2024-8841",
		regimeId: regime.id,
		regimeNameRu: regime.nameRu,
		targetTemperatureCelsius: regime.targetTemperatureCelsius,
		targetPressureBar: regime.targetPressureBar,
		targetExposureMinutes: regime.exposureTimeMinutes,
		actualTemperatureCelsius: params.sensors.actualTemperatureCelsius,
		actualPressureBar: params.sensors.actualPressureBar,
		actualExposureMinutes: params.sensors.actualExposureMinutes,
		itemsDescriptionRu: params.itemsDescriptionRu,
		packsCount: params.packsCount,
		packagingType: params.packagingType || "kraft_self_adhesive",
		packagingNameRu: params.packagingNameRu || "Крафт-пакет самоклеящийся (50 сут.)",
		shelfLifeDays: params.shelfLifeDays || 50,
		chamberPoints: params.chamberPoints,
		areAllPointsPassed: pointsEvaluation.areAllPointsPassed,
		chemicalIndicatorNameRu: chemicalIndName,
		bioTestId: params.bioTestId,
		bioTestResult: params.bioTestResult,
		isCyclePassed,
		status,
		rejectionReason,
		operatorStaffFullName: params.operatorStaffFullName,
		operatorStaffPosition: params.operatorStaffPosition || "Медсестра ЦСО",
		headNurseSignatureFullName: params.headNurseSignatureFullName,
		isHeadNurseVerified: Boolean(params.isHeadNurseVerified),
		verificationTimestamp: params.isHeadNurseVerified ? new Date().toISOString() : undefined,
		digitalStampHash,
		notes: params.notes,
		createdAt: new Date().toISOString(),
	};
}
