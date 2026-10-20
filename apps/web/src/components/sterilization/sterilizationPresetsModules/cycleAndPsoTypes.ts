/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/cycleAndPsoTypes.ts
 *
 * Типы циклов автоклавирования и контроля качества ПСО.
 * Мандат 8b: строго <= 120 строк.
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

export type SterilizationCyclePreset = Omit<
	AutoclaveCycleRecord,
	"id" | "cycleNumber" | "timestamp"
> & {
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

export type PsoQualityControlPreset = Omit<
	PsoQualityRecord,
	"id" | "timestamp"
> & {
	readonly id?: string;
};
