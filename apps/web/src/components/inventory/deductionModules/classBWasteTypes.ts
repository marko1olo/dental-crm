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
