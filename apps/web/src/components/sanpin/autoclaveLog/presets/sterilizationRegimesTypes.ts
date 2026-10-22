import type { PackagingTypeId } from "./packagingTypes";
import type { SterilizationRegimeId, SterilizerMethodType } from "./sterilizersCatalog";

export interface SterilizationRegimeDefinition {
	readonly id: SterilizationRegimeId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly methodType: SterilizerMethodType;
	readonly targetTemperatureCelsius: number;
	readonly tempToleranceCelsius: { readonly min: number; readonly max: number };
	readonly targetPressureBar: number;
	readonly pressureToleranceBar: { readonly min: number; readonly max: number };
	readonly exposureTimeMinutes: number;
	readonly dryingTimeMinutes: number;
	readonly totalEstimatedMinutes: number;
	readonly vacuumPulses: number;
	readonly targetItemsDescriptionRu: string;
	readonly packagingTypesAllowed: readonly PackagingTypeId[];
	readonly chemicalIndicatorClassRequired: string;
	readonly sanpinNormRefRu: string;
	readonly colorTheme: "blue" | "teal" | "purple" | "amber" | "orange";
}
