import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
	CbctVoxelVolume,
	Point3D,
	Point2D,
	ObliqueRotationAngles,
	RotationHandlePosition,
	ViewportTransform,
	CbctMeasurementRuler,
	CbctAngleMeasurement,
	CbctProbeMarker,
	MprPlane,
	CbctViewportType,
} from "../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	applyCursorZoom,
	calculateAngleBetween3Points3D,
	calculateAngleFromHandleDrag,
	calculateAngleFromShiftDrag,
	calculateCrosshairDragWorldMm,
	clampCoordinateToVolume,
	getCanvasPointerPos,
	getRotationHandles,
	hitTestCrosshairCenter,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
	hitTestRotationHandle,
	mapCanvasPointerToWorldMmWithTransform,
	resetPlaneObliqueAngle,
	sampleVoxelHU,
	getTissueNameFromHU,
	slicePxToScreenPx,
	worldMmToSlicePx,
	worldMmToVoxel,
} from "../cbctMprMath";
import {
	DEFAULT_OBLIQUE_ROTATION,
	computeObliquePlaneBasis,
} from "../cbctObliqueMatrixMath";
import { calculateWheelSliceDelta } from "../cbctObliqueMath";
import type { DentalArchCurve, PanoramicReconstructionResult, CrossSectionSliceData } from "../dentalCurveEngine";
import {
	findCrossSectionAndPositionByFdi,
	hitTestDentalArchControlPoint,
	updateDentalArchAnchorPosition,
} from "../dentalCurveEngine";
import type { VirtualImplantSpec } from "../implantSafetyEngine";
import { showToast } from "../../GlobalToast";
import type { CbctToolMode } from "../CbctLeftToolDock";
import { ROTATE_CURSOR, type StudioMode } from "./cbctStudioTypes";
import {
	projectMeasurementsToSlice,
	updateDraggedMeasurementRuler,
	updateDraggedMeasurementAngle,
} from "./cbctInteractionHelpers";
import { useCbctCurvedViewportHandlers } from "./useCbctCurvedViewportHandlers";

