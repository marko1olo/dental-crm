/**
 * ============================================================================
 * SANPIN 3.3686-21 & GOST R ISO 11607 KRAFT PACKAGE GENERATOR & BARCODE ENGINE
 * Нормативный расчет сроков годности (50 / 60 / 180 / 20 суток),
 * векторные генераторы 1D Code128 и 2D DataMatrix SVG, прямая печать этикеток
 * для термопринтеров (TSPL / ZPL / ESC-POS CP866) и пакетный учет ЦСО.
 * ============================================================================
 */
import { generateSanpinCode128Svg, generateSanpinDataMatrixSvg, formatKraftDataMatrixPayload, generate1DBarcodeString } from "./barcodeGenerators.js";
import { KRAFT_PACKAGE_MATERIALS, KRAFT_PACKAGE_SIZES, getKraftMaterialDefinition, getKraftSizeDefinition, type KraftBatchOptions, type KraftPackageRecord, type KraftPackageSizeId, type KraftPackageStatus, type ThermalLabelSize } from "./kraftPackageTypes.js";
import { calculatePackageExpiration, evaluateKraftPackageStatus, sanitizeForThermalPrinter, generateTsplLabel, generateZplLabel, generateThermalStickerHtml, generateA4BatchSheetHtml } from "./thermalLabelEngine.js";
export interface ChemicalIndicatorDefinition {
    readonly id: string;
    readonly brandNameRu: string;
    readonly indicatorClass: "class_4_multivariable" | "class_5_integrator" | "class_6_emulating" | "bowie_dick";
    readonly initialColorHex: string;
    readonly passedColorHex: string;
    readonly initialColorRu: string;
    readonly passedColorRu: string;
    readonly standardTargetParamRu: string;
    readonly sanpinNormRefRu: string;
}
export declare const SANPIN_CHEMICAL_INDICATORS: readonly ChemicalIndicatorDefinition[];
export interface DentalToolSetDefinition {
    readonly id: string;
    readonly shortCode: string;
    readonly nameRu: string;
    readonly defaultPackageSize: KraftPackageSizeId;
    readonly typicalItemsRu: readonly string[];
}
export declare const DENTAL_TOOL_SETS_CATALOG: readonly DentalToolSetDefinition[];
export declare function getChemicalIndicatorDefinition(id: string): ChemicalIndicatorDefinition;
export declare function getDentalToolSetDefinition(id: string): DentalToolSetDefinition;
/**
 * Generates a complete batch of KraftPackageRecords with calculated expiration dates,
 * Code128 1D barcodes, and structured SanPiN DataMatrix 2D payloads.
 */
export declare function generateKraftBatchRecords(options: KraftBatchOptions): KraftPackageRecord[];
/**
 * Encodes Unicode/UTF-8 Russian string to standard IBM CP866 (DOS Cyrillic) byte array.
 */
export declare function encodeStringToCp866(text: string): Uint8Array;
/**
 * Generates raw TSPL command script for direct thermal printing (TSC, Xprinter, Godex).
 */
export declare function generateTsplLabelCode(record: KraftPackageRecord, options?: {
    size?: ThermalLabelSize | undefined;
    clinicName?: string | undefined;
    copies?: number | undefined;
}): string;
/**
 * Generates raw ZPL II script for direct thermal printing (Zebra ZD/ZT series).
 */
export declare function generateZplLabelCode(record: KraftPackageRecord, options?: {
    size?: ThermalLabelSize | undefined;
    clinicName?: string | undefined;
    copies?: number | undefined;
}): string;
/**
 * Generates raw ESC/POS binary command stream for thermal label printing (POS-58/80, Xprinter, Epson).
 */
export declare function generateEscPosSanpinLabelBinary(record: KraftPackageRecord, options?: {
    clinicName?: string | undefined;
    cutPaper?: boolean | undefined;
}): Uint8Array;
export declare function exportKraftBatchToCsv(records: readonly KraftPackageRecord[]): string;
export declare function filterKraftPackages(records: readonly KraftPackageRecord[], filter: {
    status?: KraftPackageStatus | "all" | undefined;
    query?: string | undefined;
    autoclaveId?: string | undefined;
}): KraftPackageRecord[];
export interface KraftBatchStatistics {
    readonly totalPacks: number;
    readonly sterileValidCount: number;
    readonly expiringSoonCount: number;
    readonly expiredCount: number;
    readonly recalledCount: number;
    readonly verifiedIndicatorCount: number;
}
export declare function calculateKraftBatchStatistics(records: readonly KraftPackageRecord[]): KraftBatchStatistics;
export { calculatePackageExpiration, evaluateKraftPackageStatus, sanitizeForThermalPrinter, generateTsplLabel, generateZplLabel, generateThermalStickerHtml, generateA4BatchSheetHtml, generateSanpinCode128Svg, generateSanpinDataMatrixSvg, formatKraftDataMatrixPayload, generate1DBarcodeString, getKraftMaterialDefinition, getKraftSizeDefinition, KRAFT_PACKAGE_MATERIALS, KRAFT_PACKAGE_SIZES, };
