import type { InventoryItem } from "../useInventoryLogic.js";

export type ClinicalPackageId =
	| "anesthesia"
	| "filling"
	| "hygiene"
	| "surgery"
	| "carpule_quick"
	| "sterilization_kit";

export interface ClinicalWriteoffPackageItem {
	readonly id: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: "anesthesia" | "ppe" | "composite" | "hygiene" | "surgery" | "auxiliary";
	readonly unit: string;
	readonly standardQuantity: number;
	readonly unitCostKopecks: number;
	readonly defaultLotNumber?: string;
	readonly defaultExpDate?: string;
}

export interface ClinicalWriteoffPackage {
	readonly id: ClinicalPackageId;
	readonly title: string;
	readonly description: string;
	readonly buttonClass: string;
	readonly testId: string;
	readonly items: readonly ClinicalWriteoffPackageItem[];
}

export interface PackageWriteOffOptions {
	readonly packageId: ClinicalPackageId | string;
	readonly quantityMultiplier?: number | undefined;
	readonly cabinetId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly nurseName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly allowSoftOverdraft?: boolean | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly warehouseItems?: readonly InventoryItem[] | undefined;
	readonly organizationId?: string | undefined;
	readonly onToast?: ((message: string, type: "success" | "warning" | "info" | "error") => void) | undefined;
	readonly fetchFn?: typeof fetch | undefined;
}

export interface PackageWriteOffDeductedItem {
	readonly id: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly quantity: number;
	readonly unit: string;
	readonly unitCostKopecks: number;
	readonly costKopecks: number;
	readonly isOverdraft: boolean;
	readonly deficitQty: number;
}

export interface PackageWriteOffResult {
	readonly success: boolean;
	readonly packageId: string;
	readonly packageTitle: string;
	readonly actNumber: string;
	readonly actDate: string;
	readonly totalItemsCount: number;
	readonly totalQuantity: number;
	readonly totalCostKopecks: number;
	readonly isOverdraft: boolean;
	readonly overdraftCount: number;
	readonly overdraftItems: ReadonlyArray<{
		nameRu: string;
		requestedQty: number;
		availableQty: number;
		deficitQty: number;
	}>;
	readonly deductedItems: readonly PackageWriteOffDeductedItem[];
	readonly toastMessage: string;
	readonly toastType: "success" | "warning" | "error";
}

/** @deprecated Имя содержит сленг «OneClick». Используйте канонический PackageWriteOffOptions */
export type OneClickPackageWriteOffOptions = PackageWriteOffOptions;

/** @deprecated Имя содержит сленг «OneClick». Используйте канонический PackageWriteOffDeductedItem */
export type OneClickPackageWriteOffDeductedItem = PackageWriteOffDeductedItem;

/** @deprecated Имя содержит сленг «OneClick». Используйте канонический PackageWriteOffResult */
export type OneClickPackageWriteOffResult = PackageWriteOffResult;
