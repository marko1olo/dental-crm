import type { TreatmentPlanStage } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";

export const mockSplitStages: TreatmentPlanStage[] = [
	{
		id: "stage-1",
		stageNumber: 1,
		title: "Терапевтическая санация",
		subtitle: "Лечение кариеса",
		clinicalGoal: "Устранение очагов инфекции и кариозных полостей",
		stageKind: "stage_1_therapy",
		items: [
			{
				id: "item-101",
				serviceCode: "A16.07.002.001",
				code804n: "A16.07.002.001",
				name: "Восстановление зуба светоотверждаемым композитом",
				category: "Терапия",
				toothNumber: 46,
				quantity: 1,
				unitPriceRub: 5200,
				priceRub: 5200,
				discountRub: 0,
				stageKind: "stage_1_therapy",
			},
		],
		totalRub: 5200,
		totalKopecks: 520000 as any,
		estimatedVisits: 1,
		estimatedWeeks: 1,
		order804nCodes: ["A16.07.002.001"],
		status: "draft",
	},
	{
		id: "stage-2",
		stageNumber: 2,
		title: "Хирургический этап",
		subtitle: "Имплантация",
		clinicalGoal: "Установка дентального имплантата",
		stageKind: "stage_2_surgery",
		items: [],
		totalRub: 0,
		totalKopecks: 0 as any,
		estimatedVisits: 1,
		estimatedWeeks: 2,
		order804nCodes: [],
		status: "draft",
	},
];

export const mockSplitCatalog: CatalogServiceLookupItem[] = [
	{
		id: "A16.07.002.001",
		code: "A16.07.002.001",
		order804nCode: "A16.07.002.001",
		title: "Восстановление зуба светоотверждаемым композитом",
		category: "Терапия",
		basePriceRub: 5200,
		active: true,
	},
	{
		id: "A16.07.004.001",
		code: "A16.07.004.001",
		order804nCode: "A16.07.004.001",
		title: "Эндодонтическое лечение одноканального зуба",
		category: "Эндодонтия",
		basePriceRub: 7500,
		active: true,
	},
	{
		id: "A16.07.054",
		code: "A16.07.054",
		order804nCode: "A16.07.054",
		title: "Внутрикостная дентальная имплантация",
		category: "Хирургия",
		basePriceRub: 35000,
		active: true,
	},
];
