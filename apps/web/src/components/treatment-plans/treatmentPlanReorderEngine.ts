/**
 * treatmentPlanReorderEngine.ts — движок упорядочивания этапов и процедур плана лечения DENTE CRM.
 *
 * Предоставляет чистые функции для:
 * - Перемещения этапов (drag-and-drop / reorder) с автоматической перенумерацией
 * - Переноса процедур между этапами с пересчетом фаз и сумм в копейках
 * - Изменения порядка процедур внутри этапа
 * - Валидации клинической последовательности (санация -> хирургия -> ортопедия)
 */

import { type Kopecks } from "@dental/shared";
import type { TreatmentPlanItem, TreatmentPlanStage } from "./types";

/**
 * Пересчет сумм этапа в копейках и рублях на основе его процедур.
 */
export function recalculateStageTotals(stage: TreatmentPlanStage): TreatmentPlanStage {
	const totalKopecks = stage.items.reduce(
		(acc, item) => acc + Math.round((item.priceRub || 0) * 100),
		0,
	) as Kopecks;
	const totalRub = Math.round(totalKopecks / 100);

	const codes = Array.from(
		new Set(
			stage.items
				.map((it) => it.code804n)
				.filter((code): code is string => typeof code === "string" && code.length > 0),
		),
	);

	return {
		...stage,
		totalRub,
		totalKopecks,
		order804nCodes: codes,
	};
}

/**
 * Перенумерация этапов (1..N) с обновлением названий и фаз процедур.
 */
export function reindexStages(stages: readonly TreatmentPlanStage[]): TreatmentPlanStage[] {
	return stages.map((st, idx) => {
		const newNumber = idx + 1;
		const updatedItems = st.items.map((item) => ({
			...item,
			phase: newNumber,
		}));

		return recalculateStageTotals({
			...st,
			stageNumber: newNumber,
			items: updatedItems,
		});
	});
}

/**
 * Изменение порядка этапов плана лечения.
 */
export function reorderTreatmentPlanStages(
	stages: readonly TreatmentPlanStage[],
	sourceIndex: number,
	targetIndex: number,
): TreatmentPlanStage[] {
	if (
		sourceIndex < 0 ||
		sourceIndex >= stages.length ||
		targetIndex < 0 ||
		targetIndex >= stages.length ||
		sourceIndex === targetIndex
	) {
		return [...stages];
	}

	const next = [...stages];
	const [moved] = next.splice(sourceIndex, 1);
	if (!moved) return [...stages];
	next.splice(targetIndex, 0, moved);

	return reindexStages(next);
}

/**
 * Перемещение процедуры внутри одного этапа.
 */
export function reorderStageItems(
	stage: TreatmentPlanStage,
	fromIndex: number,
	toIndex: number,
): TreatmentPlanStage {
	if (
		fromIndex < 0 ||
		fromIndex >= stage.items.length ||
		toIndex < 0 ||
		toIndex >= stage.items.length ||
		fromIndex === toIndex
	) {
		return stage;
	}

	const items = [...stage.items];
	const [moved] = items.splice(fromIndex, 1);
	if (!moved) return stage;
	items.splice(toIndex, 0, moved);

	return {
		...stage,
		items,
	};
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
	let sourceStageKind = "";

	// Поиск элемента
	for (const st of stages) {
		const item = st.items.find((it) => it.id === itemId);
		if (item) {
			foundItem = item;
			sourceStageKind = st.stageKind;
			break;
		}
	}

	if (!foundItem) return [...stages];

	return stages.map((st) => {
		const hasTarget = st.stageNumber === targetStageNumber;
		const hasSource = st.items.some((it) => it.id === itemId);

		if (!hasTarget && !hasSource) {
			return st;
		}

		if (hasSource && !hasTarget) {
			// Удаляем из исходного
			const filtered = st.items.filter((it) => it.id !== itemId);
			return recalculateStageTotals({
				...st,
				items: filtered,
			});
		}

		if (hasTarget && !hasSource) {
			// Добавляем в целевой
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

			return recalculateStageTotals({
				...st,
				items: nextItems,
			});
		}

		// Если перемещение внутри одного и того же этапа
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
		const nextItems = st.items.filter((it) => it.id !== itemId);
		return recalculateStageTotals({
			...st,
			items: nextItems,
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

		return recalculateStageTotals({
			...st,
			items: nextItems,
		});
	});
}

/**
 * Клиническая валидация последовательности этапов плана:
 * - Этап санации/терапии должен предшествовать хирургическому этапу
 * - Этап хирургии должен предшествовать ортопедическому этапу
 * - Проверка на пустые промежуточные этапы
 */
export function validateStageOrderDependencies(
	stages: readonly TreatmentPlanStage[],
): { isValid: boolean; warnings: readonly string[] } {
	const warnings: string[] = [];

	let lastTherapyIdx = -1;
	let firstSurgeryIdx = -1;
	let lastSurgeryIdx = -1;
	let firstOrthoIdx = -1;

	stages.forEach((st, idx) => {
		if (st.stageKind === "stage_1_therapy" || st.stageKind.includes("therapy")) {
			lastTherapyIdx = Math.max(lastTherapyIdx, idx);
		}
		if (st.stageKind === "stage_2_surgery" || st.stageKind.includes("surgery")) {
			if (firstSurgeryIdx === -1) firstSurgeryIdx = idx;
			lastSurgeryIdx = Math.max(lastSurgeryIdx, idx);
		}
		if (st.stageKind === "stage_3_orthopedics" || st.stageKind.includes("orthopedics")) {
			if (firstOrthoIdx === -1) firstOrthoIdx = idx;
		}

		if (st.items.length === 0 && idx < stages.length - 1) {
			warnings.push(`Этап ${st.stageNumber} («${st.title}») не содержит процедур.`);
		}
	});

	if (firstSurgeryIdx !== -1 && lastTherapyIdx > firstSurgeryIdx) {
		warnings.push(
			"Терапевтическая санация расположена после хирургического этапа. Рекомендуется сначала устранить инфекционные очаги.",
		);
	}

	if (firstOrthoIdx !== -1 && lastSurgeryIdx > firstOrthoIdx) {
		warnings.push(
			"Хирургический этап расположен после ортопедической реабилитации. Ортопедическое протезирование должно завершать план.",
		);
	}

	return {
		isValid: warnings.length === 0,
		warnings,
	};
}
