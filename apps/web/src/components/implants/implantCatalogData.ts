/**
 * implantCatalogData.ts — Единый канонический SSOT каталог систем имплантации (DENTE CRM).
 * Консолидирует спецификации промышленных систем, протоколы сверления, кросс-секционную геометрию
 * для рентгенологии/DICOM, диапазоны торка, отвертки, Ti-Base и гарантийные паспорта (Мандаты 8s, 8e, 8n, 8b, 8bf).
 */

import { CANONICAL_IMPLANT_SYSTEMS as DICOM_CANONICAL_IMPLANT_SYSTEMS } from "../dicom/implantCatalog";

// ─────────────────────────────────────────────────────────────────────────────
// 1. BRAND IDENTIFIERS & METADATA
// ─────────────────────────────────────────────────────────────────────────────

export type NormalizedBrandId =
	| "osstem"
	| "straumann"
	| "nobel_biocare"
	| "dentium"
	| "astra_tech"
	| "anyridge"
	| "ankylos";

export type CanonicalImplantSystemId =
	| "osstem"
	| "straumann"
	| "dentium"
	| "nobel_biocare"
	| "astra_tech"
	| "anyridge";

export type ImplantBrand =
	| "straumann"
	| "nobel_biocare"
	| "osstem"
	| "dentium"
	| "ankylos"
	| "astra_tech"
	| "mis";

export type ImplantTorqueBrand = ImplantBrand;

export type PlatformType = "conical" | "internal_hex" | "external_hex";
export type PlatformConnection = PlatformType;
export type PlatformConnectionType = "conical" | "internal_hex";

export type ImplantCapType = "fdm" | "plug";
export type ImplantStageType = "two_stage_plug" | "one_stage_healing_abutment";
export type MischBoneDensity = "D1" | "D2" | "D3" | "D4";

export interface BrandMetadata {
	readonly id: ImplantBrand;
	readonly name: string;
	readonly country: string;
	readonly countryCode: string;
	readonly popularLines: readonly string[];
	readonly defaultHexColor: string;
}

export const IMPLANT_BRANDS_METADATA: Record<ImplantBrand, BrandMetadata> = {
	straumann: {
		id: "straumann",
		name: "Straumann",
		country: "Швейцария",
		countryCode: "CH",
		popularLines: ["Bone Level Tapered BLT", "BLX"],
		defaultHexColor: "#0284c7",
	},
	nobel_biocare: {
		id: "nobel_biocare",
		name: "Nobel Biocare",
		country: "Швейцария / Швеция",
		countryCode: "CH/SE",
		popularLines: ["NobelActive", "NobelReplace CC"],
		defaultHexColor: "#e11d48",
	},
	osstem: {
		id: "osstem",
		name: "Osstem",
		country: "Южная Корея",
		countryCode: "KR",
		popularLines: ["TS III SA", "TS III CA"],
		defaultHexColor: "#16a34a",
	},
	dentium: {
		id: "dentium",
		name: "Dentium",
		country: "Южная Корея",
		countryCode: "KR",
		popularLines: ["SuperLine", "SimpleLine II"],
		defaultHexColor: "#f59e0b",
	},
	ankylos: {
		id: "ankylos",
		name: "Ankylos",
		country: "Германия (Dentsply Sirona)",
		countryCode: "DE",
		popularLines: ["C/X", "TissueCare"],
		defaultHexColor: "#059669",
	},
	astra_tech: {
		id: "astra_tech",
		name: "Astra Tech",
		country: "Швеция",
		countryCode: "SE",
		popularLines: ["OsseoSpeed EV"],
		defaultHexColor: "#8b5cf6",
	},
	mis: {
		id: "mis",
		name: "MIS Implants",
		country: "Израиль",
		countryCode: "IL",
		popularLines: ["SEVEN", "V3", "C1"],
		defaultHexColor: "#a855f7",
	},
};

export const BRAND_KEY_MAP: Record<string, ImplantBrand> = {
	"Nobel Biocare": "nobel_biocare",
	Straumann: "straumann",
	Osstem: "osstem",
	Dentium: "dentium",
	Ankylos: "ankylos",
	"Astra Tech": "astra_tech",
	"MIS Implants": "mis",
	MIS: "mis",
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. NORMALIZED INDUSTRIAL IMPLANT SYSTEMS
// ─────────────────────────────────────────────────────────────────────────────

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
		standardDiametersMm: [3.0, 3.5, 3.75, 4.0, 4.5, 5.0],
		standardLengthsMm: [7.0, 8.5, 10.0, 11.5, 13.0],
		defaultDiameterMm: 3.75,
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
// 3. CANONICAL IMPLANT SYSTEMS (6 SYSTEMS RF WITH BIGINT KOPECKS)
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
		diametersMm: [3.5, 3.75, 4.0, 4.5, 5.0],
		lengthsMm: [8.0, 10.0, 12.0, 14.0],
		defaultDiameterMm: 3.75,
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
		return { status: "under_torque", labelRu: "Низкий торк (<35 Н·см) — риск микродвижений", colorClass: "text-amber-500" };
	}
	if (torqueNcm <= 45) {
		return { status: "optimal_green", labelRu: "Оптимальная первичная стабильность (35–45 Н·см)", colorClass: "text-emerald-500" };
	}
	return { status: "over_torque", labelRu: "Повышенный торк (>45 Н·см) — риск ишемии кортикала", colorClass: "text-rose-500" };
}

