/**
 * nomenclature.ts — Каталог номенклатуры услуг для ДМС и функции поиска
 */

import { NOMENCLATURE_CATALOG_OTHER } from "./nomenclatureCatalogOther.js";
import { NOMENCLATURE_CATALOG_THERAPY } from "./nomenclatureCatalogTherapy.js";
import type { Nomenclature804nItem } from "./types.js";

export const NOMENCLATURE_804N_CATALOG: readonly Nomenclature804nItem[] = [
	...NOMENCLATURE_CATALOG_THERAPY,
	...NOMENCLATURE_CATALOG_OTHER,
];

export function search804nServices(query: string): Nomenclature804nItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return [...NOMENCLATURE_804N_CATALOG];
	return NOMENCLATURE_804N_CATALOG.filter(
		(item) => item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.categoryTitleRu.toLowerCase().includes(q),
	);
}
