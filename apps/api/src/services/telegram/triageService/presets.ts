/**
 * presets.ts
 *
 * Layer 0: Clinical standards and price catalogs for dental triage.
 */

import type {
	CariesPreset,
	CrownTypePreset,
	ImplantSystemPreset,
	WhiteningPreset,
} from "./types.js";

// Каталог имплантационных систем (проверенные клинические стандарты РФ)
export const IMPLANT_PRESETS: ImplantSystemPreset[] = [
	{
		code: "osstem",
		brand: "Osstem",
		country: "Южная Корея",
		priceRub: 35000,
		warrantyYears: "Пожизненная",
	},
	{
		code: "dentium",
		brand: "Dentium SuperLine",
		country: "Южная Корея",
		priceRub: 38000,
		warrantyYears: "Пожизненная",
	},
	{
		code: "straumann",
		brand: "Straumann SLA",
		country: "Швейцария",
		priceRub: 65000,
		warrantyYears: "Пожизненная",
	},
];

// Каталог ортопедических коронок на имплант / зуб
export const CROWN_PRESETS: CrownTypePreset[] = [
	{
		code: "zirconia",
		name: "Диоксид циркония (Prettau/Katana)",
		priceRub: 32000,
		aestheticRating: 5,
	},
	{
		code: "emax",
		name: "Керамика E.max (Германия)",
		priceRub: 35000,
		aestheticRating: 5,
	},
	{
		code: "metal_ceramic",
		name: "Металлокерамика (стандарт)",
		priceRub: 18000,
		aestheticRating: 3,
	},
];

// Каталог терапевтического лечения кариеса
export const CARIES_PRESETS: CariesPreset[] = [
	{
		code: "medium",
		label: "Средний кариес (световая пломба Estelite/Filtek)",
		priceRub: 5500,
	},
	{
		code: "deep",
		label: "Глубокий кариес с лечебной прокладкой",
		priceRub: 7200,
	},
	{
		code: "aesthetic_front",
		label: "Художественная реставрация переднего зуба",
		priceRub: 9500,
	},
];

// Каталог отбеливания
export const WHITENING_PRESETS: WhiteningPreset[] = [
	{
		code: "flash",
		label: "Холодное аппаратное отбеливание FLASH (Германия)",
		priceRub: 28000,
	},
	{
		code: "zoom4",
		label: "Клиническое отбеливание Philips Zoom 4",
		priceRub: 34000,
	},
	{
		code: "home_kit",
		label: "Домашнее отбеливание с индивидуальными каппами",
		priceRub: 14000,
	},
];

export function findImplantPreset(code: string): ImplantSystemPreset {
	return IMPLANT_PRESETS.find((p) => p.code === code) ?? IMPLANT_PRESETS[0]!;
}

export function findCrownPreset(code: string): CrownTypePreset {
	return CROWN_PRESETS.find((c) => c.code === code) ?? CROWN_PRESETS[0]!;
}

export function findCariesPreset(code: string): CariesPreset | undefined {
	return CARIES_PRESETS.find((c) => c.code === code);
}

export function findWhiteningPreset(code: string): WhiteningPreset | undefined {
	return WHITENING_PRESETS.find((w) => w.code === code);
}
