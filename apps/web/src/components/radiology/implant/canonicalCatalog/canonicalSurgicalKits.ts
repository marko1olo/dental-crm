/**
 * canonicalSurgicalKits.ts — Хирургические наборы и метаданные брендов (Мандаты 8s, 8e, 8b).
 */

import type { CanonicalImplantBrandKey, GuidedSurgeryKitSpec } from "./canonicalCatalogTypes";

export const SURGICAL_KITS: Record<string, GuidedSurgeryKitSpec> = {
	osstem_oneguide: {
		kitName: "Osstem OneGuide",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0, 10.5],
		drillStopSystemRu: "Лазерный стопор фрезы с упором в верхний срез титановой втулки",
	},
	straumann_guided: {
		kitName: "Straumann Guided Surgery (GS)",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 4.0,
		availableOffsetsMm: [2.0, 4.0, 6.0],
		drillStopSystemRu: "Ступенчатые навигационные ключи H2/H4/H6 со стоп-кольцом",
	},
	nobel_guide: {
		kitName: "NobelGuide",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Направляющие ложки Guided Drill Guides с фланцевым стопором",
	},
	dentis_simple_guide: {
		kitName: "Dentis Simple Guide / Dentium",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 4.5,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Универсальные металлические втулки 9 мм",
	},
	mis_mguide: {
		kitName: "MIS MGuide",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 4.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Открытый каркас шаблона с ключевым позиционированием фрез",
	},
	astra_facilitate: {
		kitName: "Astra Tech Facilitate",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Направляющие втулки Facilitate EV с калиброванным упором",
	},
	zimmer_guided: {
		kitName: "Zimmer Guided Surgery Kit",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Калиброванные цилиндры TSV Guided с фиксированным стопором",
	},
	megagen_r2gate: {
		kitName: "Megagen R2Gate",
		sleeveDiameterMm: 5.2,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0, 10.5],
		drillStopSystemRu: "Бесшовный R2Gate протокол с узкими направляющими втулками",
	},
	ankylos_expertease: {
		kitName: "Ankylos ExpertEase",
		sleeveDiameterMm: 5.0,
		sleeveHeightMm: 5.0,
		defaultOffsetMm: 9.0,
		availableOffsetsMm: [9.0],
		drillStopSystemRu: "Субкрестальное направленное заглубление ExpertEase 9 мм",
	},
};

export interface CanonicalBrandMeta {
	readonly key: CanonicalImplantBrandKey;
	readonly name: string;
	readonly country: string;
	readonly defaultKit: GuidedSurgeryKitSpec;
}

export const BRAND_METAS: Record<CanonicalImplantBrandKey, CanonicalBrandMeta> = {
	osstem: { key: "osstem", name: "Osstem", country: "Южная Корея", defaultKit: SURGICAL_KITS.osstem_oneguide! },
	straumann: { key: "straumann", name: "Straumann", country: "Швейцария", defaultKit: SURGICAL_KITS.straumann_guided! },
	nobel_biocare: { key: "nobel_biocare", name: "Nobel Biocare", country: "Швейцария/США", defaultKit: SURGICAL_KITS.nobel_guide! },
	dentium: { key: "dentium", name: "Dentium", country: "Южная Корея", defaultKit: SURGICAL_KITS.dentis_simple_guide! },
	mis: { key: "mis", name: "MIS Implants", country: "Израиль", defaultKit: SURGICAL_KITS.mis_mguide! },
	astra_tech: { key: "astra_tech", name: "Astra Tech", country: "Швеция", defaultKit: SURGICAL_KITS.astra_facilitate! },
	zimmer: { key: "zimmer", name: "Zimmer Dental", country: "США", defaultKit: SURGICAL_KITS.zimmer_guided! },
	megagen: { key: "megagen", name: "Megagen", country: "Южная Корея", defaultKit: SURGICAL_KITS.megagen_r2gate! },
	biohorizons: { key: "biohorizons", name: "BioHorizons", country: "США", defaultKit: SURGICAL_KITS.osstem_oneguide! },
	alphabio: { key: "alphabio", name: "Alpha-Bio Tec", country: "Израиль", defaultKit: SURGICAL_KITS.mis_mguide! },
	ankylos: { key: "ankylos", name: "Ankylos", country: "Германия", defaultKit: SURGICAL_KITS.ankylos_expertease! },
};
