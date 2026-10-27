/**
 * packages/shared/src/sanpin/kraftBarcodeTypes.ts
 * Типы и интерфейсы валидации штрихкодов стерилизации.
 * Мандат 8b: строго <= 120 строк.
 * Мандат 8x, 8ap: чистый русский язык без советского канцелярита.
 */

import type { KraftPackageMaterialId, KraftPackageSizeId } from "./kraftPackageTypes.js";

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
	readonly formattedSterilizationDiaryRecord: string;
	/** @deprecated используйте formattedSterilizationDiaryRecord */
	readonly formattedProtocolRecord043: string;
	readonly errorMessage?: string | undefined;
}

export interface ParseKraftBarcodeOptions {
	readonly referenceDate?: string | Date | undefined;
	readonly defaultOperatorName?: string | undefined;
	readonly defaultAutoclaveId?: string | undefined;
}
