/**
 * exclusions.ts — Стандартные категории исключений программ ДМС
 */

import type { DmsExclusionDefinition } from "./types.js";

export const DMS_STANDARD_EXCLUSIONS: readonly DmsExclusionDefinition[] = [
	{
		id: "orthodontics",
		key: "orthodontics",
		title: "Ортодонтия (брекеты, элайнеры)",
		description: "Исправление прикуса, брекет-системы, каппы, ортодонтические аппараты",
		defaultExcluded: true,
		matchedCategories: ["orthodontics", "ortho"],
	},
	{
		id: "implantology",
		key: "implantology",
		title: "Имплантация и костная пластика",
		description: "Установка дентальных имплантатов, синус-лифтинг, остеопластика",
		defaultExcluded: true,
		matchedCategories: ["implantology", "implants"],
	},
	{
		id: "whitening",
		key: "whitening",
		title: "Отбеливание и косметическая эстетика",
		description: "Клиническое отбеливание зубов (Zoom, Beyond), украшения на зубы (скайсы)",
		defaultExcluded: true,
		matchedCategories: ["whitening", "aesthetic"],
	},
	{
		id: "veneers",
		key: "veneers",
		title: "Виниры и эстетическая реставрация",
		description: "Керамические и композитные виниры по косметическим показаниям",
		defaultExcluded: true,
		matchedCategories: ["aesthetic", "veneers"],
	},
	{
		id: "periodontology_surgery",
		key: "periodontology_surgery",
		title: "Хирургическая пародонтология",
		description: "Лоскутные операции, направленная тканевая регенерация, кюретаж закрытый/открытый",
		defaultExcluded: false,
		matchedCategories: ["periodontology_surgery", "surgery_periodontal"],
	},
	{
		id: "prosthetics_precious",
		key: "prosthetics_precious",
		title: "Протезирование с драгметаллами",
		description: "Коронки и мостовидные протезы с использованием золота, платины, диоксида циркония",
		defaultExcluded: true,
		matchedCategories: ["prosthetics_precious", "prosthetics_luxury"],
	},
];
