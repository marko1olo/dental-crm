/**
 * apps/web/src/components/treatment-plans/phased4StageView/resolvePhasedCategory.ts
 *
 * Семантическое сопоставление номенклатуры услуги с 4 клиническими фазами лечения.
 */

import {
	map3StageKindTo4StageCategory,
	type TreatmentPlanStageCategory,
} from "@dental/shared";
import type { TreatmentPlanStageKind } from "../types";

export function resolvePhasedItemCategory(
	item: { name: string; category?: string; code804n?: string },
	stageKind: TreatmentPlanStageKind,
): TreatmentPlanStageCategory {
	const lowerName = item.name.toLowerCase();

	if (
		lowerName.includes("острой боли") ||
		lowerName.includes("неотложн") ||
		lowerName.includes("купирован") ||
		lowerName.includes("ампутация пульпы") ||
		lowerName.includes("экстирпация пульпы") ||
		lowerName.includes("пульпотом") ||
		lowerName.includes("вскрытие") ||
		lowerName.includes("дренирован") ||
		lowerName.includes("разрез") ||
		lowerName.includes("периостотом") ||
		lowerName.includes("альвеолит") ||
		lowerName.includes("перикоронит") ||
		lowerName.includes("абсцесс") ||
		lowerName.includes("гемостаз") ||
		lowerName.includes("шинирован") ||
		lowerName.includes("удаление зуба") ||
		item.code804n === "A16.07.016"
	) {
		return "hygiene_sanitation";
	}

	if (
		item.category === "hygiene" ||
		lowerName.includes("гигиен") ||
		lowerName.includes("air-flow") ||
		lowerName.includes("ультразвук") ||
		lowerName.includes("кюретаж") ||
		lowerName.includes("фторирован")
	) {
		return "hygiene_sanitation";
	}

	if (
		item.category === "therapy" ||
		lowerName.includes("кариес") ||
		lowerName.includes("пульпит") ||
		lowerName.includes("периодонтит") ||
		lowerName.includes("эндодонт") ||
		lowerName.includes("канал") ||
		lowerName.includes("реставрац") ||
		lowerName.includes("пломб")
	) {
		return "endo_therapy";
	}

	if (
		item.category === "surgery" ||
		lowerName.includes("имплант") ||
		lowerName.includes("удален") ||
		lowerName.includes("синус") ||
		lowerName.includes("костн") ||
		lowerName.includes("формировател") ||
		lowerName.includes("пластик")
	) {
		return "surgery_implant";
	}

	if (
		item.category === "ortho" ||
		lowerName.includes("коронк") ||
		lowerName.includes("винир") ||
		lowerName.includes("протез") ||
		lowerName.includes("абатмент") ||
		lowerName.includes("вкладк") ||
		lowerName.includes("брекет") ||
		lowerName.includes("элайнер") ||
		lowerName.includes("сплинт") ||
		lowerName.includes("шин")
	) {
		return "ortho_prosthetics";
	}

	return map3StageKindTo4StageCategory(stageKind, item.name);
}
