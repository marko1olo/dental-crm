export interface LabPriceMatrixItem {
	readonly id: string;
	readonly category:
		| "crowns"
		| "aesthetics"
		| "removable"
		| "aligners"
		| "implants";
	readonly categoryTitleRu: string;
	readonly nameRu: string;
	readonly shortTitle: string;
	readonly material: string;
	readonly turnaroundBusinessDays: number;
	readonly suggestedCostRub: number;
	readonly suggestedPriceRub: number;
	readonly doctorDeductionPct: number;
	readonly specialInstructions?: string;
}
