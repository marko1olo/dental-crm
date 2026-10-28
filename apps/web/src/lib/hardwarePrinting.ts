/**
 * DENTE CRM — Universal Hardware Printing Orchestrator (Facade)
 *
 * Decomposed under Mandate 8b into modular printers (<= 120 lines):
 * - a4DocumentPrinter: A4 outpatient documents (Medical card, Consents, Acts)
 * - thermalReceiptPrinter: Cash receipts (58mm/80mm) with silent native KKT
 * - thermalBarcodeLabelPrinter: Sterilization labels & barcodes (58x40mm)
 * - browserPrintFallback: WebUSB & raw TCP socket printing
 */

export * from "./hardwarePrinting/index.js";
