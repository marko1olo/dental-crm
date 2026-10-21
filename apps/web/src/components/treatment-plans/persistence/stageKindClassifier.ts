import type { TreatmentPlanStageKind } from "../types.js";

export function classifyPlanItemCategoryAndStageKind(
	name: string,
	code804n: string,
	phaseNumber: number,
): { category: string; stageKind: TreatmentPlanStageKind } {
	const lowerName = name.toLowerCase();

	if (
		lowerName.includes("ортодонт") ||
		lowerName.includes("брекет") ||
		lowerName.includes("элайнер") ||
		code804n.startsWith("A16.07.04")
	) {
		return { category: "Ортодонтия", stageKind: "stage_4_orthodontics" };
	}

	if (
		lowerName.includes("пародонт") ||
		lowerName.includes("вектор") ||
		lowerName.includes("кюретаж") ||
		lowerName.includes("десн") ||
		code804n.startsWith("A16.07.039")
	) {
		return { category: "Пародонтология", stageKind: "stage_5_periodontics" };
	}

	if (
		lowerName.includes("коронк") ||
		lowerName.includes("протез") ||
		lowerName.includes("мост") ||
		lowerName.includes("вкладк") ||
		lowerName.includes("абатмент") ||
		code804n.startsWith("A16.07.004")
	) {
		return { category: "Ортопедия", stageKind: "stage_3_orthopedics" };
	}

	if (
		lowerName.includes("удал") ||
		lowerName.includes("имплант") ||
		lowerName.includes("синус") ||
		lowerName.includes("костн") ||
		code804n.startsWith("A16.07.001") ||
		code804n.startsWith("A16.07.006") ||
		code804n.startsWith("A16.07.054")
	) {
		return { category: "Хирургия", stageKind: "stage_2_surgery" };
	}

	if (phaseNumber === 2) return { category: "Хирургия", stageKind: "stage_2_surgery" };
	if (phaseNumber === 3) return { category: "Ортопедия", stageKind: "stage_3_orthopedics" };
	if (phaseNumber === 4) return { category: "Ортодонтия", stageKind: "stage_4_orthodontics" };
	if (phaseNumber === 5) return { category: "Пародонтология", stageKind: "stage_5_periodontics" };

	return { category: "Терапия", stageKind: "stage_1_therapy" };
}
