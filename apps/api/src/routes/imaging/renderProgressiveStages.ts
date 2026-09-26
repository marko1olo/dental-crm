import {
	DicomGpuRenderPlan
} from "@dental/shared";
import type { DicomProgressiveLoadStage } from "@dental/shared";

export function clampNumber(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function progressiveStage(input: {
	id: string;
	kind: DicomProgressiveLoadStage["kind"];
	label: string;
	priority: DicomProgressiveLoadStage["priority"];
	target: DicomProgressiveLoadStage["target"];
	requestPattern: DicomProgressiveLoadStage["requestPattern"];
	cornerstoneRequestType?: DicomProgressiveLoadStage["cornerstoneRequestType"];
	cancelGroupId?: string | null;
	requiresStageIds?: string[];
	sliceStart: number | null;
	sliceEnd: number | null;
	sliceOrder?: number[];
	decimationFactor: number;
	offset: number;
	maxResidentSlices: number;
	budgetMs: number;
	blocking: boolean;
	nextAction: string;
}): DicomProgressiveLoadStage {
	return {
		...input,
		cornerstoneRequestType: input.cornerstoneRequestType ?? "none",
		cancelGroupId: input.cancelGroupId ?? null,
		requiresStageIds: input.requiresStageIds ?? [],
		sliceOrder: input.sliceOrder ?? [],
	};
}

export function boundedSliceOrder(values: number[], fileCount: number, maxItems = 96) {
	const seen = new Set<number>();
	const result: number[] = [];
	for (const value of values) {
		const slice = clampNumber(Math.round(value), 0, Math.max(0, fileCount - 1));
		if (seen.has(slice)) continue;
		seen.add(slice);
		result.push(slice);
		if (result.length >= maxItems) break;
	}
	return result;
}

export function interleavedSliceOrder(
	fileCount: number,
	decimationFactor: number,
	offset: number,
	maxItems = 128,
) {
	const values: number[] = [];
	for (let index = offset; index < fileCount; index += decimationFactor)
		values.push(index);
	return boundedSliceOrder(values, fileCount, maxItems);
}

export function windowSliceOrder(
	start: number,
	end: number,
	activeSliceIndex: number,
	fileCount: number,
	maxItems = 128,
) {
	const values = [activeSliceIndex];
	for (
		let distance = 1;
		values.length < Math.max(1, end - start + 1);
		distance += 1
	) {
		const left = activeSliceIndex - distance;
		const right = activeSliceIndex + distance;
		if (left >= start) values.push(left);
		if (right <= end) values.push(right);
		if (left < start && right > end) break;
	}
	return boundedSliceOrder(values, fileCount, maxItems);
}

export function chooseDicomAdjacentWindow(input: {
	fileCount: number;
	activeSliceIndex: number;
	firstWindowStart: number;
	firstWindowEnd: number;
	firstBatch: number;
}): { start: number; end: number } | null {
	const {
		fileCount,
		activeSliceIndex,
		firstWindowStart,
		firstWindowEnd,
		firstBatch,
	} = input;
	const maxIndex = Math.max(0, fileCount - 1);
	const candidates: Array<{
		side: "before" | "after";
		start: number;
		end: number;
		length: number;
		edgeDistance: number;
	}> = [];
	const beforeEnd = firstWindowStart - 1;
	if (beforeEnd >= 0) {
		const start = Math.max(0, beforeEnd - firstBatch + 1);
		candidates.push({
			side: "before",
			start,
			end: beforeEnd,
			length: beforeEnd - start + 1,
			edgeDistance: Math.abs(activeSliceIndex - beforeEnd),
		});
	}
	const afterStart = firstWindowEnd + 1;
	if (afterStart <= maxIndex) {
		const end = Math.min(maxIndex, afterStart + firstBatch - 1);
		candidates.push({
			side: "after",
			start: afterStart,
			end,
			length: end - afterStart + 1,
			edgeDistance: Math.abs(afterStart - activeSliceIndex),
		});
	}
	if (!candidates.length) return null;

	const leftEdgeDistance = activeSliceIndex - firstWindowStart;
	const rightEdgeDistance = firstWindowEnd - activeSliceIndex;
	const preferredSide =
		rightEdgeDistance < leftEdgeDistance
			? "after"
			: leftEdgeDistance < rightEdgeDistance
				? "before"
				: "after";
	candidates.sort((left, right) => {
		if (left.edgeDistance !== right.edgeDistance)
			return left.edgeDistance - right.edgeDistance;
		if (left.side === preferredSide && right.side !== preferredSide) return -1;
		if (right.side === preferredSide && left.side !== preferredSide) return 1;
		if (left.length !== right.length) return right.length - left.length;
		return left.side === "after" ? -1 : 1;
	});

	const selected = candidates[0];
	return selected ? { start: selected.start, end: selected.end } : null;
}

export function buildDicomProgressiveLoadStages(input: {
	fileCount: number;
	activeSliceIndex: number;
	firstWindowStart: number;
	firstWindowEnd: number;
	firstBatch: number;
	maxResidentSlices: number;
	workerCount: number;
	canUseWorker: boolean;
	renderPlan: DicomGpuRenderPlan;
}): DicomProgressiveLoadStage[] {
	const {
		fileCount,
		activeSliceIndex,
		firstWindowStart,
		firstWindowEnd,
		firstBatch,
		maxResidentSlices,
		workerCount,
		canUseWorker,
		renderPlan,
	} = input;
	if (renderPlan.textureStrategy === "external_viewer") {
		return [
			progressiveStage({
				id: "external-handoff",
				kind: "external_handoff",
				label: "передача во внешний просмотр",
				priority: "blocking",
				target: "external_viewer",
				requestPattern: "none",
				cornerstoneRequestType: "external",
				cancelGroupId: "external-handoff",
				sliceStart: null,
				sliceEnd: null,
				decimationFactor: 1,
				offset: 0,
				maxResidentSlices: 1,
				budgetMs: 100,
				blocking: true,
				nextAction:
					"Не планировать браузерную загрузку пикселей; передать серию, состояние и разметки во внешний или настольный просмотр.",
			}),
		];
	}
	if (renderPlan.textureStrategy === "metadata_only") {
		return [
			progressiveStage({
				id: "metadata-only",
				kind: "metadata_only",
				label: "только метаданные",
				priority: "blocking",
				target: "main_thread",
				requestPattern: "none",
				cornerstoneRequestType: "none",
				cancelGroupId: "metadata-only",
				sliceStart: null,
				sliceEnd: null,
				decimationFactor: 1,
				offset: 0,
				maxResidentSlices: 1,
				budgetMs: 80,
				blocking: true,
				nextAction:
					"Не запускать декодирование, пока пиксели недоступны; хранить состояние, заметки и индекс серии.",
			}),
		];
	}

	const baseDecimation =
		renderPlan.qualityMode === "diagnostic_full"
			? fileCount > 180
				? 4
				: 2
			: renderPlan.qualityMode === "balanced_mpr"
				? fileCount > 120
					? 4
					: 2
				: Math.max(4, renderPlan.downsampleFactor * 2);
	const interleavedDecimation = clampNumber(baseDecimation, 2, 8);
	const interleavedOffset = activeSliceIndex % interleavedDecimation;
	const activeWindowResident = Math.max(
		1,
		Math.min(maxResidentSlices, firstWindowEnd - firstWindowStart + 1),
	);
	const seedOrder = boundedSliceOrder(
		[activeSliceIndex, 0, fileCount - 1, Math.floor((fileCount - 1) / 2)],
		fileCount,
		4,
	);
	const interleavedOrder = interleavedSliceOrder(
		fileCount,
		interleavedDecimation,
		interleavedOffset,
		128,
	);
	const activeOrder = windowSliceOrder(
		firstWindowStart,
		firstWindowEnd,
		activeSliceIndex,
		fileCount,
		128,
	);
	const stages: DicomProgressiveLoadStage[] = [
		progressiveStage({
			id: "seed-orientation-slices",
			kind: "seed_slices",
			label: "опорные срезы",
			priority: "blocking",
			target: canUseWorker ? "web_worker" : "main_thread",
			requestPattern: "center_first",
			cornerstoneRequestType: "thumbnail",
			cancelGroupId: "ct-seed-slices",
			sliceStart: activeSliceIndex,
			sliceEnd: activeSliceIndex,
			sliceOrder: seedOrder,
			decimationFactor: 1,
			offset: activeSliceIndex,
			maxResidentSlices: Math.min(3, fileCount),
			budgetMs: Math.min(180, Math.max(80, renderPlan.interactionBudgetMs * 8)),
			blocking: true,
			nextAction:
				"Сначала показать активный, первый и последний ориентир, чтобы врач видел положение серии до тяжелой загрузки.",
		}),
		progressiveStage({
			id: "interleaved-low-resolution-volume",
			kind: "interleaved_decimation",
			label: "редкая сетка объема",
			priority: "interactive",
			target: canUseWorker ? "web_worker" : "main_thread",
			requestPattern: "interleaved",
			cornerstoneRequestType: "interaction",
			cancelGroupId: "ct-interleaved-volume",
			requiresStageIds: ["seed-orientation-slices"],
			sliceStart: 0,
			sliceEnd: fileCount - 1,
			sliceOrder: interleavedOrder,
			decimationFactor: interleavedDecimation,
			offset: interleavedOffset,
			maxResidentSlices: Math.min(
				maxResidentSlices,
				Math.max(1, Math.ceil(fileCount / interleavedDecimation)),
			),
			budgetMs:
				renderPlan.qualityMode === "diagnostic_full"
					? 650
					: renderPlan.qualityMode === "balanced_mpr"
						? 520
						: 360,
			blocking: false,
			nextAction:
				"Собирать грубый объем через каждый N-й срез; недостающие срезы уточнять только после интерактивного окна.",
		}),
		progressiveStage({
			id: "active-scroll-window",
			kind: "active_window",
			label: "активное окно прокрутки",
			priority: "interactive",
			target:
				renderPlan.textureStrategy === "single_3d_texture"
					? "gpu"
					: canUseWorker
						? "web_worker"
						: "main_thread",
			requestPattern: "active_window",
			cornerstoneRequestType: "interaction",
			cancelGroupId: "ct-active-window",
			requiresStageIds: ["seed-orientation-slices"],
			sliceStart: firstWindowStart,
			sliceEnd: firstWindowEnd,
			sliceOrder: activeOrder,
			decimationFactor: Math.max(1, renderPlan.downsampleFactor),
			offset: 0,
			maxResidentSlices: activeWindowResident,
			budgetMs: Math.max(
				220,
				Math.ceil((firstBatch * 14) / Math.max(1, workerCount)),
			),
			blocking: false,
			nextAction:
				"Держать в памяти только видимый диапазон и соседний запас; качество повышать после остановки прокрутки.",
		}),
	];

	const adjacentWindow = chooseDicomAdjacentWindow({
		fileCount,
		activeSliceIndex,
		firstWindowStart,
		firstWindowEnd,
		firstBatch,
	});
	if (adjacentWindow) {
		const adjacentStart = adjacentWindow.start;
		const adjacentEnd = adjacentWindow.end;
		const adjacentAnchor = Math.floor((adjacentStart + adjacentEnd) / 2);
		const adjacentOrder = windowSliceOrder(
			adjacentStart,
			adjacentEnd,
			adjacentAnchor,
			fileCount,
			128,
		);
		stages.push(
			progressiveStage({
				id: "adjacent-scroll-window",
				kind: "adjacent_window",
				label: "соседнее окно",
				priority: "prefetch",
				target: canUseWorker ? "web_worker" : "main_thread",
				requestPattern: "adjacent_window",
				cornerstoneRequestType: "prefetch",
				cancelGroupId: "ct-adjacent-window",
				requiresStageIds: ["active-scroll-window"],
				sliceStart: adjacentStart,
				sliceEnd: adjacentEnd,
				sliceOrder: adjacentOrder,
				decimationFactor: Math.max(1, renderPlan.downsampleFactor),
				offset: 0,
				maxResidentSlices: Math.max(
					1,
					Math.min(maxResidentSlices, adjacentEnd - adjacentStart + 1),
				),
				budgetMs: Math.max(
					260,
					Math.ceil((firstBatch * 16) / Math.max(1, workerCount)),
				),
				blocking: false,
				nextAction:
					"Подгружать соседний диапазон только после готовности активного окна; не вытеснять текущие срезы.",
			}),
		);
	}

	stages.push(
		progressiveStage({
			id: "idle-full-resolution-refine",
			kind: "idle_refine",
			label: "уточнение в паузе",
			priority:
				renderPlan.qualityMode === "interactive_low"
					? "deferred"
					: "background",
			target: renderPlan.useOffscreenCanvas
				? "offscreen_canvas"
				: canUseWorker
					? "web_worker"
					: "main_thread",
			requestPattern: "idle_full",
			cornerstoneRequestType: "compute",
			cancelGroupId: "ct-idle-refine",
			requiresStageIds: ["active-scroll-window"],
			sliceStart: firstWindowStart,
			sliceEnd: firstWindowEnd,
			sliceOrder: activeOrder,
			decimationFactor:
				renderPlan.qualityMode === "interactive_low"
					? Math.max(2, renderPlan.downsampleFactor)
					: 1,
			offset: 0,
			maxResidentSlices: activeWindowResident,
			budgetMs:
				renderPlan.qualityMode === "diagnostic_full"
					? 900
					: renderPlan.qualityMode === "balanced_mpr"
						? 700
						: 500,
			blocking: false,
			nextAction:
				"После паузы уточнять только текущее окно; полный объем не должен блокировать карточку приема.",
		}),
	);

	return stages;
}
