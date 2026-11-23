/**
 * implantCatalogData.ts — Единый канонический SSOT каталог систем имплантации (DENTE CRM).
 * Консолидирует спецификации промышленных систем, протоколы сверления, кросс-секционную геометрию
 * для рентгенологии/DICOM, диапазоны торка, отвертки, Ti-Base и гарантийные паспорта (Мандаты 8s, 8e, 8n, 8b, 8bf, 8zi).
 *
 * Архитектурный фасад декомпозирован на профильные модули без разрыва обратной совместимости:
 * 1. implantCatalogData.ts — 6 стандартизированных промышленных линеек и фасад каталогов
 * 2. implantTorqueSpecs.ts — торки, пределы безопасности и отвертки
 * 3. implantTiBaseCatalog.ts — титановые основания Ti-Base и скан-боди
 * 4. implantQuickPresets.ts — шаблоны операций, SOAP-дневники, гарантийные паспорта и пресеты
 * 5. implantFixtureDrillCatalog.ts — фикстуры, сверление и расчет комплектов
 * 6. implantClinicalGeometry.ts — анатомические кросс-секции и безопасные зоны
 */

import {
	type CanonicalImplantSystemId,
	NORMALIZED_IMPLANT_SYSTEMS as SHARED_NORMALIZED_IMPLANT_SYSTEMS,
	formatKopecksToRubles,
	formatKopecksRu,
} from "@dental/shared";

export type { CanonicalImplantSystemId };
export { SHARED_NORMALIZED_IMPLANT_SYSTEMS, formatKopecksToRubles, formatKopecksRu };

// ─────────────────────────────────────────────────────────────────────────────
// 1. BRAND IDENTIFIERS & METADATA (SSOT: implantBrandTypes.ts)
// ─────────────────────────────────────────────────────────────────────────────

import type { PlatformConnectionType, MischBoneDensity } from "./implantBrandTypes";
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
	ankylos: {
		id: "ankylos",
		brandName: "Ankylos",
		lineName: "C/X TissueCare",
		countryRu: "Германия",
		manufacturer: "Dentsply Sirona Implants",
		connectionType: "conical",
		connectionDescription: "Герметичный конус TissueCare Connection без микроподвижности",
		screwdriverType: "Hex 1.0 mm",
		screwdriverAliasRu: "Шестигранник 1.0 мм (Ankylos)",
		diametersMm: [3.5, 4.5, 5.5],
		lengthsMm: [8.0, 9.5, 11.0, 14.0],
		defaultDiameterMm: 4.5,
		defaultLengthMm: 11.0,
		minInsertionTorqueNcm: 15,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 25,
		recommendedIsqRange: [65, 80],
		implantCostKopecks: 3300000n,
		patientPriceKopecks: 6900000n,
		defaultArticlePrefix: "A-B110-CX",
	},
	mis: {
		id: "mis",
		brandName: "MIS Implants",
		lineName: "SEVEN / V3",
		countryRu: "Израиль",
		manufacturer: "MIS Implants Technologies Ltd.",
		connectionType: "conical",
		connectionDescription: "Внутренний шестигранник / конус C1",
		screwdriverType: "Hex 1.25 mm",
		screwdriverAliasRu: "Шестигранник 1.25 мм (MIS)",
		diametersMm: [3.3, 3.75, 4.2, 5.0],
		lengthsMm: [8.0, 10.0, 11.5, 13.0],
		defaultDiameterMm: 3.75,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		recommendedIsqRange: [68, 82],
		implantCostKopecks: 1950000n,
		patientPriceKopecks: 4500000n,
		defaultArticlePrefix: "MF7-3710",
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
	if (normalized.includes("ankylos")) return CANONICAL_IMPLANT_SYSTEMS.ankylos;
	if (normalized.includes("mis")) return CANONICAL_IMPLANT_SYSTEMS.mis;
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
		return { status: "under_torque", labelRu: "Низкий торк (<35 Н·см) — риск микродвижений", colorClass: "text-[var(--warning)]" };
	}
	if (torqueNcm <= 45) {
		return { status: "optimal_green", labelRu: "Оптимальная первичная стабильность (35–45 Н·см)", colorClass: "text-[var(--primary)]" };
	}
	return { status: "over_torque", labelRu: "Повышенный торк (>45 Н·см) — риск ишемии кортикала", colorClass: "text-[var(--danger)]" };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NORMALIZED IMPLANT SYSTEMS (6 INDUSTRIAL LINES)
