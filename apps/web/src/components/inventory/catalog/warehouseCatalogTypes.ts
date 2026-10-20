export type WarehouseCatalogCategory =
	| "all"
	| "anesthetics"
	| "filling"
	| "impression"
	| "disposables"
	| "disinfection"
	| "surgery"
	| "therapy"
	| "orthopedics";

export interface WarehouseCatalogCategoryTab {
	readonly id: WarehouseCatalogCategory;
	readonly label: string;
}

export const WAREHOUSE_CATALOG_CATEGORIES: readonly WarehouseCatalogCategoryTab[] =
	[
		{ id: "all", label: "Все" },
		{ id: "anesthetics", label: "Анестетики" },
		{ id: "filling", label: "Пломбировочные" },
		{ id: "impression", label: "Слепочные" },
		{ id: "disposables", label: "Расходные средства" },
		{ id: "disinfection", label: "Дезинфекция" },
		{ id: "surgery", label: "Хирургия" },
	];

export function formatCategoryRu(category?: string | null): string {
	if (!category) return "Расходные материалы";
	const l = category.toLowerCase().trim();
	if (l === "therapy") return "Терапия";
	if (l === "disinfection") return "Дезинфекция";
	if (l === "orthopedics" || l === "orthodontics") return "Ортопедия";
	if (l === "surgery") return "Хирургия";
	if (l === "anesthesia" || l === "anesthetics") return "Анестетики";
	if (l === "composite" || l === "composites" || l === "filling")
		return "Пломбировочные";
	if (l === "impression" || l === "impressions") return "Слепочные";
	if (l === "disposables" || l === "consumables") return "Расходные средства";
	if (l === "endo" || l === "endodontics") return "Эндодонтия";
	return category;
}
