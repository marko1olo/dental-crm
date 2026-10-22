import type { CatalogServiceLookupItem } from "../../treatmentPlanStagesEngine";

export const samplePgCatalog: CatalogServiceLookupItem[] = [
	{ id: "A16.07.002.001", title: "Лечение кариеса нанокомпозитом", category: "Терапия", basePriceRub: 5000 },
	{ id: "A16.07.054.001", title: "Дентальная имплантация", category: "Хирургия", basePriceRub: 38000 },
	{ id: "A16.07.004.001", title: "Коронка из диоксида циркония", category: "Ортопедия", basePriceRub: 28000 },
	{ id: "A16.07.047", title: "Ортодонтическое перемещение", category: "Ортодонтия", basePriceRub: 65000 },
	{ id: "A16.07.051", title: "Пародонтологическое лечение", category: "Пародонтология", basePriceRub: 12000 },
];
