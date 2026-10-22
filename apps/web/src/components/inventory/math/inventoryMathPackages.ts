import type { ClinicalTechMapPackage } from "./inventoryMathTypes.js";

export const CLINICAL_PROCEDURE_PACKAGES: readonly ClinicalTechMapPackage[] = [
	{
		id: "pkg-therapy",
		title: "Пакет Терапия",
		description: "СИЗ + Крафт + Анестезия + Кариес",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.004", "A16.07.002.001"],
	},
	{
		id: "pkg-endo",
		title: "Пакет Эндодонтия",
		description: "СИЗ + Крафт + Анестезия + Эндо 1 кан.",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.004", "A16.07.030.001"],
	},
	{
		id: "pkg-hygiene",
		title: "Пакет Гигиена",
		description: "СИЗ + Крафт + Профгигиена",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.051"],
	},
	{
		id: "pkg-surgery",
		title: "Пакет Хирургия",
		description: "СИЗ + Крафт + Анестезия + Удаление",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.004", "A16.07.001.001"],
	},
	{
		id: "pkg-implant",
		title: "Пакет Имплантация",
		description: "СИЗ + Крафт + Анестезия + Имплантация",
		codes: ["SANPIN_PPE", "SANPIN_KRAFT", "A16.07.004", "A16.07.054"],
	},
];
