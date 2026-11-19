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
	// Full names & English titles
	"Nobel Biocare": "nobel_biocare",
	Straumann: "straumann",
	Osstem: "osstem",
	Dentium: "dentium",
	Ankylos: "ankylos",
	"Astra Tech": "astra_tech",
	"MIS Implants": "mis",

	// Shared canonical brand IDs (packages/shared/src/clinical/implants/catalog.ts)
	nobel: "nobel_biocare",
	astra: "astra_tech",
	straumann: "straumann",
	osstem: "osstem",
	dentium: "dentium",
	ankylos: "ankylos",
	mis: "mis",

	// Web canonical brand IDs
	nobel_biocare: "nobel_biocare",
	astra_tech: "astra_tech",

	// Case-insensitive / normalized aliases
	"nobel biocare": "nobel_biocare",
	"astra tech": "astra_tech",
	"mis implants": "mis",
	nobelactive: "nobel_biocare",
	nobelreplace: "nobel_biocare",
	osseospeed: "astra_tech",

	// Russian clinical aliases (Мандат 8x)
	нобель: "nobel_biocare",
	"нобель биокеар": "nobel_biocare",
	"нобель актив": "nobel_biocare",
	астра: "astra_tech",
	"астра тек": "astra_tech",
	штрауман: "straumann",
	штрауманн: "straumann",
	осстем: "osstem",
	дентиум: "dentium",
	анкилос: "ankylos",
	мис: "mis",
};

/**
 * Обратный маппинг web-идентификаторов ("nobel_biocare", "astra_tech")
 * к каноническим ID из packages/shared ("nobel", "astra") (Мандаты 8e, 8x).
 */
export const WEB_TO_SHARED_BRAND_MAP: Record<ImplantBrand, string> = {
	nobel_biocare: "nobel",
	astra_tech: "astra",
	straumann: "straumann",
	osstem: "osstem",
	dentium: "dentium",
	ankylos: "ankylos",
	mis: "osstem",
};

/**
 * Прямой маппинг shared-идентификаторов ("nobel", "astra")
 * к каноническим web-идентификаторам ("nobel_biocare", "astra_tech").
 */
export const SHARED_TO_WEB_BRAND_MAP: Record<string, ImplantBrand> = {
	nobel: "nobel_biocare",
	astra: "astra_tech",
	straumann: "straumann",
	osstem: "osstem",
	dentium: "dentium",
	ankylos: "ankylos",
	mis: "mis",
};

/**
 * Гарантированное двустороннее разрешение идентификатора бренда (Shared <-> Web).
 */
export function resolveWebBrandId(brandOrKey: string): ImplantBrand {
	if (!brandOrKey) return "osstem";
	const trimmed = brandOrKey.trim();
	if (BRAND_KEY_MAP[trimmed]) return BRAND_KEY_MAP[trimmed];
	const lower = trimmed.toLowerCase();
	if (BRAND_KEY_MAP[lower]) return BRAND_KEY_MAP[lower];
	if (lower.includes("nobel")) return "nobel_biocare";
	if (lower.includes("astra")) return "astra_tech";
	if (lower.includes("straumann")) return "straumann";
	if (lower.includes("osstem")) return "osstem";
	if (lower.includes("dentium")) return "dentium";
	if (lower.includes("ankylos")) return "ankylos";
	if (lower.includes("mis")) return "mis";
	return "osstem";
}

/**
 * Разрешение web-идентификатора в shared-идентификатор ("nobel", "astra").
 */
export function resolveSharedBrandId(brandOrKey: string): string {
	const webBrand = resolveWebBrandId(brandOrKey);
	return WEB_TO_SHARED_BRAND_MAP[webBrand] ?? "osstem";
}
