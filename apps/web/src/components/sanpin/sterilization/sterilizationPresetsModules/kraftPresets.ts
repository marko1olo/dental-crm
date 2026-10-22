/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/kraftPresets.ts
 *
 * Фасад: Нормативные типоразмеры крафт-пакетов, химические индикаторы и стандартные лотки.
 */

export {
	SAMPLE_TEST_BARCODES,
	getSampleKraftBarcodes,
} from "./kraftSampleBarcodesData.js";

export {
	STATUTORY_CHEMICAL_INDICATOR_OPTIONS,
	STATUTORY_KRAFT_SIZES,
} from "./kraftSizesAndIndicatorsData.js";

export {
	STANDARD_TRAY_OPTIONS,
	createStandardSterileTrayBarcode,
} from "./kraftStandardTraysData.js";
