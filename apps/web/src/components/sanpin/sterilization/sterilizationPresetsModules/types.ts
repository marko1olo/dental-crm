/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/types.ts
 * Единые типизированные интерфейсы стерилизации, автоклавирования и контроля ПСО.
 */

export interface AutoclaveCycleRecord {
	readonly id: string;
	readonly cycleNumber: number;
	readonly autoclaveCode: string;
	readonly autoclaveModel: string;
	readonly programName?: string;
	readonly sterilizerType?: "autoclave_class_b" | "dry_heat";
	readonly temperatureC: number;
	readonly pressureBar: number;
	readonly exposureMinutes: number;
	readonly preVacuum: string;
	readonly indicatorPointsStatus: string;
	readonly indicatorBrand?: "Медтест" | "DGM Steriguard" | "Винар";
	readonly indicatorClass?: 4 | 5;
	readonly indicatorVerdict?: string;
	readonly kraftSize?: "75x150" | "100x200" | "150x250";
	readonly shelfLifeDays?: number;
	readonly bowieDickResult: "passed" | "not_performed" | "failed";
	readonly bowieDickNote: string;
	readonly loadDescription: string;
	readonly packageType: string;
	readonly batchVerdict: "ГОДНА" | "БРАК";
	readonly operatorName: string;
	readonly timestamp: string;
	readonly sanpinClause: string;
	readonly isQuickPreset?: boolean;
}

export type SterilizationCyclePreset = Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp"> & {
	readonly id?: string;
};

export interface PsoQualityRecord {
	readonly id: string;
	readonly testType: "azopyram" | "phenolphthalein" | "both";
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly minSampleCountRequired?: number;
	readonly samplingSatisfied?: boolean;
	readonly azopyramResult: "negative" | "positive";
	readonly azopyramResultDescriptionRu?: string;
	readonly phenolphthaleinResult: "negative" | "positive";
	readonly phenolphthaleinResultDescriptionRu?: string;
	readonly detergentBrand: string;
	readonly isApproved: boolean;
	readonly operatorName: string;
	readonly timestamp: string;
	readonly sanpinClause: string;
	readonly notes: string;
}

export type PsoQualityControlPreset = Omit<PsoQualityRecord, "id" | "timestamp"> & {
	readonly id?: string;
};

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
	readonly methodRu: "погружение" | "ультразвуковая_ванна" | "2-кратное_протирание" | "орошение";
	readonly temperatureC?: number;
	readonly ultrasonicFrequencyKhz?: number;
	readonly shelfLifeSolutionDays: number;
	readonly sanpinClause: string;
	readonly testStripBrandRu: string;
	readonly instructionsRu: string;
}
