/**
 * HardwarePrinter.ts — Canonical Thin Facade re-exporting the modularized HardwarePrinter layers.
 */

export {
	type BrowserPrintOptions,
	DEFAULT_PRINTER_CONFIG,
	HardwarePrinter,
	hardwarePrinter,
} from "./printerModules/index.js";
export * from "./printerModules/index.js";
