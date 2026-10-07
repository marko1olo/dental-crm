/*
 * treatmentEstimatorBundles.ts — Бесшовный перенос диагнозов одонтограммы в смету.
 * Например: кариес 16 -> анестезия + препарирование + световая пломба с копеечной точностью.
 * Мандаты 8b, 8e: точные копейки, отсутствие выдуманных цен, автономия врача.
 * Номенклатура Приказа Минздрава РФ 804н.
 */

import type { PlanPriceCatalogItem } from "../treatment-plans/planPricing";
import type { PlanItem } from "./treatmentEstimatorCatalogMatching";
import { surfaceSuffix } from "./treatmentEstimatorCatalogMatching";
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
	codes?: readonly string[],
): PlanPriceCatalogItem | undefined {
	const activeItems = catalog.filter((s) => s.active);

	// 1. Поиск по кодам Приказа 804н (точный приоритет)
	if (codes && codes.length > 0) {
		for (const code of codes) {
			const found = activeItems.find(
				(s) =>
					s.id === code ||
					(s as unknown as Record<string, unknown>).code === code ||
					(s as unknown as Record<string, unknown>).code804n === code,
			);
			if (found) return found;
		}
	}

	const normalizedKeywords = keywords.map((k) => k.toLowerCase().replace(/ё/g, "е"));

	// 2. Поиск в заданной категории с совпадением ключевых слов
	if (category) {
		const inCat = activeItems.filter((s) => s.category.toLowerCase().includes(category.toLowerCase()));
		for (const kw of normalizedKeywords) {
			const found = inCat.find((s) => s.title.toLowerCase().replace(/ё/g, "е").includes(kw));
			if (found) return found;
		}
	}

	// 3. Поиск по всем активным услугам
	for (const kw of normalizedKeywords) {
		const found = activeItems.find((s) => s.title.toLowerCase().replace(/ё/g, "е").includes(kw));
		if (found) return found;
	}

	return undefined;
}

/**
 * Формирует клинический пакет санации кариеса у кресла (кариес 16 -> анестезия + препарирование + световая пломба).
 * Номенклатура 804н: A11.07.012, A16.07.002.001, A16.07.002, A16.07.002.010, A16.07.002.011.
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
		const anesthSvc = findCatalogService(
			catalog,
			["анестези", "убистезин", "септонест", "артикаин"],
			"анестез",
			["A11.07.012", "A25.07.001"],
		);
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
		const isolSvc = findCatalogService(
			catalog,
			["коффердам", "раббердам", "изоляци", "препарирован"],
			"терап",
			["A16.07.002.001", "A16.07.051"],
		);
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
	const fillCodes = isDeciduous
		? ["A16.07.002.001"]
		: ["A16.07.002.010", "A16.07.002.011"];
	const fillSvc = findCatalogService(catalog, fillKeywords, "терап", fillCodes);

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
		const polishSvc = findCatalogService(
			catalog,
			["шлифовк", "полировк", "полирование"],
			"терап",
			["A16.07.002.011", "A16.07.002.012"],
		);
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
 * Формирует клинический пакет эндодонтического лечения пульпита у кресла (K04.0).
 * Номенклатура 804н: A11.07.012, A16.07.002.001, A16.07.030.001, A16.07.030.002, A16.07.030.004.
 */
export function createChairsideEndoBundle(
	toothNumber: number,
	catalog: readonly PlanPriceCatalogItem[],
	options?: ChairsidePathologyBundleOptions,
): PlanItem[] {
	const items: PlanItem[] = [];

	// 1. Анестезия
	if (options?.includeAnesthesia !== false) {
		const anesthSvc = findCatalogService(
			catalog,
			["анестези", "убистезин", "септонест", "артикаин"],
			"анестез",
			["A11.07.012", "A25.07.001"],
		);
		items.push({
			id: `endo_anesth_${toothNumber}_${Date.now()}`,
			toothNumber,
			priceId: anesthSvc ? anesthSvc.id : null,
			name: anesthSvc ? anesthSvc.title : "Местная анестезия (инфильтрационная / проводниковая)",
			quantity: 1,
			price: anesthSvc && Number.isFinite(anesthSvc.basePriceRub) ? anesthSvc.basePriceRub : null,
			discount: 0,
			phase: 1,
			category: "Анестезия",
			isAuto: true,
			suggestion: "pulpitis",
			issue: anesthSvc ? null : { kind: "not_in_catalog", humanName: "анестезия", matches: 0 },
		});
	}

	// 2. Коффердам
	if (options?.includeIsolation !== false) {
		const isolSvc = findCatalogService(
			catalog,
			["коффердам", "раббердам", "изоляци"],
			"терап",
			["A16.07.002.001", "A16.07.051"],
		);
		if (isolSvc) {
			items.push({
				id: `endo_isol_${toothNumber}_${Date.now()}`,
				toothNumber,
				priceId: isolSvc.id,
				name: isolSvc.title,
				quantity: 1,
				price: Number.isFinite(isolSvc.basePriceRub) ? isolSvc.basePriceRub : null,
				discount: 0,
				phase: 1,
				category: isolSvc.category,
				isAuto: true,
				suggestion: "pulpitis",
				issue: null,
			});
		}
	}

	// 3. Обработка каналов и депульпирование
	const endoSvc = findCatalogService(
		catalog,
		["пульпит", "эндодонт", "депульпирован", "каналы"],
		"эндодонт",
		["A16.07.030.001", "A16.07.030.002"],
	);
	items.push({
		id: `endo_treat_${toothNumber}_${Date.now()}`,
		toothNumber,
		priceId: endoSvc ? endoSvc.id : null,
		name: endoSvc ? endoSvc.title : "Эндодонтическое лечение (обработка каналов)",
		quantity: 1,
		price: endoSvc && Number.isFinite(endoSvc.basePriceRub) ? endoSvc.basePriceRub : null,
		discount: 0,
		phase: 1,
		category: "Эндодонтия",
		isAuto: true,
		suggestion: "pulpitis",
		issue: endoSvc ? null : { kind: "not_in_catalog", humanName: "лечение пульпита", matches: 0 },
	});

	return items;
}

