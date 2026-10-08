/**
 * DENTE CRM — CBCT Cross-Section Reconstruction & Implant Handlers
 * Layer 2: Cross-section slices, virtual implant positioning, and cross-section viewport event hook
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import type React from "react";
import { useCallback } from "react";
import { showToast } from "../../../GlobalToast";
import { crossSectionWorldMmToSlicePx } from "../../cbctCoordinateMath";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import {
	calculateWorldDistance3DMm,
	DEFAULT_VIEWPORT_TRANSFORM,
	getCanvasPointerPos,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
	slicePxToScreenPx,
} from "../../cbctMprMath";
import type { CrossSectionSliceData } from "../../dentalCurveEngine";
import { notifyCbctSliceInteraction } from "../cbctAdaptiveSlicePipeline";
import {
	CBCT_MEASUREMENT_HANDLE_HIT_RADIUS_PX,
	CBCT_MEASUREMENT_OBJECT_HIT_RADIUS_PX,
	CBCT_MIN_RULER_DISTANCE_MM,
} from "./constants";
import {
	calculateCrossSectionNerveWorldPoint,
	calculateImplantDragDelta,
	getCrossPointerWorldMm,
	hitTestImplantPart,
	isImplantResetButtonHit,
} from "./curveSplineMath";
import type {
	MeasurementHandleDragDescriptor,
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
 * Hit tests measurement handles (ends / vertices) on cross-section slice
 */
export function hitTestCrossSectionHandles(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: CbctMeasurementRuler[],
	angles: CbctAngleMeasurement[],
	activeCrossSection: CrossSectionSliceData,
	currentTransform: ViewportTransform,
	canvasWidth: number,
) {
	const toScreen = (p: Point3D) =>
		slicePxToScreenPx(
			crossSectionWorldMmToSlicePx(p, activeCrossSection, canvasWidth),
			currentTransform,
		);

	const pRulers = rulers
		.filter((r) => r.plane === "cross_section")
		.map((r) => ({
			id: r.id,
			plane: r.plane,
			startPx: toScreen(r.startMm),
			endPx: toScreen(r.endMm),
		}));

	const pAngles = angles
		.filter((a) => a.plane === "cross_section")
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
 * Hit tests measurement lines and delete buttons on cross-section slice
 */
export function hitTestCrossSectionObjects(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: CbctMeasurementRuler[],
	angles: CbctAngleMeasurement[],
	activeCrossSection: CrossSectionSliceData,
	currentTransform: ViewportTransform,
	canvasWidth: number,
) {
	const toScreen = (p: Point3D) =>
		slicePxToScreenPx(
			crossSectionWorldMmToSlicePx(p, activeCrossSection, canvasWidth),
			currentTransform,
		);

	const pRulers = rulers
		.filter((r) => r.plane === "cross_section")
		.map((r) => ({
			id: r.id,
			plane: r.plane,
			startPx: toScreen(r.startMm),
			endPx: toScreen(r.endMm),
		}));

	const pAngles = angles
		.filter((a) => a.plane === "cross_section")
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
 * Updates ruler or angle coordinates during handle drag on cross-section slice
 */
export function updateCrossSectionMeasurementDrag(
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
					angleDeg: calculateWorldDistance3DMm(startMm, vertexMm) > 0
						? calculateWorldDistance3DMm(vertexMm, endMm) > 0
							? (Math.round(
									(Math.atan2(
										endMm.y - vertexMm.y,
										endMm.x - vertexMm.x,
									) -
										Math.atan2(
											startMm.y - vertexMm.y,
											startMm.x - vertexMm.x,
										)) *
										(180 / Math.PI),
								) + 360) % 360
							: 0
						: 0,
				};
			}),
		);
	}
}

/**
 * Finalizes ruler measurement on cross-section mouse release
 */
