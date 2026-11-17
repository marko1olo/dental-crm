/**
 * implantNormalizedSystems.ts — 6 стандартизированных промышленных систем имплантации (DENTE CRM).
 * Декомпозирован из implantCatalogData.ts по Мандатам 8b и 8zi.
 */

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
