/*
 * treatmentEstimatorBundles.ts — Бесшовный перенос диагнозов одонтограммы в смету (1 клик).
 * Например: кариес 16 -> анестезия + препарирование + световая пломба в 1 клик с копеечной точностью.
 * Мандаты 8b, 8e: точные копейки, отсутствие выдуманных цен, автономия врача.
 */

import type { PlanPriceCatalogItem } from "../treatment-plans/planPricing";
import type { PlanItem } from "./treatmentEstimatorCatalogMatching";
import { formatSurfacesText, surfaceSuffix } from "./treatmentEstimatorCatalogMatching";
import { isDeciduousFdiToothNumber } from "./treatmentEstimatorRules";

export interface ChairsidePathologyBundleOptions {
	readonly surfaces?: readonly string[] | undefined;
	readonly includeAnesthesia?: boolean | undefined;
	readonly includeIsolation?: boolean | undefined;
	readonly includePolishing?: boolean | undefined;
	readonly canalsCount?: number | undefined;
}

function findCatalogService(
	catalog: readonly PlanPriceCatalogItem[],
	keywords: readonly string[],
	category?: string,
): PlanPriceCatalogItem | undefined {
	const activeItems = catalog.filter((s) => s.active);
	const normalizedKeywords = keywords.map((k) => k.toLowerCase().replace(/ё/g, "е"));

	// 1. Поиск в заданной категории с совпадением всех или хотя бы одного ключевого слова
	if (category) {
		const inCat = activeItems.filter((s) => s.category.toLowerCase().includes(category.toLowerCase()));
		for (const kw of normalizedKeywords) {
			const found = inCat.find((s) => s.title.toLowerCase().replace(/ё/g, "е").includes(kw));
			if (found) return found;
		}
	}

	// 2. Поиск по всем активным услугам
	for (const kw of normalizedKeywords) {
		const found = activeItems.find((s) => s.title.toLowerCase().replace(/ё/g, "е").includes(kw));
		if (found) return found;
	}

	return undefined;
}

/**
 * Формирует клинический пакет санации кариеса у кресла (кариес 16 -> анестезия + препарирование + световая пломба в 1 клик).
 */
export function createChairsideCariesBundle(
	toothNumber: number,
	catalog: readonly PlanPriceCatalogItem[],
	options?: ChairsidePathologyBundleOptions,
): PlanItem[] {
	const items: PlanItem[] = [];
	const isDeciduous = isDeciduousFdiToothNumber(toothNumber);
	const surfaces = options?.surfaces;
	const surfText = surfaceSuffix(surfaces);

	// 1. Анестезия (по умолчанию включена)
	if (options?.includeAnesthesia !== false) {
		const anesthSvc = findCatalogService(catalog, ["анестези", "убистезин", "септонест", "артикаин"], "анестез");
		items.push({
			id: `caries_anesth_${toothNumber}_${Date.now()}`,
			toothNumber,
			priceId: anesthSvc ? anesthSvc.id : null,
			name: anesthSvc ? anesthSvc.title : "Местная анестезия (инфильтрационная / проводниковая)",
			quantity: 1,
			price: anesthSvc && Number.isFinite(anesthSvc.basePriceRub) ? anesthSvc.basePriceRub : null,
			discount: 0,
			phase: 1,
			category: "Анестезия",
			isAuto: true,
			suggestion: "caries",
			issue: anesthSvc
				? null
				: {
						kind: catalog.length === 0 ? "catalog_empty" : "not_in_catalog",
						humanName: "местная анестезия",
						matches: 0,
					},
		});
	}

	// 2. Изоляция / препарирование (коффердам / раббердам)
	if (options?.includeIsolation !== false && !isDeciduous) {
		const isolSvc = findCatalogService(catalog, ["коффердам", "раббердам", "изоляци", "препарирован"], "терап");
		if (isolSvc) {
			items.push({
				id: `caries_isol_${toothNumber}_${Date.now()}`,
				toothNumber,
				priceId: isolSvc.id,
				name: isolSvc.title,
				quantity: 1,
				price: Number.isFinite(isolSvc.basePriceRub) ? isolSvc.basePriceRub : null,
				discount: 0,
				phase: 1,
				category: isolSvc.category,
				isAuto: true,
				suggestion: "caries",
				issue: null,
			});
		}
	}

	// 3. Световая пломба (реставрация композитом)
	const fillKeywords = isDeciduous
		? ["детск", "молочн", "стеклоиономер", "компомер", "кариес"]
		: ["кариес", "пломб", "композит", "реставрац", "estelite", "filtek"];
	const fillSvc = findCatalogService(catalog, fillKeywords, "терап");

	const defaultFillName = isDeciduous
		? `Восстановление временного зуба пломбой (лечение кариеса)${surfText}`
		: `Восстановление зуба пломбой светового отверждения (лечение кариеса)${surfText}`;

	items.push({
		id: `caries_rest_${toothNumber}_${Date.now()}`,
		toothNumber,
		priceId: fillSvc ? fillSvc.id : null,
		name: (fillSvc ? fillSvc.title : defaultFillName) + (fillSvc ? surfText : ""),
		quantity: 1,
		price: fillSvc && Number.isFinite(fillSvc.basePriceRub) ? fillSvc.basePriceRub : null,
		discount: 0,
		phase: 1,
		category: fillSvc ? fillSvc.category : "Терапия",
		isAuto: true,
		suggestion: "caries",
		issue: fillSvc
			? null
			: {
					kind: catalog.length === 0 ? "catalog_empty" : "not_in_catalog",
					humanName: "лечение кариеса",
					matches: 0,
				},
	});

	// 4. Шлифовка и полировка пломбы
	if (options?.includePolishing) {
		const polishSvc = findCatalogService(catalog, ["шлифовк", "полировк", "полирование"], "терап");
		if (polishSvc) {
			items.push({
				id: `caries_polish_${toothNumber}_${Date.now()}`,
				toothNumber,
				priceId: polishSvc.id,
				name: polishSvc.title,
				quantity: 1,
				price: Number.isFinite(polishSvc.basePriceRub) ? polishSvc.basePriceRub : null,
				discount: 0,
				phase: 1,
				category: polishSvc.category,
				isAuto: true,
				suggestion: "caries",
				issue: null,
			});
		}
	}

	return items;
}

/**
 * Бесшовный перенос клинического диагноза одонтограммы в пакет процедур.
 */
export function expandToothDiagnosisToClinicalBundle(
	toothNumber: number,
	state: string,
	catalog: readonly PlanPriceCatalogItem[],
	options?: ChairsidePathologyBundleOptions,
): PlanItem[] {
	if (state === "Caries") {
		return createChairsideCariesBundle(toothNumber, catalog, options);
	}
	return [];
}
