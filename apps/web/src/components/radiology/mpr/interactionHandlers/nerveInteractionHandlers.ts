import type React from "react";
import { showToast } from "../../../GlobalToast";
import type {
	CbctVoxelVolume,
	MprPlane,
	ObliqueRotationAngles,
	Point2D,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import { mapCanvasPointerToWorldMmWithTransform } from "../../cbctMprMath";
import { traceMandibularNerveAsync } from "../../cbctNerveWorkerBridge";
import { hitTestNerveControlPoint } from "../cbctNerveHitTest";
import { NERVE_NODE_HIT_RADIUS } from "./constants";

/**
 * Layer 2: Inferior Alveolar Nerve (IAN) Canal Tracing & Node Editing Handlers.
 */

export interface NerveInteractionContext {
	volume: CbctVoxelVolume;
	plane: MprPlane;
	canvas: HTMLCanvasElement;
	pointerPx: Point2D;
	currentTransform: ViewportTransform;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	nervePoints: Point3D[];
	setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>;
	setSelectedNerveNodeIdx: React.Dispatch<React.SetStateAction<number | null>>;
	setIsDraggingNerveNode: React.Dispatch<React.SetStateAction<number | null>>;
}

/**
 * Handles mouse down event when activeTool === "nerve".
 */
export function handleNerveMouseDown(ctx: NerveInteractionContext): void {
	const {
		plane,
		canvas,
		pointerPx,
		currentTransform,
		crosshairMm,
		volume,
		obliqueAngles,
		nervePoints,
		setNervePoints,
		setSelectedNerveNodeIdx,
		setIsDraggingNerveNode,
	} = ctx;

	const nerveHit = hitTestNerveControlPoint(
		pointerPx,
		nervePoints,
		plane,
		crosshairMm,
		volume,
		currentTransform,
		NERVE_NODE_HIT_RADIUS,
	);
	if (nerveHit) {
		setSelectedNerveNodeIdx(nerveHit.index);
		setIsDraggingNerveNode(nerveHit.index);
		showToast(
			`Выбран 3D-узел нерва #${nerveHit.index + 1}. Перетащите для микроподгонки`,
			"info",
		);
		return;
	}

	const pointMm = mapCanvasPointerToWorldMmWithTransform(
		pointerPx,
		{ width: canvas.width, height: canvas.height },
		plane,
		crosshairMm,
		obliqueAngles,
		currentTransform,
		volume,
	);

	if (nervePoints.length === 0) {
		setNervePoints([pointMm]);
		showToast(
			"Точка 1/2: Ментальное отверстие зафиксировано. Кликните Foramen mandibulae (на ветви челюсти) для автотрассировки Fast Marching",
			"info",
		);
		return;
	}

	if (nervePoints.length === 1 && volume) {
		const startSeed = nervePoints[0]!;
		const endSeed = pointMm;
		setNervePoints([startSeed, endSeed]);
		showToast(
			"Трассировка канала IAN (Fast Marching Web Worker 60 FPS)...",
			"info",
		);
		traceMandibularNerveAsync(volume, startSeed, endSeed)
			.then((marchResult) => {
				setNervePoints(marchResult.controlPoints as Point3D[]);
				showToast(
					`Канал IAN успешно сегментирован (Fast Marching 2-Seed Vatech Web Worker): 3D-длина ${marchResult.totalLengthMm} мм (${marchResult.controlPoints.length} узлов за ${marchResult.executionTimeMs} мс)`,
					"success",
				);
			})
			.catch(() => {
				setNervePoints([startSeed, endSeed]);
				showToast("Зафиксированы 2 точки канала IAN", "info");
			});
		return;
	}

	setNervePoints((prev) => [...prev, pointMm]);
	showToast(
		`Добавлен дополнительный узел нижнечелюстного канала #${nervePoints.length + 1}`,
		"info",
	);
}

/**
 * Handles mouse move when dragging an existing nerve node.
 */
export function handleNerveNodeDragMouseMove(
	isDraggingNerveNode: number,
	plane: MprPlane,
	canvas: HTMLCanvasElement,
	pointerPx: Point2D,
	currentTransform: ViewportTransform,
	crosshairMm: Point3D,
	obliqueAngles: ObliqueRotationAngles,
	volume: CbctVoxelVolume,
	setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>,
): void {
	const pointMm = mapCanvasPointerToWorldMmWithTransform(
		pointerPx,
		{ width: canvas.width, height: canvas.height },
		plane,
		crosshairMm,
		obliqueAngles,
		currentTransform,
		volume,
	);
	setNervePoints((prev) =>
		prev.map((pt, idx) => (idx === isDraggingNerveNode ? pointMm : pt)),
	);
}
