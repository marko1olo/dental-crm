import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import type { TreatmentPlanStage } from "../../types";

export const MOCK_STAGES: TreatmentPlanStage[] = [
	{
		id: "stage-1",
		stageNumber: 1,
		title: "Терапевтическая санация",
		subtitle: "Лечение кариеса",
		clinicalGoal: "Санация",
		stageKind: "stage_1_therapy",
		items: [],
		totalRub: 0,
		totalKopecks: 0,
		estimatedVisits: 1,
		estimatedWeeks: 1,
		order804nCodes: [],
		status: "draft",
	},
	{
		id: "stage-2",
		stageNumber: 2,
		title: "Хирургический этап",
		subtitle: "Удаление",
		clinicalGoal: "Удаление ретинированных зубов",
		stageKind: "stage_2_surgery",
		items: [],
		totalRub: 0,
		totalKopecks: 0,
		estimatedVisits: 1,
		estimatedWeeks: 1,
		order804nCodes: [],
		status: "draft",
	},
];

export const MOCK_CATALOG: CatalogServiceLookupItem[] = [
	{
		id: "A16.07.002.001",
		code: "A16.07.002.001",
		order804nCode: "A16.07.002.001",
		title: "Восстановление зуба пломбой с нарушением формы зуба (глубокий кариес)",
		category: "Терапия",
		basePriceRub: 5200,
		active: true,
	},
	{
		id: "A16.07.001.001",
		code: "A16.07.001.001",
		order804nCode: "A16.07.001.001",
		title: "Удаление постоянного зуба простое с местной анестезией",
		category: "Хирургия",
		basePriceRub: 3500,
		active: true,
	},
];
