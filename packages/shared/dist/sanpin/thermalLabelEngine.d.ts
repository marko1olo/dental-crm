/**
 * ============================================================================
 * SANPIN THERMAL LABEL ENGINE (TSPL / ZPL / HTML / SVG)
 * Прямая печать этикеток крафт-пакетов на термопринтеры (Zebra, Xprinter, TSC)
 * и расчет сроков годности по СанПиН 3.3686-21 (50 / 60 / 180 / 20 суток).
 * ============================================================================
 */
import { type ExpirationCalculationResult, type KraftPackageMaterialId, type KraftPackageRecord, type KraftPackageStatus, type ThermalLabelSize } from "./kraftPackageTypes.js";
/**
 * Calculates statutory package expiration date based on SanPiN 3.3686-21 norms:
 * - Single paper self-seal: 50 days
 * - Double paper self-seal: 60 days
 * - Paper-plastic pouch with heat-seal (термосварка): 180 days (6 months)
 * - Crepe paper wrap (2 layers): 60 days
 * - Bix with filter: 20 days
 */
export declare function calculatePackageExpiration(packDateInput: string | Date, packageType: KraftPackageMaterialId, referenceDateInput?: string | Date): ExpirationCalculationResult;
/**
 * Evaluates sterile package status based on expiration date and packaging integrity.
 */
export declare function evaluateKraftPackageStatus(expDateInput: string | Date, isBreached?: boolean, referenceDateInput?: string | Date): KraftPackageStatus;
/**
 * Transliterates Russian strings for thermal printers with basic ASCII fonts.
 */
export declare function sanitizeForThermalPrinter(text: string): string;
/**
 * Generates TSPL / TSPL2 command string for Xprinter and TSC thermal printers.
 * Supported label sizes: 58x40 mm and 43x25 mm.
 */
export declare function generateTsplLabel(record: KraftPackageRecord, options?: {
    size?: ThermalLabelSize | undefined;
    clinicName?: string | undefined;
    copies?: number | undefined;
    dpi?: 203 | 300 | undefined;
}): string;
/**
 * Generates ZPL II command string for Zebra label printers.
 * Supported label sizes: 58x40 mm (464x320 dots at 203 DPI) and 43x25 mm (344x200 dots at 203 DPI).
 */
export declare function generateZplLabel(record: KraftPackageRecord, options?: {
    size?: ThermalLabelSize | undefined;
    clinicName?: string | undefined;
    copies?: number | undefined;
    dpi?: 203 | 300 | undefined;
}): string;
/**
 * Generates vector HTML thermal sticker snippet (58x40 mm or 43x25 mm).
 */
export declare function generateThermalStickerHtml(record: KraftPackageRecord, options?: {
    size?: ThermalLabelSize | undefined;
    clinicName?: string | undefined;
    showIndicatorSwatch?: boolean | undefined;
}): string;
/**
 * Generates print-ready A4 Batch Sheet HTML with multiple thermal stickers for standard office laser printing.
 */
export declare function generateA4BatchSheetHtml(records: readonly KraftPackageRecord[], options?: {
    clinicName?: string | undefined;
}): string;
