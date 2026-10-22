/**
 * RETROACTIVE SANPIN VALIDATOR & DOSSIER EXPORTER (Layer 3 Фасад)
 * Мандат 8b: модульная композиция до 120 строк на файл.
 */

export {
	validateRetroactiveDaySanpin,
	validateRetroactiveBatchSanpin,
} from "./retroactiveValidationRules.js";

export {
	generateRetroactiveDossierPrintHtml,
} from "./retroactiveDossierHtml.js";

export {
	exportRetroactiveBatchToCsv,
} from "./retroactiveCsvExporter.js";
