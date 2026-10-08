import {
	type DentalMaterialKind,
	type DentalPricelistAnalysisRequest,
	type DentalPricelistItem,
	type DentalRestorationType,
	type ServiceCatalogItem,
	type ServiceCategory,
} from "@dental/shared";

import { normalizeKey } from "./textNormalizers.js";

export function titleTokens(value: string): Set<string> {
	return new Set(
		normalizeKey(value)
			.split(/\s+/)
			.filter((token) => token.length >= 4),
	);
}

export function matchServiceId(
	item: Pick<DentalPricelistItem, "category" | "specialty" | "title">,
	catalog: ServiceCatalogItem[],
): string | null {
	const sourceTokens = titleTokens(item.title);
	let best: { service: ServiceCatalogItem; score: number } | null = null;
	for (const service of catalog) {
		let score = service.category === item.category ? 2 : 0;
		if (
			service.specialty === item.specialty ||
			service.specialty === "universal"
		)
			score += 1;
		for (const token of titleTokens(service.title)) {
			if (sourceTokens.has(token)) score += 1;
		}
		if (score > (best?.score ?? 0)) best = { service, score };
	}
	return best && best.score >= 3 ? best.service.id : null;
}

export function buildWarnings(input: {
	title: string;
	category: ServiceCategory;
	materialKind: DentalMaterialKind;
	restorationType: DentalRestorationType;
	priceRub: number | null;
	sourceKind: DentalPricelistAnalysisRequest["sourceKind"];
}): string[] {
	const warnings: string[] = [];
	if (!input.priceRub) warnings.push("price_not_found");
	if (input.category === "other") warnings.push("category_uncertain");
	if (
		input.materialKind === "unknown" &&
		["prosthetics", "orthodontics", "surgery", "therapy"].includes(
			input.category,
		)
	) {
		warnings.push("material_uncertain");
	}
	if (input.restorationType === "unknown")
		warnings.push("restoration_uncertain");
	if (input.title.length < 4) warnings.push("title_too_short");
	if (input.sourceKind === "photo_ocr")
		warnings.push("photo_ocr_requires_visual_review");
	return warnings;
}

export function confidenceForItem(input: {
	title: string;
	category: ServiceCategory;
	materialKind: DentalMaterialKind;
	restorationType: DentalRestorationType;
	brand: string | null;
	priceRub: number | null;
}): number {
	let confidence = 0.35;
	if (input.priceRub !== null) confidence += 0.2;
	if (input.category !== "other") confidence += 0.18;
	if (input.materialKind !== "unknown") confidence += 0.1;
	if (input.restorationType !== "none" && input.restorationType !== "unknown")
		confidence += 0.08;
	if (input.brand) confidence += 0.05;
	if (input.title.length >= 8) confidence += 0.04;
	return Math.min(0.96, Number(confidence.toFixed(2)));
}