/**
 * Формирует клинический пакет лечения периодонтита (K04.7).
 */
export function createChairsidePeriodontitisBundle(
	toothNumber: number,
	catalog: readonly PlanPriceCatalogItem[],
	options?: ChairsidePathologyBundleOptions,
): PlanItem[] {
	const items: PlanItem[] = [];

	if (options?.includeAnesthesia !== false) {
		const anesthSvc = findCatalogService(
			catalog,
			["анестези", "убистезин", "септонест"],
			"анестез",
			["A11.07.012", "A25.07.001"],
		);
		items.push({
			id: `perio_anesth_${toothNumber}_${Date.now()}`,
			toothNumber,
			priceId: anesthSvc ? anesthSvc.id : null,
			name: anesthSvc ? anesthSvc.title : "Местная анестезия",
			quantity: 1,
			price: anesthSvc && Number.isFinite(anesthSvc.basePriceRub) ? anesthSvc.basePriceRub : null,
			discount: 0,
			phase: 1,
			category: "Анестезия",
			isAuto: true,
			suggestion: "periodontitis",
			issue: null,
		});
	}

	const perioSvc = findCatalogService(
		catalog,
		["периодонтит", "распломбирован", "кальций"],
		"эндодонт",
		["A16.07.082", "A16.07.091"],
	);
	items.push({
		id: `perio_treat_${toothNumber}_${Date.now()}`,
		toothNumber,
		priceId: perioSvc ? perioSvc.id : null,
		name: perioSvc ? perioSvc.title : "Лечение периодонтита (распломбирование и лекарственная обтурация)",
		quantity: 1,
		price: perioSvc && Number.isFinite(perioSvc.basePriceRub) ? perioSvc.basePriceRub : null,
		discount: 0,
		phase: 1,
		category: "Эндодонтия",
		isAuto: true,
		suggestion: "periodontitis",
		issue: null,
	});

	return items;
}

/**
 * Формирует клинический пакет удаления зуба (K08.1).
 */
export function createChairsideExtractionBundle(
	toothNumber: number,
	catalog: readonly PlanPriceCatalogItem[],
	options?: ChairsidePathologyBundleOptions,
): PlanItem[] {
	const items: PlanItem[] = [];

	if (options?.includeAnesthesia !== false) {
		const anesthSvc = findCatalogService(
			catalog,
			["анестези", "убистезин", "септонест"],
			"анестез",
			["A11.07.012", "A25.07.001"],
		);
		items.push({
			id: `extract_anesth_${toothNumber}_${Date.now()}`,
			toothNumber,
			priceId: anesthSvc ? anesthSvc.id : null,
			name: anesthSvc ? anesthSvc.title : "Местная анестезия",
			quantity: 1,
			price: anesthSvc && Number.isFinite(anesthSvc.basePriceRub) ? anesthSvc.basePriceRub : null,
			discount: 0,
			phase: 2,
			category: "Анестезия",
			isAuto: true,
			issue: null,
		});
	}

	const extractSvc = findCatalogService(
		catalog,
		["удаление зуба", "удаление постоянного", "экстракция"],
		"хирург",
		["A16.07.001.001", "A16.07.001"],
	);
	items.push({
		id: `extract_treat_${toothNumber}_${Date.now()}`,
		toothNumber,
		priceId: extractSvc ? extractSvc.id : null,
		name: extractSvc ? extractSvc.title : "Удаление зуба",
		quantity: 1,
		price: extractSvc && Number.isFinite(extractSvc.basePriceRub) ? extractSvc.basePriceRub : null,
		discount: 0,
		phase: 2,
		category: "Хирургия",
		isAuto: true,
		issue: null,
	});

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
	switch (state) {
		case "Caries":
			return createChairsideCariesBundle(toothNumber, catalog, options);
		case "Pulpitis":
			return createChairsideEndoBundle(toothNumber, catalog, options);
		case "Periodontitis":
			return createChairsidePeriodontitisBundle(toothNumber, catalog, options);
		case "Missing":
		case "ExtractionIndicated":
			return createChairsideExtractionBundle(toothNumber, catalog, options);
		default:
			return [];
	}
}
