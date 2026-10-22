import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";

export const MOCK_CLINIC_CATALOG: readonly CatalogServiceLookupItem[] = [
	{
		id: "cat-diag-ct",
		title: "Компьютерная томография КЛКТ 3D A06.07.004",
		category: "Диагностика",
		basePriceRub: 3500,
		order804nCode: "A06.07.004",
		active: true,
	},
	{
		id: "cat-hyg",
		title: "Профессиональная гигиена полости рта Air-Flow A16.07.050",
		category: "Гигиена",
		basePriceRub: 5000,
		order804nCode: "A16.07.050",
		active: true,
	},
	{
		id: "cat-caries",
		title: "Лечение кариеса нанокомпозитом Estelite A16.07.002.001",
		category: "Терапия",
		basePriceRub: 4800,
		order804nCode: "A16.07.002.001",
		active: true,
	},
	{
		id: "cat-implant",
		title: "Дентальная имплантация Osstem TS-III A16.07.054.001",
		category: "Хирургия",
		basePriceRub: 42000,
		order804nCode: "A16.07.054.001",
		active: true,
	},
	{
		id: "cat-crown",
		title: "Коронка из диоксида циркония Prettau A16.07.004.001",
		category: "Ортопедия",
		basePriceRub: 26000,
		order804nCode: "A16.07.004.001",
		active: true,
	},
];
