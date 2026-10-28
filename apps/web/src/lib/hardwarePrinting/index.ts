/**
 * DENTE CRM — Hardware Printing Module Entry Point
 */

export * from "./printingTypes.js";
export * from "./a4DocumentPrinter.js";
export * from "./thermalReceiptPrinter.js";
export * from "./thermalBarcodeLabelPrinter.js";
export * from "./browserPrintFallback.js";
export { printDesktopA4DocumentSilent, printDesktopDocumentSilent } from "../../native/desktopBridge.js";
