import type { TreatmentPlanItem } from "../../types";
import { isToothExtractionItem, isToothPreservationOrProstheticItem } from "./toothProcedureClassifier";
import type { MutuallyExclusiveToothConflict } from "./types";

/**
 * detectMutuallyExclusiveToothProcedures — выявление взаимоисключающих манипуляций на одном зубе.
 * Мандаты 8e & 8y: Система предупреждает врача (пассивный алерт), но НИКОГДА не блокирует кнопки.
 */
export function detectMutuallyExclusiveToothProcedures(
	items: readonly TreatmentPlanItem[],
): MutuallyExclusiveToothConflict[] {
	const conflicts: MutuallyExclusiveToothConflict[] = [];
	const byTooth = new Map<number, TreatmentPlanItem[]>();

	for (const it of items) {
		if (typeof it.toothNumber === "number" && it.toothNumber > 0) {
			const list = byTooth.get(it.toothNumber) || [];
			list.push(it);
			byTooth.set(it.toothNumber, list);
		}
	}

	for (const [toothNum, toothItems] of byTooth.entries()) {
		const extractions = toothItems.filter(isToothExtractionItem);
		const restorations = toothItems.filter(isToothPreservationOrProstheticItem);

		if (extractions.length > 0 && restorations.length > 0) {
			for (const ext of extractions) {
				for (const rest of restorations) {
					const isCrown =
						(rest.code804n && rest.code804n.startsWith("A16.07.004")) ||
						/коронк|протез|вкладк/i.test(rest.name);
					conflicts.push({
						toothNumber: toothNum,
						conflictType: isCrown
							? "EXTRACTION_VS_PROSTHETICS"
							: "EXTRACTION_VS_PRESERVATION",
						procedureA: ext,
						procedureB: rest,
						descriptionRu: isCrown
							? `Невозможно одновременно назначить удаление зуба №${toothNum} («${ext.name}») и установку ортопедической коронки («${rest.name}») на тот же зуб.`
							: `Невозможно одновременно назначить удаление зуба №${toothNum} («${ext.name}») и терапевтическое сохранение/пломбирование («${rest.name}»).`,
					});
				}
			}
		}
	}

	return conflicts;
}


