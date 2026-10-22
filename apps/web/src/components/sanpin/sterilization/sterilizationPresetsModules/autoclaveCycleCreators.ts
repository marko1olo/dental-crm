import { SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET } from "./autoclavePresetsCatalog.js";
import { AUTOCLAVE_CYCLE_PRESETS } from "./dryHeatAndVacuumPresets.js";
import type { AutoclaveCycleRecord } from "./types.js";

export function createQuickAutoclaveCycle(
	presetIdOrCycleNumber: string | number = 1,
	cycleNumberOrOperator: number | string = "Смирнова А.В. (медсестра ЦСО)",
	operatorOrOverrides: string | Partial<AutoclaveCycleRecord> = "Смирнова А.В. (медсестра ЦСО)",
	overrides: Partial<AutoclaveCycleRecord> = {},
): AutoclaveCycleRecord {
	let presetId = "universal_134";
	let cycleNumber = 1;
	let operatorName = "Смирнова А.В. (медсестра ЦСО)";
	let finalOverrides: Partial<AutoclaveCycleRecord> = {};

	if (typeof presetIdOrCycleNumber === "number") {
		cycleNumber = presetIdOrCycleNumber;
		if (typeof cycleNumberOrOperator === "string") operatorName = cycleNumberOrOperator;
		if (typeof operatorOrOverrides === "object" && operatorOrOverrides !== null) finalOverrides = operatorOrOverrides;
	} else if (typeof presetIdOrCycleNumber === "string") {
		if (typeof cycleNumberOrOperator === "number") {
			presetId = presetIdOrCycleNumber;
			cycleNumber = cycleNumberOrOperator;
			if (typeof operatorOrOverrides === "string") operatorName = operatorOrOverrides;
			finalOverrides = overrides;
		} else {
			presetId = presetIdOrCycleNumber;
			if (typeof cycleNumberOrOperator === "string") operatorName = cycleNumberOrOperator;
			if (typeof operatorOrOverrides === "object" && operatorOrOverrides !== null) finalOverrides = operatorOrOverrides;
		}
	}

	const preset = AUTOCLAVE_CYCLE_PRESETS.find((p) => p.id === presetId) || SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET;
	const now = new Date().toISOString();
	return {
		...preset,
		id: `CYC-${cycleNumber}-${Date.now().toString(36)}`,
		cycleNumber,
		operatorName,
		timestamp: now,
		...finalOverrides,
	};
}

export function createQuickUniversalCycle(cycleNumber = 1, operatorName = "Смирнова А.В. (медсестра ЦСО)"): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("universal_134", cycleNumber, operatorName, { id: `cycle-univ-${cycleNumber}-${Date.now().toString(36)}` });
}

export function createQuickStandard132Cycle(cycleNumber = 1, operatorName = "Смирнова А.В. (медсестра ЦСО)"): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("standard_132", cycleNumber, operatorName, { id: `cycle-std132-${cycleNumber}-${Date.now().toString(36)}` });
}

export function createQuickPrionCycle(cycleNumber = 1, operatorName = "Смирнова А.В. (медсестра ЦСО)"): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("prion_134", cycleNumber, operatorName, { id: `cycle-prion-${cycleNumber}-${Date.now().toString(36)}` });
}

export function createQuickDelicateCycle(cycleNumber = 1, operatorName = "Смирнова А.В. (медсестра ЦСО)"): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("delicate_121", cycleNumber, operatorName, { id: `cycle-delicate-${cycleNumber}-${Date.now().toString(36)}` });
}

export function createQuickDryHeat180Cycle(cycleNumber = 1, operatorName = "Смирнова А.В. (медсестра ЦСО)"): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("dry_heat_180", cycleNumber, operatorName, { id: `cycle-dry180-${cycleNumber}-${Date.now().toString(36)}` });
}

export function createQuickDryHeat160Cycle(cycleNumber = 1, operatorName = "Смирнова А.В. (медсестра ЦСО)"): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("dry_heat_160", cycleNumber, operatorName, { id: `cycle-dry160-${cycleNumber}-${Date.now().toString(36)}` });
}

export function createQuickDailyShiftAutoclaveCycles(cyclesCountOrOperator: number | string = 3, operatorName = "Смирнова А.В. (медсестра ЦСО)"): AutoclaveCycleRecord[] {
	const cyclesCount = typeof cyclesCountOrOperator === "number" ? cyclesCountOrOperator : 3;
	const opName = typeof cyclesCountOrOperator === "string" ? cyclesCountOrOperator : operatorName;
	const result: AutoclaveCycleRecord[] = [];
	for (let i = 1; i <= cyclesCount; i++) {
		result.push(createQuickUniversalCycle(i, opName));
	}
	return result;
}
