/**
 * ============================================================================
 * SANPIN 3.3686-21 KRAFT PACKAGE PROTOCOL LINK & INVENTORY AUTOPILOT
 * 1-клик привязка крафт-пакетов к протоколу приёма (Форма № 043/у)
 * по 1D/2D штрихкодам и автоматическое списание расходников по техкартам.
 * ============================================================================
 */
import { type Kopecks } from "../utils/money.js";
import { type KraftPackageMaterialId, type KraftPackageSizeId } from "./kraftPackageTypes.js";
export type KraftBarcodeType = "datamatrix_2d" | "code128_1d" | "custom_tray";
export interface ParsedKraftBarcode {
    readonly rawInput: string;
    readonly barcodeType: KraftBarcodeType;
    readonly isValid: boolean;
    readonly isExpired: boolean;
    readonly isExpiringSoon: boolean;
    readonly daysRemaining: number;
    readonly daysLifespan: number;
    readonly batchId: string;
    readonly serialNumber?: number | undefined;
    readonly autoclaveId: string;
    readonly cycleNumber: number;
    readonly packDateIso: string;
    readonly expDateIso: string;
    readonly operatorId: string;
    readonly operatorName: string;
    readonly toolSetId: string;
    readonly toolSetNameRu: string;
    readonly packageMaterialId: KraftPackageMaterialId;
    readonly packageSizeId: KraftPackageSizeId;
    readonly indicatorId: string;
    readonly indicatorClassRu: string;
    readonly indicatorPassed: boolean;
    readonly sanpinClauseRu: string;
    readonly formattedProtocolRecord043: string;
    readonly errorMessage?: string | undefined;
}
export interface ParseKraftBarcodeOptions {
    readonly referenceDate?: string | Date | undefined;
    readonly defaultOperatorName?: string | undefined;
    readonly defaultAutoclaveId?: string | undefined;
    readonly requireClass5Indicator?: boolean | undefined;
}
/**
 * 1-клик парсер и валидатор 2D DataMatrix и 1D Code128 штрихкодов крафт-пакетов стерилизации.
 * Выполняет строгую проверку срока годности по СанПиН 3.3686-21.
 */
export declare function parseAndValidateKraftBarcode(rawInput: string, options?: ParseKraftBarcodeOptions): ParsedKraftBarcode;
/**
 * Формирует нормативную запись стерилизации для медкарты формы № 043/у
 */
export declare function format043SterilizationRecord(params: {
    readonly autoclaveId: string;
    readonly cycleNumber: number;
    readonly packDateIso: string;
    readonly expDateIso: string;
    readonly barcode: string;
    readonly operatorName: string;
    readonly indicatorClassRu?: string | undefined;
    readonly toolSetNameRu?: string | undefined;
    readonly isExpired?: boolean | undefined;
}): string;
/**
 * 1-клик внедрение записи стерилизации в дневник формы 043/у
 */
export declare function attachKraftPackageTo043Diary<T extends {
    appliedMaterials?: string | null;
    treatmentDescription?: string | null;
}>(diary: T, parsedKraft: ParsedKraftBarcode): T;
export type ProcedureKind = "filling_composite" | "endodontics" | "tooth_extraction" | "hygiene_airflow";
export interface ProcedureDeductionItem {
    readonly id: string;
    readonly name: string;
    readonly category: "ppe" | "anesthesia" | "composite" | "endo" | "surgery" | "hygiene" | "other";
    readonly unit: string;
    readonly quantity: number;
    readonly unitCostKopecks: Kopecks;
    readonly totalCostKopecks: Kopecks;
    readonly isMandatory: boolean;
    readonly descriptionRu: string;
    readonly order804nCode?: string | undefined;
}
export interface ProcedureDeductionRequest {
    readonly procedureKind: ProcedureKind;
    readonly toothNumber?: number | string | undefined;
    readonly rootCanalsCount?: number | undefined;
    readonly anesthesiaCarpules?: number | undefined;
    readonly includePpe?: boolean | undefined;
    readonly customAdditions?: readonly {
        readonly name: string;
        readonly quantity: number;
        readonly unitCostKopecks: Kopecks;
        readonly unit: string;
    }[] | undefined;
}
export interface ProcedureDeductionResult {
    readonly procedureKind: ProcedureKind;
    readonly procedureTitleRu: string;
    readonly toothNumber?: number | string | undefined;
    readonly rootCanalsCount: number;
    readonly items: readonly ProcedureDeductionItem[];
    readonly totalItemsCount: number;
    readonly totalCostKopecks: Kopecks;
    readonly totalCostFormatted: string;
    readonly summaryDescriptionRu: string;
}
/**
 * Автоматический расчет списания расходных материалов по технологической карте процедуры:
 * - Пломбирование: 1 карпула анестетика, 1 платок коффердама, бонд, полировочная головка, перчатки, маска, слюноотсос;
 * - Эндодонтия: бумажные пины (по числу каналов), гуттаперча, силер, файл;
 * - Удаление зуба: анестетик, гемостатическая губка, шовный материал.
 */
export declare function calculateProcedureAutoDeduction(request: ProcedureDeductionRequest): ProcedureDeductionResult;