export function formatKopecksToRubles(kopecks: bigint | number): string {
	const rub = typeof kopecks === "bigint" ? Number(kopecks) / 100 : kopecks / 100;
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(rub);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SURGICAL QUICK TEMPLATES & WARRANTY PASSPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface ImplantSurgeryQuickTemplate {
	readonly id: string;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly stage: ImplantStageType;
	readonly defaultTorqueNcm: number;
	readonly defaultIsq: number;
	readonly isImmediateLoading: boolean;
	readonly boneGraftRequired: boolean;
	readonly membraneRequired: boolean;
}

export const SURGICAL_QUICK_TEMPLATES: readonly ImplantSurgeryQuickTemplate[] = [
	{
		id: "immediate_extraction",
		labelRu: "1. Немедленная имплантация (в лунку удаленного)",
		descriptionRu: "Одномоментная установка в лунку удаленного зуба с формирователем десны или временной коронкой.",
		stage: "one_stage_healing_abutment",
		defaultTorqueNcm: 40,
		defaultIsq: 75,
		isImmediateLoading: true,
		boneGraftRequired: true,
		membraneRequired: true,
	},
	{
		id: "classic_two_stage",
		labelRu: "2. Классическая двухэтапная",
		descriptionRu: "Погружная установка имплантата с винтом-заглушкой и ушиванием слизистой наглухо.",
		stage: "two_stage_plug",
		defaultTorqueNcm: 35,
		defaultIsq: 70,
		isImmediateLoading: false,
		boneGraftRequired: false,
		membraneRequired: false,
	},
	{
		id: "closed_sinus_lift",
		labelRu: "3. Имплантация с закрытым синус-лифтингом",
		descriptionRu: "Мягкое транскрестальное поднятие дна гайморовой пазухи остеотомами с подсадкой костного графта.",
		stage: "two_stage_plug",
		defaultTorqueNcm: 35,
		defaultIsq: 68,
		isImmediateLoading: false,
		boneGraftRequired: true,
		membraneRequired: true,
	},
	{
		id: "healing_abutment_placement",
		labelRu: "4. Установка формирователя десны",
		descriptionRu: "Второй хирургический этап: раскрытие имплантата, удаление винта-заглушки и фиксация ФДМ.",
		stage: "one_stage_healing_abutment",
		defaultTorqueNcm: 15,
		defaultIsq: 76,
		isImmediateLoading: false,
		boneGraftRequired: false,
		membraneRequired: false,
	},
];

export interface ImplantWarrantyPassportData {
	readonly passportId: string;
	readonly toothFdi: number;
	readonly systemId: CanonicalImplantSystemId;
	readonly brandName: string;
	readonly lineName: string;
	readonly catalogArticle: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly insertionTorqueNcm: number;
	readonly isqValue: number;
	readonly boneDensity: MischBoneDensity;
	readonly stage: ImplantStageType;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly patientName: string;
	readonly patientId: string;
	readonly doctorName: string;
	readonly doctorId: string;
	readonly surgeryDateIso: string;
	readonly expectedOsteointegrationDateIso: string;
	readonly implantCostKopecks: bigint;
	readonly patientPriceKopecks: bigint;
	readonly verificationQrPayload: string;
}

export function generateWarrantyPassportRecord(params: {
	toothFdi: number;
	systemId: CanonicalImplantSystemId;
	diameterMm?: number | undefined;
	lengthMm?: number | undefined;
	torqueNcm?: number | undefined;
	isq?: number | undefined;
	stage?: ImplantStageType | undefined;
	patientName?: string | undefined;
	patientId?: string | undefined;
	doctorName?: string | undefined;
	doctorId?: string | undefined;
	lotNumber?: string | undefined;
	serialNumber?: string | undefined;
	surgeryDateIso?: string | undefined;
}): ImplantWarrantyPassportData {
	const sys = CANONICAL_IMPLANT_SYSTEMS[params.systemId] || CANONICAL_IMPLANT_SYSTEMS.osstem;
	const diameterMm = params.diameterMm ?? sys.defaultDiameterMm;
	const lengthMm = params.lengthMm ?? sys.defaultLengthMm;
	const torqueNcm = params.torqueNcm ?? sys.defaultTorqueNcm;
	const isqValue = params.isq ?? 72;
	const stage = params.stage ?? "one_stage_healing_abutment";
	const toothFdi = params.toothFdi || 46;
	const boneDensity = getMischBoneDensityByToothFdi(toothFdi);
	const now = new Date();
	const surgeryDateIso = params.surgeryDateIso ?? now.toISOString().slice(0, 10);

	const isUpper = toothFdi >= 11 && toothFdi <= 28;
	const osteoMonths = isUpper ? 5 : 3;
	const expectedDate = new Date(now.getTime() + osteoMonths * 30 * 24 * 60 * 60 * 1000);
	const expectedDateIso = expectedDate.toISOString().slice(0, 10);

	const lotNumber = params.lotNumber || `LOT-${sys.id.toUpperCase().slice(0, 3)}-${now.getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
	const serialNumber = params.serialNumber || `SN-${Math.floor(100000 + Math.random() * 900000)}`;
	const passportId = `PASS-IMP-${toothFdi}-${Date.now().toString(36).toUpperCase()}`;
	const article = `${sys.defaultArticlePrefix}-${Math.round(diameterMm * 10)}${Math.round(lengthMm * 10)}`;

	const verificationQrPayload = JSON.stringify({
		passportId,
		toothFdi,
		brand: sys.brandName,
		lot: lotNumber,
		sn: serialNumber,
		date: surgeryDateIso,
		osteoDate: expectedDateIso,
		warranty: "Lifetime Manufacturer Osseointegration Guarantee",
	});

	return {
		passportId,
		toothFdi,
		systemId: sys.id,
		brandName: sys.brandName,
		lineName: sys.lineName,
		catalogArticle: article,
		diameterMm,
		lengthMm,
		insertionTorqueNcm: torqueNcm,
		isqValue,
		boneDensity,
		stage,
		lotNumber,
		serialNumber,
		patientName: params.patientName || "Иванов Иван Иванович",
		patientId: params.patientId || "PAT-01",
		doctorName: params.doctorName || "Д-р Воронов А. В.",
		doctorId: params.doctorId || "DOC-01",
		surgeryDateIso,
		expectedOsteointegrationDateIso: expectedDateIso,
		implantCostKopecks: sys.implantCostKopecks,
		patientPriceKopecks: sys.patientPriceKopecks,
		verificationQrPayload,
	};
}

export function buildSoapSurgeryDiaryText(params: {
	toothFdi: number;
	boneDensity: MischBoneDensity;
	brandName: string;
	lineName: string;
	diameterMm: number;
	lengthMm: number;
	torqueNcm: number;
	isqValue: number;
	screwdriverAliasRu: string;
	stage: ImplantStageType;
	isGbrPerformed: boolean;
}): string {
	const stageText = params.stage === "one_stage_healing_abutment" ? "установка формирователя десны (ФДМ)" : "винт-заглушка с ушиванием наглухо";
	const gbrText = params.isGbrPerformed ? "Проведена костная пластика (GBR) с фиксацией коллагеновой мембраны." : "Без аугментации.";
	return `ДНЕВНИК ХИРУРГИЧЕСКОГО ПРИЁМА: ОПЕРАЦИЯ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ
Локализация: зуб ${params.toothFdi} (Плотность костной ткани по Misch: ${params.boneDensity}).
Протокол вмешательства: инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.
Разрез по гребню, отслаивание слизисто-надкостничного лоскута.
Формирование костного ложа под обильным стерильным охлаждением 0.9% NaCl.
Установлен имплантат: ${params.brandName} ${params.lineName} Ø ${params.diameterMm} мм × ${params.lengthMm} мм.
Первичная торсионная стабильность: ${params.torqueNcm} Н·см. Коэффициент ISQ: ${params.isqValue}.
Отвертка: ${params.screwdriverAliasRu}.
Этап: ${stageText}. ${gbrText}
Ушивание раны узловыми швами. Гемостаз полный. Пациенту выдан гарантийный паспорт имплантата.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TORQUE SPECS, SCREWDRIVERS & TI-BASE CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export type ProstheticComponentType =
	| "fixture_insertion"
	| "cover_screw"
	| "healing_abutment"
	| "multi_unit_straight"
	| "multi_unit_angled"
	| "multi_unit_bridge_screw"
	| "ti_base_screw"
	| "custom_abutment_screw"
	| "locator_abutment"
	| "ball_attachment";

export type ConnectionEngagement = "engaging" | "non_engaging";

export interface BrandTorqueSpec {
	readonly brand: ImplantTorqueBrand;
	readonly brandName: string;
	readonly screwdriverDefault: string;
	readonly screwdriverAliasRu: string;
	readonly torqueFinalScrewNcm: number;
	readonly torqueMultiUnitBodyNcm: number;
	readonly torqueMultiUnitBridgeScrewNcm: number;
	readonly torqueCoverScrewNcm: number;
	readonly torqueHealingAbutmentNcm: number;
	readonly maxSafeTorqueNcm: number;
	readonly minInsertionTorqueNcm: number;
	readonly connectionSafetyNotes: string;
}

export const IMPLANT_TORQUE_SPECS: Record<ImplantTorqueBrand, BrandTorqueSpec> = {
	straumann: {
		brand: "straumann",
		brandName: "Straumann",
		screwdriverDefault: "SCS (Screw Carrying System)",
		screwdriverAliasRu: "Отвертка Straumann SCS (звездочка)",
		torqueFinalScrewNcm: 35,
		torqueMultiUnitBodyNcm: 35,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 45,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Коническое соединение CrossFit 15°. Затяжка винта Ti-Base строго 35 Н·см.",
	},
	nobel_biocare: {
		brand: "nobel_biocare",
		brandName: "Nobel Biocare",
		screwdriverDefault: "Unigrip",
		screwdriverAliasRu: "Отвертка Nobel Unigrip (лепестковая)",
		torqueFinalScrewNcm: 35,
		torqueMultiUnitBodyNcm: 35,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 45,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Коническое соединение Conical Connection. Мостовые винты строго 15 Н·см.",
	},
	osstem: {
		brand: "osstem",
		brandName: "Osstem",
		screwdriverDefault: "Hex 1.2 mm",
		screwdriverAliasRu: "Шестигранник 1.2 мм (Osstem)",
		torqueFinalScrewNcm: 30,
		torqueMultiUnitBodyNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 20,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 35,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Внутренний конус Морзе 11° с шестигранником. Не превышать 30 Н·см на абатментный винт.",
	},
	dentium: {
		brand: "dentium",
		brandName: "Dentium",
		screwdriverDefault: "Hex 1.27 mm (0.050 inch)",
		screwdriverAliasRu: "Шестигранник 1.27 мм (Dentium / Zimmer)",
		torqueFinalScrewNcm: 30,
		torqueMultiUnitBodyNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 35,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Конус 11° с шестигранником. Отвертка 1.27 мм взаимозаменяема с Zimmer/MIS.",
	},
	ankylos: {
		brand: "ankylos",
		brandName: "Ankylos",
		screwdriverDefault: "Hex 1.0 mm (TissueCare)",
		screwdriverAliasRu: "Шестигранник 1.0 мм (Ankylos)",
		torqueFinalScrewNcm: 15,
		torqueMultiUnitBodyNcm: 25,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 25,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Бескомпромиссный конус Морзе 5.7° без позиционера. Эффект холодной сварки: финальная затяжка строго 15 Н·см!",
	},
	astra_tech: {
		brand: "astra_tech",
		brandName: "Astra Tech",
		screwdriverDefault: "Hex 1.25 mm (OsseoSpeed EV)",
		screwdriverAliasRu: "Шестигранник Astra Tech EV (1.25 мм)",
		torqueFinalScrewNcm: 25,
		torqueMultiUnitBodyNcm: 25,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 30,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Коническое самонаправляющееся соединение Conical Seal Design. Затяжка винта 25 Н·см.",
	},
	mis: {
		brand: "mis",
		brandName: "MIS Implants",
		screwdriverDefault: "Hex 1.27 mm (0.050 inch)",
		screwdriverAliasRu: "Шестигранник 1.27 мм (MIS / Zimmer)",
		torqueFinalScrewNcm: 30,
		torqueMultiUnitBodyNcm: 30,
		torqueMultiUnitBridgeScrewNcm: 15,
		torqueCoverScrewNcm: 10,
		torqueHealingAbutmentNcm: 10,
		maxSafeTorqueNcm: 35,
		minInsertionTorqueNcm: 15,
		connectionSafetyNotes: "Коническое соединение C1 / V3 и внутренний шестигранник SEVEN. Финальная затяжка 30 Н·см.",
	},
};

export function getTorqueSpecsByBrand(brand: ImplantTorqueBrand | string): BrandTorqueSpec {
	const normalized = (brand || "osstem").toLowerCase() as ImplantTorqueBrand;
	return IMPLANT_TORQUE_SPECS[normalized] ?? IMPLANT_TORQUE_SPECS.osstem;
}

export function getRecommendedTorqueNcm(
	brand: ImplantTorqueBrand | string,
	component: ProstheticComponentType | "insertion" | "final_screw" | "cover_screw" = "insertion",
): number {
	const spec = getTorqueSpecsByBrand(brand);
	switch (component) {
		case "cover_screw":
			return spec.torqueCoverScrewNcm;
		case "healing_abutment":
			return spec.torqueHealingAbutmentNcm;
		case "multi_unit_bridge_screw":
			return spec.torqueMultiUnitBridgeScrewNcm;
		case "multi_unit_straight":
		case "multi_unit_angled":
			return spec.torqueMultiUnitBodyNcm;
		case "final_screw":
		case "ti_base_screw":
		case "custom_abutment_screw":
		case "locator_abutment":
		case "ball_attachment":
			return spec.torqueFinalScrewNcm;
		case "fixture_insertion":
		case "insertion":
		default:
			return findImplantSystem(brand).defaultTorqueNcm;
	}
}

export function getScrewdriverType(brand: string): string {
	return getTorqueSpecsByBrand(brand).screwdriverDefault;
}

export interface TiBaseItemSSOT {
	readonly id: string;
	readonly brand: NormalizedBrandId;
	readonly line: string;
	readonly platformName: string;
	readonly platformDiameterMm: number;
	readonly gingivaHeightMm: number;
	readonly chimneyHeightMm: number;
	readonly articleNumber: string;
	readonly recommendedTorqueNcm: number;
	readonly screwdriverType: string;
}

export interface TiBaseCatalogItem {
	readonly id: string;
	readonly brand: ImplantTorqueBrand;
	readonly line: string;
	readonly platformName: string;
	readonly platformDiameterMm: number;
	readonly gingivaHeightMm: number;
	readonly chimneyHeightMm: number;
	readonly engagement: ConnectionEngagement;
	readonly articleNumber: string;
	readonly screwArticleNumber: string;
	readonly screwdriverType: string;
	readonly recommendedTorqueNcm: number;
	readonly scanBodyArticle: string;
	readonly priceKopecks: number;
}

export const TI_BASE_CATALOG_SSOT: readonly TiBaseItemSSOT[] = [
	{ id: "st-tb-nc-01", brand: "straumann", line: "BLX / Bone Level", platformName: "NC 3.3mm", platformDiameterMm: 3.3, gingivaHeightMm: 1.0, chimneyHeightMm: 4.0, articleNumber: "022.0104", recommendedTorqueNcm: 35, screwdriverType: "SCS" },
	{ id: "st-tb-rc-01", brand: "straumann", line: "BLX / Bone Level", platformName: "RC 4.1mm", platformDiameterMm: 4.1, gingivaHeightMm: 1.0, chimneyHeightMm: 4.0, articleNumber: "022.0106", recommendedTorqueNcm: 35, screwdriverType: "SCS" },
	{ id: "nb-tb-np-01", brand: "nobel_biocare", line: "NobelActive", platformName: "NP 3.5mm", platformDiameterMm: 3.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, articleNumber: "36838", recommendedTorqueNcm: 35, screwdriverType: "Unigrip" },
	{ id: "nb-tb-rp-01", brand: "nobel_biocare", line: "NobelActive", platformName: "RP 4.3mm", platformDiameterMm: 4.3, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, articleNumber: "36839", recommendedTorqueNcm: 35, screwdriverType: "Unigrip" },
	{ id: "oss-tb-mini-01", brand: "osstem", line: "TS III", platformName: "Mini (M)", platformDiameterMm: 3.5, gingivaHeightMm: 1.0, chimneyHeightMm: 4.0, articleNumber: "TBM3510", recommendedTorqueNcm: 30, screwdriverType: "Hex 1.2 mm" },
	{ id: "oss-tb-reg-01", brand: "osstem", line: "TS III", platformName: "Regular (R)", platformDiameterMm: 4.0, gingivaHeightMm: 1.0, chimneyHeightMm: 4.0, articleNumber: "TBR4010", recommendedTorqueNcm: 30, screwdriverType: "Hex 1.2 mm" },
	{ id: "dt-tb-reg-01", brand: "dentium", line: "SuperLine", platformName: "Regular", platformDiameterMm: 4.0, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, articleNumber: "TLB4015", recommendedTorqueNcm: 30, screwdriverType: "Hex 1.27 mm" },
	{ id: "as-tb-ev-01", brand: "astra_tech", line: "OsseoSpeed EV", platformName: "Yellow 4.2", platformDiameterMm: 4.2, gingivaHeightMm: 1.5, chimneyHeightMm: 4.0, articleNumber: "25841", recommendedTorqueNcm: 25, screwdriverType: "Hex 1.25 mm" },
	{ id: "ar-tb-reg-01", brand: "anyridge", line: "AnyRidge", platformName: "Regular", platformDiameterMm: 4.0, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, articleNumber: "ARTB4015", recommendedTorqueNcm: 35, screwdriverType: "Hex 1.2 mm" },
	{ id: "ank-tb-cx-01", brand: "ankylos", line: "C/X", platformName: "Regular C/X", platformDiameterMm: 4.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.0, articleNumber: "31022510", recommendedTorqueNcm: 15, screwdriverType: "Hex 1.0 mm" },
];

export const TI_BASE_CATALOG: readonly TiBaseCatalogItem[] = [
	{
		id: "st-tb-nc-01", brand: "straumann", line: "Bone Level", platformName: "NC (Narrow CrossFit)",
		platformDiameterMm: 3.3, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, engagement: "engaging",
		articleNumber: "022.0101", screwArticleNumber: "025.2901", screwdriverType: "SCS", recommendedTorqueNcm: 35,
		scanBodyArticle: "025.0001", priceKopecks: 850000,
	},
	{
		id: "st-tb-rc-01", brand: "straumann", line: "Bone Level", platformName: "RC (Regular CrossFit)",
		platformDiameterMm: 4.1, gingivaHeightMm: 1.5, chimneyHeightMm: 5.5, engagement: "engaging",
		articleNumber: "022.0102", screwArticleNumber: "025.4901", screwdriverType: "SCS", recommendedTorqueNcm: 35,
		scanBodyArticle: "025.0002", priceKopecks: 850000,
	},
	{
		id: "nb-tb-np-01", brand: "nobel_biocare", line: "NobelActive", platformName: "NP (Narrow Platform)",
		platformDiameterMm: 3.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, engagement: "engaging",
		articleNumber: "36812", screwArticleNumber: "36818", screwdriverType: "Unigrip", recommendedTorqueNcm: 35,
		scanBodyArticle: "36850", priceKopecks: 900000,
	},
	{
		id: "nb-tb-rp-01", brand: "nobel_biocare", line: "NobelActive", platformName: "RP (Regular Platform)",
		platformDiameterMm: 4.3, gingivaHeightMm: 1.5, chimneyHeightMm: 5.5, engagement: "engaging",
		articleNumber: "36813", screwArticleNumber: "36819", screwdriverType: "Unigrip", recommendedTorqueNcm: 35,
		scanBodyArticle: "36851", priceKopecks: 900000,
	},
	{
		id: "oss-tb-m-01", brand: "osstem", line: "TS III", platformName: "Mini",
		platformDiameterMm: 3.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.5, engagement: "engaging",
		articleNumber: "TBTS3M15", screwArticleNumber: "BSTSM", screwdriverType: "Hex 1.2 mm", recommendedTorqueNcm: 30,
		scanBodyArticle: "SB-OSS-M", priceKopecks: 450000,
	},
	{
		id: "oss-tb-r-01", brand: "osstem", line: "TS III", platformName: "Regular",
		platformDiameterMm: 4.0, gingivaHeightMm: 1.5, chimneyHeightMm: 5.5, engagement: "engaging",
		articleNumber: "TBTS3R15", screwArticleNumber: "BSTSR", screwdriverType: "Hex 1.2 mm", recommendedTorqueNcm: 30,
		scanBodyArticle: "SB-OSS-R", priceKopecks: 450000,
	},
	{
		id: "dent-tb-sl-01", brand: "dentium", line: "SuperLine", platformName: "Standard",
		platformDiameterMm: 4.0, gingivaHeightMm: 1.5, chimneyHeightMm: 5.0, engagement: "engaging",
		articleNumber: "TBAL4015", screwArticleNumber: "SBL30", screwdriverType: "Hex 1.27 mm", recommendedTorqueNcm: 30,
		scanBodyArticle: "SB-DENT-STD", priceKopecks: 480000,
	},
	{
		id: "ank-tb-c-01", brand: "ankylos", line: "C/X", platformName: "Balance Base C/",
		platformDiameterMm: 3.5, gingivaHeightMm: 1.5, chimneyHeightMm: 4.0, engagement: "non_engaging",
		articleNumber: "31022110", screwArticleNumber: "31022190", screwdriverType: "Hex 1.0 mm", recommendedTorqueNcm: 15,
		scanBodyArticle: "SB-ANK-BB", priceKopecks: 870000,
	},
];

export function getTiBasesByBrandAndPlatform(
	brand: ImplantTorqueBrand,
	platformName?: string,
): TiBaseCatalogItem[] {
	return TI_BASE_CATALOG.filter(
		(tb) => tb.brand === brand && (!platformName || tb.platformName.includes(platformName)),
	);
}

export function findTiBaseByArticle(articleNumber: string): TiBaseCatalogItem | undefined {
	return TI_BASE_CATALOG.find((tb) => tb.articleNumber === articleNumber);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FIXTURES, PRICING & DRILLING SEQUENCES (from implantCatalog)
// ─────────────────────────────────────────────────────────────────────────────

export interface DrillStep {
	readonly stepNumber: number;
	readonly drillName: string;
	readonly diameterMm: number;
	readonly targetRpm: number;
	readonly maxRpm: number;
	readonly irrigation: "copious_sterile_saline" | "moderate_sterile_saline";
	readonly depthGuide: string;
	readonly isBoneDenseOnly?: boolean;
	readonly isBoneSoftOptional?: boolean;
}

export interface GuidedSleeveSpec {
	readonly sleeveDiameterMm: number;
	readonly sleeveHeightMm: number;
	readonly offsetMm: number;
	readonly sleeveArticle: string;
}

export interface ImplantFixture {
	readonly id: string;
	readonly brand: ImplantBrand;
	readonly brandName: string;
	readonly brandCountry: string;
	readonly line: string;
	readonly lineDescription: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformType: PlatformType;
	readonly platformName: string;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly surfaceTreatment: string;
	readonly surfaceDescription: string;
	readonly articleNumber: string;
	readonly guidedSleeve: GuidedSleeveSpec;
	readonly drillSequence: readonly DrillStep[];
	readonly fixturePriceKopecks: number;
	readonly healingCapPriceKopecks: number;
	readonly transferPriceKopecks: number;
	readonly standardAbutmentPriceKopecks: number;
	readonly guidedSleevePriceKopecks: number;
}

export interface ImplantKitCost {
	readonly fixtureKopecks: number;
	readonly healingCapKopecks: number;
	readonly transferKopecks: number;
	readonly abutmentKopecks: number;
	readonly guidedSleeveKopecks: number;
	readonly totalKitKopecks: number;
	readonly totalRublesFormatted: string;
}

export const BASE_PRICES: Record<ImplantBrand, { fixture: number; cap: number; transfer: number; abutment: number; sleeve: number }> = {
	straumann: { fixture: 3200000, cap: 450000, transfer: 380000, abutment: 850000, sleeve: 250000 },
	nobel_biocare: { fixture: 3500000, cap: 500000, transfer: 420000, abutment: 900000, sleeve: 250000 },
	osstem: { fixture: 1250000, cap: 220000, transfer: 200000, abutment: 450000, sleeve: 180000 },
	dentium: { fixture: 1450000, cap: 250000, transfer: 220000, abutment: 480000, sleeve: 180000 },
	ankylos: { fixture: 3300000, cap: 480000, transfer: 390000, abutment: 870000, sleeve: 250000 },
	astra_tech: { fixture: 3100000, cap: 460000, transfer: 400000, abutment: 880000, sleeve: 250000 },
	mis: { fixture: 1550000, cap: 240000, transfer: 210000, abutment: 460000, sleeve: 190000 },
};

function buildDrillSequence(sizeDiameter: number, len: number): DrillStep[] {
	const drillSequence: DrillStep[] = [
		{
			stepNumber: 1,
			drillName: "Пилотное сверло Ø2.0",
			diameterMm: 2.0,
			targetRpm: 800,
			maxRpm: 1200,
			irrigation: "copious_sterile_saline",
			depthGuide: `${len} мм`,
		},
		{
			stepNumber: 2,
			drillName: `Формирующее сверло Ø${(sizeDiameter - 0.5).toFixed(1)}`,
			diameterMm: Math.max(2.5, sizeDiameter - 0.5),
			targetRpm: 600,
			maxRpm: 800,
			irrigation: "copious_sterile_saline",
			depthGuide: `${len} мм`,
		},
	];

	if (sizeDiameter >= 4.0) {
		drillSequence.push({
			stepNumber: 3,
			drillName: `Финальное кортикальное сверло Ø${sizeDiameter.toFixed(1)}`,
			diameterMm: sizeDiameter,
			targetRpm: 400,
			maxRpm: 500,
			irrigation: "copious_sterile_saline",
			depthGuide: `${len} мм`,
			isBoneDenseOnly: true,
		});
	}

	return drillSequence;
}

export function createFixtures(): ImplantFixture[] {
	const catalog: ImplantFixture[] = [];

	for (const sys of DICOM_CANONICAL_IMPLANT_SYSTEMS) {
		const brandKey = BRAND_KEY_MAP[sys.brand];
		if (!brandKey) continue;

		const prices = BASE_PRICES[brandKey];
		const isConical = sys.primaryStabilityDesign.toLowerCase().includes("конич");
		const platformType: PlatformType = isConical ? "conical" : "internal_hex";

		for (const size of sys.sizes) {
			for (const len of size.lengthsMm) {
				const id = `${brandKey}-${sys.line.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${size.diameterMm.toFixed(1)}-${len.toFixed(1)}`;
				const article = `${brandKey.toUpperCase().slice(0, 3)}-${Math.round(size.diameterMm * 10)}${Math.round(len * 10)}`;

				catalog.push({
					id,
					brand: brandKey,
					brandName: sys.brand,
					brandCountry: sys.country,
					line: sys.line,
					lineDescription: sys.descriptionRu,
					diameterMm: size.diameterMm,
					lengthMm: len,
					platformType,
					platformName: size.platform.labelRu,
					platformDiameterMm: size.diameterMm,
					apexDiameterMm: Number((size.diameterMm * 0.65).toFixed(1)),
					surfaceTreatment: "SLA / Nanostructured bioactive surface",
					surfaceDescription: "Пескоструйная обработка и кислотное травление для ускоренной остеоинтеграции",
					articleNumber: article,
					guidedSleeve: {
						sleeveDiameterMm: sys.sleeveDiameterMm,
						sleeveHeightMm: sys.sleeveHeightMm,
						offsetMm: sys.drillOffsetDefaultMm,
						sleeveArticle: `SLV-${article}`,
					},
					drillSequence: buildDrillSequence(size.diameterMm, len),
					fixturePriceKopecks: prices.fixture,
					healingCapPriceKopecks: prices.cap,
					transferPriceKopecks: prices.transfer,
					standardAbutmentPriceKopecks: prices.abutment,
					guidedSleevePriceKopecks: prices.sleeve,
				});
			}
		}
	}

	return catalog;
}

export const IMPLANT_CATALOG: readonly ImplantFixture[] = Object.freeze(createFixtures());

export function getFixturesByBrand(brand: ImplantBrand): ImplantFixture[] {
	return IMPLANT_CATALOG.filter((f) => f.brand === brand);
}

export function getLinesByBrand(brand: ImplantBrand): string[] {
	const fixtures = getFixturesByBrand(brand);
	return Array.from(new Set(fixtures.map((f) => f.line)));
}

export function getAvailableDiameters(brandOrKey: string, line?: string): readonly number[] {
	const brand = BRAND_KEY_MAP[brandOrKey] || resolveNormalizedBrand(brandOrKey);
	const fixtures = IMPLANT_CATALOG.filter(
		(f) => f.brand === brand && (!line || f.line === line),
	);
	if (fixtures.length > 0) {
		return Array.from(new Set(fixtures.map((f) => f.diameterMm))).sort((a, b) => a - b);
	}
	return findImplantSystem(brandOrKey).standardDiametersMm;
}

export function getAvailableLengths(brandOrKey: string, line?: string, diameter?: number): readonly number[] {
	const brand = BRAND_KEY_MAP[brandOrKey] || resolveNormalizedBrand(brandOrKey);
	const fixtures = IMPLANT_CATALOG.filter(
		(f) =>
			f.brand === brand &&
			(!line || f.line === line) &&
			(diameter === undefined || f.diameterMm === diameter),
	);
	if (fixtures.length > 0) {
		return Array.from(new Set(fixtures.map((f) => f.lengthMm))).sort((a, b) => a - b);
	}
	return findImplantSystem(brandOrKey).standardLengthsMm;
}

export function findFixture(id: string): ImplantFixture | undefined {
	return IMPLANT_CATALOG.find((f) => f.id === id);
}

export function findFixtureBySpecs(
	brand: ImplantBrand,
	line: string,
	diameterMm: number,
	lengthMm: number,
): ImplantFixture | undefined {
	return IMPLANT_CATALOG.find(
		(f) =>
			f.brand === brand &&
			f.line === line &&
			Math.abs(f.diameterMm - diameterMm) < 0.05 &&
			Math.abs(f.lengthMm - lengthMm) < 0.05,
	);
}

export function calculateKitPriceKopecks(
	fixture: ImplantFixture,
	options?: {
		includeHealingCap?: boolean;
		includeTransfer?: boolean;
		includeAbutment?: boolean;
		includeGuidedSleeve?: boolean;
	},
): ImplantKitCost {
	const includeHealing = options?.includeHealingCap ?? true;
	const includeTransfer = options?.includeTransfer ?? true;
	const includeAbutment = options?.includeAbutment ?? true;
	const includeSleeve = options?.includeGuidedSleeve ?? true;

	const fixtureKopecks = fixture.fixturePriceKopecks;
	const healingCapKopecks = includeHealing ? fixture.healingCapPriceKopecks : 0;
	const transferKopecks = includeTransfer ? fixture.transferPriceKopecks : 0;
	const abutmentKopecks = includeAbutment ? fixture.standardAbutmentPriceKopecks : 0;
	const guidedSleeveKopecks = includeSleeve ? fixture.guidedSleevePriceKopecks : 0;

	const totalKitKopecks =
		fixtureKopecks + healingCapKopecks + transferKopecks + abutmentKopecks + guidedSleeveKopecks;

	const rubles = totalKitKopecks / 100;
	const formatted = `${rubles.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} ₽`;

	return {
		fixtureKopecks,
		healingCapKopecks,
		transferKopecks,
		abutmentKopecks,
		guidedSleeveKopecks,
		totalKitKopecks,
		totalRublesFormatted: formatted,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CLINICAL GEOMETRY & CROSS-SECTION SPECIFICATIONS (Radiology & DICOM)
// ─────────────────────────────────────────────────────────────────────────────

export type ClinicalImplantBrandKey = "osstem" | "straumann" | "nobel_biocare" | "dentium" | "mis";

export interface ClinicalImplantBrandMeta {
	readonly key: ClinicalImplantBrandKey;
	readonly name: string;
	readonly country: string;
	readonly systemFamily: string;
	readonly descriptionRu: string;
	readonly defaultPlatformType: "internal_hex" | "cross_fit" | "conical";
}

export const CLINICAL_IMPLANT_BRANDS: readonly ClinicalImplantBrandMeta[] = [
	{
		key: "osstem",
		name: "Osstem",
		country: "Южная Корея",
		systemFamily: "TS III SA / TS IV SA",
		descriptionRu: "Золотой стандарт с SA гидрофильной поверхностью и двойной микрорезьбой.",
		defaultPlatformType: "internal_hex",
	},
	{
		key: "straumann",
		name: "Straumann",
		country: "Швейцария",
		systemFamily: "BLX / BLT / Bone Level",
		descriptionRu: "Премиальный швейцарский сплав Roxolid с поверхностью SLActive/SLA.",
		defaultPlatformType: "cross_fit",
	},
	{
		key: "nobel_biocare",
		name: "Nobel Biocare",
		country: "Швейцария",
		systemFamily: "NobelActive / NobelParallel",
		descriptionRu: "Высокая первичная стабильность в кости D3–D4 для немедленной нагрузки.",
		defaultPlatformType: "conical",
	},
	{
		key: "dentium",
		name: "Dentium",
		country: "Южная Корея",
		systemFamily: "SuperLine / SimpleLine",
		descriptionRu: "Коническая форма с глубоким конусом Морзе и агрессивной самонарезающей резьбой.",
		defaultPlatformType: "internal_hex",
	},
	{
		key: "mis",
		name: "MIS Implants",
		country: "Израиль",
		systemFamily: "SEVEN / C1 / V3",
		descriptionRu: "Универсальный конический макродизайн с выраженной компрессионной резьбой.",
		defaultPlatformType: "internal_hex",
	},
] as const;

export const STANDARD_CLINICAL_DIAMETERS = [3.5, 4.0, 4.5, 5.0] as const;
export const STANDARD_CLINICAL_LENGTHS = [8.0, 10.0, 11.5, 13.0] as const;

export type StandardImplantDiameterMm = typeof STANDARD_CLINICAL_DIAMETERS[number];
export type StandardImplantLengthMm = typeof STANDARD_CLINICAL_LENGTHS[number];

export const IMPLANT_PLATFORM_COLORS: Record<number, { hex: string; nameRu: string }> = {
	3.5: { hex: "#eab308", nameRu: "Желтый (Narrow 3.5)" },
	4.0: { hex: "#10b981", nameRu: "Зеленый (Regular 4.0)" },
	4.5: { hex: "#06b6d4", nameRu: "Бирюзовый (Regular Wide 4.5)" },
	5.0: { hex: "#a855f7", nameRu: "Фиолетовый (Wide Molar 5.0)" },
};

export interface ClinicalImplantSpec {
	readonly id: string;
	readonly brand: ClinicalImplantBrandKey;
	readonly brandName: string;
	readonly lineName: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly platformDiameterMm: number;
	readonly apexDiameterMm: number;
	readonly apicalTaperLengthMm: number;
	readonly safetyZoneMm: number;
	readonly priceKopecks: number;
	readonly articleNumber: string;
	readonly platformColorHex: string;
	readonly clinicalIndicationRu: string;
}

export function buildClinicalImplantSpec(
	brand: ClinicalImplantBrandKey,
	diameterMm: number,
	lengthMm: number,
): ClinicalImplantSpec {
	const brandMeta = CLINICAL_IMPLANT_BRANDS.find((b) => b.key === brand) ?? CLINICAL_IMPLANT_BRANDS[0]!;
	const color = IMPLANT_PLATFORM_COLORS[diameterMm]?.hex ?? "#10b981";

	const apexDiameterMm = Number((diameterMm * 0.68).toFixed(1));
	const apicalTaperLengthMm = Math.min(3.0, Number((lengthMm * 0.28).toFixed(1)));

	const basePriceKopecks: Record<ClinicalImplantBrandKey, number> = {
		osstem: 1850000,
		straumann: 3850000,
		nobel_biocare: 3950000,
		dentium: 1900000,
		mis: 1950000,
	};

	const prefix: Record<ClinicalImplantBrandKey, string> = {
		osstem: "TS3S",
		straumann: "061.",
		nobel_biocare: "NB-",
		dentium: "FXT",
		mis: "MF7-",
	};

	const diamCode = Math.round(diameterMm * 10);
	const lenCode = Math.round(lengthMm * 10);
	const articleNumber = `${prefix[brand]}${diamCode}${lenCode}`;

	const indicationRu =
		diameterMm <= 3.5
			? "Узкий гребень, замещение резцов и премоляров при дефиците кости"
			: diameterMm <= 4.0
				? "Универсальный протокол для премоляров и моляров верхней и нижней челюсти"
				: diameterMm <= 4.5
					? "Широкий гребень моляров, немедленная нагрузка"
					: "Широкая костная площадка моляров нижней челюсти";

	return {
		id: `${brand}-d${diamCode}-l${lenCode}`,
		brand,
		brandName: brandMeta.name,
		lineName: brandMeta.systemFamily.split("/")[0]!.trim(),
		diameterMm,
		lengthMm,
		platformDiameterMm: diameterMm,
		apexDiameterMm,
		apicalTaperLengthMm,
		safetyZoneMm: 2.0,
		priceKopecks: basePriceKopecks[brand] ?? 2000000,
		articleNumber,
		platformColorHex: color,
		clinicalIndicationRu: indicationRu,
	};
}

export const CLINICAL_IMPLANT_LIBRARY: readonly ClinicalImplantSpec[] = (() => {
	const catalog: ClinicalImplantSpec[] = [];
	for (const brand of CLINICAL_IMPLANT_BRANDS) {
		for (const d of STANDARD_CLINICAL_DIAMETERS) {
			for (const l of STANDARD_CLINICAL_LENGTHS) {
				catalog.push(buildClinicalImplantSpec(brand.key, d, l));
			}
		}
	}
	return catalog;
})();

export function findClinicalImplant(
	brand: ClinicalImplantBrandKey,
	diameterMm: number,
	lengthMm: number,
): ClinicalImplantSpec {
	const exact = CLINICAL_IMPLANT_LIBRARY.find(
		(i) => i.brand === brand && Math.abs(i.diameterMm - diameterMm) < 0.1 && Math.abs(i.lengthMm - lengthMm) < 0.1,
	);
	return exact ?? buildClinicalImplantSpec(brand, diameterMm, lengthMm);
}

export interface ClinicalImplantPose {
	readonly depthMm: number;
	readonly xOffsetMm: number;
	readonly angulationDeg: number;
}

export const DEFAULT_IMPLANT_POSE: ClinicalImplantPose = {
	depthMm: 0.5,
	xOffsetMm: 0.0,
	angulationDeg: 0.0,
};

export interface ImplantCrossSectionGeometry {
	readonly entryCenterMm: { x: number; y: number };
	readonly apexCenterMm: { x: number; y: number };
	readonly implantPolygonMm: readonly { x: number; y: number }[];
	readonly safetyZonePolygonMm: readonly { x: number; y: number }[];
	readonly centralAxisLineMm: [{ x: number; y: number }, { x: number; y: number }];
	readonly platformWidthMm: number;
	readonly apexWidthMm: number;
	readonly totalLengthMm: number;
	readonly safetyMarginMm: number;
}

export function calculateImplantCrossSectionGeometry(
	implant: Pick<ClinicalImplantSpec, "diameterMm" | "lengthMm" | "platformDiameterMm" | "apexDiameterMm" | "apicalTaperLengthMm" | "safetyZoneMm">,
	pose: ClinicalImplantPose,
	crestReferenceMm: { x: number; y: number } = { x: 0, y: 0 },
): ImplantCrossSectionGeometry {
	const rad = (pose.angulationDeg * Math.PI) / 180.0;
	const sin = Math.sin(rad);
	const cos = Math.cos(rad);

	const dirX = sin;
	const dirY = cos;
	const perpX = cos;
	const perpY = -sin;

	const entryX = crestReferenceMm.x + pose.xOffsetMm;
	const entryY = crestReferenceMm.y + pose.depthMm;
	const apexX = entryX + dirX * implant.lengthMm;
	const apexY = entryY + dirY * implant.lengthMm;

	const taperStartY = implant.lengthMm - implant.apicalTaperLengthMm;
	const taperStartX = entryX + dirX * taperStartY;
	const taperStartYPos = entryY + dirY * taperStartY;

	const rPlat = implant.platformDiameterMm / 2.0;
	const rApex = implant.apexDiameterMm / 2.0;

	const pLeft = { x: entryX - perpX * rPlat, y: entryY - perpY * rPlat };
	const pRight = { x: entryX + perpX * rPlat, y: entryY + perpY * rPlat };
	const tRight = { x: taperStartX + perpX * rPlat, y: taperStartYPos + perpY * rPlat };
	const aRight = { x: apexX + perpX * rApex, y: apexY + perpY * rApex };
	const aLeft = { x: apexX - perpX * rApex, y: apexY - perpY * rApex };
	const tLeft = { x: taperStartX - perpX * rPlat, y: taperStartYPos - perpY * rPlat };

	const implantPolygonMm = [pLeft, pRight, tRight, aRight, aLeft, tLeft];

	const safety = implant.safetyZoneMm ?? 2.0;
	const rSafePlat = rPlat + safety;
	const rSafeApex = rApex + safety;
	const safeApexCenter = { x: apexX + dirX * safety, y: apexY + dirY * safety };

	const sPLeft = { x: entryX - perpX * rSafePlat, y: entryY - perpY * rSafePlat };
	const sPRight = { x: entryX + perpX * rSafePlat, y: entryY + perpY * rSafePlat };
	const sTRight = { x: taperStartX + perpX * rSafePlat, y: taperStartYPos + perpY * rSafePlat };
	const sARight = { x: apexX + perpX * rSafeApex, y: apexY + perpY * rSafeApex };
	const sApexTip = safeApexCenter;
	const sALeft = { x: apexX - perpX * rSafeApex, y: apexY - perpY * rSafeApex };
	const sTLeft = { x: taperStartX - perpX * rSafePlat, y: taperStartYPos - perpY * rSafePlat };

	const safetyZonePolygonMm = [sPLeft, sPRight, sTRight, sARight, sApexTip, sALeft, sTLeft];

	return {
		entryCenterMm: { x: entryX, y: entryY },
		apexCenterMm: { x: apexX, y: apexY },
		implantPolygonMm,
		safetyZonePolygonMm,
		centralAxisLineMm: [
			{ x: entryX, y: entryY },
			{ x: apexX + dirX * 1.5, y: apexY + dirY * 1.5 },
		],
		platformWidthMm: implant.platformDiameterMm,
		apexWidthMm: implant.apexDiameterMm,
		totalLengthMm: implant.lengthMm,
		safetyMarginMm: safety,
	};
}

export function evaluateImplantObstacleClearance(
	apexYMm: number,
	obstacleYMm: number | null | undefined,
	safetyZoneMm = 2.0,
): {
	readonly clearanceMm: number | null;
	readonly status: "safe" | "warning" | "danger" | "unmeasured";
	readonly statusLabelRu: string;
	readonly badgeColorClass: string;
} {
	if (obstacleYMm === null || obstacleYMm === undefined || !Number.isFinite(obstacleYMm)) {
		return {
			clearanceMm: null,
			status: "unmeasured",
			statusLabelRu: "Ориентир не размечен",
			badgeColorClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
		};
	}

	const clearanceMm = Number((obstacleYMm - apexYMm).toFixed(1));

	if (clearanceMm < 0.5) {
		return {
			clearanceMm,
			status: "danger",
			statusLabelRu: `ОПАСНО: вторжение в зону канала (${clearanceMm.toFixed(1)} мм < 0.5 мм)`,
			badgeColorClass: "bg-rose-950/80 text-rose-300 border-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
		};
	}

	if (clearanceMm < safetyZoneMm) {
		return {
			clearanceMm,
			status: "warning",
			statusLabelRu: `Внимание: буфер ${clearanceMm.toFixed(1)} мм (менее зоны безопасности ${safetyZoneMm} мм)`,
			badgeColorClass: "bg-amber-950/80 text-amber-300 border-amber-500/80",
		};
	}

	return {
		clearanceMm,
		status: "safe",
		statusLabelRu: `Безопасно: ${clearanceMm.toFixed(1)} мм до препятствия (норма >= ${safetyZoneMm} мм)`,
		badgeColorClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/80",
	};
}
