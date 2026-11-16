/**
 * apps/web/src/components/catalog/pricelist/pricelistCatalogTypes.ts
 *
 * Типы категорий, нормализаторы и структуры данных студии прейскуранта.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 250).
 */

import type { DentalSpecialty, ServiceCategory } from "@dental/shared";

export type PricelistCategoryKey =
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "orthodontics"
	| "implantology"
	| "pediatric"
	| "hygiene"
	| "diagnostics";

/**
 * Двусторонний маппинг категорий фронтенда со схемой serviceCategorySchema бэкенда (DEF-PRICE-01).
 */
export function normalizeCategoryToBackend(category: string): ServiceCategory {
	switch (category) {
		case "orthopedics":
			return "prosthetics";
		case "diagnostics":
			return "imaging";
		case "implantology":
			return "surgery";
		case "pediatric":
			return "therapy";
		case "consultation":
		case "therapy":
		case "surgery":
		case "prosthetics":
		case "orthodontics":
		case "periodontology":
		case "hygiene":
		case "imaging":
		case "documents":
		case "other":
			return category;
		default:
			return "other";
	}
}

/**
 * Нормализация категории бэкенда в категорию студии прейскуранта фронтенда (DEF-PRICE-01).
 */
export function normalizeCategoryFromBackend(category: string | null | undefined): PricelistCategoryKey {
	switch (category) {
		case "prosthetics":
			return "orthopedics";
		case "imaging":
		case "consultation":
		case "documents":
			return "diagnostics";
		case "surgery":
			return "surgery";
		case "orthodontics":
			return "orthodontics";
		case "hygiene":
		case "periodontology":
			return "hygiene";
		case "pediatric":
			return "pediatric";
		case "implantology":
			return "implantology";
		case "therapy":
		default:
			return "therapy";
	}
}

/**
 * Динамическое определение специальности врача по категории услуги (DEF-PRICE-04).
 */
export function getSpecialtyForCategory(category: string): DentalSpecialty {
	switch (category) {
		case "surgery":
		case "implantology":
			return "surgeon";
		case "orthopedics":
		case "prosthetics":
			return "orthopedist";
		case "orthodontics":
			return "orthodontist";
		case "hygiene":
			return "hygienist";
		case "pediatric":
			return "pediatric";
		case "diagnostics":
		case "imaging":
			return "radiologist";
		case "periodontology":
			return "periodontist";
		case "therapy":
		case "consultation":
		default:
			return "therapist";
	}
}

export interface PricelistCategoryMeta {
	readonly key: PricelistCategoryKey;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly badgeClass: string;
}

export const CANONICAL_CLINICAL_CATEGORIES: readonly PricelistCategoryMeta[] = [
	{
		key: "therapy",
		title: "Терапия и лечение",
		shortTitle: "Терапия",
		description: "Лечение кариеса, пульпита, каналов и эстетические реставрации",
		badgeClass: "badge-therapy",
	},
	{
		key: "surgery",
		title: "Хирургия и удаление",
		shortTitle: "Хирургия",
		description: "Удаление зубов любой сложности, резекции верхушек, пластика уздечек",
		badgeClass: "badge-surgery",
	},
	{
		key: "orthopedics",
		title: "Ортопедия и коронки",
		shortTitle: "Ортопедия",
		description: "Коронки, мостовидные протезы, виниры, съемное протезирование",
		badgeClass: "badge-orthopedics",
	},
	{
		key: "orthodontics",
		title: "Ортодонтия и прикус",
		shortTitle: "Ортодонтия",
		description: "Брекет-системы, ортодонтические дуги, элайнеры, ретейнеры",
		badgeClass: "badge-orthodontics",
	},
	{
		key: "implantology",
		title: "Имплантология",
		shortTitle: "Имплантация",
		description: "Дентальная имплантация, остеопластика, синус-лифтинг и формирователи десны",
		badgeClass: "badge-implantology",
	},
	{
		key: "pediatric",
		title: "Детская стоматология",
		shortTitle: "Детство",
		description: "Адаптационный приём, лечение молочных зубов, цветные пломбы, герметизация",
		badgeClass: "badge-pediatric",
	},
	{
		key: "hygiene",
		title: "Профилактика и гигиена",
		shortTitle: "Гигиена",
		description: "Air-Flow, ультразвуковой скейлинг, полировка, фторирование и пародонтология",
		badgeClass: "badge-hygiene",
	},
	{
		key: "diagnostics",
		title: "Диагностика и снимки",
		shortTitle: "Диагностика",
		description: "Консультации, прицельные снимки, радиовизиография, КЛКТ 3D",
		badgeClass: "badge-diagnostics",
	},
];

