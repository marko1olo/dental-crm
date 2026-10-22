import type {
	AutoclaveCycleId,
	AutoclavePackagingType,
	IndicatorQualityClass,
} from "./autoclavePresets";

export interface SterilePackRecord {
	barcode: string;
	packId: string;
	autoclaveId: string;
	cycleNumber: number;
	sterilizationDate: string;
	expirationDate: string;
	packagingType: AutoclavePackagingType;
	packagingNameRu: string;
	itemCategoryRu: string;
	itemsListRu: string[];
	operatorName: string;
	operatorStaffId?: string | undefined;
	status: "sterile" | "expiring_soon" | "expired" | "breached" | "used";
	isBreached: boolean;
	usedAtPatientId?: string | undefined;
	usedAtPatientName?: string | undefined;
	usedAtVisitDate?: string | undefined;
	usedByDoctorName?: string | undefined;
}

export interface Form257SterilizerJournalEntry {
	id: string;
	date: string;
	cycleNumber: number;
	deviceName: string;
	autoclaveId: string;
	cycleType: AutoclaveCycleId;
	cycleNameRu: string;
	sterilizationMode: {
		temperatureCelsius: number;
		pressureBar: number;
		durationMinutes: number;
	};
	loadDescriptionRu: string;
	packsCount: number;
	packagingType: AutoclavePackagingType;
	indicatorType: IndicatorQualityClass;
	indicatorColorBeforeRu: string;
	indicatorColorAfterRu: string;
	isIndicatorPassed: boolean;
	isBiologicalTestConducted: boolean;
	biologicalTestResult: "passed" | "failed" | "not_conducted";
	isBatchApproved: boolean;
	operatorName: string;
	operatorSignatureStamp: string;
	generatedBarcodes: string[];
	notes?: string | undefined;
}

export interface PatientSterileUsageRecord {
	packBarcode: string;
	patientId: string;
	patientName: string;
	doctorName: string;
	nurseName: string;
	visitDate: string;
	verifiedSterile: boolean;
	recordedAtIso: string;
}

export interface PackExpiryCalculation {
	sterilizationDate: Date;
	expiryDate: Date;
	daysValid: number;
	formattedExpiry: string;
	isExpired: boolean;
	daysRemaining: number;
}
