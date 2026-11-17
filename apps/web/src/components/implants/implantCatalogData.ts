/**
 * implantCatalogData.ts — Единый канонический SSOT каталог систем имплантации (DENTE CRM).
 * Консолидирует спецификации промышленных систем, протоколы сверления, кросс-секционную геометрию
 * для рентгенологии/DICOM, диапазоны торка, отвертки, Ti-Base и гарантийные паспорта (Мандаты 8s, 8e, 8n, 8b, 8bf, 8zi).
 *
 * Архитектурный фасад декомпозирован на профильные модули без разрыва обратной совместимости:
 * 1. implantNormalizedSystems.ts — 6 стандартизированных промышленных линеек
 * 2. implantTorqueSpecs.ts — торки, пределы безопасности и отвертки
 * 3. implantTiBaseCatalog.ts — титановые основания Ti-Base и скан-боди
 * 4. implantWarrantyEngine.ts — шаблоны операций, SOAP-дневники и гарантийные паспорта
 * 5. implantFixtureDrillCatalog.ts — фикстуры, сверление и расчет комплектов
 * 6. implantClinicalGeometry.ts — анатомические кросс-секции и безопасные зоны
 */

import {
	type CanonicalImplantSystemId,
	NORMALIZED_IMPLANT_SYSTEMS as SHARED_NORMALIZED_IMPLANT_SYSTEMS,
} from "@dental/shared";

export type { CanonicalImplantSystemId };
export { SHARED_NORMALIZED_IMPLANT_SYSTEMS };

// ─────────────────────────────────────────────────────────────────────────────
// 1. BRAND IDENTIFIERS & METADATA (SSOT: implantBrandTypes.ts)
// ─────────────────────────────────────────────────────────────────────────────

export * from "./implantBrandTypes";

// ─────────────────────────────────────────────────────────────────────────────
// 2. CANONICAL IMPLANT SYSTEMS (6 SYSTEMS RF WITH BIGINT KOPECKS)
// ─────────────────────────────────────────────────────────────────────────────

export interface CanonicalImplantSystem {
	readonly id: CanonicalImplantSystemId;
	readonly brandName: string;
	readonly lineName: string;
	readonly countryRu: string;
	readonly manufacturer: string;
	readonly connectionType: PlatformConnectionType;
	readonly connectionDescription: string;
	readonly screwdriverType: string;
	readonly screwdriverAliasRu: string;
	readonly diametersMm: readonly number[];
	readonly lengthsMm: readonly number[];
	readonly defaultDiameterMm: number;
	readonly defaultLengthMm: number;
	readonly minInsertionTorqueNcm: number;
	readonly defaultTorqueNcm: number;
	readonly maxSafeTorqueNcm: number;
	readonly recommendedIsqRange: readonly [min: number, max: number];
	readonly implantCostKopecks: bigint;
	readonly patientPriceKopecks: bigint;
	readonly defaultArticlePrefix: string;
}

