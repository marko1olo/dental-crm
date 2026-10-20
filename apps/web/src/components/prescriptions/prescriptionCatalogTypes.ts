/**
 * prescriptionCatalogTypes.ts — Types for Prescription Drug Catalog Selector
 */

import type { PrescriptionFormType } from "./PrescriptionPrintModal";
import type { DentalFastPrescriptionSet } from "./prescriptionDataSets";

export interface PrescriptionDrugCatalogSelectorProps {
	readonly fastPresets: readonly DentalFastPrescriptionSet[];
	readonly activePresetId?: string | undefined;
	readonly onSelectPreset?:
		| ((preset: DentalFastPrescriptionSet) => void)
		| undefined;
	readonly onApplyAndInsertToDiary: (preset: DentalFastPrescriptionSet) => void;
	readonly onApplyAndPrint: (preset: DentalFastPrescriptionSet) => void;
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly filteredCatalog: readonly {
		readonly id: string;
		readonly tradeNameRu: string;
		readonly latinRp: string;
		readonly dosageRu: string;
		readonly category?: string;
	}[];
	readonly selectedDrugIds: readonly string[];
	readonly onToggleDrug: (id: string) => void;
	readonly isAddingCustom: boolean;
	readonly onToggleAddingCustom: () => void;
	readonly customTradeName: string;
	readonly onCustomTradeNameChange: (val: string) => void;
	readonly customLatinRp: string;
	readonly onCustomLatinRpChange: (val: string) => void;
	readonly customDispense: string;
	readonly onCustomDispenseChange: (val: string) => void;
	readonly customSigna: string;
	readonly onCustomSignaChange: (val: string) => void;
	readonly onAddCustomDrug: () => void;
	readonly customSeriesNumber: string;
	readonly onCustomSeriesNumberChange: (val: string) => void;
	readonly validityDays: "15" | "30" | "60" | "365";
	readonly onValidityDaysChange: (days: "15" | "30" | "60" | "365") => void;
	readonly isChronicSpecialCare: boolean;
	readonly onToggleChronicSpecialCare: () => void;
	readonly chronicPeriodicity: string;
	readonly onChronicPeriodicityChange: (val: string) => void;
	readonly patientAddress: string;
	readonly onPatientAddressChange: (val: string) => void;
	readonly activeForm: PrescriptionFormType;
	readonly patientAllergies?: string | readonly string[] | null | undefined;
	readonly className?: string | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly onPatientWeightKgChange?:
		| ((val: number | undefined) => void)
		| undefined;
}
