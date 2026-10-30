/**
 * demoLabOrdersData.ts — Демонстрационные наряды ЗТЛ (режим Showcase / Demo).
 * Мандат 8wy: строго изолировано для демонстраций без засорения боевого каталога.
 */

import { addWorkingDaysRu, type LabStageId } from "./labCatalogData";

export interface DemoLabOrderData {
	readonly id: string;
	readonly orderNumber: string;
	readonly patientName: string;
	readonly patientId?: string;
	readonly doctorName: string;
	readonly toothFdi: string;
	readonly constructionTitle: string;
	readonly material: string;
	readonly shadeVita: string;
	readonly shadeStump?: string;
	readonly labName: string;
	readonly stageId: LabStageId;
	readonly createdAt: string;
	readonly trialDate: string;
	readonly dueDate: string;
	readonly labCostKopecks: number;
	readonly patientPriceKopecks: number;
}

export const DEMO_LAB_ORDERS: readonly DemoLabOrderData[] = [
	{
		id: "ord_101",
		orderNumber: "ЗТЛ-2026-0042",
		patientName: "Ковалев Дмитрий Сергеевич",
		patientId: "pat_1",
		doctorName: "Д-р Смирнова Е. В. (Ортопед)",
		toothFdi: "16",
		constructionTitle: "Коронка из диоксида циркония (Katana ML)",
		material: "Многослойный диоксид циркония Katana HTML",
		shadeVita: "A2",
		shadeStump: "ND2",
		labName: "Арт-Дент Лаб (CAD/CAM фрезерный центр)",
		stageId: "in_progress",
		createdAt: new Date().toISOString().split("T")[0]!,
		trialDate: addWorkingDaysRu(new Date(), 3).toISOString().split("T")[0]!,
		dueDate: addWorkingDaysRu(new Date(), 5).toISOString().split("T")[0]!,
		labCostKopecks: 750000,
		patientPriceKopecks: 2400000,
	},
	{
		id: "ord_102",
		orderNumber: "ЗТЛ-2026-0041",
		patientName: "Васильева Анна Михайловна",
		patientId: "pat_2",
		doctorName: "Д-р Ортопедов В. С.",
		toothFdi: "21, 22",
		constructionTitle: "Керамический винир E.max / рефрактор",
		material: "Полевошпатная керамика e.max Press",
		shadeVita: "BL2",
		shadeStump: "ND1",
		labName: "Премиум-Смайл Лаб (Эстетическая керамика)",
		stageId: "fitting",
		createdAt: addWorkingDaysRu(new Date(), -4).toISOString().split("T")[0]!,
		trialDate: new Date().toISOString().split("T")[0]!,
		dueDate: addWorkingDaysRu(new Date(), 3).toISOString().split("T")[0]!,
		labCostKopecks: 1900000,
		patientPriceKopecks: 5600000,
	},
];