// ─────────────────────────────────────────────────────────────────────────────

import type {
	ImplantCapType,
	NormalizedBrandId,
	PlatformConnection,
} from "./implantBrandTypes";

export interface NormalizedImplantSystem {
	readonly id: NormalizedBrandId;
	readonly brandName: string;
	readonly manufacturer: string;
	readonly countryRu: string;
	readonly popularLines: readonly string[];
	readonly platformConnection: PlatformConnection;
	readonly connectionDetails: string;
	readonly standardDiametersMm: readonly number[];
	readonly standardLengthsMm: readonly number[];
	readonly defaultDiameterMm: number;
	readonly defaultLengthMm: number;
	readonly minInsertionTorqueNcm: number;
	readonly defaultTorqueNcm: number;
	readonly maxSafeTorqueNcm: number;
	readonly finalScrewTorqueNcm: number;
	readonly coverScrewTorqueNcm: number;
	readonly healingAbutmentTorqueNcm: number;
	readonly screwdriverType: string;
	readonly screwdriverAliasRu: string;
	readonly supportedCaps: readonly ImplantCapType[];
	readonly healingCapDiametersMm: readonly number[];
	readonly healingCapHeightsMm: readonly number[];
	readonly defaultKitPriceRub: number;
	readonly defaultKitPriceKopecks: number;
	readonly defaultArticlePrefix: string;
}

