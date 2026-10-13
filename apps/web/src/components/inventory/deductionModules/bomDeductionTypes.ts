/**
 * bomDeductionTypes.ts — Типы данных и интерфейсы движка автосписания технологических карт (BOM).
 */

import type { InventoryItem } from "../inventoryDataMappers.js";
import type { BatchCandidate } from "./bomBatchMatcher.js";
import type { OverdraftAlertPayload } from "./bomDeductionValidator.js";

export interface ShiftCloseClassBWasteInput {
	readonly shiftDate?: string | undefined;
	readonly responsibleStaffName: string;
	readonly responsibleStaffPosition?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly departmentNameRu?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly chairId?: string | undefined;
	readonly accumulatedCarpulesCount: number;
	readonly accumulatedNeedlesCount: number;
	readonly accumulatedSharpsCount?: number | undefined;
	readonly contaminatedItemsCount?: number | undefined;
	readonly brokenCarpulesCount?: number | undefined;
	readonly partiallyUsedCarpulesCount?: number | undefined;
	readonly disinfectionProtocol?: string | undefined;
	readonly customTareKg?: number | undefined;
	readonly organizationId?: string | undefined;
	readonly fetchFn?: typeof fetch | undefined;
	readonly onToast?: ((message: string, type: "success" | "warning" | "info" | "error") => void) | undefined;
}

export interface ShiftCloseClassBWasteResult {
	readonly success: boolean;
	readonly actNumber: string;
	readonly actDate: string;
	readonly sealNumber: string;
	readonly barcode: string;
	readonly wasteClass: "class_B";
	readonly packageType: "yellow_container_sharps" | "yellow_bag";
	readonly packageCount: number;
	readonly grossWeightKg: number;
	readonly tareWeightKg: number;
	readonly netWeightKg: number;
	readonly totalCarpulesCount: number;
	readonly brokenCarpulesCount: number;
	readonly partiallyUsedCarpulesCount: number;
	readonly totalSharpsCount: number;
	readonly responsibleStaffName: string;
	readonly responsibleStaffPosition: string;
	readonly singlePersonApproval: boolean;
	readonly disinfectionProtocol: string;
	readonly cabinetId?: string | undefined;
	readonly chairId?: string | undefined;
	readonly actHtml: string;
	readonly toastMessage: string;
}

export interface NormalizedRenderedService {
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly quantity: number;
	readonly toothNumber: number | null;
}

export interface PerformAutoVisitBomDeductionOptions {
	readonly visitId: string;
	readonly visitNumber?: string | undefined;
	readonly patientId: string;
	readonly patientFullName?: string | undefined;
	readonly doctorId: string;
	readonly doctorFullName?: string | undefined;
	readonly visitDate?: string | undefined;
	readonly chairId?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly renderedServices: ReadonlyArray<{
		readonly serviceCode?: string | undefined;
		readonly code?: string | undefined;
		readonly name?: string | undefined;
		readonly serviceTitle?: string | undefined;
		readonly title?: string | undefined;
		readonly quantity?: number | undefined;
		readonly toothNumber?: number | string | null | undefined;
	}>;
	readonly warehouseItems?: readonly (InventoryItem & {
		readonly cabinetId?: string | undefined;
		readonly chairId?: string | undefined;
		readonly locationId?: string | undefined;
	})[] | undefined;
	readonly batches?: readonly BatchCandidate[] | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly allowOverdraft?: boolean | undefined;
	readonly includeStandardPpe?: boolean | undefined;
	readonly organizationId?: string | undefined;
	readonly fetchFn?: typeof fetch | undefined;
	readonly onToast?: ((message: string, type: "success" | "warning" | "info" | "error") => void) | undefined;
	readonly onOverdraftAlert?: ((alert: OverdraftAlertPayload) => void) | undefined;
	readonly onExpiredBatchBlocked?: ((warning: {
		readonly batchNumber: string;
		readonly expiryDate: string;
		readonly alertMessage: string;
		readonly itemName: string;
	}) => void) | undefined;
}
