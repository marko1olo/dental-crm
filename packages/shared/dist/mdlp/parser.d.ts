import type { MdlpExpirationResult, MdlpParsedBarcode } from "./types.js";
/**
 * Calculates GS1 Modulo 10 check digit for a 13-digit string.
 * For a 14-digit GTIN, the first 13 digits are multiplied by weights 3 and 1 alternating:
 * Positions 1, 3, 5, 7, 9, 11, 13 (indices 0, 2, 4, 6, 8, 10, 12) have weight 3.
 * Positions 2, 4, 6, 8, 10, 12 (indices 1, 3, 5, 7, 9, 11) have weight 1.
 */
export declare function computeGtinCheckDigit(gtin13: string): number;
/**
 * Safe version of computeGtinCheckDigit that returns a Result object instead of throwing.
 */
export declare function safeComputeGtinCheckDigit(gtin13: unknown): {
    isValid: boolean;
    checkDigit?: number;
    error?: string;
};
/**
 * Validates a 14-digit GTIN string by computing and comparing its Modulo 10 check digit.
 * Rejects all-zero dummy GTINs and non-numeric inputs.
 */
export declare function isValidGtinChecksum(gtin14: unknown): boolean;
export declare const GS1_GROUP_SEPARATOR = "\u001D";
export declare const GS1_FNC1 = "\u001D";
/**
 * Normalizes scanner input representation into standard internal form.
 */
export declare function normalizeDataMatrixSeparators(raw: unknown): string;
/**
 * Parses GS1 Expiration Date (AI 17) in YYMMDD format.
 */
export declare function parseMdlpExpirationDate(yymmdd: unknown, referenceDate?: Date): MdlpExpirationResult;
/**
 * Main GS1 DataMatrix parser for Russian Pharma / MDLP / Chestny ZNAK barcodes.
 */
export declare function parseMdlpDataMatrix(rawInput: unknown, referenceDate?: Date): MdlpParsedBarcode;
/**
 * Returns a human-friendly formatted representation of a GS1 DataMatrix string.
 */
export declare function formatDataMatrixForDisplay(barcode: string): string;
export type SafeParseMdlpDataMatrixResult = {
    success: true;
    data: MdlpParsedBarcode;
} | {
    success: false;
    data: MdlpParsedBarcode;
    error: string;
    errors: readonly string[];
};
/**
 * Gracefully parses a GS1 DataMatrix barcode without throwing unhandled exceptions.
 * Returns a typed Result pattern with the parsed metadata and diagnostic errors.
 */
export declare function safeParseMdlpDataMatrix(rawInput: unknown, referenceDate?: Date): SafeParseMdlpDataMatrixResult;
export declare const parseGs1DataMatrix: typeof parseMdlpDataMatrix;
export type ParsedGs1DataMatrix = MdlpParsedBarcode;
