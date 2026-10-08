/**
 * DENTE CRM — CBCT Panoramic Reconstruction & Slice Handlers
 * Layer 2: Panoramic slice navigation, measurement hit-testing, dragging, and viewport event hook
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import type React from "react";
import { useCallback, useRef, useState } from "react";
import { showToast } from "../../../GlobalToast";
import { panoramicWorldMmToSlicePx } from "../../cbctCoordinateMath";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import {
	calculateAngleBetween3Points3D,
	calculateWorldDistance3DMm,
	DEFAULT_VIEWPORT_TRANSFORM,
	getCanvasPointerPos,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
	slicePxToScreenPx,
} from "../../cbctMprMath";
import type { PanoramicReconstructionResult } from "../../dentalCurveEngine";
import {
	hitTestPanoramicToothMarker,
	mapPanoPointerToCrosshairAndSlice,
} from "../../dentalCurveEngine";
import { notifyCbctSliceInteraction } from "../cbctAdaptiveSlicePipeline";
import {
	CBCT_MEASUREMENT_HANDLE_HIT_RADIUS_PX,
	CBCT_MEASUREMENT_OBJECT_HIT_RADIUS_PX,
	CBCT_MIN_RULER_DISTANCE_MM,
} from "./constants";
import { getPanoPointerWorldMm } from "./curveSplineMath";
import type {
	MeasurementHandleDragDescriptor,
	PendingPanoSync,
	UseCbctCurvedViewportHandlersParams,
} from "./types";
import {
	applyPanDrag,
	applyWindowLevelDrag,
	applyZoomClick,
	applyZoomDrag,
	handleAngleMeasurementClick,
	handleCommonNavigationMouseDown,
	traceMandibularNerveSeedsAsync,
} from "./viewportInteractionHandlers";

/**
 * Hit tests measurement handles (ends / vertices) on panoramic projection
 */
export function hitTestPanoramicHandles(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: CbctMeasurementRuler[],
	angles: CbctAngleMeasurement[],
	panoramicData: PanoramicReconstructionResult,
	currentTransform: ViewportTransform,
	totalArcLengthMm: number,
) {
	const toScreen = (p: Point3D) =>
		slicePxToScreenPx(
			panoramicWorldMmToSlicePx(p, panoramicData, totalArcLengthMm),
			currentTransform,
		);

	const pRulers = rulers
		.filter((r) => r.plane === "panoramic")
		.map((r) => ({
			id: r.id,
			plane: r.plane,
			startPx: toScreen(r.startMm),
			endPx: toScreen(r.endMm),
		}));

	const pAngles = angles
		.filter((a) => a.plane === "panoramic")
		.map((a) => ({
			id: a.id,
			plane: a.plane,
			startPx: toScreen(a.startMm),
			vertexPx: toScreen(a.vertexMm),
			endPx: toScreen(a.endMm),
		}));

	return hitTestMeasurementHandle(
		pointerPx,
		pRulers,
		pAngles,
		CBCT_MEASUREMENT_HANDLE_HIT_RADIUS_PX,
	);
}

/**
 * Hit tests measurement lines and delete buttons on panoramic projection
 */
export function hitTestPanoramicObjects(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: CbctMeasurementRuler[],
	angles: CbctAngleMeasurement[],
	panoramicData: PanoramicReconstructionResult,
	currentTransform: ViewportTransform,
	totalArcLengthMm: number,
) {
	const toScreen = (p: Point3D) =>
		slicePxToScreenPx(
			panoramicWorldMmToSlicePx(p, panoramicData, totalArcLengthMm),
			currentTransform,
		);

	const pRulers = rulers
		.filter((r) => r.plane === "panoramic")
		.map((r) => ({
			id: r.id,
			plane: r.plane,
			startPx: toScreen(r.startMm),
			endPx: toScreen(r.endMm),
		}));

	const pAngles = angles
		.filter((a) => a.plane === "panoramic")
		.map((a) => ({
			id: a.id,
			plane: a.plane,
			startPx: toScreen(a.startMm),
			vertexPx: toScreen(a.vertexMm),
			endPx: toScreen(a.endMm),
		}));

	return hitTestMeasurementObject(
		pointerPx,
		pRulers,
		pAngles,
		[],
		CBCT_MEASUREMENT_OBJECT_HIT_RADIUS_PX,
	);
}

