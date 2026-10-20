import { rublesToKopecks } from "./servicePricelistEngine";
import type {
	DoctorSpecialty,
	Order804nCategory,
	PriceTierKind,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export interface BuildServicePricelistItemParams {
	readonly id: string;
	readonly code: string;
	readonly commercialTitle: string;
	readonly statutoryTitle: string;
	readonly category: Order804nCategory;
	readonly specialty: DoctorSpecialty;
	readonly priceRub: number;
	readonly materialCostRub: number;
	readonly labCostRub: number;
	readonly durationMin: number;
	readonly icd10List: readonly string[];
	readonly tierPrices: Partial<Record<PriceTierKind, number>>;
	readonly fallbackItem?: ServicePricelistItem | null;
}

export function buildServicePricelistItem(
	params: BuildServicePricelistItemParams,
): ServicePricelistItem {
	return {
		id: params.id,
		code804n: params.code.trim().toUpperCase() || "A16.07.002",
		commercialTitle:
			params.commercialTitle.trim() || params.statutoryTitle.trim(),
		statutoryTitle804n:
			params.statutoryTitle.trim() || params.commercialTitle.trim(),
		category: params.category,
		specialty: params.specialty,
		basePriceRub: params.priceRub,
		basePriceKopecks: rublesToKopecks(params.priceRub),
		materialCostRub: params.materialCostRub,
		labCostRub: params.labCostRub,
		tierPrices:
			Object.keys(params.tierPrices).length > 0
				? params.tierPrices
				: params.fallbackItem?.tierPrices,
		estimatedDurationMin: params.durationMin,
		icd10Indications: params.icd10List as string[],
		vatRate: 0,
		vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
		isActive: true,
		isArchived: false,
		tags: params.fallbackItem?.tags ?? [],
	};
}
