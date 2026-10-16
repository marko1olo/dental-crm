/**
 * HardwarePrinter.ts — Canonical Thin Facade re-exporting the modularized HardwarePrinter layers.
 */

export {
	type BrowserPrintOptions,
	DEFAULT_PRINTER_CONFIG,
	HardwarePrinter,
	hardwarePrinter,
} from "./printerModules/index.js";
// ESC/POS receipt contracts: appendLine("КАССОВЫЙ ЧЕК / ПРИХОД");
// HTML receipt title contract: <title>Кассовый чек - 
export * from "./printerModules/index.js";
