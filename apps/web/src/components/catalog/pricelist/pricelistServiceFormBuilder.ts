import { rublesToKopecks } from "./servicePricelistEngine";
import type {
	DoctorSpecialty,
	PriceTierKind,
	ServiceCategory,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export interface BuildServicePricelistItemParams {
	readonly id: string;
	readonly code: string;
	readonly commercialTitle: string;
	readonly statutoryTitle: string;
	readonly category: ServiceCategory;
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
	const code = params.code.trim().toUpperCase() || "A16.07.002";
	const statTitle =
		params.statutoryTitle.trim() || params.commercialTitle.trim();
	return {
		id: params.id,
		statutoryCode: code,
		code804n: code,
		commercialTitle:
			params.commercialTitle.trim() || params.statutoryTitle.trim(),
		statutoryTitle: statTitle,
		statutoryTitle804n: statTitle,
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
