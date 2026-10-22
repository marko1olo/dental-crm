import type { ChairsideExpressService, FilteredCatalogService } from "../completedServicesPlan";
import type { ClinicalServiceBundle } from "./types";

export function buildExpressServicePayload(
	service: ChairsideExpressService,
	selectedTooth: string | null,
) {
	return {
		toothNumber: selectedTooth ? Number(selectedTooth) || selectedTooth : undefined,
		toothCode: selectedTooth || undefined,
		services: [
			{
				code: service.code804n,
				code804n: service.code804n,
				title: service.title,
				price: service.priceRub,
				priceRub: service.priceRub,
				unitPriceRub: service.priceRub,
				quantity: 1,
				toothCode: selectedTooth || undefined,
			},
		],
		source: "chairside_express",
	};
}

export function buildCatalogServicePayload(
	item: FilteredCatalogService,
	selectedTooth: string | null,
) {
	return {
		toothNumber: selectedTooth ? Number(selectedTooth) || selectedTooth : undefined,
		toothCode: selectedTooth || undefined,
		services: [
			{
				code: item.code,
				code804n: item.code,
				title: item.title,
				price: item.priceRub,
				priceRub: item.priceRub,
				unitPriceRub: item.priceRub,
				quantity: 1,
				toothCode: selectedTooth || undefined,
			},
		],
		source: "chairside_catalog",
	};
}

export function buildBundlePayload(
	bundle: ClinicalServiceBundle,
	selectedTooth: string | null,
) {
	return {
		bundleId: bundle.id,
		bundleTitle: bundle.title,
		toothNumber: selectedTooth ? Number(selectedTooth) || selectedTooth : undefined,
		toothCode: selectedTooth || undefined,
		services: bundle.services.map((s) => ({
			code: s.code804n,
			code804n: s.code804n,
			title: s.title,
			price: s.priceRub,
			priceRub: s.priceRub,
			unitPriceRub: s.priceRub,
			quantity: 1,
			toothCode: selectedTooth || undefined,
		})),
		source: "chairside_bundle",
	};
}
