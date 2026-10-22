import type {
	DecontaminationMethodType,
	MedicalWasteClassId,
	MedicalWastePackagingTypeId,
	WasteStorageLocationId,
} from "./medicalWastePresets.js";

export interface MedicalWasteJournalRecord {
	readonly id: string;
	readonly timestamp: string;
	readonly wasteClass: MedicalWasteClassId;
	readonly departmentNameRu: string;
	readonly packageType: MedicalWastePackagingTypeId;
	readonly packageCount: number;
	readonly grossWeightKg: number;
	readonly tareWeightKg: number;
	readonly netWeightKg: number;
	readonly sealNumber?: string | undefined;
	readonly barcode: string;
	readonly decontaminationMethod: DecontaminationMethodType;
	readonly decontamDisinfectantName?: string | undefined;
	readonly decontamAutoclaveCycleId?: string | undefined;
	readonly storageLocation: WasteStorageLocationId;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly status: "accumulating" | "transferred_for_disposal";
	readonly transferActNumber?: string | undefined;
	readonly notes?: string | undefined;
}

export interface MedicalWasteTransferAct {
	readonly actNumber: string;
	readonly actDate: string;
	readonly clinicInfo: {
		readonly name: string;
		readonly inn: string;
		readonly ogrn: string;
		readonly address: string;
		readonly responsiblePerson: string;
		readonly responsiblePosition: string;
	};
	readonly disposalCompanyInfo: {
		readonly name: string;
		readonly inn: string;
		readonly licenseNumber: string;
		readonly contractNumber: string;
		readonly contractDate: string;
		readonly driverFullName: string;
		readonly vehiclePlateNumber: string;
	};
	readonly transferredRecords: readonly MedicalWasteJournalRecord[];
	readonly totalsByClass: Record<
		MedicalWasteClassId,
		{ count: number; totalNetWeightKg: number; totalGrossWeightKg: number }
	>;
	readonly totalNetWeightKg: number;
	readonly totalPackagesCount: number;
}

export interface StorageValidationResult {
	readonly isExpired: boolean;
	readonly hoursElapsed: number;
	readonly hoursRemaining: number;
	readonly maxHoursAllowed: number;
	readonly status: "optimal" | "warning_approaching_limit" | "expired";
	readonly statusMessageRu: string;
}

export interface WasteThermalStickerOptions {
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly disposalContractNo?: string;
}
