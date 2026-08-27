/**
 * Marking Code & GS1 DataMatrix Validator for 54-FZ FFD 1.2 & Chestny ZNAK / MDLP.
 * Compliant with Federal Law No. 425-FZ, 54-FZ (Tags 1162, 1163, 2000), and GS1 General Specifications.
 */
import type { Ffd12MarkingCodeDescriptor } from "./ffd12Types.js";
export interface DentalMarkingCatalogItem {
    tradeName: string;
    category: "anesthetic" | "implant" | "bone_graft" | "membrane" | "other_med";
}
/**
 * Known Dental Medications & Medical Devices GTIN Catalog (Честный ЗНАК / МДЛП)
 */
export declare const DENTAL_MDLP_MARKING_CATALOG: Record<string, DentalMarkingCatalogItem>;
/**
 * Calculates and validates GS1 Modulo 10 Checksum digit for GTIN-14 / GTIN-13 / GTIN-8.
 */
export declare function isValidGs1Checksum(gtin: string): boolean;
export interface DataMatrixParseResult {
    readonly isValid: boolean;
    readonly rawString: string;
    readonly gtin?: string | undefined;
    readonly serialNumber?: string | undefined;
    readonly cryptoKey?: string | undefined;
    readonly cryptoTail?: string | undefined;
    readonly expirationDate?: string | undefined;
    readonly seriesOrLot?: string | undefined;
    readonly matchedTradeName?: string | undefined;
    readonly matchedProduct?: DentalMarkingCatalogItem | undefined;
    readonly errorMessage?: string | undefined;
}
/**
 * Parses and validates GS1 DataMatrix barcode string (Честный ЗНАК / МДЛП).
 * Supports standard ASCII with GS delimiter (\x1d), plain concatenation, and human-readable (01)...(21)... formats.
 */
export declare function parseChestnyZnakDataMatrix(rawInput: string): DataMatrixParseResult;
/**
 * Builds statutory FFD 1.2 Tag 2000 (КТ 1.2 / Код товара) payload for KKT driver.
 */
export declare function buildFfd12Tag2000MarkingPayload(descriptor: Ffd12MarkingCodeDescriptor): {
    tag1162_binaryCode?: string | undefined;
    tag1163_markingCode: string;
    tag2106_checkResult: number;
    tag2107_productStatus: number;
    gtin: string;
    serialNumber: string;
};
