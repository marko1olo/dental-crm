export type OrthopedicProtocolCategory =
	| "prep_crown"
	| "impression_scan"
	| "temp_crown"
	| "try_in"
	| "permanent_cementation"
	| "removable_prosthetics"
	| "consultation_norm";

export interface OrthopedicConsumableItem {
	readonly nameRu: string;
	readonly item?: string | undefined;
	readonly quantity: number;
	readonly unit: string;
	readonly defaultCostRub?: number;
}

export interface Order804nServiceItem {
	readonly code: string;
	readonly nameRu: string;
	readonly stageKind: "stage_3_orthopedics";
	readonly suggestedPriceRub?: number;
	readonly priceRub?: number;
	readonly toothNumber?: number;
}

export interface OrthopedicProtocolPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly shortLabel: string;
	readonly category: OrthopedicProtocolCategory;
	readonly defaultIcd10: string;
	readonly defaultIcd10Label: string;
	readonly anamnesis: string;
	readonly objective: string;
	readonly treatment: string;
	readonly recommendations: string;
	readonly order804nServices: readonly Order804nServiceItem[];
	readonly warehouseBundleType?:
		| "orthopedics_prep"
		| "orthopedics_impression"
		| "orthopedics_temporary"
		| "orthopedics_cementation"
		| undefined;
	readonly consumables?: readonly OrthopedicConsumableItem[] | undefined;
	readonly quickWriteoffInventory?: boolean | undefined;
}

export interface FormatOrthopedicProtocolOptions {
	toothFdi?: string | number | undefined;
	teethFdi?: readonly (string | number)[] | undefined;
	jawScope?: "upper" | "lower" | "both" | undefined;
	material?: string | undefined;
	colorVita?: string | undefined;
	labOrderId?: string | undefined;
	labOrderNumber?: string | undefined;
	technicianName?: string | undefined;
	warrantyPassport?: string | undefined;
}

export interface DoctorClinicalOverrideResult {
	readonly doctorClinicalOverride: true;
	readonly doctorOverrideReason: string;
	readonly doctorName?: string | undefined;
	readonly timestampIso: string;
	readonly mandate8e: true;
	readonly notice: string;
}

export interface ApplyOrthopedicProtocolParams {
	protocol: OrthopedicProtocolPreset;
	options?: FormatOrthopedicProtocolOptions;
	onSuccess?: ((summary: string) => void) | undefined;
	onAddToInvoice?: ((services: readonly Order804nServiceItem[]) => void) | undefined;
	copyToClipboard?: boolean;
	showNotification?: boolean;
}
