/**
 * apps/web/src/components/perio/perioMath.ts
 *
 * Клинический фасад математики пародонтологии и ВОЗ/PSR скрининга (Мандат 8b, <= 120 строк).
 * Реэкспортирует чистые типы, пресеты и расчетные движки без потери обратной совместимости.
 */

export * from "./perioMathTypes";
export * from "./perioMathPresets";
export * from "./perioPsrEngine";

export {
	ALL_PERIO_TEETH,
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	formatPsrSextantsSummary,
	isFurcationEligibleTooth,
	PERIO_SITE_KEYS,
	type PerioChartSummary,
	type PerioToothRecord,
	PSR_SEXTANTS,
	type PsrSextantResult,
} from "@dental/shared";

import {
	applyGingivalRecessionPreset,
	applyGingivitisPreset,
	applyHealthyPeriodontiumPreset,
	PERIO_EXPRESS_PRESETS,
} from "./perioMathPresets";
import {
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	applyPsrSextantCode,
	generatePsrDiaryProtocol,
	getPsrMaxCode,
	hasPsrAsterisk,
} from "./perioPsrEngine";

export {
	PERIO_EXPRESS_PRESETS,
	applyHealthyPeriodontiumPreset,
	applyGingivitisPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	applyGingivalRecessionPreset,
	applyPsrSextantCode,
	generatePsrDiaryProtocol,
	getPsrMaxCode,
	hasPsrAsterisk,
};