export function finalizeCrossSectionRuler(
	activeRuler: CbctMeasurementRuler & { currentMm: Point3D },
): CbctMeasurementRuler | null {
	const distMm = calculateWorldDistance3DMm(
		activeRuler.startMm,
		activeRuler.currentMm,
	);
	if (distMm >= CBCT_MIN_RULER_DISTANCE_MM) {
		return {
			id: activeRuler.id,
			plane: "cross_section",
			startMm: activeRuler.startMm,
			endMm: activeRuler.currentMm,
			distanceMm: distMm,
		};
	}
	return null;
}

/**
 * Dedicated sub-hook managing all cross-section viewport mouse interactions
 */
export function useCrossSectionViewportHandlers(
	params: UseCbctCurvedViewportHandlersParams,
) {
	const {
		volume,
		nervePoints,
		setNervePoints,
		activeTool,
		studioMode,
		windowWidth,
		setWindowWidth,
		windowLevel,
		setWindowLevel,
		transforms,
		setTransforms,
		activeCrossSection,
		currentImplantSpec,
		implantEntryXOffsetMm,
		setImplantEntryXOffsetMm,
		implantEntryDepthMm,
		setImplantEntryDepthMm,
		implantAngulationDeg,
		setImplantAngulationDeg,
		hoveredImplantPart,
		setHoveredImplantPart,
		dragImplantPart,
		setDragImplantPart,
		crossSectionDragStart,
		setCrossSectionDragStart,
		setSelectedMeasurement,
		crossSectionCanvasRef,
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
	} = params;

	const getCrossPointerMm = useCallback(
		(
			pointerPx: { readonly x: number; readonly y: number },
			cW: number,
		): Point3D => {
			return getCrossPointerWorldMm(
				pointerPx,
				transforms.cross_section,
				activeCrossSection,
				cW,
			);
		},
		[transforms.cross_section, activeCrossSection],
	);

	const handleCrossSectionMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			notifyCbctSliceInteraction();

			if (
				handleCommonNavigationMouseDown(
					e,
					activeTool,
					"cross_section",
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
				if (activeCrossSection && crossSectionCanvasRef.current) {
					const canvas = crossSectionCanvasRef.current;
					const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
					const pt = getCrossPointerMm(pointerPx, canvas.width);
					setActiveRuler({
						id: `ruler-${Date.now()}`,
						plane: "cross_section",
						startMm: pt,
						endMm: pt,
						currentMm: pt,
						distanceMm: 0,
					});
				}
				return;
			}

			if (activeTool === "angle") {
				if (activeCrossSection && crossSectionCanvasRef.current) {
					const canvas = crossSectionCanvasRef.current;
					const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
					const pt = getCrossPointerMm(pointerPx, canvas.width);
					handleAngleMeasurementClick(
						activeAngle,
						pt,
						"cross_section",
						setActiveAngle,
						setAngles,
						setSelectedMeasurement,
					);
				}
				return;
			}

			if (activeTool === "nerve") {
				if (activeCrossSection && crossSectionCanvasRef.current) {
					const canvas = crossSectionCanvasRef.current;
					const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
					const localMm = getCrossPointerMm(pointerPx, canvas.width);
					const pointMm = calculateCrossSectionNerveWorldPoint(
						activeCrossSection,
						localMm,
					);

					if (nervePoints.length === 0) {
						setNervePoints([pointMm]);
						showToast(
							"Точка 1/2 (Кросс-секция): Ментальное отверстие зафиксировано. Кликните Foramen mandibulae для автотрассировки Fast Marching",
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

			if (activeCrossSection && crossSectionCanvasRef.current) {
				const canvas = crossSectionCanvasRef.current;
				const currentTransform =
					transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);

				const handleHit = hitTestCrossSectionHandles(
					pointerPx,
					rulers,
					angles,
					activeCrossSection,
					currentTransform,
					canvas.width,
				);
				if (handleHit) {
					setDraggingMeasurementHandle({
						type: handleHit.type,
						id: handleHit.id,
						handleIndex: handleHit.handleIndex,
						plane: "cross_section",
					});
					setSelectedMeasurement({
						type: handleHit.type,
						id: handleHit.id,
					} as unknown as CbctMeasurementRuler);
					return;
				}

				const objectHit = hitTestCrossSectionObjects(
					pointerPx,
					rulers,
					angles,
					activeCrossSection,
					currentTransform,
					canvas.width,
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

			if (
				studioMode !== "implant" ||
				!activeCrossSection ||
				!crossSectionCanvasRef.current
			)
				return;
			const canvas = crossSectionCanvasRef.current;
			const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);

			if (isImplantResetButtonHit(x, y, canvas.width)) {
				setImplantEntryXOffsetMm(0);
				setImplantEntryDepthMm(2);
				setImplantAngulationDeg(0);
				setSelectedMeasurement(null);
				showToast("Положение имплантата сброшено по умолчанию", "info");
				return;
			}

			const hitPart = hitTestImplantPart(
				canvas,
				activeCrossSection,
				currentImplantSpec,
				implantEntryXOffsetMm,
				implantEntryDepthMm,
				implantAngulationDeg,
				{ x, y },
			);
			if (hitPart) {
				setDragImplantPart(hitPart);
				setSelectedMeasurement({
					type: "implant" as unknown as "ruler",
					id: "active",
				} as unknown as CbctMeasurementRuler);
				setCrossSectionDragStart({
					clientX: e.clientX,
					clientY: e.clientY,
					startX: implantEntryXOffsetMm,
					startY: implantEntryDepthMm,
					startAng: implantAngulationDeg,
				});
			}
		},
		[
			studioMode,
			activeCrossSection,
			implantEntryXOffsetMm,
			implantEntryDepthMm,
			implantAngulationDeg,
			currentImplantSpec,
			activeTool,
			windowWidth,
			windowLevel,
			transforms.cross_section,
			crossSectionCanvasRef,
			setTransforms,
			setImplantEntryXOffsetMm,
			setImplantEntryDepthMm,
			setImplantAngulationDeg,
			setSelectedMeasurement,
			setDragImplantPart,
			setCrossSectionDragStart,
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
			getCrossPointerMm,
			nervePoints,
			setNervePoints,
			volume,
			transforms,
		],
	);

	const handleCrossSectionMouseMove = useCallback(
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
			if (isPanning && isPanning.plane === "cross_section") {
				applyPanDrag(
					e.clientX,
					e.clientY,
					isPanning,
					"cross_section",
					setTransforms,
				);
				return;
			}
			if (isDraggingZoom && isDraggingZoom.plane === "cross_section") {
				applyZoomDrag(
					e.clientY,
					isDraggingZoom,
					"cross_section",
					hasDraggedZoomRef,
					setTransforms,
				);
				return;
			}

			if (
				draggingMeasurementHandle &&
				draggingMeasurementHandle.plane === "cross_section" &&
				activeCrossSection &&
				crossSectionCanvasRef.current
			) {
				const canvas = crossSectionCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getCrossPointerMm(pointerPx, canvas.width);
				updateCrossSectionMeasurementDrag(
					draggingMeasurementHandle,
					pt,
					setRulers,
					setAngles,
				);
				return;
			}

			if (
				activeRuler &&
				activeRuler.plane === "cross_section" &&
				activeCrossSection &&
				crossSectionCanvasRef.current
			) {
				const canvas = crossSectionCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getCrossPointerMm(pointerPx, canvas.width);
				setActiveRuler((prev) => (prev ? { ...prev, currentMm: pt } : null));
				return;
			}

			if (
				activeAngle &&
				activeAngle.plane === "cross_section" &&
				activeCrossSection &&
				crossSectionCanvasRef.current
			) {
				const canvas = crossSectionCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getCrossPointerMm(pointerPx, canvas.width);
				setActiveAngle((prev) => (prev ? { ...prev, currentMm: pt } : null));
				return;
			}

			if (
				activeCrossSection &&
				crossSectionCanvasRef.current &&
				!dragImplantPart
			) {
				const canvas = crossSectionCanvasRef.current;
				const currentTransform =
					transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);

				const handleHit = hitTestCrossSectionHandles(
					pointerPx,
					rulers,
					angles,
					activeCrossSection,
					currentTransform,
					canvas.width,
				);
				setHoveredMeasurementHandle(
					handleHit
						? {
								type: handleHit.type,
								id: handleHit.id,
								handleIndex: handleHit.handleIndex,
								plane: "cross_section",
							}
						: null,
				);
			}

			if (!activeCrossSection || !crossSectionCanvasRef.current) return;
			const canvas = crossSectionCanvasRef.current;
			const pxSpacing = activeCrossSection.pixelSpacingMm || 0.25;

			if (!dragImplantPart || !crossSectionDragStart) {
				if (studioMode === "implant") {
					const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
					const hoverPart = hitTestImplantPart(
						canvas,
						activeCrossSection,
						currentImplantSpec,
						implantEntryXOffsetMm,
						implantEntryDepthMm,
						implantAngulationDeg,
						{ x, y },
					);
					if (hoveredImplantPart !== hoverPart)
						setHoveredImplantPart(hoverPart);
				}
				return;
			}

			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const delta = calculateImplantDragDelta(
				dragImplantPart,
				crossSectionDragStart,
				e.clientX,
				e.clientY,
				pxSpacing,
				canvas,
				activeCrossSection,
				currentImplantSpec,
				pointerPx,
			);

			if (delta.newXOffset !== undefined) {
				setImplantEntryXOffsetMm(delta.newXOffset);
			}
			if (delta.newDepth !== undefined) {
				setImplantEntryDepthMm(delta.newDepth);
			}
			if (delta.newAngulation !== undefined) {
				setImplantAngulationDeg(delta.newAngulation);
			}
		},
		[
			isDraggingWL,
			isPanning,
			isDraggingZoom,
			dragImplantPart,
			crossSectionDragStart,
			activeCrossSection,
			studioMode,
			implantEntryXOffsetMm,
			implantEntryDepthMm,
			implantAngulationDeg,
			currentImplantSpec,
			hoveredImplantPart,
			crossSectionCanvasRef,
			setWindowWidth,
			setWindowLevel,
			setTransforms,
			setHoveredImplantPart,
			setImplantEntryXOffsetMm,
			setImplantEntryDepthMm,
			setImplantAngulationDeg,
			hasDraggedZoomRef,
			draggingMeasurementHandle,
			activeRuler,
			activeAngle,
			rulers,
			angles,
			setRulers,
			setAngles,
			setActiveRuler,
			setActiveAngle,
			setHoveredMeasurementHandle,
			getCrossPointerMm,
		],
	);

	const handleCrossSectionMouseUp = useCallback(() => {
		applyZoomClick(
			isDraggingZoom,
			hasDraggedZoomRef,
			"cross_section",
			transforms,
			setTransforms,
		);
		if (
			draggingMeasurementHandle &&
			draggingMeasurementHandle.plane === "cross_section"
		) {
			setDraggingMeasurementHandle(null);
			return;
		}
		if (activeRuler && activeRuler.plane === "cross_section") {
			const fullRuler = finalizeCrossSectionRuler(activeRuler);
			if (fullRuler) {
				setRulers((prev) => [...prev, fullRuler]);
				setSelectedMeasurement(fullRuler);
				showToast(`Замер зафиксирован: ${fullRuler.distanceMm} мм`, "success");
			}
			setActiveRuler(null);
			return;
		}
		setDragImplantPart(null);
		setCrossSectionDragStart(null);
		setIsPanning(null);
		setIsDraggingZoom(null);
		setIsDraggingWL(null);
		hasDraggedZoomRef.current = false;
	}, [
		isDraggingZoom,
		transforms,
		setDragImplantPart,
		setCrossSectionDragStart,
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
		handleCrossSectionMouseDown,
		handleCrossSectionMouseMove,
		handleCrossSectionMouseUp,
	};
}