export const NORMALIZED_IMPLANT_SYSTEMS: Record<NormalizedBrandId, NormalizedImplantSystem> = {
	osstem: {
		id: "osstem",
		brandName: "Osstem",
		manufacturer: "Osstem Implant Co., Ltd.",
		countryRu: "Южная Корея",
		popularLines: ["TS III SA", "TS III CA"],
		platformConnection: "conical",
		connectionDetails: "Внутренний конус Морзе 11° с шестигранником",
		standardDiametersMm: [3.0, 3.5, 4.0, 4.5, 5.0],
		standardLengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		finalScrewTorqueNcm: 30,
		coverScrewTorqueNcm: 10,
		healingAbutmentTorqueNcm: 10,
		screwdriverType: "Hex 1.2 mm",
		screwdriverAliasRu: "Шестигранник 1.2 мм (Osstem)",
		supportedCaps: ["fdm", "plug"],
		healingCapDiametersMm: [4.0, 4.5, 5.0, 6.0],
		healingCapHeightsMm: [2.0, 3.0, 4.0, 5.0, 7.0],
		defaultKitPriceRub: 12500,
		defaultKitPriceKopecks: 1250000,
		defaultArticlePrefix: "TS3S4010S",
	},
	straumann: {
		id: "straumann",
		brandName: "Straumann",
		manufacturer: "Institut Straumann AG",
		countryRu: "Швейцария",
		popularLines: ["BLX Roxolid", "Bone Level SLA"],
		platformConnection: "conical",
		connectionDetails: "Коническое самоблокирующееся CrossFit / TorcFit",
		standardDiametersMm: [3.3, 3.75, 4.1, 4.8],
		standardLengthsMm: [8.0, 10.0, 12.0, 14.0],
		defaultDiameterMm: 4.1,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 50,
		finalScrewTorqueNcm: 35,
		coverScrewTorqueNcm: 10,
		healingAbutmentTorqueNcm: 10,
		screwdriverType: "SCS (Screw Carrying System)",
		screwdriverAliasRu: "Отвертка Straumann SCS (звездочка)",
		supportedCaps: ["fdm", "plug"],
		healingCapDiametersMm: [3.5, 4.5, 5.5],
		healingCapHeightsMm: [2.0, 3.5, 5.0],
		defaultKitPriceRub: 32000,
		defaultKitPriceKopecks: 3200000,
		defaultArticlePrefix: "021.2310",
	},
	nobel_biocare: {
		id: "nobel_biocare",
		brandName: "Nobel Biocare",
		manufacturer: "Nobel Biocare Services AG",
		countryRu: "Швейцария / Швеция",
		popularLines: ["NobelActive", "NobelReplace CC"],
		platformConnection: "conical",
		connectionDetails: "Коническое соединение Conical Connection с антиротационным замком",
		standardDiametersMm: [3.0, 3.5, 4.3, 5.0],
		standardLengthsMm: [8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.3,
		defaultLengthMm: 11.5,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		finalScrewTorqueNcm: 35,
		coverScrewTorqueNcm: 10,
		healingAbutmentTorqueNcm: 10,
		screwdriverType: "Unigrip",
		screwdriverAliasRu: "Отвертка Nobel Unigrip (лепестковая)",
		supportedCaps: ["fdm", "plug"],
		healingCapDiametersMm: [3.6, 5.0],
		healingCapHeightsMm: [3.0, 5.0],
		defaultKitPriceRub: 35000,
		defaultKitPriceKopecks: 3500000,
		defaultArticlePrefix: "NP-35115",
	},
	dentium: {
		id: "dentium",
		brandName: "Dentium",
		manufacturer: "Dentium Co., Ltd.",
		countryRu: "Южная Корея",
		popularLines: ["SuperLine", "SimpleLine II"],
		platformConnection: "conical",
		connectionDetails: "Внутренний конус 11° с шестигранником",
		standardDiametersMm: [3.6, 4.0, 4.5, 5.0],
		standardLengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.5,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		finalScrewTorqueNcm: 30,
		coverScrewTorqueNcm: 10,
		healingAbutmentTorqueNcm: 10,
		screwdriverType: "Hex 1.27 mm",
		screwdriverAliasRu: "Шестигранник 1.27 мм (Dentium / Zimmer)",
		supportedCaps: ["fdm", "plug"],
		healingCapDiametersMm: [4.0, 4.5, 5.5],
		healingCapHeightsMm: [2.0, 3.5, 5.0],
		defaultKitPriceRub: 14500,
		defaultKitPriceKopecks: 1450000,
		defaultArticlePrefix: "FX4510",
	},
	astra_tech: {
		id: "astra_tech",
		brandName: "Astra Tech",
		manufacturer: "Dentsply Sirona Implants",
		countryRu: "Швеция",
		popularLines: ["OsseoSpeed EV", "OsseoSpeed TX"],
		platformConnection: "conical",
		connectionDetails: "Коническое самонаправляющееся соединение Conical Seal Design",
		standardDiametersMm: [3.0, 3.6, 4.2, 4.8, 5.4],
		standardLengthsMm: [8.0, 9.0, 11.0, 13.0],
		defaultDiameterMm: 4.2,
		defaultLengthMm: 11.0,
		minInsertionTorqueNcm: 20,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 40,
		finalScrewTorqueNcm: 25,
		coverScrewTorqueNcm: 10,
		healingAbutmentTorqueNcm: 10,
		screwdriverType: "Hex 1.25 mm (OsseoSpeed EV)",
		screwdriverAliasRu: "Шестигранник Astra Tech EV (1.25 мм)",
		supportedCaps: ["fdm", "plug"],
		healingCapDiametersMm: [4.0, 4.8],
		healingCapHeightsMm: [2.5, 4.0, 6.0],
		defaultKitPriceRub: 31000,
		defaultKitPriceKopecks: 3100000,
		defaultArticlePrefix: "EV-42110",
	},
	anyridge: {
		id: "anyridge",
		brandName: "AnyRidge",
		manufacturer: "MegaGen Implant Co., Ltd.",
		countryRu: "Южная Корея",
		popularLines: ["AnyRidge Knife Thread", "AnyOne"],
		platformConnection: "conical",
		connectionDetails: "Внутренний конус Морзе 5° с шестигранником",
		standardDiametersMm: [3.5, 4.0, 4.5, 5.0, 5.5],
		standardLengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 4.0,
		defaultLengthMm: 10.0,
		minInsertionTorqueNcm: 25,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 45,
		finalScrewTorqueNcm: 35,
		coverScrewTorqueNcm: 10,
		healingAbutmentTorqueNcm: 10,
		screwdriverType: "Hex 1.2 mm",
		screwdriverAliasRu: "Шестигранник 1.2 мм (MegaGen AnyRidge)",
		supportedCaps: ["fdm", "plug"],
		healingCapDiametersMm: [4.0, 4.5, 5.5],
		healingCapHeightsMm: [3.0, 4.0, 5.5],
		defaultKitPriceRub: 16500,
		defaultKitPriceKopecks: 1650000,
		defaultArticlePrefix: "AR4010",
	},
	ankylos: {
		id: "ankylos",
		brandName: "Ankylos",
		manufacturer: "Dentsply Sirona Implants",
		countryRu: "Германия",
		popularLines: ["C/X", "TissueCare"],
		platformConnection: "conical",
		connectionDetails: "Бескомпромиссный конус Морзе 5.7° с холодной сваркой",
		standardDiametersMm: [3.5, 4.5, 5.5],
		standardLengthsMm: [8.0, 9.5, 11.0, 14.0],
		defaultDiameterMm: 4.5,
		defaultLengthMm: 11.0,
		minInsertionTorqueNcm: 15,
		defaultTorqueNcm: 35,
		maxSafeTorqueNcm: 25,
		finalScrewTorqueNcm: 15,
		coverScrewTorqueNcm: 10,
		healingAbutmentTorqueNcm: 10,
		screwdriverType: "Hex 1.0 mm (TissueCare)",
		screwdriverAliasRu: "Шестигранник 1.0 мм (Ankylos)",
		supportedCaps: ["fdm", "plug"],
		healingCapDiametersMm: [3.5, 4.5],
		healingCapHeightsMm: [1.5, 3.0, 4.5],
		defaultKitPriceRub: 33000,
		defaultKitPriceKopecks: 3300000,
		defaultArticlePrefix: "A-B110-CX",
	},
};

export function resolveNormalizedBrand(input: string): NormalizedBrandId {
	const raw = (input || "").toLowerCase().trim();
	if (raw.includes("straumann")) return "straumann";
	if (raw.includes("nobel")) return "nobel_biocare";
	if (raw.includes("osstem")) return "osstem";
	if (raw.includes("dentium")) return "dentium";
	if (raw.includes("astra")) return "astra_tech";
	if (raw.includes("anyridge") || raw.includes("megagen")) return "anyridge";
	if (raw.includes("ankylos")) return "ankylos";
	return "osstem";
}

export function findImplantSystem(brandOrKey: string): NormalizedImplantSystem {
	const id = resolveNormalizedBrand(brandOrKey);
	return NORMALIZED_IMPLANT_SYSTEMS[id] ?? NORMALIZED_IMPLANT_SYSTEMS.osstem;
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS FROM MODULAR SUB-FILES (100% BACKWARD COMPATIBLE ZERO BREAKAGE)
// ─────────────────────────────────────────────────────────────────────────────

export * from "./implantTorqueSpecs";
export * from "./implantTiBaseCatalog";
export {
	type ImplantSurgeryQuickTemplate,
	SURGICAL_QUICK_TEMPLATES,
	type ImplantWarrantyPassportData,
	generateWarrantyPassportRecord,
	buildSoapSurgeryDiaryText,
} from "./implantQuickPresets";
export * from "./implantFixtureDrillCatalog";
export * from "./implantClinicalGeometry";
