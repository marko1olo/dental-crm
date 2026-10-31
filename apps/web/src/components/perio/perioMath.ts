/**
 * perioMath.ts — Клинический фасад математики пародонтологии и PSR скрининга (Мандат 8b: < 60 строк).
 * Реэкспортирует канонический SSOT perioCatalogData и @dental/shared.
 */

export * from "./perioCatalogData";

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
