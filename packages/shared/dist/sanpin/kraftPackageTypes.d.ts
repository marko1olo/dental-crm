import { z } from "zod";
/**
 * ============================================================================
 * SANPIN 3.3686-21 & GOST R ISO 11607 STATUTORY KRAFT PACKAGING CONSTANTS
 * Нормативные классификаторы стерилизационных упаковочных материалов,
 * сроков годности (50 / 60 / 180 суток), типоразмеров и термопринтеров.
 * ============================================================================
 */
export type KraftPackageMaterialId = "paper_self_seal_single" | "paper_self_seal_double" | "paper_plastic_pouch" | "crepe_paper_wrap" | "bix_with_filter";
export type KraftPackageSizeId = "size_75x150" | "size_100x200" | "size_150x250" | "size_200x300";
export type ThermalLabelSize = "58x40" | "43x25";
export type ThermalPrinterProtocol = "zpl" | "tspl" | "escpos";
export type KraftPackageStatus = "sterile_valid" | "expiring_soon_7d" | "expired" | "recalled";
export interface KraftPackageMaterialDefinition {
    readonly id: KraftPackageMaterialId;
    readonly nameRu: string;
    readonly shortLabelRu: string;
    readonly statutoryShelfLifeDays: number;
    readonly sealingMethodRu: string;
    readonly sanpinClauseRu: string;
    readonly gostStandardRu: string;
    readonly descriptionRu: string;
    readonly recommendedSterilizationMethod: "steam_autoclave_134" | "steam_autoclave_121" | "dry_heat";
    readonly isHeatSealed: boolean;
    readonly isTransparentFilm: boolean;
}
export declare const KRAFT_PACKAGE_MATERIALS: readonly KraftPackageMaterialDefinition[];
export interface KraftPackageSizeDefinition {
    readonly id: KraftPackageSizeId;
    readonly dimensionsMmRu: string;
    readonly widthMm: number;
    readonly heightMm: number;
    readonly titleRu: string;
    readonly recommendedUsageRu: string;
    readonly typicalCapacityItemsCount: number;
}
export declare const KRAFT_PACKAGE_SIZES: readonly KraftPackageSizeDefinition[];
export interface KraftPackageRecord {
    readonly id: string;
    readonly batchId: string;
    readonly serialNumber: number;
    readonly packageType: KraftPackageMaterialId;
    readonly packageSize: KraftPackageSizeId;
    readonly toolSetId: string;
    readonly toolSetNameRu: string;
    readonly itemsListRu: readonly string[];
    readonly packDate: string;
    readonly expDate: string;
    readonly daysLifespan: number;
    readonly daysRemaining: number;
    readonly status: KraftPackageStatus;
    readonly autoclaveId: string;
    readonly cycleNumber: number;
    readonly operatorId: string;
    readonly operatorName: string;
    readonly indicatorId: string;
    readonly indicatorVerified: boolean;
    readonly barcode128: string;
    readonly barcodeDataMatrixPayload: string;
    readonly isBreached: boolean;
    readonly notes: string;
    readonly createdAt: string;
}
export interface KraftBatchOptions {
    readonly autoclaveId: string;
    readonly cycleNumber: number;
    readonly packageType: KraftPackageMaterialId;
    readonly packageSize: KraftPackageSizeId;
    readonly toolSetId: string;
    readonly customItems?: readonly string[] | undefined;
    readonly quantity: number;
    readonly operatorId?: string | undefined;
    readonly operatorName?: string | undefined;
    readonly indicatorId?: string | undefined;
    readonly indicatorVerified?: boolean | undefined;
    readonly customPackDate?: string | undefined;
    readonly customBatchId?: string | undefined;
    readonly notes?: string | undefined;
}
export interface ExpirationCalculationResult {
    readonly packDateFormatted: string;
    readonly expDateFormatted: string;
    readonly expDateIso: string;
    readonly daysLifespan: number;
    readonly daysRemaining: number;
    readonly status: KraftPackageStatus;
    readonly isExpired: boolean;
    readonly isExpiringSoon: boolean;
    readonly humanReadableRemainingRu: string;
}
export interface ThermalPrinterConfig {
    readonly host: string;
    readonly port: number;
    readonly protocol: ThermalPrinterProtocol;
    readonly modelName?: string | undefined;
    readonly dpi?: 203 | 300 | undefined;
    readonly timeoutMs?: number | undefined;
}
export interface ThermalPrintJobParams {
    readonly printerConfig: ThermalPrinterConfig;
    readonly labelSize: ThermalLabelSize;
    readonly records: readonly KraftPackageRecord[];
    readonly copiesPerLabel?: number | undefined;
    readonly clinicName?: string | undefined;
}
export interface ThermalPrintResult {
    readonly success: boolean;
    readonly totalPrinted: number;
    readonly printedAt: string;
    readonly protocol: ThermalPrinterProtocol;
    readonly latencyMs: number;
    readonly rawCommandsPreview?: string | undefined;
    readonly error?: string | undefined;
}
export declare const kraftPackageMaterialIdSchema: z.ZodEnum<["paper_self_seal_single", "paper_self_seal_double", "paper_plastic_pouch", "crepe_paper_wrap", "bix_with_filter"]>;
export declare const kraftPackageSizeIdSchema: z.ZodEnum<["size_75x150", "size_100x200", "size_150x250", "size_200x300"]>;
export declare const thermalLabelSizeSchema: z.ZodEnum<["58x40", "43x25"]>;
export declare const thermalPrinterProtocolSchema: z.ZodEnum<["zpl", "tspl", "escpos"]>;
export declare const thermalPrinterConfigSchema: z.ZodObject<{
    host: z.ZodString;
    port: z.ZodDefault<z.ZodNumber>;
    protocol: z.ZodDefault<z.ZodEnum<["zpl", "tspl", "escpos"]>>;
    modelName: z.ZodOptional<z.ZodString>;
    dpi: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<203>, z.ZodLiteral<300>]>>;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    host: string;
    port: number;
    protocol: "zpl" | "tspl" | "escpos";
    dpi: 300 | 203;
    timeoutMs: number;
    modelName?: string | undefined;
}, {
    host: string;
    port?: number | undefined;
    protocol?: "zpl" | "tspl" | "escpos" | undefined;
    modelName?: string | undefined;
    dpi?: 300 | 203 | undefined;
    timeoutMs?: number | undefined;
}>;
export declare const thermalPrintJobDtoSchema: z.ZodObject<{
    printerConfig: z.ZodObject<{
        host: z.ZodString;
        port: z.ZodDefault<z.ZodNumber>;
        protocol: z.ZodDefault<z.ZodEnum<["zpl", "tspl", "escpos"]>>;
        modelName: z.ZodOptional<z.ZodString>;
        dpi: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<203>, z.ZodLiteral<300>]>>;
        timeoutMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        host: string;
        port: number;
        protocol: "zpl" | "tspl" | "escpos";
        dpi: 300 | 203;
        timeoutMs: number;
        modelName?: string | undefined;
    }, {
        host: string;
        port?: number | undefined;
        protocol?: "zpl" | "tspl" | "escpos" | undefined;
        modelName?: string | undefined;
        dpi?: 300 | 203 | undefined;
        timeoutMs?: number | undefined;
    }>;
    labelSize: z.ZodDefault<z.ZodEnum<["58x40", "43x25"]>>;
    packageRecordIds: z.ZodArray<z.ZodString, "many">;
    copiesPerLabel: z.ZodDefault<z.ZodNumber>;
    clinicName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    printerConfig: {
        host: string;
        port: number;
        protocol: "zpl" | "tspl" | "escpos";
        dpi: 300 | 203;
        timeoutMs: number;
        modelName?: string | undefined;
    };
    labelSize: "58x40" | "43x25";
    packageRecordIds: string[];
    copiesPerLabel: number;
    clinicName?: string | undefined;
}, {
    printerConfig: {
        host: string;
        port?: number | undefined;
        protocol?: "zpl" | "tspl" | "escpos" | undefined;
        modelName?: string | undefined;
        dpi?: 300 | 203 | undefined;
        timeoutMs?: number | undefined;
    };
    packageRecordIds: string[];
    labelSize?: "58x40" | "43x25" | undefined;
    copiesPerLabel?: number | undefined;
    clinicName?: string | undefined;
}>;
export type ThermalPrintJobDto = z.infer<typeof thermalPrintJobDtoSchema>;
export declare function getKraftMaterialDefinition(id: KraftPackageMaterialId): KraftPackageMaterialDefinition;
export declare function getKraftSizeDefinition(id: KraftPackageSizeId): KraftPackageSizeDefinition;
export declare function calculateSanpinKraftLifespanDays(materialId: KraftPackageMaterialId): number;
