/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/packagingAndTrayTypes.ts
 *
 * Типоразмеры крафт-пакетов, лотки и химическая дезинфекция.
 * Мандат 8b: строго <= 120 строк.
 */

export interface SampleKraftBarcode {
	readonly label: string;
	readonly barcode: string;
	readonly badge: string;
	readonly description?: string;
}

export interface KraftPackageSizeOption {
	readonly id: "size_75x150" | "size_100x200" | "size_150x250";
	readonly dimensionsMm: string;
	readonly widthMm: number;
	readonly heightMm: number;
	readonly maxShelfLifeDays: number;
	readonly indicatorTypeRu: string;
	readonly typicalUsageRu: string;
}

export interface ChemicalIndicatorOption {
	readonly id: string;
	readonly manufacturer: "Медтест" | "DGM Steriguard" | "Винар";
	readonly tradeName: string;
	readonly indicatorClass: 4 | 5;
	readonly indicatorClassRu: string;
	readonly methodType: "steam" | "dry_heat";
	readonly targetRegimeRu: string;
	readonly standardResultVerdict: "Цвет эталона достигнут / Стерильно";
	readonly notesRu: string;
}

export type StandardTrayType = "therapy" | "surgery" | "endo";

export interface StandardTrayDefinition {
	readonly id: StandardTrayType;
	readonly toolSetCode: string;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
}

export interface ChemicalDisinfectionPreset {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly activeSubstanceRu: string;
	readonly concentrationPercent: number;
	readonly exposureMinutes: number;
	readonly targetGroupRu: string;
	readonly methodRu:
		| "погружение"
		| "ультразвуковая_ванна"
		| "2-кратное_протирание"
		| "орошение";
	readonly temperatureC?: number;
	readonly ultrasonicFrequencyKhz?: number;
	readonly shelfLifeSolutionDays: number;
	readonly sanpinClause: string;
	readonly testStripBrandRu: string;
	readonly instructionsRu: string;
}
