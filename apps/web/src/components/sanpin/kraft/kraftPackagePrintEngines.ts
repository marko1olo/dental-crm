/**
 * ============================================================================
 * SANPIN KRAFT PACKAGE PRINT ENGINES (HTML, TSPL, ZPL II, ESC/POS CP866)
 * Фасад генераторов макетов печати термоэтикеток 58x40 / 43x25 мм и низкоуровневых
 * протоколов термопринтеров.
 * ============================================================================
 */

export {
	encodeStringToCp866,
	generateEscPosSanpinLabelBinary,
} from "./kraftEscPosPrint.js";

export {
	generateA4BatchSheetHtml,
	generateThermalStickerHtml,
	printThermalStickers,
} from "./kraftHtmlPrint.js";

export {
	generateTsplLabelCode,
	generateZplLabelCode,
} from "./kraftTsplZplPrint.js";
