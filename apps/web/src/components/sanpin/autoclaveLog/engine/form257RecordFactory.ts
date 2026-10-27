import {
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_STERILIZERS_CATALOG,
} from "../autoclaveLogPresets.js";
import {
	calculateDigitalStampHash,
	generateForm257RecordId,
} from "./packageBarcodeGenerator.js";
import {
	evaluate5ChamberPoints,
	evaluateCycleParameters,
} from "./sterilizationCycleValidator.js";
import type { CreateForm257RecordParams, Form257Record } from "./types.js";

export function createSterilizationLogRecord(params: CreateForm257RecordParams): Form257Record {
	const sterilizer = STATUTORY_STERILIZERS_CATALOG.find((s) => s.id === params.sterilizerId) ?? STATUTORY_STERILIZERS_CATALOG[0];
	const regime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === params.regimeId) ?? STATUTORY_STERILIZATION_REGIMES[0];
	const packaging = STATUTORY_PACKAGING_TYPES.find((p) => p.id === params.packagingType) ?? STATUTORY_PACKAGING_TYPES[0];

	const cycleCompliance = evaluateCycleParameters(regime?.id ?? "steam_134_5min", params.sensors);
	const pointsEvaluation = evaluate5ChamberPoints(params.chamberPoints);
	const isCyclePassed = cycleCompliance.isCompliant && pointsEvaluation.areAllPointsPassed;

	const failureReasons: string[] = [...cycleCompliance.failureReasons];
	if (!pointsEvaluation.areAllPointsPassed) {
		failureReasons.push(pointsEvaluation.summaryRu);
	}

	const status = isCyclePassed ? "sterile_passed" : "rejected_defect";
	const rejectionReason = failureReasons.length > 0 ? failureReasons.join("; ") : undefined;
	const id = generateForm257RecordId(params.date, params.cycleNumber, sterilizer?.code ?? "АК-01");
	const digitalStampHash = calculateDigitalStampHash({
		id, date: params.date, cycleNumber: params.cycleNumber,
		sterilizerCode: params.sterilizerCode ?? sterilizer?.code ?? "АК-01",
		actualTemp: params.sensors.actualTemperatureCelsius,
		actualPressure: params.sensors.actualPressureBar,
		actualTime: params.sensors.actualExposureMinutes,
		isPassed: isCyclePassed,
		operatorName: params.operatorStaffFullName,
	});

	const chemicalIndName = params.chamberPoints[0]?.indicatorTradeNameRu ?? "Химический интегратор 5 класса (пар 134°C)";

	return {
		id,
		date: params.date,
		cycleNumber: params.cycleNumber,
		sterilizerId: sterilizer?.id ?? params.sterilizerId ?? "autoclave-melag-vacuklav-23b",
		sterilizerCode: params.sterilizerCode ?? sterilizer?.code ?? "АК-01",
		sterilizerBrandModel: params.sterilizerBrandModel ?? `${sterilizer?.brand ?? ""} ${sterilizer?.model ?? ""}`.trim(),
		sterilizerSerialNumber: params.sterilizerSerialNumber ?? sterilizer?.serialNumber ?? "",
		regimeId: regime?.id ?? "steam_134_5min",
		regimeNameRu: regime?.nameRu ?? "",
		targetTemperatureCelsius: regime?.targetTemperatureCelsius ?? 134,
		targetPressureBar: regime?.targetPressureBar ?? 2.1,
		targetExposureMinutes: regime?.exposureTimeMinutes ?? 5,
		actualTemperatureCelsius: params.sensors.actualTemperatureCelsius,
		actualPressureBar: params.sensors.actualPressureBar,
		actualExposureMinutes: params.sensors.actualExposureMinutes,
		itemsDescriptionRu: params.itemsDescriptionRu,
		packsCount: params.packsCount,
		bixNumber: params.bixNumber?.trim() || undefined,
		packagingType: packaging?.id ?? "kraft_pouch_sealed",
		packagingNameRu: packaging?.nameRu ?? "",
		shelfLifeDays: packaging?.shelfLifeDays ?? 30,
		chamberPoints: params.chamberPoints,
		areAllPointsPassed: pointsEvaluation.areAllPointsPassed,
		chemicalIndicatorNameRu: chemicalIndName,
		bioTestId: params.bioTestId,
		bioTestResult: params.bioTestResult,
		isCyclePassed,
		status,
		rejectionReason,
		operatorStaffFullName: params.operatorStaffFullName,
		operatorStaffPosition: params.operatorStaffPosition ?? "Сотрудник ЦСО / Врач",
		headNurseSignatureFullName: params.headNurseSignatureFullName,
		isHeadNurseVerified: Boolean(params.isHeadNurseVerified),
		verificationTimestamp: params.isHeadNurseVerified ? new Date().toISOString() : undefined,
		digitalStampHash,
		notes: params.notes,
		createdAt: new Date().toISOString(),
	};
}

export { createSterilizationLogRecord as createForm257Record };
