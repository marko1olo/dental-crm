/**
 * DENTE CRM — CBCT Generic Viewport Interaction Handlers
 * Layer 3: Mouse drag, pan, zoom, measurement stepping, and nerve trace dispatchers (0 DOM dependencies)
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import type React from "react";
import { showToast } from "../../../GlobalToast";
import type { CbctToolMode } from "../../CbctLeftToolDock";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctViewportType,
	CbctVoxelVolume,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import {
	calculateAngleBetween3Points3D,
	DEFAULT_VIEWPORT_TRANSFORM,
} from "../../cbctMprMath";
import { traceMandibularNerveAsync } from "../../cbctNerveWorkerBridge";
import {
	CBCT_MAX_WINDOW_LEVEL,
	CBCT_MAX_WINDOW_WIDTH,
	CBCT_MAX_ZOOM,
	CBCT_MIN_WINDOW_LEVEL,
	CBCT_MIN_WINDOW_WIDTH,
	CBCT_MIN_ZOOM,
	CBCT_WL_DRAG_SCALE_X,
	CBCT_WL_DRAG_SCALE_Y,
	CBCT_ZOOM_DRAG_FACTOR,
	CBCT_ZOOM_IN_STEP_FACTOR,
	CBCT_ZOOM_OUT_STEP_FACTOR,
} from "./constants";

/**
 * Handles active drag adjustment of Window Width (WW) and Window Level (WL)
 */
export function applyWindowLevelDrag(
	clientX: number,
	clientY: number,
	isDraggingWL: {
		startX: number;
		startY: number;
		startWW: number;
		startWL: number;
	},
	setWindowWidth: React.Dispatch<React.SetStateAction<number>>,
	setWindowLevel: React.Dispatch<React.SetStateAction<number>>,
): void {
	const dx = clientX - isDraggingWL.startX;
	const dy = clientY - isDraggingWL.startY;
	setWindowWidth(
		Math.max(
			CBCT_MIN_WINDOW_WIDTH,
			Math.min(
				CBCT_MAX_WINDOW_WIDTH,
				Math.round(isDraggingWL.startWW + dx * CBCT_WL_DRAG_SCALE_X),
			),
		),
	);
	setWindowLevel(
		Math.max(
			CBCT_MIN_WINDOW_LEVEL,
			Math.min(
				CBCT_MAX_WINDOW_LEVEL,
				Math.round(isDraggingWL.startWL - dy * CBCT_WL_DRAG_SCALE_Y),
			),
		),
	);
}

/**
 * Handles active viewport panning translation
 */
export function applyPanDrag(
	clientX: number,
	clientY: number,
	isPanning: {
		plane: CbctViewportType;
		startX: number;
		startY: number;
		startPanX: number;
		startPanY: number;
	},
	plane: CbctViewportType,
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>,
): void {
	if (isPanning.plane !== plane) return;
	const dx = clientX - isPanning.startX;
	const dy = clientY - isPanning.startY;
	setTransforms((prev) => ({
		...prev,
		[plane]: {
			...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM),
			panX: isPanning.startPanX + dx,
			panY: isPanning.startPanY + dy,
		},
	}));
}

/**
 * Handles continuous viewport zooming via vertical mouse drag
 */
export function applyZoomDrag(
	clientY: number,
	isDraggingZoom: {
		plane: CbctViewportType;
		startY: number;
		startZoom: number;
	},
	plane: CbctViewportType,
	hasDraggedZoomRef: React.MutableRefObject<boolean>,
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>,
): void {
	if (isDraggingZoom.plane !== plane) return;
	hasDraggedZoomRef.current = true;
	const dy = isDraggingZoom.startY - clientY;
	const zoomFactor = Math.exp(dy * CBCT_ZOOM_DRAG_FACTOR);
	const nextZoom = Math.max(
		CBCT_MIN_ZOOM,
		Math.min(
			CBCT_MAX_ZOOM,
			Number((isDraggingZoom.startZoom * zoomFactor).toFixed(2)),
		),
	);
	setTransforms((prev) => ({
		...prev,
		[plane]: {
			...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM),
			zoom: nextZoom,
		},
	}));
}

/**
 * Handles step-based zoom in when user clicks without dragging
 */
export function applyZoomClick(
	isDraggingZoom: {
		plane: CbctViewportType;
		startY: number;
		startZoom: number;
	} | null,
	hasDraggedZoomRef: React.MutableRefObject<boolean>,
	plane: CbctViewportType,
	transforms: Record<CbctViewportType, ViewportTransform>,
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>,
): void {
	if (
		isDraggingZoom &&
		!hasDraggedZoomRef.current &&
		isDraggingZoom.plane === plane
	) {
		const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
		const nextZoom = Math.min(
			CBCT_MAX_ZOOM,
			Number((currentTransform.zoom * CBCT_ZOOM_IN_STEP_FACTOR).toFixed(2)),
		);
		setTransforms((prev) => ({
			...prev,
			[plane]: {
				...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM),
				zoom: nextZoom,
			},
		}));
	}
}

/**
 * Handles step-based zoom out when Alt+clicking with the zoom tool
 */
