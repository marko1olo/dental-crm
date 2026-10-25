/**
 * implantCatalogBrands.ts — Метаданные брендов имплантов и базовая ценовая сетка (копейки).
 */

import type { ImplantBrand, BrandMetadata } from "./implantCatalogTypes";

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

export const BASE_PRICES: Record<ImplantBrand, { fixture: number; cap: number; transfer: number; abutment: number; sleeve: number }> = {
	straumann: { fixture: 3200000, cap: 450000, transfer: 380000, abutment: 850000, sleeve: 250000 },
	nobel_biocare: { fixture: 3500000, cap: 500000, transfer: 420000, abutment: 900000, sleeve: 250000 },
	osstem: { fixture: 1250000, cap: 220000, transfer: 200000, abutment: 450000, sleeve: 180000 },
	dentium: { fixture: 1450000, cap: 250000, transfer: 220000, abutment: 480000, sleeve: 180000 },
	ankylos: { fixture: 3300000, cap: 480000, transfer: 390000, abutment: 870000, sleeve: 250000 },
	astra_tech: { fixture: 3100000, cap: 460000, transfer: 400000, abutment: 880000, sleeve: 250000 },
	mis: { fixture: 1550000, cap: 240000, transfer: 210000, abutment: 460000, sleeve: 190000 },
};
