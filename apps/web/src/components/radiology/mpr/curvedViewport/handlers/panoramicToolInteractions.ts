/**
 * DENTE CRM — Panoramic Viewport Clinical Tool Interactions
 * Manages Ruler, Angle, Mandibular Nerve Tracing, and Tooth Marker Hit-Testing.
 * Standards: Mandate 8b (Sweet Spot 180-240 lines), Mandate 8e (Doctor Autonomy).
 */

import type React from "react";
import { showToast } from "../../../../GlobalToast";
import type {
	CbctMeasurementRuler,
	Point3D,
} from "../../../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	getCanvasPointerPos,
} from "../../../cbctMprMath";
import {
	hitTestPanoramicToothMarker,
	mapPanoPointerToCrosshairAndSlice,
} from "../../../dentalCurveEngine";
import type { UseCbctCurvedViewportHandlersParams } from "../types";
import {
	handleAngleMeasurementClick,
	traceMandibularNerveSeedsAsync,
} from "../viewportInteractionHandlers";
import {
	finalizePanoramicRuler,
	hitTestPanoramicHandles,
	hitTestPanoramicObjects,
	updatePanoramicMeasurementDrag,
} from "../panoramicMeasurementInteraction";

export interface PanoramicToolContext extends UseCbctCurvedViewportHandlersParams {
	readonly getPanoPointerMm: (pointerPx: { readonly x: number; readonly y: number }) => Point3D;
}

/**
 * Handles clinical tool mouse-down events (ruler, angle, nerve, handle interaction, tooth selection).
 * Returns true if an interaction was initiated and further default crosshair navigation should be skipped.
 */
export function handlePanoramicToolMouseDown(
	e: React.MouseEvent<HTMLCanvasElement>,
	context: PanoramicToolContext,
): boolean {
	const {
		activeTool,
		panoramicData,
		panoCanvasRef,
		transforms,
		archCurve,
		crossSections,
		crosshairMm,
		rulers,
		setRulers,
		setActiveRuler,
		angles,
		setAngles,
		activeAngle,
		setActiveAngle,
		setDraggingMeasurementHandle,
		setSelectedMeasurement,
		nervePoints,
		setNervePoints,
		volume,
		handleSelectTooth,
		getPanoPointerMm,
	} = context;

	const canvas = panoCanvasRef.current;
	if (!canvas) return false;

	const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);

	if (activeTool === "ruler") {
		if (panoramicData) {
			const pt = getPanoPointerMm(pointerPx);
			setActiveRuler({
				id: `ruler-${Date.now()}`,
				plane: "panoramic",
				startMm: pt,
				endMm: pt,
				currentMm: pt,
				distanceMm: 0,
			});
		}
		return true;
	}

	if (activeTool === "angle") {
		if (panoramicData) {
			const pt = getPanoPointerMm(pointerPx);
			handleAngleMeasurementClick(
				activeAngle,
				pt,
				"panoramic",
				setActiveAngle,
				setAngles,
				setSelectedMeasurement,
			);
		}
		return true;
	}

	if (activeTool === "nerve") {
		const syncRes = mapPanoPointerToCrosshairAndSlice(
			pointerPx,
			{ width: canvas.width, height: canvas.height },
			archCurve,
			crossSections,
			crosshairMm,
			transforms.panoramic,
		);
		const pointMm = syncRes.worldMm;

		if (nervePoints.length === 0) {
			setNervePoints([pointMm]);
			showToast(
				"Точка 1/2 (Панорама): Ментальное отверстие зафиксировано. Укажите Foramen mandibulae для автотрассировки",
				"info",
			);
			return true;
		}

		if (nervePoints.length === 1 && volume) {
			const startSeed = nervePoints[0]!;
			const endSeed = pointMm;
			setNervePoints([startSeed, endSeed]);
			traceMandibularNerveSeedsAsync(volume, startSeed, endSeed, setNervePoints);
			return true;
		}

		setNervePoints((prev) => [...prev, pointMm]);
		showToast(
			`Добавлен узел нижнечелюстного канала #${nervePoints.length + 1}`,
			"info",
		);
		return true;
	}

	// Measurement handle / object selection hit-test
	if (panoramicData) {
		const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
		const handleHit = hitTestPanoramicHandles(
			pointerPx,
			rulers,
			angles,
			panoramicData,
			currentTransform,
			archCurve.totalArcLengthMm,
		);
		if (handleHit) {
			setDraggingMeasurementHandle({
				type: handleHit.type,
				id: handleHit.id,
				handleIndex: handleHit.handleIndex,
				plane: "panoramic",
			});
			setSelectedMeasurement({
				type: handleHit.type,
				id: handleHit.id,
			} as unknown as CbctMeasurementRuler);
			return true;
		}

		const objectHit = hitTestPanoramicObjects(
			pointerPx,
			rulers,
			angles,
			panoramicData,
			currentTransform,
			archCurve.totalArcLengthMm,
		);
		if (objectHit) {
			if (objectHit.isDeleteButtonHit) {
				if (objectHit.type === "ruler") {
					setRulers((prev) => prev.filter((r) => r.id !== objectHit.id));
					showToast("Измерение линейки удалено", "info");
				} else if (objectHit.type === "angle") {
					setAngles((prev) => prev.filter((a) => a.id !== objectHit.id));
					showToast("Измерение угла удалено", "info");
				}
				setSelectedMeasurement(null);
				return true;
			}
			setSelectedMeasurement({
				type: objectHit.type,
				id: objectHit.id,
			} as unknown as CbctMeasurementRuler);
			return true;
		}
	}

	// Tooth marker hit-test
	if (panoramicData?.toothMarkersOnPano) {
		const hitMarker = hitTestPanoramicToothMarker(
			pointerPx,
			panoramicData.toothMarkersOnPano,
			transforms.panoramic,
		);
		if (hitMarker) {
			handleSelectTooth(hitMarker.toothFdi);
			return true;
		}
	}

	return false;
}

