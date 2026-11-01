/**
 * apps/web/src/components/sanpin/sterilizationCatalogData.ts
 *
 * Канонический ре-экспортный фасад каталога стерилизации (Мандаты 8b, 8e, 8n).
 * Устраняет дублирование данных: единый источник правды (SSOT) — sanpinCatalogData.ts.
 * Строго <= 50 строк (Мандат 8b/8zi).
 */

export * from "./sanpinCatalogData";

export const PRESET_PACK_COUNTS = [6, 12, 18, 24] as const;

export type AutoclaveRegimeId = "standard_134" | "delicate_121" | "flash_134";

export {
	AUTOCLAVE_PROGRAMS,
	CLINIC_STERILIZERS,
	CLINIC_SEALING_MACHINES,
	BACTERICIDAL_STANDARD_DEVICES,
	CHEMICAL_INDICATORS,
	STERILIZATION_PACKAGING,
	CLINICAL_BATCH_TEMPLATES,
	PSO_QUALITY_STANDARD,
	calculateBatchStockDeduction,
	validateSterilizationCycleParameters,
	createOneClickShiftBatch,
	getSanpinBatchRecords,
	generateSanpinPrintHtml,
	generateKraftStickersHtml,
} from "./sanpinCatalogData";