/**
 * Получение человекочитаемого названия категории для UI без утечки английских энумов (DEF-PRICE-03).
 */
export function getCategoryDisplayLabel(category: string): string {
	const found = CANONICAL_CLINICAL_CATEGORIES.find((c) => c.key === category);
	if (found) return found.shortTitle;
	switch (category) {
		case "prosthetics":
			return "Ортопедия";
		case "imaging":
			return "Диагностика";
		case "consultation":
			return "Консультация";
		case "periodontology":
			return "Пародонтология";
		case "documents":
			return "Документы";
		case "other":
			return "Прочее";
		default:
			return category;
	}
}

export interface PricelistStudioItem {
	readonly id: string;
	readonly code: string;
	readonly serviceCode?: string | undefined;
	readonly regulatoryCode?: string | undefined;
	readonly statutoryCode?: string | undefined;
	readonly code804n?: string | undefined;
	readonly title: string;
	readonly category: PricelistCategoryKey;
	readonly priceKopecks: number;
	readonly costKopecks: number;
	readonly durationMin: number;
	readonly isActive: boolean;
	readonly isArchived?: boolean | undefined;
	readonly tags?: readonly string[] | undefined;
	readonly isBundle?: boolean | undefined;
	readonly active?: boolean | undefined;
	readonly priceRub?: number | undefined;
	readonly basePriceRub?: number | undefined;
	readonly materialCostRub?: number | undefined;
	readonly materialsCostRub?: number | undefined;
	readonly costRub?: number | undefined;
	readonly estimatedDurationMin?: number | undefined;
	readonly commercialTitle?: string | undefined;
}

export interface PricelistClinicalBundle {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly category: PricelistCategoryKey;
	readonly priceKopecks: number;
	readonly itemsCount: number;
	readonly items: readonly string[];
}

export function calculateMarginKopecks(priceKopecks: number, costKopecks: number): number {
	return Math.max(0, priceKopecks - costKopecks);
}

export function calculateMarginPercent(priceKopecks: number, costKopecks: number): number {
	if (priceKopecks <= 0) return 0;
	const margin = calculateMarginKopecks(priceKopecks, costKopecks);
	return Math.round((margin / priceKopecks) * 100);
}

export function getMatchedTag(item: PricelistStudioItem, query: string): string | undefined {
	const q = query.trim().toLowerCase();
	if (!q || !item.tags) return undefined;
	return item.tags.find((t) => t.toLowerCase().includes(q));
}

export function filterPricelist(
	items: readonly PricelistStudioItem[],
	selectedCategory: PricelistCategoryKey | "all",
	searchQuery: string,
): readonly PricelistStudioItem[] {
	const query = searchQuery.trim().toLowerCase();
	return items.filter((item) => {
		if (selectedCategory !== "all" && item.category !== selectedCategory) {
			return false;
		}
		if (!query) return true;
		const matchTitle = item.title.toLowerCase().includes(query);
		const matchCode = item.code.toLowerCase().includes(query);
		const matchTags = item.tags?.some((tag) => tag.toLowerCase().includes(query)) ?? false;
		return matchTitle || matchCode || matchTags;
	});
}

export function calculatePricelistStats(items: readonly PricelistStudioItem[]) {
	const totalItems = items.length;
	const activeItems = items.filter((i) => i.isActive).length;
	const totalRevenuePotentialKopecks = items.reduce(
		(sum, item) => sum + (item.isActive ? item.priceKopecks : 0),
		0,
	);
	const avgMarginPercent =
		totalItems > 0
			? Math.round(
					items.reduce(
						(sum, item) => sum + calculateMarginPercent(item.priceKopecks, item.costKopecks),
						0,
					) / totalItems,
				)
			: 0;

	return {
		totalItems,
		activeItems,
		totalRevenuePotentialKopecks,
		avgMarginPercent,
	};
}