export const CANONICAL_IMPLANT_SYSTEMS: Record<CanonicalImplantSystemId, CanonicalImplantSystem> = {
	osstem: {
		id: "osstem",
		brandName: "Osstem",
		lineName: "TS III SA",
		countryRu: "Южная Корея",
		manufacturer: "Osstem Implant Co., Ltd.",
		connectionType: "conical",
		connectionDescription: "Внутренний конус Морзе 11° с шестигранником",
		screwdriverType: "Hex 1.2 mm",
		screwdriverAliasRu: "Шестигранник 1.2 мм (Osstem)",
		diametersMm: [3.0, 3.5, 4.0, 4.5, 5.0],
		lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		recommendedIsqRange: [65, 80],
		implantCostKopecks: 1250000n,
		patientPriceKopecks: 3500000n,
		defaultArticlePrefix: "TS3S4010S",
	},
	straumann: {
		id: "straumann",
		brandName: "Straumann",
		lineName: "BLX / Bone Level SLA",
		countryRu: "Швейцария",
		manufacturer: "Institut Straumann AG",
		connectionType: "conical",
		connectionDescription: "Коническое самоблокирующееся CrossFit / TorcFit",
		screwdriverType: "SCS (Screw Carrying System)",
		screwdriverAliasRu: "Отвертка Straumann SCS (звездочка)",
		diametersMm: [3.3, 3.75, 4.1, 4.8],
		lengthsMm: [8.0, 10.0, 12.0, 14.0],
		defaultDiameterMm: 4.1,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 50,
		recommendedIsqRange: [70, 85],
		implantCostKopecks: 3200000n,
		patientPriceKopecks: 6500000n,
		defaultArticlePrefix: "021.2310",
	},
	dentium: {
		id: "dentium",
		brandName: "Dentium",
		lineName: "SuperLine SLA",
		countryRu: "Южная Корея",
		manufacturer: "Dentium Co., Ltd.",
		connectionType: "conical",
		connectionDescription: "Внутренний конус 11° с шестигранником",
		screwdriverType: "Hex 1.27 mm",
		screwdriverAliasRu: "Шестигранник 1.27 мм (Dentium / Zimmer)",
		diametersMm: [3.6, 4.0, 4.5, 5.0],
		lengthsMm: [7.0, 8.5, 10.0, 12.0, 14.0],
		defaultDiameterMm: 4.5,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		recommendedIsqRange: [68, 82],
		implantCostKopecks: 1450000n,
		patientPriceKopecks: 3800000n,
		defaultArticlePrefix: "FX4510",
	},
	nobel_biocare: {
		id: "nobel_biocare",
		brandName: "Nobel Biocare",
		lineName: "Conical Connection (CC)",
		countryRu: "Швеция / США",
		manufacturer: "Nobel Biocare Services AG",
		connectionType: "conical",
		connectionDescription: "Коническое Conical Connection с антиротационным замком",
		screwdriverType: "Unigrip",
		screwdriverAliasRu: "Отвертка Nobel Unigrip (лепестковая)",
		diametersMm: [3.5, 4.3, 5.0],
		lengthsMm: [8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.3,
		defaultLengthMm: 11.5,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		recommendedIsqRange: [70, 85],
		implantCostKopecks: 3500000n,
		patientPriceKopecks: 7200000n,
		defaultArticlePrefix: "NP-35115",
	},
	astra_tech: {
		id: "astra_tech",
		brandName: "Astra Tech",
		lineName: "OsseoSpeed EV",
		countryRu: "Швеция",
		manufacturer: "Dentsply Sirona Implants",
		connectionType: "conical",
		connectionDescription: "Коническое самонаправляющееся соединение Conical Seal Design",
		screwdriverType: "Hex 1.25 mm (EV)",
		screwdriverAliasRu: "Шестигранник Astra Tech EV (1.25 мм)",
		diametersMm: [3.0, 3.6, 4.2, 4.8, 5.4],
		lengthsMm: [8.0, 9.0, 11.0, 13.0],
		defaultDiameterMm: 4.2,
		defaultLengthMm: 11.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 40,
		recommendedIsqRange: [68, 82],
		implantCostKopecks: 3100000n,
		patientPriceKopecks: 6800000n,
		defaultArticlePrefix: "EV-42110",
	},
	anyridge: {
		id: "anyridge",
		brandName: "AnyRidge",
		lineName: "MegaGen Knife Thread",
		countryRu: "Южная Корея",
		manufacturer: "MegaGen Implant Co., Ltd.",
		connectionType: "conical",
		connectionDescription: "Внутренний конус Морзе 5° с шестигранником",
		screwdriverType: "Hex 1.2 mm",
		screwdriverAliasRu: "Шестигранник 1.2 мм (MegaGen AnyRidge)",
		diametersMm: [3.5, 4.0, 4.5, 5.0, 5.5],
		lengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		recommendedIsqRange: [68, 84],
		implantCostKopecks: 1650000n,
		patientPriceKopecks: 4200000n,
		defaultArticlePrefix: "AR4010",
	},
};

export const FDI_SURGICAL_PRESETS: readonly number[] = [16, 15, 14, 11, 21, 24, 25, 26, 36, 46];

export function resolveImplantSystem(key: string): CanonicalImplantSystem {
	const normalized = (key || "").toLowerCase().trim();
	if (normalized.includes("straumann")) return CANONICAL_IMPLANT_SYSTEMS.straumann;
	if (normalized.includes("nobel")) return CANONICAL_IMPLANT_SYSTEMS.nobel_biocare;
	if (normalized.includes("dentium")) return CANONICAL_IMPLANT_SYSTEMS.dentium;
	if (normalized.includes("astra")) return CANONICAL_IMPLANT_SYSTEMS.astra_tech;
	if (normalized.includes("anyridge") || normalized.includes("megagen")) return CANONICAL_IMPLANT_SYSTEMS.anyridge;
	return CANONICAL_IMPLANT_SYSTEMS.osstem;
}

export function getMischBoneDensityByToothFdi(toothFdi: number): MischBoneDensity {
	if (toothFdi >= 11 && toothFdi <= 28) {
		if ([17, 18, 27, 28].includes(toothFdi)) return "D4";
		return "D3";
	}
	if (toothFdi >= 31 && toothFdi <= 48) {
		if ([31, 32, 33, 41, 42, 43].includes(toothFdi)) return "D1";
		if ([37, 38, 47, 48].includes(toothFdi)) return "D3";
		return "D2";
	}
	return "D2";
}

export function getRecommendedTorqueZone(torqueNcm: number): {
	readonly status: "under_torque" | "optimal_green" | "over_torque";
	readonly labelRu: string;
	readonly colorClass: string;
} {
	if (torqueNcm < 35) {
		return { status: "under_torque", labelRu: "Низкий торк (<35 Н·см) — риск микродвижений", colorClass: "text-[var(--warning,#f59e0b)]" };
	}
	if (torqueNcm <= 45) {
		return { status: "optimal_green", labelRu: "Оптимальная первичная стабильность (35–45 Н·см)", colorClass: "text-[var(--primary)]" };
	}
	return { status: "over_torque", labelRu: "Повышенный торк (>45 Н·см) — риск ишемии кортикала", colorClass: "text-[var(--danger,#f43f5e)]" };
}

export function formatKopecksToRubles(kopecks: bigint | number): string {
	const rub = typeof kopecks === "bigint" ? Number(kopecks) / 100 : kopecks / 100;
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(rub);
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS FROM MODULAR SUB-FILES (100% BACKWARD COMPATIBLE ZERO BREAKAGE)
// ─────────────────────────────────────────────────────────────────────────────

export * from "./implantNormalizedSystems";
export * from "./implantTorqueSpecs";
export * from "./implantTiBaseCatalog";
export * from "./implantWarrantyEngine";
export * from "./implantFixtureDrillCatalog";
export * from "./implantClinicalGeometry";
