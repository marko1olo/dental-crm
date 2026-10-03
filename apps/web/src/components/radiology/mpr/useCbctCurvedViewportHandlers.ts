/**
 * DENTE CRM — CBCT Panoramic & Cross-Section Interactive Viewport Handlers
 * Decomposed from useCbctInteractionHandlers.ts per Mandate 8b & Mandate 8k.
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import React, { useCallback, useRef, useState } from "react";
import type { CbctVoxelVolume, Point3D, ViewportTransform, CbctViewportType, CbctMeasurementRuler, CbctAngleMeasurement } from "../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	getCanvasPointerPos,
	calculateAngleBetween3Points3D,
	calculateWorldDistance3DMm,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
	slicePxToScreenPx,
} from "../cbctMprMath";
import {
	panoramicSlicePxToWorldMm,
	panoramicWorldMmToSlicePx,
	crossSectionSlicePxToWorldMm,
	crossSectionWorldMmToSlicePx,
} from "../cbctCoordinateMath";
import type { DentalArchCurve, PanoramicReconstructionResult, CrossSectionSliceData } from "../dentalCurveEngine";
import { hitTestPanoramicToothMarker, mapPanoPointerToCrosshairAndSlice } from "../dentalCurveEngine";
import { type VirtualImplantSpec, pointToSegmentDistance2D } from "../implantSafetyEngine";
import { traceMandibularNerveFastMarching } from "../fastMarchingNerve";
import { showToast } from "../../GlobalToast";
import type { CbctToolMode } from "../CbctLeftToolDock";
import type { StudioMode } from "./cbctStudioTypes";
import { getImplantCrossSectionGeometry } from "./cbctInteractionHelpers";

export interface UseCbctCurvedViewportHandlersParams {
	volume?: CbctVoxelVolume | null;
	nervePoints: Point3D[];
	setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>;
	activeTool: CbctToolMode;
	studioMode: StudioMode;
	windowWidth: number;
	setWindowWidth: React.Dispatch<React.SetStateAction<number>>;
	windowLevel: number;
	setWindowLevel: React.Dispatch<React.SetStateAction<number>>;
	transforms: Record<CbctViewportType, ViewportTransform>;
	setTransforms: React.Dispatch<React.SetStateAction<Record<CbctViewportType, ViewportTransform>>>;
	crosshairMm: Point3D;
	setCrosshairMm: React.Dispatch<React.SetStateAction<Point3D>>;
	archCurve: DentalArchCurve;
	panoramicData: PanoramicReconstructionResult | null;
	crossSections: CrossSectionSliceData[];
	activeCrossSection: CrossSectionSliceData | null;
	setActiveCrossSectionIdx: React.Dispatch<React.SetStateAction<number>>;
	currentImplantSpec: VirtualImplantSpec;
	implantEntryXOffsetMm: number;
	setImplantEntryXOffsetMm: React.Dispatch<React.SetStateAction<number>>;
	implantEntryDepthMm: number;
	setImplantEntryDepthMm: React.Dispatch<React.SetStateAction<number>>;
	implantAngulationDeg: number;
	setImplantAngulationDeg: React.Dispatch<React.SetStateAction<number>>;
	hoveredImplantPart: string | null;
	setHoveredImplantPart: React.Dispatch<React.SetStateAction<string | null>>;
	dragImplantPart: string | null;
	setDragImplantPart: React.Dispatch<React.SetStateAction<string | null>>;
	crossSectionDragStart: { clientX: number; clientY: number; startX: number; startY: number; startAng: number } | null;
	setCrossSectionDragStart: React.Dispatch<React.SetStateAction<{ clientX: number; clientY: number; startX: number; startY: number; startAng: number } | null>>;
	setSelectedMeasurement: React.Dispatch<React.SetStateAction<CbctMeasurementRuler | null>>;
	handleSelectTooth: (toothFdi: number | string) => void;
	panoCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	isDraggingWL: { startX: number; startY: number; startWW: number; startWL: number } | null;
	setIsDraggingWL: React.Dispatch<React.SetStateAction<{ startX: number; startY: number; startWW: number; startWL: number } | null>>;
	isPanning: { plane: CbctViewportType; startX: number; startY: number; startPanX: number; startPanY: number } | null;
	setIsPanning: React.Dispatch<React.SetStateAction<{ plane: CbctViewportType; startX: number; startY: number; startPanX: number; startPanY: number } | null>>;
	isDraggingZoom: { plane: CbctViewportType; startY: number; startZoom: number } | null;
	setIsDraggingZoom: React.Dispatch<React.SetStateAction<{ plane: CbctViewportType; startY: number; startZoom: number } | null>>;
	hasDraggedZoomRef: React.MutableRefObject<boolean>;
	rulers: CbctMeasurementRuler[];
	setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>;
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	setActiveRuler: React.Dispatch<React.SetStateAction<(CbctMeasurementRuler & { currentMm: Point3D }) | null>>;
	angles: CbctAngleMeasurement[];
	setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>;
	activeAngle: (CbctAngleMeasurement & { currentMm: Point3D; step?: "vertex" | "end" }) | null;
	setActiveAngle: React.Dispatch<React.SetStateAction<(CbctAngleMeasurement & { currentMm: Point3D; step?: "vertex" | "end" }) | null>>;
	hoveredMeasurementHandle: { type?: string; id: string; handleIndex: number; plane?: any } | null;
	setHoveredMeasurementHandle: React.Dispatch<React.SetStateAction<any>>;
	draggingMeasurementHandle: { type?: string; id: string; handleIndex: number; plane?: any } | null;
	setDraggingMeasurementHandle: React.Dispatch<React.SetStateAction<any>>;
}

export function useCbctCurvedViewportHandlers(params: UseCbctCurvedViewportHandlersParams) {
	const {
		volume, nervePoints, setNervePoints,
		activeTool, studioMode, windowWidth, setWindowWidth, windowLevel, setWindowLevel,
		transforms, setTransforms, crosshairMm, setCrosshairMm, archCurve, panoramicData,
		crossSections, activeCrossSection, setActiveCrossSectionIdx, currentImplantSpec,
		implantEntryXOffsetMm, setImplantEntryXOffsetMm, implantEntryDepthMm, setImplantEntryDepthMm,
		implantAngulationDeg, setImplantAngulationDeg, hoveredImplantPart, setHoveredImplantPart,
		dragImplantPart, setDragImplantPart, crossSectionDragStart, setCrossSectionDragStart,
		setSelectedMeasurement, handleSelectTooth, panoCanvasRef, crossSectionCanvasRef,
		isDraggingWL, setIsDraggingWL, isPanning, setIsPanning, isDraggingZoom, setIsDraggingZoom,
		hasDraggedZoomRef,
		rulers, setRulers, activeRuler, setActiveRuler,
		angles, setAngles, activeAngle, setActiveAngle,
		hoveredMeasurementHandle, setHoveredMeasurementHandle,
		draggingMeasurementHandle, setDraggingMeasurementHandle,
	} = params;

	const getPanoPointerMm = useCallback((pointerPx: { readonly x: number; readonly y: number }): Point3D => {
		const t = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
		const slicePx = { x: (pointerPx.x - t.panX) / t.zoom, y: (pointerPx.y - t.panY) / t.zoom };
		return panoramicSlicePxToWorldMm(slicePx, panoramicData ?? { widthPx: 1000, heightPx: 500 }, archCurve.totalArcLengthMm);
	}, [transforms.panoramic, panoramicData, archCurve.totalArcLengthMm]);

	const getCrossPointerMm = useCallback((pointerPx: { readonly x: number; readonly y: number }, cW: number): Point3D => {
		const t = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
		const slicePx = { x: (pointerPx.x - t.panX) / t.zoom, y: (pointerPx.y - t.panY) / t.zoom };
		return crossSectionSlicePxToWorldMm(slicePx, activeCrossSection ?? { widthPx: 400, heightPx: 400 }, cW);
	}, [transforms.cross_section, activeCrossSection]);

	const [isDraggingPano, setIsDraggingPano] = useState<boolean>(false);
	const pendingPanoSyncRef = useRef<{ crossSectionIdx: number; worldMm: Point3D } | null>(null);
	const rafPanoIdRef = useRef<number | null>(null);

	const handlePanoMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (e.button === 2 || activeTool === "window_level") {
			e.preventDefault();
			setIsDraggingWL({ startX: e.clientX, startY: e.clientY, startWW: windowWidth, startWL: windowLevel });
			return;
		}
		if (activeTool === "pan" || e.button === 1) {
			e.preventDefault();
			const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
			setIsPanning({ plane: "panoramic", startX: e.clientX, startY: e.clientY, startPanX: currentTransform.panX, startPanY: currentTransform.panY });
			return;
		}
		if (activeTool === "zoom") {
			e.preventDefault();
			const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
			if (e.altKey) {
				const nextZoom = Math.max(0.5, Number((currentTransform.zoom * 0.8).toFixed(2)));
				setTransforms((prev) => ({ ...prev, panoramic: { ...(prev.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
				return;
			}
			hasDraggedZoomRef.current = false;
			setIsDraggingZoom({ plane: "panoramic", startY: e.clientY, startZoom: currentTransform.zoom });
			return;
		}
		if (activeTool === "ruler") {
			if (panoramicData && panoCanvasRef.current) {
				const canvas = panoCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getPanoPointerMm(pointerPx);
				setActiveRuler({ id: `ruler-${Date.now()}`, plane: "panoramic", startMm: pt, endMm: pt, currentMm: pt, distanceMm: 0 });
			}
			return;
		}
		if (activeTool === "angle") {
			if (panoramicData && panoCanvasRef.current) {
				const canvas = panoCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getPanoPointerMm(pointerPx);
				if (!activeAngle) {
					setActiveAngle({ id: `angle-${Date.now()}`, plane: "panoramic", startMm: pt, vertexMm: pt, endMm: pt, currentMm: pt, angleDeg: 0, step: "vertex" } as unknown as CbctAngleMeasurement & { currentMm: Point3D });
					showToast("Точка 1 (плечо) установлена. Кликните для установки вершины угла", "info");
					return;
				}
				if ((activeAngle as unknown as { step?: "vertex" | "end" }).step === "vertex") {
					setActiveAngle({ ...activeAngle, vertexMm: pt, endMm: pt, currentMm: pt, step: "end" } as unknown as CbctAngleMeasurement & { currentMm: Point3D; step?: "vertex" | "end" });
					showToast("Вершина угла зафиксирована. Кликните для фиксации второго плеча", "info");
					return;
				}
				const deg = calculateAngleBetween3Points3D(activeAngle.startMm, activeAngle.vertexMm, pt);
				const full: CbctAngleMeasurement = { id: activeAngle.id, plane: "panoramic", startMm: activeAngle.startMm, vertexMm: activeAngle.vertexMm, endMm: pt, angleDeg: deg };
				setAngles((prev) => [...prev, full]);
				setActiveAngle(null);
				setSelectedMeasurement(full as unknown as CbctMeasurementRuler);
				showToast(`Измерение угла зафиксировано: ${deg}°`, "success");
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
					showToast("Точка 1/2 (ОПТГ): Ментальное отверстие зафиксировано. Кликните Foramen mandibulae для автотрассировки Fast Marching", "info");
					return;
				}

				if (nervePoints.length === 1 && volume) {
					const startSeed = nervePoints[0]!;
					const endSeed = pointMm;
					try {
						const marchResult = traceMandibularNerveFastMarching(volume, startSeed, endSeed);
						setNervePoints(marchResult.controlPoints as Point3D[]);
						showToast(
							`Канал IAN успешно сегментирован (Fast Marching 2-Seed Vatech): 3D-длина ${marchResult.totalLengthMm} мм (${marchResult.controlPoints.length} узлов за ${marchResult.executionTimeMs} мс)`,
							"success",
						);
					} catch {
						setNervePoints([startSeed, endSeed]);
						showToast("Зафиксированы 2 точки канала IAN", "info");
					}
					return;
				}

				setNervePoints((prev) => [...prev, pointMm]);
				showToast(`Добавлен дополнительный узел нижнечелюстного канала #${nervePoints.length + 1}`, "info");
			}
			return;
		}

		if (panoramicData && panoCanvasRef.current) {
			const canvas = panoCanvasRef.current;
			const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const toScreen = (p: Point3D) => slicePxToScreenPx(panoramicWorldMmToSlicePx(p, panoramicData, archCurve.totalArcLengthMm), currentTransform);
			const pRulers = rulers.filter((r) => r.plane === "panoramic").map((r) => ({ id: r.id, plane: r.plane, startPx: toScreen(r.startMm), endPx: toScreen(r.endMm) }));
			const pAngles = angles.filter((a) => a.plane === "panoramic").map((a) => ({ id: a.id, plane: a.plane, startPx: toScreen(a.startMm), vertexPx: toScreen(a.vertexMm), endPx: toScreen(a.endMm) }));

			const handleHit = hitTestMeasurementHandle(pointerPx, pRulers, pAngles, 12);
			if (handleHit) {
				setDraggingMeasurementHandle({ type: handleHit.type, id: handleHit.id, handleIndex: handleHit.handleIndex, plane: "panoramic" });
				setSelectedMeasurement({ type: handleHit.type, id: handleHit.id } as unknown as CbctMeasurementRuler);
				return;
			}

			const objectHit = hitTestMeasurementObject(pointerPx, pRulers, pAngles, [], 10);
			if (objectHit) {
				if (objectHit.isDeleteButtonHit) {
					if (objectHit.type === "ruler") { setRulers((prev) => prev.filter((r) => r.id !== objectHit.id)); showToast("Измерение линейки удалено", "info"); }
					else if (objectHit.type === "angle") { setAngles((prev) => prev.filter((a) => a.id !== objectHit.id)); showToast("Измерение угла удалено", "info"); }
					setSelectedMeasurement(null);
					return;
				}
				setSelectedMeasurement({ type: objectHit.type, id: objectHit.id } as unknown as CbctMeasurementRuler);
				return;
			}
		}

		if (crossSections.length === 0 || !panoCanvasRef.current) return;
		setIsDraggingPano(true);
		const canvas = panoCanvasRef.current;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		if (panoramicData?.toothMarkersOnPano) {
			const hitMarker = hitTestPanoramicToothMarker({ x, y }, panoramicData.toothMarkersOnPano, transforms.panoramic);
			if (hitMarker) {
				handleSelectTooth(hitMarker.toothFdi);
				return;
			}
		}
		const syncRes = mapPanoPointerToCrosshairAndSlice({ x, y }, { width: canvas.width, height: canvas.height }, archCurve, crossSections, crosshairMm, transforms.panoramic);
		setActiveCrossSectionIdx(syncRes.crossSectionIdx);
		setCrosshairMm(syncRes.worldMm);
	}, [crossSections, archCurve, crosshairMm, transforms.panoramic, panoramicData, handleSelectTooth, activeTool, windowWidth, windowLevel, panoCanvasRef, setTransforms, setActiveCrossSectionIdx, setCrosshairMm, setIsDraggingWL, setIsPanning, setIsDraggingZoom, hasDraggedZoomRef, rulers, setRulers, setActiveRuler, angles, setAngles, activeAngle, setActiveAngle, setDraggingMeasurementHandle, setSelectedMeasurement, getPanoPointerMm, nervePoints, setNervePoints, volume]);

	const handlePanoMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (isDraggingWL) {
			const dx = e.clientX - isDraggingWL.startX;
			const dy = e.clientY - isDraggingWL.startY;
			setWindowWidth(Math.max(100, Math.min(10000, Math.round(isDraggingWL.startWW + dx * 8))));
			setWindowLevel(Math.max(-1000, Math.min(4000, Math.round(isDraggingWL.startWL - dy * 4))));
			return;
		}
		if (isPanning && isPanning.plane === "panoramic") {
			const dx = e.clientX - isPanning.startX;
			const dy = e.clientY - isPanning.startY;
			setTransforms((prev) => ({
				...prev,
				panoramic: { ...(prev.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM), panX: isPanning.startPanX + dx, panY: isPanning.startPanY + dy },
			}));
			return;
		}
		if (isDraggingZoom && isDraggingZoom.plane === "panoramic") {
			hasDraggedZoomRef.current = true;
			const dy = isDraggingZoom.startY - e.clientY;
			const zoomFactor = Math.exp(dy * 0.01);
			const nextZoom = Math.max(0.5, Math.min(5.0, Number((isDraggingZoom.startZoom * zoomFactor).toFixed(2))));
			setTransforms((prev) => ({
				...prev,
				panoramic: { ...(prev.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom },
			}));
			return;
		}

		if (draggingMeasurementHandle && draggingMeasurementHandle.plane === "panoramic" && panoCanvasRef.current) {
			const canvas = panoCanvasRef.current;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const pt = getPanoPointerMm(pointerPx);
			if (draggingMeasurementHandle.type === "ruler") {
				setRulers((prev) => prev.map((r) => {
					if (r.id !== draggingMeasurementHandle.id) return r;
					const startMm = draggingMeasurementHandle.handleIndex === 0 ? pt : r.startMm;
					const endMm = draggingMeasurementHandle.handleIndex === 1 ? pt : r.endMm;
					return { ...r, startMm, endMm, distanceMm: calculateWorldDistance3DMm(startMm, endMm) };
				}));
			} else if (draggingMeasurementHandle.type === "angle") {
				setAngles((prev) => prev.map((a) => {
					if (a.id !== draggingMeasurementHandle.id) return a;
					const startMm = draggingMeasurementHandle.handleIndex === 0 ? pt : a.startMm;
					const vertexMm = draggingMeasurementHandle.handleIndex === 1 ? pt : a.vertexMm;
					const endMm = draggingMeasurementHandle.handleIndex === 2 ? pt : a.endMm;
					return { ...a, startMm, vertexMm, endMm, angleDeg: calculateAngleBetween3Points3D(startMm, vertexMm, endMm) };
				}));
			}
			return;
		}

		if (activeRuler && activeRuler.plane === "panoramic" && panoCanvasRef.current) {
			const canvas = panoCanvasRef.current;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const pt = getPanoPointerMm(pointerPx);
			setActiveRuler((prev) => (prev ? { ...prev, currentMm: pt } : null));
			return;
		}

		if (activeAngle && activeAngle.plane === "panoramic" && panoCanvasRef.current) {
			const canvas = panoCanvasRef.current;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const pt = getPanoPointerMm(pointerPx);
			setActiveAngle((prev) => (prev ? { ...prev, currentMm: pt } : null));
			return;
		}

		if (!isDraggingPano && panoCanvasRef.current && panoramicData) {
			const canvas = panoCanvasRef.current;
			const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const toScreen = (p: Point3D) => slicePxToScreenPx(panoramicWorldMmToSlicePx(p, panoramicData, archCurve.totalArcLengthMm), currentTransform);
			const pRulers = rulers.filter((r) => r.plane === "panoramic").map((r) => ({ id: r.id, plane: r.plane, startPx: toScreen(r.startMm), endPx: toScreen(r.endMm) }));
			const pAngles = angles.filter((a) => a.plane === "panoramic").map((a) => ({ id: a.id, plane: a.plane, startPx: toScreen(a.startMm), vertexPx: toScreen(a.vertexMm), endPx: toScreen(a.endMm) }));
			const handleHit = hitTestMeasurementHandle(pointerPx, pRulers, pAngles, 12);
			setHoveredMeasurementHandle(handleHit ? { type: handleHit.type, id: handleHit.id, handleIndex: handleHit.handleIndex, plane: "panoramic" } : null);
		}

		if (!isDraggingPano || crossSections.length === 0 || !panoCanvasRef.current) return;
		const canvas = panoCanvasRef.current;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const syncRes = mapPanoPointerToCrosshairAndSlice({ x, y }, { width: canvas.width, height: canvas.height }, archCurve, crossSections, crosshairMm, transforms.panoramic);
		pendingPanoSyncRef.current = syncRes;
		if (rafPanoIdRef.current === null) {
			rafPanoIdRef.current = requestAnimationFrame(() => {
				if (pendingPanoSyncRef.current) {
					setActiveCrossSectionIdx(pendingPanoSyncRef.current.crossSectionIdx);
					setCrosshairMm(pendingPanoSyncRef.current.worldMm);
				}
				rafPanoIdRef.current = null;
			});
		}
	}, [isDraggingWL, isPanning, isDraggingZoom, isDraggingPano, crossSections, archCurve, crosshairMm, transforms.panoramic, panoCanvasRef, setWindowWidth, setWindowLevel, setTransforms, setActiveCrossSectionIdx, setCrosshairMm, hasDraggedZoomRef, draggingMeasurementHandle, activeRuler, activeAngle, panoramicData, rulers, angles, setRulers, setAngles, setActiveRuler, setActiveAngle, setHoveredMeasurementHandle, getPanoPointerMm]);

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
		if (isDraggingZoom && !hasDraggedZoomRef.current && isDraggingZoom.plane === "panoramic") {
			const currentTransform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
			const nextZoom = Math.min(5.0, Number((currentTransform.zoom * 1.25).toFixed(2)));
			setTransforms((prev) => ({ ...prev, panoramic: { ...(prev.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
		}
		if (draggingMeasurementHandle && draggingMeasurementHandle.plane === "panoramic") {
			setDraggingMeasurementHandle(null);
			return;
		}
		if (activeRuler && activeRuler.plane === "panoramic") {
			const distMm = calculateWorldDistance3DMm(activeRuler.startMm, activeRuler.currentMm);
			if (distMm >= 0.5) {
				const fullRuler: CbctMeasurementRuler = { id: activeRuler.id, plane: "panoramic", startMm: activeRuler.startMm, endMm: activeRuler.currentMm, distanceMm: distMm };
				setRulers((prev) => [...prev, fullRuler]);
				setSelectedMeasurement(fullRuler);
				showToast(`Замер зафиксирован: ${distMm} мм`, "success");
			}
			setActiveRuler(null);
			return;
		}
		setIsDraggingPano(false);
		setIsPanning(null);
		setIsDraggingZoom(null);
		setIsDraggingWL(null);
		hasDraggedZoomRef.current = false;
	}, [isDraggingZoom, transforms.panoramic, setActiveCrossSectionIdx, setCrosshairMm, setTransforms, setIsPanning, setIsDraggingZoom, setIsDraggingWL, hasDraggedZoomRef, draggingMeasurementHandle, activeRuler, setDraggingMeasurementHandle, setRulers, setSelectedMeasurement, setActiveRuler]);

	const handleCrossSectionMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (e.button === 2 || activeTool === "window_level") {
			e.preventDefault();
			setIsDraggingWL({ startX: e.clientX, startY: e.clientY, startWW: windowWidth, startWL: windowLevel });
			return;
		}
		if (activeTool === "pan" || e.button === 1) {
			e.preventDefault();
			const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
			setIsPanning({ plane: "cross_section", startX: e.clientX, startY: e.clientY, startPanX: currentTransform.panX, startPanY: currentTransform.panY });
			return;
		}
		if (activeTool === "zoom") {
			e.preventDefault();
			const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
			if (e.altKey) {
				const nextZoom = Math.max(0.5, Number((currentTransform.zoom * 0.8).toFixed(2)));
				setTransforms((prev) => ({ ...prev, cross_section: { ...(prev.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
				return;
			}
			hasDraggedZoomRef.current = false;
			setIsDraggingZoom({ plane: "cross_section", startY: e.clientY, startZoom: currentTransform.zoom });
			return;
		}
		if (activeTool === "ruler") {
			if (activeCrossSection && crossSectionCanvasRef.current) {
				const canvas = crossSectionCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getCrossPointerMm(pointerPx, canvas.width);
				setActiveRuler({ id: `ruler-${Date.now()}`, plane: "cross_section", startMm: pt, endMm: pt, currentMm: pt, distanceMm: 0 });
			}
			return;
		}
		if (activeTool === "angle") {
			if (activeCrossSection && crossSectionCanvasRef.current) {
				const canvas = crossSectionCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const pt = getCrossPointerMm(pointerPx, canvas.width);
				if (!activeAngle) {
					setActiveAngle({ id: `angle-${Date.now()}`, plane: "cross_section", startMm: pt, vertexMm: pt, endMm: pt, currentMm: pt, angleDeg: 0, step: "vertex" } as unknown as CbctAngleMeasurement & { currentMm: Point3D });
					showToast("Точка 1 (плечо) установлена. Кликните для установки вершины угла", "info");
					return;
				}
				if ((activeAngle as unknown as { step?: "vertex" | "end" }).step === "vertex") {
					setActiveAngle({ ...activeAngle, vertexMm: pt, endMm: pt, currentMm: pt, step: "end" } as unknown as CbctAngleMeasurement & { currentMm: Point3D; step?: "vertex" | "end" });
					showToast("Вершина угла зафиксирована. Кликните для фиксации второго плеча", "info");
					return;
				}
				const deg = calculateAngleBetween3Points3D(activeAngle.startMm, activeAngle.vertexMm, pt);
				const full: CbctAngleMeasurement = { id: activeAngle.id, plane: "cross_section", startMm: activeAngle.startMm, vertexMm: activeAngle.vertexMm, endMm: pt, angleDeg: deg };
				setAngles((prev) => [...prev, full]);
				setActiveAngle(null);
				setSelectedMeasurement(full as unknown as CbctMeasurementRuler);
				showToast(`Измерение угла зафиксировано: ${deg}°`, "success");
			}
			return;
		}

		if (activeTool === "nerve") {
			if (activeCrossSection && crossSectionCanvasRef.current) {
				const canvas = crossSectionCanvasRef.current;
				const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const localMm = getCrossPointerMm(pointerPx, canvas.width);
				const crestZ = activeCrossSection.centerPointMm.z + (activeCrossSection.heightMm / 2.0 - 4.0);
				const pointMm: Point3D = {
					x: Number((activeCrossSection.centerPointMm.x + activeCrossSection.normalVector2D.x * localMm.x).toFixed(2)),
					y: Number((activeCrossSection.centerPointMm.y + activeCrossSection.normalVector2D.y * localMm.x).toFixed(2)),
					z: Number((crestZ - localMm.z).toFixed(2)),
				};

				if (nervePoints.length === 0) {
					setNervePoints([pointMm]);
					showToast("Точка 1/2 (Кросс-секция): Ментальное отверстие зафиксировано. Кликните Foramen mandibulae для автотрассировки Fast Marching", "info");
					return;
				}

				if (nervePoints.length === 1 && volume) {
					const startSeed = nervePoints[0]!;
					const endSeed = pointMm;
					try {
						const marchResult = traceMandibularNerveFastMarching(volume, startSeed, endSeed);
						setNervePoints(marchResult.controlPoints as Point3D[]);
						showToast(
							`Канал IAN успешно сегментирован (Fast Marching 2-Seed Vatech): 3D-длина ${marchResult.totalLengthMm} мм (${marchResult.controlPoints.length} узлов за ${marchResult.executionTimeMs} мс)`,
							"success",
						);
					} catch {
						setNervePoints([startSeed, endSeed]);
						showToast("Зафиксированы 2 точки канала IAN", "info");
					}
					return;
				}

				setNervePoints((prev) => [...prev, pointMm]);
				showToast(`Добавлен дополнительный узел нижнечелюстного канала #${nervePoints.length + 1}`, "info");
			}
			return;
		}

		if (activeCrossSection && crossSectionCanvasRef.current) {
			const canvas = crossSectionCanvasRef.current;
			const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const toScreen = (p: Point3D) => slicePxToScreenPx(crossSectionWorldMmToSlicePx(p, activeCrossSection, canvas.width), currentTransform);
			const pRulers = rulers.filter((r) => r.plane === "cross_section").map((r) => ({ id: r.id, plane: r.plane, startPx: toScreen(r.startMm), endPx: toScreen(r.endMm) }));
			const pAngles = angles.filter((a) => a.plane === "cross_section").map((a) => ({ id: a.id, plane: a.plane, startPx: toScreen(a.startMm), vertexPx: toScreen(a.vertexMm), endPx: toScreen(a.endMm) }));

			const handleHit = hitTestMeasurementHandle(pointerPx, pRulers, pAngles, 12);
			if (handleHit) {
				setDraggingMeasurementHandle({ type: handleHit.type, id: handleHit.id, handleIndex: handleHit.handleIndex, plane: "cross_section" });
				setSelectedMeasurement({ type: handleHit.type, id: handleHit.id } as unknown as CbctMeasurementRuler);
				return;
			}

			const objectHit = hitTestMeasurementObject(pointerPx, pRulers, pAngles, [], 10);
			if (objectHit) {
				if (objectHit.isDeleteButtonHit) {
					if (objectHit.type === "ruler") { setRulers((prev) => prev.filter((r) => r.id !== objectHit.id)); showToast("Измерение линейки удалено", "info"); }
					else if (objectHit.type === "angle") { setAngles((prev) => prev.filter((a) => a.id !== objectHit.id)); showToast("Измерение угла удалено", "info"); }
					setSelectedMeasurement(null);
					return;
				}
				setSelectedMeasurement({ type: objectHit.type, id: objectHit.id } as unknown as CbctMeasurementRuler);
				return;
			}
		}

		if (studioMode !== "implant" || !activeCrossSection || !crossSectionCanvasRef.current) return;
		const canvas = crossSectionCanvasRef.current;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);

		if (x >= canvas.width - 85 && x <= canvas.width - 10 && y >= 8 && y <= 30) {
			setImplantEntryXOffsetMm(0);
			setImplantEntryDepthMm(2);
			setImplantAngulationDeg(0);
			setSelectedMeasurement(null);
			showToast("Положение имплантата сброшено по умолчанию", "info");
			return;
		}

		const { entryPxX, entryPxY, apexPxX, apexPxY, radiusPx } = getImplantCrossSectionGeometry(
			canvas, activeCrossSection, currentImplantSpec, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg,
		);
		const distToEntry = Math.hypot(x - entryPxX, y - entryPxY);
		const distToApex = Math.hypot(x - apexPxX, y - apexPxY);
		const hitPart = distToEntry <= 12 ? "entry" : distToApex <= 12 ? "apex" : pointToSegmentDistance2D({ x, y }, { x: entryPxX, y: entryPxY }, { x: apexPxX, y: apexPxY }).distance <= radiusPx + 10 ? "body" : null;
		if (hitPart) {
			setDragImplantPart(hitPart);
			setSelectedMeasurement({ type: "implant" as unknown as "ruler", id: "active" } as unknown as CbctMeasurementRuler);
			setCrossSectionDragStart({ clientX: e.clientX, clientY: e.clientY, startX: implantEntryXOffsetMm, startY: implantEntryDepthMm, startAng: implantAngulationDeg });
		}
	}, [studioMode, activeCrossSection, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg, currentImplantSpec, activeTool, windowWidth, windowLevel, transforms.cross_section, crossSectionCanvasRef, setTransforms, setImplantEntryXOffsetMm, setImplantEntryDepthMm, setImplantAngulationDeg, setSelectedMeasurement, setDragImplantPart, setCrossSectionDragStart, setIsDraggingWL, setIsPanning, setIsDraggingZoom, hasDraggedZoomRef, rulers, setRulers, setActiveRuler, angles, setAngles, activeAngle, setActiveAngle, setDraggingMeasurementHandle, getCrossPointerMm, nervePoints, setNervePoints, volume]);

	const handleCrossSectionMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (isDraggingWL) {
			const dx = e.clientX - isDraggingWL.startX;
			const dy = e.clientY - isDraggingWL.startY;
			setWindowWidth(Math.max(100, Math.min(10000, Math.round(isDraggingWL.startWW + dx * 8))));
			setWindowLevel(Math.max(-1000, Math.min(4000, Math.round(isDraggingWL.startWL - dy * 4))));
			return;
		}
		if (isPanning && isPanning.plane === "cross_section") {
			const dx = e.clientX - isPanning.startX;
			const dy = e.clientY - isPanning.startY;
			setTransforms((prev) => ({
				...prev,
				cross_section: { ...(prev.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM), panX: isPanning.startPanX + dx, panY: isPanning.startPanY + dy },
			}));
			return;
		}
		if (isDraggingZoom && isDraggingZoom.plane === "cross_section") {
			hasDraggedZoomRef.current = true;
			const dy = isDraggingZoom.startY - e.clientY;
			const zoomFactor = Math.exp(dy * 0.01);
			const nextZoom = Math.max(0.5, Math.min(5.0, Number((isDraggingZoom.startZoom * zoomFactor).toFixed(2))));
			setTransforms((prev) => ({
				...prev,
				cross_section: { ...(prev.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom },
			}));
			return;
		}

		if (draggingMeasurementHandle && draggingMeasurementHandle.plane === "cross_section" && activeCrossSection && crossSectionCanvasRef.current) {
			const canvas = crossSectionCanvasRef.current;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const pt = getCrossPointerMm(pointerPx, canvas.width);
			if (draggingMeasurementHandle.type === "ruler") {
				setRulers((prev) => prev.map((r) => {
					if (r.id !== draggingMeasurementHandle.id) return r;
					const startMm = draggingMeasurementHandle.handleIndex === 0 ? pt : r.startMm;
					const endMm = draggingMeasurementHandle.handleIndex === 1 ? pt : r.endMm;
					return { ...r, startMm, endMm, distanceMm: calculateWorldDistance3DMm(startMm, endMm) };
				}));
			} else if (draggingMeasurementHandle.type === "angle") {
				setAngles((prev) => prev.map((a) => {
					if (a.id !== draggingMeasurementHandle.id) return a;
					const startMm = draggingMeasurementHandle.handleIndex === 0 ? pt : a.startMm;
					const vertexMm = draggingMeasurementHandle.handleIndex === 1 ? pt : a.vertexMm;
					const endMm = draggingMeasurementHandle.handleIndex === 2 ? pt : a.endMm;
					return { ...a, startMm, vertexMm, endMm, angleDeg: calculateAngleBetween3Points3D(startMm, vertexMm, endMm) };
				}));
			}
			return;
		}

		if (activeRuler && activeRuler.plane === "cross_section" && activeCrossSection && crossSectionCanvasRef.current) {
			const canvas = crossSectionCanvasRef.current;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const pt = getCrossPointerMm(pointerPx, canvas.width);
			setActiveRuler((prev) => (prev ? { ...prev, currentMm: pt } : null));
			return;
		}

		if (activeAngle && activeAngle.plane === "cross_section" && activeCrossSection && crossSectionCanvasRef.current) {
			const canvas = crossSectionCanvasRef.current;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const pt = getCrossPointerMm(pointerPx, canvas.width);
			setActiveAngle((prev) => (prev ? { ...prev, currentMm: pt } : null));
			return;
		}

		if (activeCrossSection && crossSectionCanvasRef.current && !dragImplantPart) {
			const canvas = crossSectionCanvasRef.current;
			const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const toScreen = (p: Point3D) => slicePxToScreenPx(crossSectionWorldMmToSlicePx(p, activeCrossSection, canvas.width), currentTransform);
			const pRulers = rulers.filter((r) => r.plane === "cross_section").map((r) => ({ id: r.id, plane: r.plane, startPx: toScreen(r.startMm), endPx: toScreen(r.endMm) }));
			const pAngles = angles.filter((a) => a.plane === "cross_section").map((a) => ({ id: a.id, plane: a.plane, startPx: toScreen(a.startMm), vertexPx: toScreen(a.vertexMm), endPx: toScreen(a.endMm) }));
			const handleHit = hitTestMeasurementHandle(pointerPx, pRulers, pAngles, 12);
			setHoveredMeasurementHandle(handleHit ? { type: handleHit.type, id: handleHit.id, handleIndex: handleHit.handleIndex, plane: "cross_section" } : null);
		}

		if (!activeCrossSection || !crossSectionCanvasRef.current) return;
		const canvas = crossSectionCanvasRef.current;
		const pxSpacing = activeCrossSection.pixelSpacingMm || 0.25;

		if (!dragImplantPart || !crossSectionDragStart) {
			if (studioMode === "implant") {
				const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
				const { entryPxX, entryPxY, apexPxX, apexPxY, radiusPx } = getImplantCrossSectionGeometry(
					canvas, activeCrossSection, currentImplantSpec, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg,
				);
				const distToEntry = Math.hypot(x - entryPxX, y - entryPxY);
				const distToApex = Math.hypot(x - apexPxX, y - apexPxY);
				const seg = pointToSegmentDistance2D({ x, y }, { x: entryPxX, y: entryPxY }, { x: apexPxX, y: apexPxY });
				const hoverPart = distToEntry <= 12 ? "entry" : distToApex <= 12 ? "apex" : seg.distance <= radiusPx + 10 ? "body" : null;
				if (hoveredImplantPart !== hoverPart) setHoveredImplantPart(hoverPart);
			}
			return;
		}

		const dxPx = e.clientX - crossSectionDragStart.clientX;
		const dyPx = e.clientY - crossSectionDragStart.clientY;

		if (dragImplantPart === "entry" || dragImplantPart === "body") {
			const newX = Math.max(-8.0, Math.min(8.0, crossSectionDragStart.startX + dxPx * pxSpacing));
			const newY = Math.max(0.0, Math.min(15.0, crossSectionDragStart.startY + dyPx * pxSpacing));
			setImplantEntryXOffsetMm(Number(newX.toFixed(1)));
			setImplantEntryDepthMm(Number(newY.toFixed(1)));
		} else if (dragImplantPart === "apex") {
			const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const { entryPxX, entryPxY } = getImplantCrossSectionGeometry(
				canvas, activeCrossSection, currentImplantSpec, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg,
			);
			const relX = x - entryPxX;
			const relY = y - entryPxY;
			if (Math.hypot(relX, relY) > 8) {
				const angleDeg = Math.round((Math.atan2(relX, relY) * 180) / Math.PI);
				setImplantAngulationDeg(Math.max(-30, Math.min(30, angleDeg)));
			}
		}
	}, [isDraggingWL, isPanning, isDraggingZoom, dragImplantPart, crossSectionDragStart, activeCrossSection, studioMode, implantEntryXOffsetMm, implantEntryDepthMm, implantAngulationDeg, currentImplantSpec, hoveredImplantPart, crossSectionCanvasRef, setWindowWidth, setWindowLevel, setTransforms, setHoveredImplantPart, setImplantEntryXOffsetMm, setImplantEntryDepthMm, setImplantAngulationDeg, hasDraggedZoomRef, draggingMeasurementHandle, activeRuler, activeAngle, rulers, angles, setRulers, setAngles, setActiveRuler, setActiveAngle, setHoveredMeasurementHandle, getCrossPointerMm]);

	const handleCrossSectionMouseUp = useCallback(() => {
		if (isDraggingZoom && !hasDraggedZoomRef.current && isDraggingZoom.plane === "cross_section") {
			const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
			const nextZoom = Math.min(5.0, Number((currentTransform.zoom * 1.25).toFixed(2)));
			setTransforms((prev) => ({ ...prev, cross_section: { ...(prev.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
		}
		if (draggingMeasurementHandle && draggingMeasurementHandle.plane === "cross_section") {
			setDraggingMeasurementHandle(null);
			return;
		}
		if (activeRuler && activeRuler.plane === "cross_section") {
			const distMm = calculateWorldDistance3DMm(activeRuler.startMm, activeRuler.currentMm);
			if (distMm >= 0.5) {
				const fullRuler: CbctMeasurementRuler = { id: activeRuler.id, plane: "cross_section", startMm: activeRuler.startMm, endMm: activeRuler.currentMm, distanceMm: distMm };
				setRulers((prev) => [...prev, fullRuler]);
				setSelectedMeasurement(fullRuler);
				showToast(`Замер зафиксирован: ${distMm} мм`, "success");
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
	}, [isDraggingZoom, transforms.cross_section, setDragImplantPart, setCrossSectionDragStart, setTransforms, setIsPanning, setIsDraggingZoom, setIsDraggingWL, hasDraggedZoomRef, draggingMeasurementHandle, activeRuler, setDraggingMeasurementHandle, setRulers, setSelectedMeasurement, setActiveRuler]);

	return {
		isDraggingPano,
		handlePanoMouseDown,
		handlePanoMouseMove,
		handlePanoMouseUp,
		handleCrossSectionMouseDown,
		handleCrossSectionMouseMove,
		handleCrossSectionMouseUp,
	};
}
