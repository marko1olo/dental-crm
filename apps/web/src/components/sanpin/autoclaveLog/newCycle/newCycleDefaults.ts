import { createDefault5ChamberPoints, type ChamberPointEvaluation } from "../autoclaveLogEngine.js";
import type { PackagingTypeId, SterilizationRegimeId } from "../autoclaveLogPresets.js";

export const EXPRESS_CYCLE_DEFAULTS = {
	regimeId: "steam_134_5min" as const,
	targetTemperatureCelsius: 134,
	targetPressureBar: 2.1,
	targetExposureMinutes: 5,
	itemsDescription: "Наконечники турбинные и угловые, смотровые лотки (зеркала, зонды, пинцеты), хирургический инструмент",
	defaultPacksCount: 14,
	defaultBixNumber: "Бикс № 1 (КСКФ-3) / Пакеты № 1-14",
	packagingType: "kraft_pouch_sealed" as const,
	defaultOperatorName: "Сотрудник клиники",
	fallbackOperatorName: "Дежурный ассистент",
	fallbackItemsDescription: "Смотровые лотки и наконечники (стандартный набор)",
	fallbackPacksCount: 1,
} as const;

export interface ExpressCycleFillState {
	readonly selectedRegimeId: SterilizationRegimeId;
	readonly actualTemp: number;
	readonly actualPressure: number;
	readonly actualTime: number;
	readonly itemsDescription: string;
	readonly packsCount: number;
	readonly bixNumber: string;
	readonly packagingType: PackagingTypeId;
	readonly operatorFullName: string;
	readonly chamberPoints: ChamberPointEvaluation[];
}

export function computeExpressStandardCycleValues(params: {
	currentPacksCount?: number;
	currentBixNumber?: string;
	currentOperatorName?: string;
	defaultOperatorName?: string;
	selectedIndicatorId?: string;
}): ExpressCycleFillState {
	const packs = params.currentPacksCount && params.currentPacksCount > 0 ? params.currentPacksCount : EXPRESS_CYCLE_DEFAULTS.defaultPacksCount;
	const operator = params.currentOperatorName?.trim() || params.defaultOperatorName?.trim() || EXPRESS_CYCLE_DEFAULTS.defaultOperatorName;
	return {
		selectedRegimeId: EXPRESS_CYCLE_DEFAULTS.regimeId,
		actualTemp: EXPRESS_CYCLE_DEFAULTS.targetTemperatureCelsius,
		actualPressure: EXPRESS_CYCLE_DEFAULTS.targetPressureBar,
		actualTime: EXPRESS_CYCLE_DEFAULTS.targetExposureMinutes,
		itemsDescription: EXPRESS_CYCLE_DEFAULTS.itemsDescription,
		packsCount: packs,
		bixNumber: params.currentBixNumber?.trim() || EXPRESS_CYCLE_DEFAULTS.defaultBixNumber,
		packagingType: EXPRESS_CYCLE_DEFAULTS.packagingType,
		operatorFullName: operator,
		chamberPoints: createDefault5ChamberPoints(params.selectedIndicatorId ?? "intetest_v_134_5", true),
	};
}

export function resolveAutoclaveCycleFallbacks(input: {
	operatorFullName?: string;
	defaultOperatorName?: string;
	itemsDescription?: string;
	packsCount?: number;
}): {
	readonly operatorStaffFullName: string;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
} {
	const operatorStaffFullName = input.operatorFullName?.trim() || input.defaultOperatorName?.trim() || EXPRESS_CYCLE_DEFAULTS.fallbackOperatorName;
	const itemsDescriptionRu = input.itemsDescription?.trim() || EXPRESS_CYCLE_DEFAULTS.fallbackItemsDescription;
	const packsCount = input.packsCount && input.packsCount > 0 ? input.packsCount : EXPRESS_CYCLE_DEFAULTS.fallbackPacksCount;
	return { operatorStaffFullName, itemsDescriptionRu, packsCount };
}