export interface UseCbctInteractionHandlersParams {
	volume: CbctVoxelVolume | null;
	crosshairMm: Point3D; setCrosshairMm: React.Dispatch<React.SetStateAction<Point3D>>;
	obliqueAngles: ObliqueRotationAngles; setObliqueAngles: React.Dispatch<React.SetStateAction<ObliqueRotationAngles>>;
	activeTool: CbctToolMode; studioMode: StudioMode;
	windowWidth: number; setWindowWidth: React.Dispatch<React.SetStateAction<number>>;
	windowLevel: number; setWindowLevel: React.Dispatch<React.SetStateAction<number>>;
	transforms: Record<CbctViewportType, ViewportTransform>; setTransforms: React.Dispatch<React.SetStateAction<Record<CbctViewportType, ViewportTransform>>>;
	rulers: CbctMeasurementRuler[]; setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>;
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null; setActiveRuler: React.Dispatch<React.SetStateAction<(CbctMeasurementRuler & { currentMm: Point3D }) | null>>;
	angles: CbctAngleMeasurement[]; setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>;
	activeAngle: (CbctAngleMeasurement & { currentMm: Point3D }) | null; setActiveAngle: React.Dispatch<React.SetStateAction<(CbctAngleMeasurement & { currentMm: Point3D }) | null>>;
	probeMarkers: CbctProbeMarker[]; setProbeMarkers: React.Dispatch<React.SetStateAction<CbctProbeMarker[]>>;
	activeProbe: (CbctProbeMarker & { hu: number; tissueName: string }) | null; setActiveProbe: React.Dispatch<React.SetStateAction<(CbctProbeMarker & { hu: number; tissueName: string }) | null>>;
	selectedMeasurement: CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null; setSelectedMeasurement: React.Dispatch<React.SetStateAction<CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null>>;
	hoveredMeasurementHandle: { id: string; handleIndex: number; plane?: MprPlane } | null; setHoveredMeasurementHandle: React.Dispatch<React.SetStateAction<{ id: string; handleIndex: number; plane?: MprPlane } | null>>;
	draggingMeasurementHandle: { id: string; handleIndex: number; plane?: MprPlane; type?: string } | null; setDraggingMeasurementHandle: React.Dispatch<React.SetStateAction<{ id: string; handleIndex: number; plane?: MprPlane; type?: string } | null>>;
	nervePoints: Point3D[]; setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>;
	selectedNerveNodeIdx: number | null; setSelectedNerveNodeIdx: React.Dispatch<React.SetStateAction<number | null>>;
	showDentalArch: boolean; archCurve: DentalArchCurve; setArchCurve: React.Dispatch<React.SetStateAction<DentalArchCurve>>;
	panoramicData: PanoramicReconstructionResult | null;
	crossSections: CrossSectionSliceData[]; activeCrossSection: CrossSectionSliceData | null;
	activeCrossSectionIdx: number; setActiveCrossSectionIdx: React.Dispatch<React.SetStateAction<number>>;
	currentImplantSpec: VirtualImplantSpec;
	implantEntryXOffsetMm: number; setImplantEntryXOffsetMm: React.Dispatch<React.SetStateAction<number>>;
	implantEntryDepthMm: number; setImplantEntryDepthMm: React.Dispatch<React.SetStateAction<number>>;
	implantAngulationDeg: number; setImplantAngulationDeg: React.Dispatch<React.SetStateAction<number>>;
	hoveredImplantPart: string | null; setHoveredImplantPart: React.Dispatch<React.SetStateAction<string | null>>;
	dragImplantPart: string | null; setDragImplantPart: React.Dispatch<React.SetStateAction<string | null>>;
	crossSectionDragStart: { clientX: number; clientY: number; startX: number; startY: number; startAng: number } | null; setCrossSectionDragStart: React.Dispatch<React.SetStateAction<{ clientX: number; clientY: number; startX: number; startY: number; startAng: number } | null>>;
	handleToggleMaximize: (viewport: CbctViewportType) => void;
	panoCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	axialCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	coronalCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	sagittalCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useCbctInteractionHandlers(params: UseCbctInteractionHandlersParams) {
	const {
		volume, crosshairMm, setCrosshairMm, obliqueAngles, setObliqueAngles,
		activeTool, studioMode, windowWidth, setWindowWidth, windowLevel, setWindowLevel,
		transforms, setTransforms, rulers, setRulers, activeRuler, setActiveRuler,
		angles, setAngles, activeAngle, setActiveAngle, probeMarkers, setProbeMarkers,
		activeProbe, setActiveProbe, selectedMeasurement, setSelectedMeasurement,
		hoveredMeasurementHandle, setHoveredMeasurementHandle,
		draggingMeasurementHandle, setDraggingMeasurementHandle,
		nervePoints, setNervePoints, selectedNerveNodeIdx, setSelectedNerveNodeIdx,
		showDentalArch, archCurve, setArchCurve, panoramicData,
		crossSections, activeCrossSection, activeCrossSectionIdx, setActiveCrossSectionIdx,
		currentImplantSpec, implantEntryXOffsetMm, setImplantEntryXOffsetMm,
		implantEntryDepthMm, setImplantEntryDepthMm, implantAngulationDeg, setImplantAngulationDeg,
		hoveredImplantPart, setHoveredImplantPart, dragImplantPart, setDragImplantPart,
		crossSectionDragStart, setCrossSectionDragStart, handleToggleMaximize,
		panoCanvasRef, crossSectionCanvasRef, axialCanvasRef, coronalCanvasRef, sagittalCanvasRef,
	} = params;

	const [isDraggingCrosshair, setIsDraggingCrosshair] = useState<MprPlane | null>(null);
	const [activeRotationHandle, setActiveRotationHandle] = useState<{ plane: MprPlane; handle: RotationHandlePosition; centerPx: { x: number; y: number } } | null>(null);
	const [hoveredHandle, setHoveredHandle] = useState<{ plane: MprPlane; handle: RotationHandlePosition } | null>(null);
	const [isShiftRotating, setIsShiftRotating] = useState<{ plane: MprPlane; centerPx: { x: number; y: number }; startPointerPx: { x: number; y: number }; initialAngleDeg: number } | null>(null);
	const [isPanning, setIsPanning] = useState<{ plane: CbctViewportType; startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
	const [isDraggingZoom, setIsDraggingZoom] = useState<{ plane: CbctViewportType; startY: number; startZoom: number } | null>(null);
	const [isDraggingWL, setIsDraggingWL] = useState<{ startX: number; startY: number; startWW: number; startWL: number } | null>(null);
	const [isDraggingArchAnchor, setIsDraggingArchAnchor] = useState<number | null>(null);
	const [hoveredArchAnchorIdx, setHoveredArchAnchorIdx] = useState<number | null>(null);
	const [isDraggingNerveNode, setIsDraggingNerveNode] = useState<number | null>(null);

	const pendingCrosshairMmRef = useRef<Point3D | null>(null);
	const rafCrosshairIdRef = useRef<number | null>(null);
	const pendingObliqueAnglesRef = useRef<ObliqueRotationAngles | null>(null);
	const rafObliqueIdRef = useRef<number | null>(null);
	const pendingArchAnchorMmRef = useRef<{ index: number; positionMm: Point2D } | null>(null);
	const rafArchAnchorIdRef = useRef<number | null>(null);
	const hasDraggedZoomRef = useRef<boolean>(false);

	// Clean up transient preview states when active tool switches
	useEffect(() => {
		if (activeTool !== "probe" && activeProbe) setActiveProbe(null);
		if (activeTool !== "angle" && activeAngle) setActiveAngle(null);
		if (activeTool !== "ruler" && activeRuler) setActiveRuler(null);
	}, [activeTool, activeProbe, activeAngle, activeRuler, setActiveProbe, setActiveAngle, setActiveRuler]);

	const handleSelectTooth = useCallback((toothFdi: number | string) => {
		const targetZ = archCurve.planeZMm !== undefined ? archCurve.planeZMm : crosshairMm.z;
		const res = findCrossSectionAndPositionByFdi(toothFdi, crossSections, archCurve, targetZ);
		if (res.found) {
			setActiveCrossSectionIdx(res.crossSectionIdx);
			setCrosshairMm(res.positionMm);
			showToast(`Навигация к зубу FDI #${res.nearestToothFdi} (Срез #${res.crossSectionIdx + 1})`, "info");
		}
	}, [crossSections, archCurve, crosshairMm.z, setActiveCrossSectionIdx, setCrosshairMm]);

	// Curved viewports (panoramic & cross-section) interaction handlers
	const curvedHandlers = useCbctCurvedViewportHandlers({
		activeTool, studioMode, windowWidth, setWindowWidth, windowLevel, setWindowLevel,
		transforms, setTransforms, crosshairMm, setCrosshairMm, archCurve, panoramicData,
		crossSections, activeCrossSection, setActiveCrossSectionIdx, currentImplantSpec,
		implantEntryXOffsetMm, setImplantEntryXOffsetMm, implantEntryDepthMm, setImplantEntryDepthMm,
		implantAngulationDeg, setImplantAngulationDeg, hoveredImplantPart, setHoveredImplantPart,
		dragImplantPart, setDragImplantPart, crossSectionDragStart, setCrossSectionDragStart,
		setSelectedMeasurement: setSelectedMeasurement as React.Dispatch<React.SetStateAction<CbctMeasurementRuler | null>>,
		handleSelectTooth, panoCanvasRef, crossSectionCanvasRef,
		isDraggingWL, setIsDraggingWL, isPanning, setIsPanning, isDraggingZoom, setIsDraggingZoom,
		hasDraggedZoomRef,
	});

	const handleCanvasMouseDown = useCallback((plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!volume) return;
		if (e.button === 2 || activeTool === "window_level") {
			e.preventDefault();
			setIsDraggingWL({ startX: e.clientX, startY: e.clientY, startWW: windowWidth, startWL: windowLevel });
			return;
		}

		const canvas = e.currentTarget;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const pointerPx = { x, y };

		const { projectedRulers, projectedAngles, projectedProbes } = projectMeasurementsToSlice(
			plane, volume, rulers, angles, probeMarkers,
		);

		const handleHit = hitTestMeasurementHandle(pointerPx, projectedRulers, projectedAngles, 12);
		if (handleHit) {
			setDraggingMeasurementHandle({ type: handleHit.type, id: handleHit.id, handleIndex: handleHit.handleIndex, plane });
			setSelectedMeasurement({ type: handleHit.type, id: handleHit.id } as unknown as CbctMeasurementRuler);
			return;
		}

		const objectHit = hitTestMeasurementObject(pointerPx, projectedRulers, projectedAngles, projectedProbes, 10);
		if (objectHit) {
			if (objectHit.isDeleteButtonHit) {
				if (objectHit.type === "ruler") { setRulers((prev) => prev.filter((r) => r.id !== objectHit.id)); showToast("Измерение линейки удалено", "info"); }
				else if (objectHit.type === "angle") { setAngles((prev) => prev.filter((a) => a.id !== objectHit.id)); showToast("Измерение угла удалено", "info"); }
				else if (objectHit.type === "probe") { setProbeMarkers((prev) => prev.filter((p) => p.id !== objectHit.id)); showToast("Метка плотности удалена", "info"); }
				setSelectedMeasurement(null);
				return;
			}
			setSelectedMeasurement({ type: objectHit.type, id: objectHit.id } as unknown as CbctMeasurementRuler);
			return;
		}

		if (e.shiftKey || activeTool === "rotate") {
			const centerPx = worldMmToSlicePx(crosshairMm, plane, volume);
			const rotDeg = plane === "axial" ? obliqueAngles.axialAngleDeg : plane === "coronal" ? obliqueAngles.coronalTiltDeg : obliqueAngles.sagittalTiltDeg;
			setIsShiftRotating({ plane, centerPx, startPointerPx: pointerPx, initialAngleDeg: rotDeg });
			return;
		}

		if (activeTool === "pan" || e.button === 1) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			setIsPanning({ plane, startX: e.clientX, startY: e.clientY, startPanX: currentTransform.panX, startPanY: currentTransform.panY });
			return;
		}

		if (activeTool === "zoom") {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			if (e.altKey) {
				const nextZoom = Math.max(0.5, Number((currentTransform.zoom * 0.8).toFixed(2)));
				setTransforms((prev) => ({ ...prev, [plane]: { ...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
				return;
			}
			hasDraggedZoomRef.current = false;
			setIsDraggingZoom({ plane, startY: e.clientY, startZoom: currentTransform.zoom });
			return;
		}

		if (activeTool === "ruler") {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume);
			setActiveRuler({ id: `ruler-${Date.now()}`, plane, startMm: pointMm, endMm: pointMm, currentMm: pointMm, distanceMm: 0 });
			return;
		}

		if (activeTool === "angle") {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume);
			if (!activeAngle) {
				setActiveAngle({ id: `angle-${Date.now()}`, plane, startMm: pointMm, vertexMm: pointMm, endMm: pointMm, currentMm: pointMm, angleDeg: 0, step: "vertex" } as unknown as CbctAngleMeasurement & { currentMm: Point3D });
				showToast("Точка 1 (плечо) установлена. Кликните для установки вершины угла", "info");
				return;
			}
			if ((activeAngle as unknown as { step?: "vertex" | "end" }).step === "vertex") {
				setActiveAngle({ ...activeAngle, vertexMm: pointMm, endMm: pointMm, currentMm: pointMm, step: "end" } as unknown as CbctAngleMeasurement & { currentMm: Point3D; step?: "vertex" | "end" });
				showToast("Вершина угла зафиксирована. Кликните для фиксации второго плеча", "info");
				return;
			}
			const finalAngleDeg = calculateAngleBetween3Points3D(activeAngle.startMm, activeAngle.vertexMm, pointMm);
			const fullAngle: CbctAngleMeasurement = { id: activeAngle.id, plane: activeAngle.plane, startMm: activeAngle.startMm, vertexMm: activeAngle.vertexMm, endMm: pointMm, angleDeg: finalAngleDeg };
			setAngles((prev) => [...prev, fullAngle]);
			setActiveAngle(null);
			setSelectedMeasurement(fullAngle);
			showToast(`Измерение угла зафиксировано: ${finalAngleDeg}°`, "success");
			return;
		}

		if (activeTool === "probe") {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume);
			const vox = worldMmToVoxel(pointMm, volume);
			const hu = sampleVoxelHU(vox.x, vox.y, vox.z, volume);
			const tissueName = getTissueNameFromHU(hu);
			const newProbe: CbctProbeMarker = { id: `probe-${Date.now()}`, plane, worldMm: pointMm, hu, tissueName };
			setProbeMarkers((prev) => [...prev, newProbe]);
			setSelectedMeasurement(newProbe);
			showToast(`Метка плотности: ${hu} HU (${tissueName})`, "info");
			return;
		}

		if (activeTool === "nerve") {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume);
			setNervePoints((prev) => [...prev, pointMm]);
			showToast(`Добавлена точка нижнечелюстного канала #${nervePoints.length + 1}`, "info");
			return;
		}

		// Dental arch anchor drag on Axial canvas (Mandate 8e: Doctor Autonomy)
		if (plane === "axial" && showDentalArch && archCurve) {
			const archHit = hitTestDentalArchControlPoint(
				pointerPx,
				archCurve,
				volume,
				transforms.axial,
				14,
				crosshairMm.z,
			);
			if (archHit) {
				setIsDraggingArchAnchor(archHit.index);
				return;
			}
		}

		// Crosshair / rotation handle hit tests
		const centerPx = worldMmToSlicePx(crosshairMm, plane, volume);
		const rotDeg = plane === "axial" ? obliqueAngles.axialAngleDeg : plane === "coronal" ? obliqueAngles.coronalTiltDeg : obliqueAngles.sagittalTiltDeg;
		const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
		const centerScreen = slicePxToScreenPx(centerPx, currentTransform);
		const handles = getRotationHandles(plane, canvas.width, canvas.height, centerScreen, 65, rotDeg);
		const hitHandle = hitTestRotationHandle(pointerPx, handles, 24);
		if (hitHandle) {
			setActiveRotationHandle({ plane, handle: hitHandle.position, centerPx: centerScreen });
			return;
		}

		setIsDraggingCrosshair(plane);
		const newWorldMm = calculateCrosshairDragWorldMm(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume);
		setCrosshairMm(newWorldMm);
	}, [volume, activeTool, windowWidth, windowLevel, rulers, angles, probeMarkers, crosshairMm, obliqueAngles, transforms, activeAngle, nervePoints.length, showDentalArch, archCurve, setDraggingMeasurementHandle, setSelectedMeasurement, setRulers, setAngles, setProbeMarkers, setTransforms, setActiveRuler, setActiveAngle, setNervePoints, setCrosshairMm, setIsDraggingArchAnchor]);

