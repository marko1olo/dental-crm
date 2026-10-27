import type { Kopecks } from "@dental/shared";
import type {
	ClinicLegalInfo,
	DiscrepancyReasonCode,
	MaterialMeasurementUnit,
} from "../clinicalWriteoffPresets.js";

export const generateDocumentRowId = (): string =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID().slice(0, 8)
		: Date.now().toString(36).slice(-6) + Math.floor(typeof performance !== "undefined" ? performance.now() : 0).toString(36);

export interface CompletedClinicalService {
	readonly serviceCode: string;
	readonly toothNumber?: number | string | undefined;
	readonly serviceTitle?: string | undefined;
	readonly quantityMultiplier?: number | undefined;
	readonly notes?: string | undefined;
}

export interface ClinicalWriteoffLine {
	readonly id: string;
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly toothNumber?: number | string | undefined;
	readonly materialId: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: string;
	readonly unit: MaterialMeasurementUnit;
	readonly okeiCode: string;
	readonly standardQuantity: number;
	actualQuantity: number;
	discrepancyQuantity: number;
	discrepancyReasonCode: DiscrepancyReasonCode;
	discrepancyNotes?: string | undefined;
	batchId?: string | undefined;
	lotNumber?: string | undefined;
	serialNumber?: string | undefined;
	expirationDate?: string | undefined;
	daysUntilExpiration?: number | undefined;
	isExpiringSoon: boolean;
	isExpired: boolean;
	cabinetId?: string | undefined;
	cabinetNameRu?: string | undefined;
	stockAvailable: number;
	criticalThreshold: number;
	stockStatus: "ok" | "warning" | "deficit";
	unitCostKopecks: Kopecks;
	totalCostKopecks: Kopecks;
	readonly isMandatory: boolean;
	readonly requiresLotTracking: boolean;
	readonly requiresSerialNumber: boolean;
}

export interface ClinicalWriteoffTotals {
	readonly totalServicesCount: number;
	readonly totalMaterialsCount: number;
	readonly totalMaterialsQuantity: number;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
	readonly totalCostRubles: number;
	readonly totalDiscrepancyCostKopecks: Kopecks;
	readonly totalDiscrepancyCostFormatted: string;
	readonly totalDiscrepancyCostRubles: number;
	readonly expiringBatchesCount: number;
	readonly expiredBatchesCount: number;
	readonly deficitItemsCount: number;
	readonly hasDeficit: boolean;
	readonly hasExpiringLots: boolean;
	readonly hasExpiredLots: boolean;
}

export interface ClinicalWriteoffDocument {
	readonly id: string;
	readonly actNumber: string;
	readonly actDate: string;
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly assistantFullName?: string | undefined;
	readonly cabinetId: string;
	readonly cabinetNameRu: string;
	readonly completedServices: readonly CompletedClinicalService[];
	readonly lines: readonly ClinicalWriteoffLine[];
	readonly totals: ClinicalWriteoffTotals;
	readonly statutoryFormType: "material_writeoff" | "waybill" | "disposal_act" | "0504230" | "M11" | "TORG16";
	readonly status: "draft" | "confirmed" | "cancelled";
	readonly notes?: string | undefined;
	readonly confirmedAt?: string | undefined;
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly isQuickCarpuleWriteoff?: boolean | undefined;
	readonly writtenOffByRole?: string | undefined;
	readonly isSingleSigner?: boolean | undefined;
}
