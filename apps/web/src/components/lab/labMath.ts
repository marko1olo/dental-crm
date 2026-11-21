/**
 * labMath.ts — Types, Constants, VITA Shades, and Kopeck-Exact Financial Math.
 * Декомпозирован по Мандату 8b (строго <= 120 строк).
 */

export * from "./labShadesData";
export * from "./labBarcodeQr";
export * from "./labClinicalStages";

export * from "./orderEngine/labAppointmentDraftHelper";
export * from "./orderEngine/labMaterialsCatalog";

export * from "./math/labDataTypes";
export * from "./math/labConstructionTypes";
export * from "./math/labJawFormatting";
export {
	type ExpressLabPreset,
	EXPRESS_LAB_PRESETS,
	CANONICAL_EXPRESS_LAB_PRESETS,
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
	MODAL_EXPRESS_LAB_PRESETS,
} from "./dentalLabCatalogData";
export * from "./math/labFinancialSplit";