/**
 * Updates ruler or angle coordinates during handle drag on panoramic slice
 */
export function updatePanoramicMeasurementDrag(
	draggingHandle: MeasurementHandleDragDescriptor,
	pt: Point3D,
	setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>,
	setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>,
): void {
	if (draggingHandle.type === "ruler") {
		setRulers((prev) =>
			prev.map((r) => {
				if (r.id !== draggingHandle.id) return r;
				const startMm =
					draggingHandle.handleIndex === 0 ? pt : r.startMm;
				const endMm =
					draggingHandle.handleIndex === 1 ? pt : r.endMm;
				return {
					...r,
					startMm,
					endMm,
					distanceMm: calculateWorldDistance3DMm(startMm, endMm),
				};
			}),
		);
	} else if (draggingHandle.type === "angle") {
		setAngles((prev) =>
			prev.map((a) => {
				if (a.id !== draggingHandle.id) return a;
				const startMm =
					draggingHandle.handleIndex === 0 ? pt : a.startMm;
				const vertexMm =
					draggingHandle.handleIndex === 1 ? pt : a.vertexMm;
				const endMm =
					draggingHandle.handleIndex === 2 ? pt : a.endMm;
				return {
					...a,
					startMm,
					vertexMm,
					endMm,
					angleDeg: calculateAngleBetween3Points3D(
						startMm,
						vertexMm,
						endMm,
					),
				};
			}),
		);
	}
}

/**
 * Finalizes ruler measurement on mouse release, returning completed ruler if above threshold
 */
export function finalizePanoramicRuler(
	activeRuler: CbctMeasurementRuler & { currentMm: Point3D },
): CbctMeasurementRuler | null {
	const distMm = calculateWorldDistance3DMm(
		activeRuler.startMm,
		activeRuler.currentMm,
	);
	if (distMm >= CBCT_MIN_RULER_DISTANCE_MM) {
		return {
			id: activeRuler.id,
			plane: "panoramic",
			startMm: activeRuler.startMm,
			endMm: activeRuler.currentMm,
			distanceMm: distMm,
		};
	}
	return null;
}

/**
 * Dedicated sub-hook managing all panoramic viewport mouse interactions
 */
