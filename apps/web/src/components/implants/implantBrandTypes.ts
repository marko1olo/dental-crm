/**
 * implantBrandTypes.ts — Базовые идентификаторы брендов, метаданные и типы платформ имплантатов (DENTE CRM).
 * Декомпозирован из implantCatalogData.ts для устранения циклических зависимостей по Мандатам 8b и 8zi.
 */

export type NormalizedBrandId =
	| "osstem"
	| "straumann"
	| "nobel_biocare"
	| "dentium"
	| "astra_tech"
	| "anyridge"
	| "ankylos";

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
};
