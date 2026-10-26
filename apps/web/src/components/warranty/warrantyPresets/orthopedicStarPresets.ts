import type { StarQuickPreset } from "./types.js";

export const STAR_EMAX_QUICK_PRESET: StarQuickPreset = {
	id: "star_emax_2y",
	title: "Керамика E.max",
	subtitle: "2 года (24 мес.) • Срок сл. 10 лет",
	category: "ceramic_crown_veneer",
	materialName: "IPS e.max Press (дисиликат лития)",
	manufacturer: "Ivoclar Vivadent",
	country: "Лихтенштейн",
	warrantyMonths: 24,
	serviceLifeMonths: 120,
	serviceCode804n: "A16.07.004.002",
	statutoryNote: "Положение СтАР разд. 3 (безметалловая керамика E.max)",
};

export const STAR_ZIRCONIA_QUICK_PRESET: StarQuickPreset = {
	id: "star_zirconia_3y",
	title: "Диоксид циркония",
	subtitle: "3 года (36 мес.) • Срок сл. 15 лет",
	category: "ceramic_crown_veneer",
	materialName: "Katana Zirconia HTML/UTML",
	manufacturer: "Kuraray Noritake",
	country: "Япония",
	warrantyMonths: 36,
	serviceLifeMonths: 180,
	serviceCode804n: "A16.07.004.002",
	statutoryNote: "Положение СтАР разд. 3, ГК РФ ст. 720–724",
};

export const STAR_ORTHOPEDIC_QUICK_PRESETS: readonly StarQuickPreset[] = [
	STAR_EMAX_QUICK_PRESET,
	STAR_ZIRCONIA_QUICK_PRESET,
] as const;