export function applyZoomAltClick(
	plane: CbctViewportType,
	transforms: Record<CbctViewportType, ViewportTransform>,
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>,
): void {
	const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
	const nextZoom = Math.max(
		CBCT_MIN_ZOOM,
		Number((currentTransform.zoom * CBCT_ZOOM_OUT_STEP_FACTOR).toFixed(2)),
	);
	setTransforms((prev) => ({
		...prev,
		[plane]: {
			...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM),
			zoom: nextZoom,
		},
	}));
}

/**
 * Handles mouse down for common navigation tools (Window/Level, Pan, Zoom)
 * Returns true if the event was consumed by navigation tools
 */
export function handleCommonNavigationMouseDown(
	e: React.MouseEvent<HTMLCanvasElement>,
	activeTool: CbctToolMode,
	plane: CbctViewportType,
	windowWidth: number,
	windowLevel: number,
	transforms: Record<CbctViewportType, ViewportTransform>,
	setIsDraggingWL: React.Dispatch<
		React.SetStateAction<{
			startX: number;
			startY: number;
			startWW: number;
			startWL: number;
		} | null>
	>,
	setIsPanning: React.Dispatch<
		React.SetStateAction<{
			plane: CbctViewportType;
			startX: number;
			startY: number;
			startPanX: number;
			startPanY: number;
		} | null>
	>,
	setIsDraggingZoom: React.Dispatch<
		React.SetStateAction<{
			plane: CbctViewportType;
			startY: number;
			startZoom: number;
		} | null>
	>,
	hasDraggedZoomRef: React.MutableRefObject<boolean>,
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>,
): boolean {
	if (e.button === 2 || activeTool === "window_level") {
		e.preventDefault();
		setIsDraggingWL({
			startX: e.clientX,
			startY: e.clientY,
			startWW: windowWidth,
			startWL: windowLevel,
		});
		return true;
	}
	if (activeTool === "pan" || e.button === 1) {
		e.preventDefault();
		const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
		setIsPanning({
			plane,
			startX: e.clientX,
			startY: e.clientY,
			startPanX: currentTransform.panX,
			startPanY: currentTransform.panY,
		});
		return true;
	}
	if (activeTool === "zoom") {
		e.preventDefault();
		if (e.altKey) {
			applyZoomAltClick(plane, transforms, setTransforms);
			return true;
		}
		const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
		hasDraggedZoomRef.current = false;
		setIsDraggingZoom({
			plane,
			startY: e.clientY,
			startZoom: currentTransform.zoom,
		});
		return true;
	}
	return false;
}

/**
 * Handles 3-step interactive angle measurement placement on click
 */
export function handleAngleMeasurementClick(
	activeAngle:
		| (CbctAngleMeasurement & { currentMm: Point3D; step?: "vertex" | "end" })
		| null,
	pt: Point3D,
	plane: CbctViewportType,
	setActiveAngle: React.Dispatch<
		React.SetStateAction<
			| (CbctAngleMeasurement & { currentMm: Point3D; step?: "vertex" | "end" })
			| null
		>
	>,
	setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>,
	setSelectedMeasurement: React.Dispatch<
		React.SetStateAction<CbctMeasurementRuler | null>
	>,
): void {
	if (!activeAngle) {
		setActiveAngle({
			id: `angle-${Date.now()}`,
			plane,
			startMm: pt,
			vertexMm: pt,
			endMm: pt,
			currentMm: pt,
			angleDeg: 0,
			step: "vertex",
		} as unknown as CbctAngleMeasurement & { currentMm: Point3D });
		showToast(
			"Точка 1 (плечо) установлена. Кликните для установки вершины угла",
			"info",
		);
		return;
	}
	if (
		(activeAngle as unknown as { step?: "vertex" | "end" }).step ===
		"vertex"
	) {
		setActiveAngle({
			...activeAngle,
			vertexMm: pt,
			endMm: pt,
			currentMm: pt,
			step: "end",
		} as unknown as CbctAngleMeasurement & {
			currentMm: Point3D;
			step?: "vertex" | "end";
		});
		showToast(
			"Вершина угла зафиксирована. Кликните для фиксации второго плеча",
			"info",
		);
		return;
	}
	const deg = calculateAngleBetween3Points3D(
		activeAngle.startMm,
		activeAngle.vertexMm,
		pt,
	);
	const full: CbctAngleMeasurement = {
		id: activeAngle.id,
		plane,
		startMm: activeAngle.startMm,
		vertexMm: activeAngle.vertexMm,
		endMm: pt,
		angleDeg: deg,
	};
	setAngles((prev) => [...prev, full]);
	setActiveAngle(null);
	setSelectedMeasurement(full as unknown as CbctMeasurementRuler);
	showToast(`Измерение угла зафиксировано: ${deg}°`, "success");
}

/**
 * Triggers Fast Marching mandibular nerve tracing between 2 seeds
 */
export function traceMandibularNerveSeedsAsync(
	volume: CbctVoxelVolume | null | undefined,
	startSeed: Point3D,
	endSeed: Point3D,
	setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>,
): void {
	if (!volume) {
		setNervePoints([startSeed, endSeed]);
		showToast("Зафиксированы 2 точки канала IAN", "info");
		return;
	}
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
}
