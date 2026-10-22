import {
	AUTOCLAVE_CYCLES,
	type AutoclaveCycleId,
	type AutoclavePackagingType,
	type IndicatorQualityClass,
} from "./autoclavePresets";
import { generateSanpinBarcode } from "./autoclaveBarcodeFormat";
import { validateSterilizationCycleParameters } from "./autoclaveCycleValidation";
import type { Form257SterilizerJournalEntry } from "./autoclaveEngineTypes";

export function createForm257JournalEntry(params: {
	autoclaveId: string;
	deviceName: string;
	cycleNumber: number;
	cycleId: AutoclaveCycleId;
	measuredTemp: number;
	measuredPressure: number;
	measuredDurationMin: number;
	loadDescriptionRu: string;
	packCount: number;
	packagingType: AutoclavePackagingType;
	indicatorType: IndicatorQualityClass;
	isIndicatorPassed: boolean;
	operatorName: string;
	notes?: string;
}): Form257SterilizerJournalEntry {
	const cycleDef = AUTOCLAVE_CYCLES[params.cycleId] || AUTOCLAVE_CYCLES.cycle_134_wrapped;
	const validation = validateSterilizationCycleParameters(
		cycleDef,
		params.measuredTemp,
		params.measuredPressure,
		params.measuredDurationMin,
	);

	const isBatchApproved = validation.isApproved && params.isIndicatorPassed;
	const now = new Date();

	const generatedBarcodes: string[] = [];
	for (let i = 1; i <= params.packCount; i++) {
		generatedBarcodes.push(generateSanpinBarcode(params.autoclaveId, params.cycleNumber, now, i));
	}

	return {
		id: `F257-${params.autoclaveId}-${params.cycleNumber}-${Date.now()}`,
		date: now.toISOString().slice(0, 10),
		cycleNumber: params.cycleNumber,
		deviceName: params.deviceName,
		autoclaveId: params.autoclaveId,
		cycleType: params.cycleId,
		cycleNameRu: cycleDef.nameRu,
		sterilizationMode: {
			temperatureCelsius: params.measuredTemp,
			pressureBar: params.measuredPressure,
			durationMinutes: params.measuredDurationMin,
		},
		loadDescriptionRu: params.loadDescriptionRu,
		packsCount: params.packCount,
		packagingType: params.packagingType,
		indicatorType: params.indicatorType,
		indicatorColorBeforeRu: "Светло-желтый / Розовый (исходный)",
		indicatorColorAfterRu: params.isIndicatorPassed ? "Темно-коричневый / Черный (эталонный)" : "Без изменений (брак)",
		isIndicatorPassed: params.isIndicatorPassed,
		isBiologicalTestConducted: cycleDef.mandatoryIndicators.includes("biological_spores"),
		biologicalTestResult: cycleDef.mandatoryIndicators.includes("biological_spores") ? "passed" : "not_conducted",
		isBatchApproved,
		operatorName: params.operatorName,
		operatorSignatureStamp: `УКЭП: ${params.operatorName} • ${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU")}`,
		generatedBarcodes,
		notes: params.notes,
	};
}