	const handleCanvasMouseMove = useCallback((plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!volume) return;
		const canvas = e.currentTarget;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const pointerPx = { x, y };

		if (isDraggingArchAnchor !== null && plane === "axial") {
			const currentTransform = transforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(pointerPx, { width: canvas.width, height: canvas.height }, "axial", crosshairMm, obliqueAngles, currentTransform, volume);
			pendingArchAnchorMmRef.current = { index: isDraggingArchAnchor, positionMm: { x: pointMm.x, y: pointMm.y } };
			if (rafArchAnchorIdRef.current === null) {
				rafArchAnchorIdRef.current = requestAnimationFrame(() => {
					if (pendingArchAnchorMmRef.current) {
						const { index, positionMm } = pendingArchAnchorMmRef.current;
						setArchCurve((prev) => updateDentalArchAnchorPosition(prev, index, positionMm));
					}
					rafArchAnchorIdRef.current = null;
				});
			}
			return;
		}

		if (draggingMeasurementHandle && draggingMeasurementHandle.plane === plane) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const currentMm = mapCanvasPointerToWorldMmWithTransform(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume);
			if (draggingMeasurementHandle.type === "ruler") {
				setRulers((prev) => updateDraggedMeasurementRuler(prev, draggingMeasurementHandle.id, draggingMeasurementHandle.handleIndex, currentMm));
				return;
			}
			if (draggingMeasurementHandle.type === "angle") {
				setAngles((prev) => updateDraggedMeasurementAngle(prev, draggingMeasurementHandle.id, draggingMeasurementHandle.handleIndex, currentMm));
				return;
			}
		}

