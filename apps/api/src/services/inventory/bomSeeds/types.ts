/**
 * @file types.ts
 * Доменные типы эталонных технологических карт (BOM) расхода стоматологических материалов.
 */

export interface DefaultBomMaterialSeed {
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly quantityToDeduct: number;
	readonly requiredQty?: number;
	readonly defaultUnitCostRub: number;
	readonly defaultStockQty: number;
	readonly criticalThreshold: number;
}

export interface DefaultBomProcedureSeed {
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly serviceCategory:
		| "consultation"
		| "therapy"
		| "surgery"
		| "prosthetics"
		| "orthodontics"
		| "periodontology"
		| "hygiene"
		| "imaging"
		| "documents"
		| "other";
	readonly specialty:
		| "therapist"
		| "orthopedist"
		| "surgeon"
		| "orthodontist"
		| "periodontist"
		| "hygienist"
		| "pediatric"
		| "implantologist"
		| "radiologist"
		| "universal";
	readonly basePriceRub: number;
	readonly durationMinutes: number;
	readonly materials: readonly DefaultBomMaterialSeed[];
}

export interface SeedDefaultBomResult {
	readonly createdServicesCount: number;
	readonly createdItemsCount: number;
	readonly createdRulesCount: number;
	readonly totalRulesCount: number;
}
