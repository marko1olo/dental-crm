/**
 * DENTE CRM — Panoramic Viewport Interaction Hook
 * Dedicated sub-hook managing all panoramic viewport mouse interactions, crosshair syncing, and tool events.
 * Standards: DICOM Part 3, Mandate 8b (<= 300 lines).
 */

import type React from "react";
import { useCallback, useRef, useState } from "react";
import { showToast } from "../../../GlobalToast";
import type {
	CbctMeasurementRuler,
	Point3D,
} from "../../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	getCanvasPointerPos,
} from "../../cbctMprMath";
import {
	hitTestPanoramicToothMarker,
	mapPanoPointerToCrosshairAndSlice,
} from "../../dentalCurveEngine";
import { notifyCbctSliceInteraction } from "../cbctAdaptiveSlicePipeline";
import { getPanoPointerWorldMm } from "./curveSplineMath";
import type {
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
import {
	finalizePanoramicRuler,
	hitTestPanoramicHandles,
	hitTestPanoramicObjects,
	updatePanoramicMeasurementDrag,
} from "./panoramicMeasurementInteraction";

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