		if (isDraggingWL) {
			const dx = e.clientX - isDraggingWL.startX;
			const dy = e.clientY - isDraggingWL.startY;
			setWindowWidth(Math.max(100, Math.min(10000, Math.round(isDraggingWL.startWW + dx * 8))));
			setWindowLevel(Math.max(-1000, Math.min(4000, Math.round(isDraggingWL.startWL - dy * 4))));
			return;
		}

		if (isPanning && isPanning.plane === plane) {
			const dx = e.clientX - isPanning.startX;
			const dy = e.clientY - isPanning.startY;
			setTransforms((prev) => ({ ...prev, [plane]: { ...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM), panX: isPanning.startPanX + dx, panY: isPanning.startPanY + dy } }));
			return;
		}

		if (isDraggingZoom && isDraggingZoom.plane === plane) {
			hasDraggedZoomRef.current = true;
			const dy = isDraggingZoom.startY - e.clientY;
			const zoomFactor = Math.exp(dy * 0.01);
			const nextZoom = Math.max(0.5, Math.min(5.0, Number((isDraggingZoom.startZoom * zoomFactor).toFixed(2))));
			setTransforms((prev) => ({ ...prev, [plane]: { ...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
			return;
		}

		if (activeRuler && activeRuler.plane === plane) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			setActiveRuler((prev) => (prev ? { ...prev, currentMm: mapCanvasPointerToWorldMmWithTransform(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume) } : null));
			return;
		}

		if (activeAngle && activeAngle.plane === plane) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const currentMm = mapCanvasPointerToWorldMmWithTransform(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume);
			setActiveAngle((prev) => {
				if (!prev) return null;
				if ((prev as unknown as { step?: "vertex" | "end" }).step === "vertex") return { ...prev, vertexMm: currentMm, currentMm };
				return { ...prev, endMm: currentMm, currentMm, angleDeg: calculateAngleBetween3Points3D(prev.startMm, prev.vertexMm, currentMm) };
			});
			return;
		}

		if (activeTool === "probe" && volume) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const pointMm = mapCanvasPointerToWorldMmWithTransform(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume);
			const vox = worldMmToVoxel(pointMm, volume);
			const hu = sampleVoxelHU(vox.x, vox.y, vox.z, volume);
			setActiveProbe({ id: "active-probe", plane, worldMm: pointMm, hu, tissueName: getTissueNameFromHU(hu) });
		}

		if (isShiftRotating && isShiftRotating.plane === plane) {
			const newAngle = calculateAngleFromShiftDrag(isShiftRotating.centerPx, pointerPx, isShiftRotating.startPointerPx, isShiftRotating.initialAngleDeg);
			setObliqueAngles((prev) => ({ ...prev, ...(plane === "axial" ? { axialAngleDeg: newAngle } : plane === "coronal" ? { coronalTiltDeg: newAngle } : { sagittalTiltDeg: newAngle }) }));
			return;
		}

		if (activeRotationHandle && activeRotationHandle.plane === plane) {
			const newAngle = calculateAngleFromHandleDrag(activeRotationHandle.centerPx, pointerPx, activeRotationHandle.handle);
			setObliqueAngles((prev) => ({ ...prev, ...(plane === "axial" ? { axialAngleDeg: newAngle } : plane === "coronal" ? { coronalTiltDeg: newAngle } : { sagittalTiltDeg: newAngle }) }));
			return;
		}

		if (isDraggingCrosshair === plane) {
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const newWorldMm = calculateCrosshairDragWorldMm(pointerPx, { width: canvas.width, height: canvas.height }, plane, crosshairMm, obliqueAngles, currentTransform, volume);
			setCrosshairMm(newWorldMm);
			return;
		}

		// Hover Detection
		if (!isShiftRotating && !activeRotationHandle && !isDraggingCrosshair && isDraggingNerveNode === null && !draggingMeasurementHandle) {
			const centerPx = worldMmToSlicePx(crosshairMm, plane, volume);
			const rotDeg = plane === "axial" ? obliqueAngles.axialAngleDeg : plane === "coronal" ? obliqueAngles.coronalTiltDeg : obliqueAngles.sagittalTiltDeg;
			const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const centerScreen = slicePxToScreenPx(centerPx, currentTransform);
			const handles = getRotationHandles(plane, canvas.width, canvas.height, centerScreen, 65, rotDeg);
			const hitHandle = hitTestRotationHandle(pointerPx, handles, 24);
			if (hitHandle) setHoveredHandle({ plane, handle: hitHandle.position });
			else if (hoveredHandle?.plane === plane) setHoveredHandle(null);

			const { projectedRulers, projectedAngles } = projectMeasurementsToSlice(plane, volume, rulers, angles, probeMarkers);
			const handleHit = hitTestMeasurementHandle(pointerPx, projectedRulers, projectedAngles, 12);
			if (handleHit) setHoveredMeasurementHandle({ id: handleHit.id, handleIndex: handleHit.handleIndex, plane });
			else if (hoveredMeasurementHandle?.plane === plane) setHoveredMeasurementHandle(null);

			if (plane === "axial" && showDentalArch && archCurve) {
				const archHit = hitTestDentalArchControlPoint(
					pointerPx,
					archCurve,
					volume,
					transforms.axial,
					14,
					crosshairMm.z,
				);
				if (archHit) {
					if (hoveredArchAnchorIdx !== archHit.index) setHoveredArchAnchorIdx(archHit.index);
				} else if (hoveredArchAnchorIdx !== null) {
					setHoveredArchAnchorIdx(null);
				}
			} else if (hoveredArchAnchorIdx !== null && plane === "axial") {
				setHoveredArchAnchorIdx(null);
			}
		}
	}, [volume, isDraggingArchAnchor, transforms, crosshairMm, obliqueAngles, draggingMeasurementHandle, isDraggingWL, isPanning, isDraggingZoom, activeRuler, activeAngle, activeTool, isShiftRotating, activeRotationHandle, isDraggingCrosshair, isDraggingNerveNode, hoveredHandle, showDentalArch, archCurve, hoveredArchAnchorIdx, rulers, angles, probeMarkers, hoveredMeasurementHandle, setArchCurve, setRulers, setAngles, setActiveProbe, setWindowWidth, setWindowLevel, setTransforms, setActiveRuler, setActiveAngle, setObliqueAngles, setCrosshairMm, setHoveredArchAnchorIdx, setHoveredMeasurementHandle]);

	const handleCanvasMouseUp = useCallback(() => {
		if (rafCrosshairIdRef.current !== null) { cancelAnimationFrame(rafCrosshairIdRef.current); rafCrosshairIdRef.current = null; }
		if (rafObliqueIdRef.current !== null) { cancelAnimationFrame(rafObliqueIdRef.current); rafObliqueIdRef.current = null; }
		if (rafArchAnchorIdRef.current !== null) { cancelAnimationFrame(rafArchAnchorIdRef.current); rafArchAnchorIdRef.current = null; }
		if (pendingArchAnchorMmRef.current) {
			const { index, positionMm } = pendingArchAnchorMmRef.current;
			setArchCurve((prev) => updateDentalArchAnchorPosition(prev, index, positionMm));
			pendingArchAnchorMmRef.current = null;
		}
		setIsDraggingArchAnchor(null);
		if (activeRuler) {
			const dist = Math.hypot(activeRuler.currentMm.x - activeRuler.startMm.x, activeRuler.currentMm.y - activeRuler.startMm.y, activeRuler.currentMm.z - activeRuler.startMm.z);
			if (dist > 0.3) {
				const newRuler: CbctMeasurementRuler = { id: `ruler-${Date.now()}`, plane: activeRuler.plane, startMm: activeRuler.startMm, endMm: activeRuler.currentMm, distanceMm: Number(dist.toFixed(1)) };
				setRulers((prev) => [...prev, newRuler]);
				setSelectedMeasurement(newRuler);
			}
			setActiveRuler(null);
		}
		if (isDraggingZoom && !hasDraggedZoomRef.current) {
			const targetPlane = isDraggingZoom.plane;
			if (targetPlane === "axial" || targetPlane === "coronal" || targetPlane === "sagittal") {
				const currentTransform = transforms[targetPlane] ?? DEFAULT_VIEWPORT_TRANSFORM;
				const nextZoom = Math.min(5.0, Number((currentTransform.zoom * 1.25).toFixed(2)));
				setTransforms((prev) => ({ ...prev, [targetPlane]: { ...(prev[targetPlane] ?? DEFAULT_VIEWPORT_TRANSFORM), zoom: nextZoom } }));
			}
		}
		setIsDraggingCrosshair(null); setActiveRotationHandle(null); setIsShiftRotating(null);
		setIsPanning(null); setIsDraggingZoom(null); setIsDraggingWL(null); setIsDraggingNerveNode(null);
		if (draggingMeasurementHandle) setDraggingMeasurementHandle(null);
		if (hoveredMeasurementHandle) setHoveredMeasurementHandle(null);
		hasDraggedZoomRef.current = false;
	}, [activeRuler, draggingMeasurementHandle, hoveredMeasurementHandle, isDraggingZoom, transforms, setArchCurve, setRulers, setSelectedMeasurement, setActiveRuler, setTransforms, setDraggingMeasurementHandle, setHoveredMeasurementHandle, setIsDraggingArchAnchor]);

	const handleCanvasDoubleClick = useCallback((plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!volume) {
			handleToggleMaximize(plane);
			return;
		}
		const canvas = e.currentTarget;
		const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
		const centerPx = worldMmToSlicePx(crosshairMm, plane, volume);
		if (hitTestCrosshairCenter({ x, y }, centerPx, 18)) {
			setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, plane));
			return;
		}
		handleToggleMaximize(plane);
	}, [volume, crosshairMm, handleToggleMaximize, setObliqueAngles]);

	const getCanvasCursor = useCallback((plane: MprPlane) => {
		if (isDraggingArchAnchor !== null && plane === "axial") return "grabbing";
		if (hoveredArchAnchorIdx !== null && plane === "axial") return "pointer";
		if (draggingMeasurementHandle) return "grabbing";
		if (hoveredMeasurementHandle?.plane === plane) return "grab";
		if (isShiftRotating?.plane === plane || activeRotationHandle?.plane === plane) return ROTATE_CURSOR;
		if (hoveredHandle?.plane === plane) return ROTATE_CURSOR;
		if (isDraggingWL) return "move";
		if (isPanning && isPanning.plane === plane) return "grabbing";
		if (isDraggingZoom && isDraggingZoom.plane === plane) return "ns-resize";
		if (activeTool === "pan") return "grab";
		if (activeTool === "zoom") return "zoom-in";
		if (activeTool === "window_level") return "col-resize";
		if (activeTool === "rotate") return ROTATE_CURSOR;
		return "crosshair";
	}, [isDraggingArchAnchor, hoveredArchAnchorIdx, draggingMeasurementHandle, hoveredMeasurementHandle, isShiftRotating, activeRotationHandle, hoveredHandle, isDraggingWL, isPanning, isDraggingZoom, activeTool]);

	const handleCanvasWheel = useCallback((viewport: CbctViewportType, e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const isZoom = e.ctrlKey || e.metaKey || activeTool === "zoom";
		if (isZoom) {
			const canvas = e.currentTarget;
			const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			setTransforms((prev) => ({
				...prev,
				[viewport]: applyCursorZoom(prev[viewport] ?? DEFAULT_VIEWPORT_TRANSFORM, { x, y }, e.deltaY, 0.5, 5.0),
			}));
			return;
		}
		const step = e.shiftKey ? 5 : 1;
		const delta = calculateWheelSliceDelta(e.deltaY, step);
		if (delta === 0) return;

		if (viewport === "cross_section" || viewport === "panoramic") {
			if (crossSections.length > 0) {
				setActiveCrossSectionIdx((prev) => {
					const nextIdx = Math.max(0, Math.min(crossSections.length - 1, prev + delta));
					const cs = crossSections[nextIdx];
					if (cs) {
						setCrosshairMm((curr) => ({
							x: cs.centerPointMm.x,
							y: cs.centerPointMm.y,
							z: curr.z,
						}));
					}
					return nextIdx;
				});
			}
			return;
		}
		if (volume) {
			setCrosshairMm((prev) => {
				const isMpr = viewport === "axial" || viewport === "coronal" || viewport === "sagittal";
				if (!isMpr) return prev;

				// Oblique slice normal calculation (Standards: Romexis 6.x, Ez3D-i)
				const basis = computeObliquePlaneBasis(viewport, prev, obliqueAngles ?? DEFAULT_OBLIQUE_ROTATION);
				const normal = basis.normal;

				// Physical step in mm along normal
				const baseSpacingMm = viewport === "axial"
					? volume.spacingMm.z
					: viewport === "coronal"
					? volume.spacingMm.y
					: volume.spacingMm.x;
				const stepMm = baseSpacingMm * delta;

				const nx = prev.x + normal.x * stepMm;
				const ny = prev.y + normal.y * stepMm;
				const nz = prev.z + normal.z * stepMm;

				return clampCoordinateToVolume({ x: nx, y: ny, z: nz }, volume);
			});
		}
	}, [activeTool, crossSections, volume, obliqueAngles, setTransforms, setActiveCrossSectionIdx, setCrosshairMm]);

	// Global mouseup window listener to prevent stuck cursor when dragging outside canvas
	useEffect(() => {
		const isAnyDragging =
			isDraggingCrosshair !== null ||
			activeRotationHandle !== null ||
			isShiftRotating !== null ||
			isPanning !== null ||
			isDraggingZoom !== null ||
			isDraggingWL !== null ||
			curvedHandlers.isDraggingPano ||
			isDraggingArchAnchor !== null ||
			draggingMeasurementHandle !== null ||
			dragImplantPart !== null;

		if (!isAnyDragging) return;

		const handleGlobalMouseUp = () => {
			handleCanvasMouseUp();
			curvedHandlers.handlePanoMouseUp();
			curvedHandlers.handleCrossSectionMouseUp();
		};

		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => {
			window.removeEventListener("mouseup", handleGlobalMouseUp);
		};
	}, [isDraggingCrosshair, activeRotationHandle, isShiftRotating, isPanning, isDraggingZoom, isDraggingWL, curvedHandlers, isDraggingArchAnchor, draggingMeasurementHandle, dragImplantPart, handleCanvasMouseUp]);

	// Native non-passive wheel listeners on canvas refs to prevent parasitic page scroll behind modal
	useEffect(() => {
		const canvases = [axialCanvasRef.current, coronalCanvasRef.current, sagittalCanvasRef.current, panoCanvasRef.current, crossSectionCanvasRef.current];
		const onNativeWheel = (e: WheelEvent) => { e.preventDefault(); };
		for (const canvas of canvases) {
			if (canvas) canvas.addEventListener("wheel", onNativeWheel, { passive: false });
		}
		return () => {
			for (const canvas of canvases) {
				if (canvas) canvas.removeEventListener("wheel", onNativeWheel);
			}
		};
	}, [axialCanvasRef, coronalCanvasRef, sagittalCanvasRef, panoCanvasRef, crossSectionCanvasRef]);

	return {
		activeRotationHandle, hoveredHandle, isShiftRotating, isDraggingCrosshair,
		isDraggingArchAnchor, hoveredArchAnchorIdx, handleSelectTooth,
		handlePanoMouseDown: curvedHandlers.handlePanoMouseDown,
		handlePanoMouseMove: curvedHandlers.handlePanoMouseMove,
		handlePanoMouseUp: curvedHandlers.handlePanoMouseUp,
		handleCrossSectionMouseDown: curvedHandlers.handleCrossSectionMouseDown,
		handleCrossSectionMouseMove: curvedHandlers.handleCrossSectionMouseMove,
		handleCrossSectionMouseUp: curvedHandlers.handleCrossSectionMouseUp,
		handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp,
		handleCanvasDoubleClick, getCanvasCursor, handleCanvasWheel,
	};
}
