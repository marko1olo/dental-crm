/**
 * @dental/shared/anesthesia/types/pkuDisposalTypes.ts
 * Carpule Disposal, Medical Waste Class B & Soft Negative Stock Types (Mandate 8b, <= 120 lines)
 */

import type { AnestheticDrugId } from "./drugTypes.js";

export type AnesthesiaDisposalReason =
	| "used_in_procedure"
	| "damaged_broken"
	| "expired"
	| "unsealed_unused"
	| "shift_batch_deduction";

export type AnesthesiaMedicalWasteClass = "class_b_hazardous";

export type AnesthesiaDisinfectionMethod =
	| "waste_sharps_container_class_b"
	| "chemical_disinfection"
	| "autoclaving_destructive";

export type AnesthesiaPkuPresetKey =
	| "ultracain_ds_forte_1"
	| "septanest_100_1"
	| "scandonest_3_1"
	| "damaged_broken_1"
	| "articaine_100k_needle_30g_kit"
	| "shift_batch_ultracain_ds"
	| "shift_batch_scandonest";

export interface AnesthesiaPkuPresetDefinition {
	readonly presetId: AnesthesiaPkuPresetKey;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly subtitleRu: string;
	readonly drugId: AnestheticDrugId;
	readonly drugTradeNameRu: string;
	readonly activeSubstanceRu: string;
	readonly carpulesCount: number;
	readonly standardSeriesNumber: string;
	readonly standardBatchNumber: string;
	readonly expirationOffsetYears: number;
	readonly disposalReason: AnesthesiaDisposalReason;
	readonly wasteClass?: AnesthesiaMedicalWasteClass | undefined;
	readonly disinfectionMethod?: AnesthesiaDisinfectionMethod | undefined;
	readonly wasteCollectionContainerRu?: string | undefined;
	readonly isSoftOverdraftSupported?: boolean | undefined;
	readonly assistantSignatureConfirmed: boolean;
	readonly notesRu: string;
	readonly disinfectantNameRu?: string | undefined;
	readonly disinfectantExposureMinutes?: number | undefined;
}

export interface AnesthesiaPkuDisposalRecord {
	readonly id: string;
	readonly recordNumber: string;
	readonly dateIso: string;
	readonly time: string;
	readonly clinicName: string;
	readonly cabinetNumber: string;
	readonly patientFullName: string;
	readonly medicalCardNumber: string;
	readonly medicalCardNumber043?: string | undefined;
	readonly doctorFullName: string;
	readonly nurseFullName: string;
	readonly drugId: AnestheticDrugId;
	readonly drugNameRu: string;
	readonly activeSubstanceRu: string;
	readonly seriesNumber: string;
	readonly batchNumber: string;
	readonly expirationDate: string;
	readonly carpulesUsedCount: number;
	readonly carpulesDisposedCount: number;
	readonly volumeMlTotal: number;
	readonly disposalReason: AnesthesiaDisposalReason;
	readonly wasteClass: AnesthesiaMedicalWasteClass;
	readonly disinfectionMethod: AnesthesiaDisinfectionMethod;
	readonly wasteCollectionContainerRu?: string | undefined;
	readonly isSoftOverdraft?: boolean | undefined;
	readonly stockOverdraftAllowed?: boolean | undefined;
	readonly assistantSignatureConfirmed: boolean;
	readonly notesRu?: string | undefined;
	readonly disinfectantNameRu?: string | undefined;
	readonly disinfectantExposureMinutes?: number | undefined;
}

export interface AnesthesiaPkuSummaryLedger {
	readonly totalCarpulesUsed: number;
	readonly totalCarpulesDisposed: number;
	readonly totalVolumeMl: number;
	readonly records: readonly AnesthesiaPkuDisposalRecord[];
	readonly generatedAtIso: string;
}
