/**
 * clinicalMarketMaterialsCatalog.ts — Единый канонический фасад клинических материалов
 * с охватом до 90% реального рынка РФ/СНГ с ранжированием строго по популярности.
 *
 * Соответствие стандартам:
 * - Mandate 8e: Doctor Autonomy (врач выбирает материал за 1 клик из топа популярных)
 * - Mandate 8b: строго <= 800 строк на файл
 * - Mandate 8d: ноль мультяшных эмодзи
 * - Mandate 8s: единый источник правды для всех модулей монорепозитория
 * - UTF-8 без BOM
 */

import {
	BONE_GRAFT_MEMBRANES_REGISTRY,
	IMPLANT_SYSTEMS_MARKET_REGISTRY,
	type ClinicalMarketMaterialItem,
	type ClinicalMaterialDomain,
} from "./materials/implantAndBoneMaterialsData.js";
import {
	ENDODONTIC_MATERIALS_REGISTRY,
	ORTHODONTIC_MATERIALS_REGISTRY,
} from "./materials/endoAndOrthoMaterialsData.js";
import { PROSTHODONTIC_MATERIALS_REGISTRY } from "./materials/prosthoMaterialsData.js";

export type { ClinicalMarketMaterialItem, ClinicalMarketMaterialItem as ClinicalMarketMaterial, ClinicalMaterialDomain };
export {
	IMPLANT_SYSTEMS_MARKET_REGISTRY,
	BONE_GRAFT_MEMBRANES_REGISTRY,
	ENDODONTIC_MATERIALS_REGISTRY,
	ORTHODONTIC_MATERIALS_REGISTRY,
	PROSTHODONTIC_MATERIALS_REGISTRY,
};

/**
 * Полный объединенный реестр клинических материалов рынка РФ/СНГ
 */
export const ALL_CLINICAL_MARKET_MATERIALS: readonly ClinicalMarketMaterialItem[] = [
	...IMPLANT_SYSTEMS_MARKET_REGISTRY,
	...BONE_GRAFT_MEMBRANES_REGISTRY,
	...ENDODONTIC_MATERIALS_REGISTRY,
	...ORTHODONTIC_MATERIALS_REGISTRY,
	...PROSTHODONTIC_MATERIALS_REGISTRY,
];

export const CLINICAL_MATERIAL_DOMAINS: readonly { id: ClinicalMaterialDomain; labelRu: string }[] = [
	{ id: "implant_system", labelRu: "Имплантационные системы" },
	{ id: "bone_graft_membrane", labelRu: "Костные материалы и мембраны" },
	{ id: "endo_file", labelRu: "Эндодонтия: Машинные файлы" },
	{ id: "endo_sealer", labelRu: "Эндодонтия: Силеры" },
	{ id: "endo_irrigation", labelRu: "Эндодонтия: Ирригация" },
	{ id: "endo_dressing", labelRu: "Эндодонтия: Временные вложения Ca(OH)2" },
	{ id: "ortho_bracket", labelRu: "Ортодонтия: Брекет-системы" },
	{ id: "ortho_archwire", labelRu: "Ортодонтия: Дуги" },
	{ id: "ortho_aligner", labelRu: "Ортодонтия: Элайнеры" },
	{ id: "ortho_miniscrew", labelRu: "Ортодонтия: Микровинты" },
	{ id: "prostho_a_silicone", labelRu: "Ортопедия: А-силиконы" },
	{ id: "prostho_c_silicone", labelRu: "Ортопедия: С-силиконы" },
	{ id: "prostho_cement_perm", labelRu: "Ортопедия: Постоянные цементы" },
	{ id: "prostho_cement_temp", labelRu: "Ортопедия: Временные цементы" },
	{ id: "prostho_retraction", labelRu: "Ортопедия: Ретракционные нити" },
];

/**
 * Получить материалы по категории (домену), отсортированные строго по рыночному рангу популярности.
 */
export function getClinicalMaterialsByDomain(
	domain: ClinicalMaterialDomain | "all",
): readonly ClinicalMarketMaterialItem[] {
	if (domain === "all") {
		return ALL_CLINICAL_MARKET_MATERIALS;
	}
	return ALL_CLINICAL_MARKET_MATERIALS.filter((m) => m.domain === domain).sort(
		(a, b) => a.marketRank - b.marketRank,
	);
}

/**
 * Поиск материалов по строке (название, производитель, синонимы), отсортированный по рангу.
 */
export function searchClinicalMaterials(
	query: string,
	domain?: ClinicalMaterialDomain | "all",
): readonly ClinicalMarketMaterialItem[] {
	const normalized = query.trim().toLowerCase();
	const pool = domain && domain !== "all"
		? ALL_CLINICAL_MARKET_MATERIALS.filter((m) => m.domain === domain)
		: ALL_CLINICAL_MARKET_MATERIALS;

	if (!normalized) {
		return [...pool].sort((a, b) => a.marketRank - b.marketRank);
	}

	return pool
		.filter((item) => {
			const inName = item.nameRu.toLowerCase().includes(normalized);
			const inBrand = item.brandName.toLowerCase().includes(normalized);
			const inMfr = item.manufacturer.toLowerCase().includes(normalized);
			const inAliases = item.aliases?.some((a) => a.toLowerCase().includes(normalized));
			return inName || inBrand || inMfr || inAliases;
		})
		.sort((a, b) => a.marketRank - b.marketRank);
}

/**
 * Найти материал по точному ID
 */
export function findClinicalMaterialById(
	id: string,
): ClinicalMarketMaterialItem | undefined {
	return ALL_CLINICAL_MARKET_MATERIALS.find((m) => m.id === id);
}

/**
 * Топ популярных материалов в категории (по умолчанию топ-5) для 1-клик быстрого выбора
 */
export function getTopPopularMaterials(
	domain: ClinicalMaterialDomain,
	limit = 5,
): readonly ClinicalMarketMaterialItem[] {
	return getClinicalMaterialsByDomain(domain).slice(0, limit);
}
