import type { TreatmentPlanItem, TreatmentPlanStage } from "../types.js";
import { recalculateStageTotals } from "./stageTotalsAndReindex.js";

/**
 * Перемещение процедуры внутри одного этапа.
 */
export function reorderStageItems(stage: TreatmentPlanStage, fromIndex: number, toIndex: number): TreatmentPlanStage {
	const len = stage.items.length;
	if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len || fromIndex === toIndex) {
		return stage;
	}

	const items = [...stage.items];
	const [moved] = items.splice(fromIndex, 1);
	if (!moved) return stage;
	items.splice(toIndex, 0, moved);

	return { ...stage, items };
}

/**
 * Перенос процедуры между этапами плана лечения.
 */
export function moveStageItem(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
	targetStageNumber: number,
	targetIndex?: number,
): TreatmentPlanStage[] {
	let foundItem: TreatmentPlanItem | null = null;
	for (const st of stages) {
		const item = st.items.find((it) => it.id === itemId);
		if (item) {
			foundItem = item;
			break;
		}
	}
	if (!foundItem) return [...stages];

	return stages.map((st) => {
		const hasTarget = st.stageNumber === targetStageNumber;
		const hasSource = st.items.some((it) => it.id === itemId);

		if (!hasTarget && !hasSource) return st;

		if (hasSource && !hasTarget) {
			return recalculateStageTotals({
				...st,
				items: st.items.filter((it) => it.id !== itemId),
			});
		}

		if (hasTarget && !hasSource) {
			const adaptedItem: TreatmentPlanItem = {
				...foundItem!,
				phase: st.stageNumber,
				stageKind: st.stageKind,
			};
			const nextItems = [...st.items];
			if (typeof targetIndex === "number" && targetIndex >= 0 && targetIndex <= nextItems.length) {
				nextItems.splice(targetIndex, 0, adaptedItem);
			} else {
				nextItems.push(adaptedItem);
			}
			return recalculateStageTotals({ ...st, items: nextItems });
		}

		if (hasSource && hasTarget && typeof targetIndex === "number") {
			const curIndex = st.items.findIndex((it) => it.id === itemId);
			return reorderStageItems(st, curIndex, targetIndex);
		}

		return st;
	});
}

/**
 * Удаление процедуры из всех этапов плана.
 */
export function removeStageItemFromPlan(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		if (!st.items.some((it) => it.id === itemId)) return st;
		return recalculateStageTotals({
			...st,
			items: st.items.filter((it) => it.id !== itemId),
		});
	});
}

/**
 * Дублирование процедуры внутри ее этапа.
 */
export function duplicateStageItem(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		const idx = st.items.findIndex((it) => it.id === itemId);
		if (idx === -1) return st;

		const original = st.items[idx]!;
		const copy: TreatmentPlanItem = {
			...original,
			id: `${original.id}-copy-${Date.now()}`,
			name: `${original.name} (копия)`,
		};

		const nextItems = [...st.items];
		nextItems.splice(idx + 1, 0, copy);

		return recalculateStageTotals({ ...st, items: nextItems });
	});
}
