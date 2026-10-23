export interface StandardZtlPreset {
	readonly id: string;
	readonly name: string;
	readonly material: string;
	readonly constructionType: string;
	readonly badge: string;
	readonly description: string;
	readonly warrantyMonths: number;
	readonly warrantyLabelRu: string;
	readonly pricePatientRub: number;
	readonly costZtlRub: number;
	readonly costMaterialsRub: number;
	readonly amountKopecks?: number;
	readonly turnaroundBusinessDays: number;
	readonly fixationType?: "cement" | "screw" | "clasp" | undefined;
	readonly hasAntagonists?: boolean | undefined;
}