/**
 * Handles mouse-move updates for ongoing measurements.
 * Returns true if the event was absorbed by measurement dragging or active ruler/angle updating.
 */
export function handlePanoramicToolMouseMove(
	e: React.MouseEvent<HTMLCanvasElement>,
	context: PanoramicToolContext,
): boolean {
	const {
		panoCanvasRef,
		draggingMeasurementHandle,
		activeRuler,
		setActiveRuler,
		activeAngle,
		setActiveAngle,
		setRulers,
		setAngles,
		getPanoPointerMm,
	} = context;

	const canvas = panoCanvasRef.current;
	if (!canvas) return false;

	const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);

	if (draggingMeasurementHandle && draggingMeasurementHandle.plane === "panoramic") {
		const pt = getPanoPointerMm(pointerPx);
		updatePanoramicMeasurementDrag(draggingMeasurementHandle, pt, setRulers, setAngles);
		return true;
	}

	if (activeRuler && activeRuler.plane === "panoramic") {
		const pt = getPanoPointerMm(pointerPx);
		setActiveRuler((prev) => (prev ? { ...prev, currentMm: pt } : null));
		return true;
	}

	if (activeAngle && activeAngle.plane === "panoramic") {
		const pt = getPanoPointerMm(pointerPx);
		setActiveAngle((prev) => (prev ? { ...prev, currentMm: pt } : null));
		return true;
	}

	return false;
}

/**
 * Handles hover updates for measurement handles when not dragging.
 */
export function updatePanoramicMeasurementHover(
	e: React.MouseEvent<HTMLCanvasElement>,
	context: PanoramicToolContext,
): void {
	const {
		panoCanvasRef,
		panoramicData,
		transforms,
		rulers,
		angles,
		archCurve,
		setHoveredMeasurementHandle,
	} = context;

	const canvas = panoCanvasRef.current;
	if (!canvas || !panoramicData) return;

	const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
	const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);

	const handleHit = hitTestPanoramicHandles(
		pointerPx,
		rulers,
		angles,
		panoramicData,
		currentTransform,
		archCurve.totalArcLengthMm,
	);

	setHoveredMeasurementHandle(
		handleHit
			? {
					type: handleHit.type,
					id: handleHit.id,
					handleIndex: handleHit.handleIndex,
					plane: "panoramic",
				}
			: null,
	);
}

/**
 * Handles mouse-up finalization for measurements.
 * Returns true if a measurement handle or ruler was finalized.
 */
export function handlePanoramicToolMouseUp(
	context: PanoramicToolContext,
): boolean {
	const {
		draggingMeasurementHandle,
		setDraggingMeasurementHandle,
		activeRuler,
		setActiveRuler,
		setRulers,
		setSelectedMeasurement,
	} = context;

	if (draggingMeasurementHandle && draggingMeasurementHandle.plane === "panoramic") {
		setDraggingMeasurementHandle(null);
		return true;
	}

	if (activeRuler && activeRuler.plane === "panoramic") {
		const fullRuler = finalizePanoramicRuler(activeRuler);
		if (fullRuler) {
			setRulers((prev) => [...prev, fullRuler]);
			setSelectedMeasurement(fullRuler);
			showToast(`Замер зафиксирован: ${fullRuler.distanceMm} мм`, "success");
		}
		setActiveRuler(null);
		return true;
	}

	return false;
}
