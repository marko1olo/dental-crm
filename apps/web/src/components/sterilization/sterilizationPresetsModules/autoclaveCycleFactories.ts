/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/autoclaveCycleFactories.ts
 *
 * Фабрики быстрых одиночных циклов автоклавирования.
 * Мандат 8b: строго <= 120 строк.
 */

import {
	SANPIN_AUTOCLAVE_CLASS_B_PRESET,
	SANPIN_AUTOCLAVE_DELICATE_121_PRESET,
	SANPIN_AUTOCLAVE_PRION_134_PRESET,
	SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET,
	SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET,
	SANPIN_DRY_HEAT_160_150_PRESET,
	SANPIN_DRY_HEAT_180_60_PRESET,
} from "./autoclavePresetsDefinitions.js";
import type { AutoclaveCycleRecord } from "./types.js";

const DEFAULT_OPERATOR = "Смирнова А.В. (медсестра ЦСО)";

export function createQuickAutoclaveCycle(
	cycleNumber: number,
	operatorName = DEFAULT_OPERATOR,
): AutoclaveCycleRecord {
	return {
		id: `cycle-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickUniversalCycle(
	cycleNumber: number,
	operatorName = DEFAULT_OPERATOR,
): AutoclaveCycleRecord {
	return {
		id: `cycle-univ-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickStandard132Cycle(
	cycleNumber: number,
	operatorName = DEFAULT_OPERATOR,
): AutoclaveCycleRecord {
	return {
		id: `cycle-std132-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickPrionCycle(
	cycleNumber: number,
	operatorName = DEFAULT_OPERATOR,
): AutoclaveCycleRecord {
	return {
		id: `cycle-prion-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_PRION_134_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDelicateCycle(
	cycleNumber: number,
	operatorName = DEFAULT_OPERATOR,
): AutoclaveCycleRecord {
	return {
		id: `cycle-delicate-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_DELICATE_121_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDryHeat180Cycle(
	cycleNumber: number,
	operatorName = DEFAULT_OPERATOR,
): AutoclaveCycleRecord {
	return {
		id: `cycle-dry180-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_DRY_HEAT_180_60_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDryHeat160Cycle(
	cycleNumber: number,
	operatorName = DEFAULT_OPERATOR,
): AutoclaveCycleRecord {
	return {
		id: `cycle-dry160-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_DRY_HEAT_160_150_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}