export function usePanoramicViewportHandlers(
	params: UseCbctCurvedViewportHandlersParams,
) {
	const {
		volume,
		nervePoints,
		setNervePoints,
		activeTool,
		windowWidth,
		setWindowWidth,
		windowLevel,
		setWindowLevel,
		transforms,
		setTransforms,
		crosshairMm,
		setCrosshairMm,
		archCurve,
		panoramicData,
		crossSections,
		setActiveCrossSectionIdx,
		handleSelectTooth,
		panoCanvasRef,
		isDraggingWL,
		setIsDraggingWL,
		isPanning,
		setIsPanning,
		isDraggingZoom,
		setIsDraggingZoom,
		hasDraggedZoomRef,
		rulers,
		setRulers,
		activeRuler,
		setActiveRuler,
		angles,
		setAngles,
		activeAngle,
		setActiveAngle,
		setHoveredMeasurementHandle,
		draggingMeasurementHandle,
		setDraggingMeasurementHandle,
		setSelectedMeasurement,
	} = params;

	const getPanoPointerMm = useCallback(
		(pointerPx: { readonly x: number; readonly y: number }): Point3D => {
			return getPanoPointerWorldMm(
				pointerPx,
				transforms.panoramic,
				panoramicData,
				archCurve.totalArcLengthMm,
			);
		},
		[transforms.panoramic, panoramicData, archCurve.totalArcLengthMm],
	);

	const [isDraggingPano, setIsDraggingPano] = useState<boolean>(false);
	const pendingPanoSyncRef = useRef<PendingPanoSync | null>(null);
	const rafPanoIdRef = useRef<number | null>(null);

	const handlePanoMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			notifyCbctSliceInteraction();

			if (
				handleCommonNavigationMouseDown(
					e,
					activeTool,
					"panoramic",
					windowWidth,
					windowLevel,
					transforms,
					setIsDraggingWL,
					setIsPanning,
					setIsDraggingZoom,
					hasDraggedZoomRef,
					setTransforms,
				)
			) {
				return;
			}

			if (activeTool === "ruler") {
				if (panoramicData && panoCanvasRef.current) {
					const canvas = panoCanvasRef.current;
					const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
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
				return;
			}

			if (activeTool === "angle") {
				if (panoramicData && panoCanvasRef.current) {
					const canvas = panoCanvasRef.current;
					const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
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
				return;
			}

			if (activeTool === "nerve") {
				if (panoCanvasRef.current) {
					const canvas = panoCanvasRef.current;
					const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
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
							"Точка 1/2 (ОПТГ): Ментальное отверстие зафиксировано. Кликните Foramen mandibulae для автотрассировки Fast Marching",
							"info",
						);
						return;
					}

					if (nervePoints.length === 1 && volume) {
						const startSeed = nervePoints[0]!;
						const endSeed = pointMm;
						setNervePoints([startSeed, endSeed]);
						traceMandibularNerveSeedsAsync(volume, startSeed, endSeed, setNervePoints);
						return;
					}

					setNervePoints((prev) => [...prev, pointMm]);
					showToast(
						`Добавлен дополнительный узел нижнечелюстного канала #${nervePoints.length + 1}`,
						"info",
					);
				}
				return;
			}

			if (panoramicData && panoCanvasRef.current) {
				const canvas = panoCanvasRef.current;
				const currentTransform =
					transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);

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
					return;
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
						return;
					}
					setSelectedMeasurement({
						type: objectHit.type,
						id: objectHit.id,
					} as unknown as CbctMeasurementRuler);
					return;
				}
			}

			if (crossSections.length === 0 || !panoCanvasRef.current) return;
			setIsDraggingPano(true);
			const canvas = panoCanvasRef.current;
			const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			if (panoramicData?.toothMarkersOnPano) {
				const hitMarker = hitTestPanoramicToothMarker(
					{ x, y },
					panoramicData.toothMarkersOnPano,
					transforms.panoramic,
				);
				if (hitMarker) {
					handleSelectTooth(hitMarker.toothFdi);
					return;
				}
			}
			const syncRes = mapPanoPointerToCrosshairAndSlice(
				{ x, y },
				{ width: canvas.width, height: canvas.height },
				archCurve,
				crossSections,
				crosshairMm,
				transforms.panoramic,
			);
			setActiveCrossSectionIdx(syncRes.crossSectionIdx);
			setCrosshairMm(syncRes.worldMm);
		},
		[
			crossSections,
			archCurve,
			crosshairMm,
			transforms.panoramic,
			panoramicData,
			handleSelectTooth,
			activeTool,
			windowWidth,
			windowLevel,
			panoCanvasRef,
			setTransforms,
			setActiveCrossSectionIdx,
			setCrosshairMm,
			setIsDraggingWL,
			setIsPanning,
			setIsDraggingZoom,
			hasDraggedZoomRef,
			rulers,
			setRulers,
			setActiveRuler,
			angles,
			setAngles,
			activeAngle,
			setActiveAngle,
			setDraggingMeasurementHandle,
			setSelectedMeasurement,
			getPanoPointerMm,
			nervePoints,
			setNervePoints,
			volume,
			transforms,
		],
	);

	const handlePanoMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (isDraggingWL) {
				applyWindowLevelDrag(
					e.clientX,
					e.clientY,
					isDraggingWL,
					setWindowWidth,
					setWindowLevel,
				);
				return;
			}
			if (isPanning && isPanning.plane === "panoramic") {
				applyPanDrag(e.clientX, e.clientY, isPanning, "panoramic", setTransforms);
				return;
			}
			if (isDraggingZoom && isDraggingZoom.plane === "panoramic") {
				applyZoomDrag(
					e.clientY,
					isDraggingZoom,
					"panoramic",
					hasDraggedZoomRef,
					setTransforms,
				);
				return;
			}

			if (
				draggingMeasurementHandle &&
				draggingMeasurementHandle.plane === "panoramic" &&
				panoCanvasRef.current
			) {
				const canvas = panoCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getPanoPointerMm(pointerPx);
				updatePanoramicMeasurementDrag(
					draggingMeasurementHandle,
					pt,
					setRulers,
					setAngles,
				);
				return;
			}

			if (
				activeRuler &&
				activeRuler.plane === "panoramic" &&
				panoCanvasRef.current
			) {
				const canvas = panoCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getPanoPointerMm(pointerPx);
				setActiveRuler((prev) => (prev ? { ...prev, currentMm: pt } : null));
				return;
			}

			if (
				activeAngle &&
				activeAngle.plane === "panoramic" &&
				panoCanvasRef.current
			) {
				const canvas = panoCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getPanoPointerMm(pointerPx);
				setActiveAngle((prev) => (prev ? { ...prev, currentMm: pt } : null));
				return;
			}

			if (!isDraggingPano && panoCanvasRef.current && panoramicData) {
				const canvas = panoCanvasRef.current;
				const currentTransform =
					transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
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

			if (
				!isDraggingPano ||
				crossSections.length === 0 ||
				!panoCanvasRef.current
			)
				return;
			const canvas = panoCanvasRef.current;
			const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const syncRes = mapPanoPointerToCrosshairAndSlice(
				{ x, y },
				{ width: canvas.width, height: canvas.height },
				archCurve,
				crossSections,
				crosshairMm,
				transforms.panoramic,
			);
			pendingPanoSyncRef.current = syncRes;
			if (rafPanoIdRef.current === null) {
				rafPanoIdRef.current = requestAnimationFrame(() => {
					if (pendingPanoSyncRef.current) {
						setActiveCrossSectionIdx(
							pendingPanoSyncRef.current.crossSectionIdx,
						);
						setCrosshairMm(pendingPanoSyncRef.current.worldMm);
					}
					rafPanoIdRef.current = null;
				});
			}
		},
		[
			isDraggingWL,
			isPanning,
			isDraggingZoom,
			isDraggingPano,
			crossSections,
			archCurve,
			crosshairMm,
			transforms.panoramic,
			panoCanvasRef,
			setWindowWidth,
			setWindowLevel,
			setTransforms,
			setActiveCrossSectionIdx,
			setCrosshairMm,
			hasDraggedZoomRef,
			draggingMeasurementHandle,
			activeRuler,
			activeAngle,
			panoramicData,
			rulers,
			angles,
			setRulers,
			setAngles,
			setActiveRuler,
			setActiveAngle,
			setHoveredMeasurementHandle,
			getPanoPointerMm,
		],
	);

	const handlePanoMouseUp = useCallback(() => {
		if (rafPanoIdRef.current !== null) {
			cancelAnimationFrame(rafPanoIdRef.current);
			rafPanoIdRef.current = null;
		}
		if (pendingPanoSyncRef.current) {
			setActiveCrossSectionIdx(pendingPanoSyncRef.current.crossSectionIdx);
			setCrosshairMm(pendingPanoSyncRef.current.worldMm);
			pendingPanoSyncRef.current = null;
		}
		applyZoomClick(
			isDraggingZoom,
			hasDraggedZoomRef,
			"panoramic",
			transforms,
			setTransforms,
		);
		if (
			draggingMeasurementHandle &&
			draggingMeasurementHandle.plane === "panoramic"
		) {
			setDraggingMeasurementHandle(null);
			return;
		}
		if (activeRuler && activeRuler.plane === "panoramic") {
			const fullRuler = finalizePanoramicRuler(activeRuler);
			if (fullRuler) {
				setRulers((prev) => [...prev, fullRuler]);
				setSelectedMeasurement(fullRuler);
				showToast(`Замер зафиксирован: ${fullRuler.distanceMm} мм`, "success");
			}
			setActiveRuler(null);
			return;
		}
		setIsDraggingPano(false);
		setIsPanning(null);
		setIsDraggingZoom(null);
		setIsDraggingWL(null);
		hasDraggedZoomRef.current = false;
	}, [
		isDraggingZoom,
		transforms,
		setActiveCrossSectionIdx,
		setCrosshairMm,
		setTransforms,
		setIsPanning,
		setIsDraggingZoom,
		setIsDraggingWL,
		hasDraggedZoomRef,
		draggingMeasurementHandle,
		activeRuler,
		setDraggingMeasurementHandle,
		setRulers,
		setSelectedMeasurement,
		setActiveRuler,
	]);

	return {
		isDraggingPano,
		handlePanoMouseDown,
		handlePanoMouseMove,
		handlePanoMouseUp,
	};
}
