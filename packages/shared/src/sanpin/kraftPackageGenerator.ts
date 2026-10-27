/**
 * packages/shared/src/sanpin/kraftPackageGenerator.ts
 *
 * Канонический фасад генерации пакетов стерилизации и штрихкодов.
 * Мандат 8b: строго <= 120 строк.
 * Мандаты 8e, 8n: 1-клик пакетный учет без блокировок и поштучных симуляторов.
 */

export * from "./kraftCatalogs.js";
export * from "./kraftBatchEngine.js";
export * from "./kraftPrinterEncoding.js";
export {
	calculatePackageExpiration,
	evaluateKraftPackageStatus,
	sanitizeForThermalPrinter,
	generateTsplLabel,
	generateZplLabel,
	generateThermalStickerHtml,
	generateA4BatchSheetHtml,
} from "./thermalLabelEngine.js";
export {
	generateSanpinCode128Svg,
	generateSanpinDataMatrixSvg,
	formatKraftDataMatrixPayload,
	generate1DBarcodeString,
} from "./barcodeGenerators.js";
export {
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
} from "./kraftPackageTypes.js";
