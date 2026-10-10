import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { showToast } from "../../../GlobalToast";
import type {
	CbctViewportType,
	MprPlane,
	ObliqueRotationAngles,
	Point2D,
	Point3D,
} from "../../cbctMprMath";
import { useCbctCurvedViewportHandlers } from "../useCbctCurvedViewportHandlers";
import { useMprCanvasEventHandlers } from "./mprCanvasEventHandlers";
import { calculateToothNavigationTarget } from "./sliceNavigationHandlers";
import type {
	ActiveRotationHandleState,
	CbctInteractionHandlersResult,
	DraggingWLState,
	DraggingZoomState,
	HoveredHandleState,
	PanningState,
	ShiftRotatingState,
	UseCbctInteractionHandlersParams,
} from "./types";

/**
 * Layer 3: Central Coordinator Hook for CBCT MPR Viewport Interactions.
 * Coordinates crosshairs, oblique rotations, measurements, zoom/pan, window/level, and slice navigation.
 */
export function useCbctInteractionHandlers(
	params: UseCbctInteractionHandlersParams,
): CbctInteractionHandlersResult {
	const {
		volume,
		crosshairMm,
		setCrosshairMm,
		obliqueAngles,
		setObliqueAngles,
		activeTool,
		studioMode,
		windowWidth,
		setWindowWidth,
		windowLevel,
		setWindowLevel,
		transforms,
		setTransforms,
		rulers,
		setRulers,
		activeRuler,
		setActiveRuler,
		angles,
		setAngles,
		activeAngle,
		setActiveAngle,
		probeMarkers,
		setProbeMarkers,
		activeProbe,
		setActiveProbe,
		selectedMeasurement,
		setSelectedMeasurement,
		hoveredMeasurementHandle,
		setHoveredMeasurementHandle,
		draggingMeasurementHandle,
		setDraggingMeasurementHandle,
		nervePoints,
		setNervePoints,
		selectedNerveNodeIdx,
		setSelectedNerveNodeIdx,
		showDentalArch,
		archCurve,
		setArchCurve,
		panoramicData,
		crossSections,
		activeCrossSection,
		setActiveCrossSectionIdx,
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
		handleToggleMaximize,
		jawType,
		onSwitchJaw,
		panoCanvasRef,
		crossSectionCanvasRef,
		axialCanvasRef,
		coronalCanvasRef,
		sagittalCanvasRef,
	} = params;

	const [isDraggingCrosshair, setIsDraggingCrosshair] =
		useState<MprPlane | null>(null);
	const [activeRotationHandle, setActiveRotationHandle] =
		useState<ActiveRotationHandleState | null>(null);
	const [hoveredHandle, setHoveredHandle] = useState<HoveredHandleState | null>(
		null,
	);
	const [isShiftRotating, setIsShiftRotating] =
		useState<ShiftRotatingState | null>(null);
	const [isPanning, setIsPanning] = useState<PanningState | null>(null);
	const [isDraggingZoom, setIsDraggingZoom] =
		useState<DraggingZoomState | null>(null);
	const [isDraggingWL, setIsDraggingWL] = useState<DraggingWLState | null>(null);
	const [isDraggingArchAnchor, setIsDraggingArchAnchor] = useState<
		number | null
	>(null);
	const [hoveredArchAnchorIdx, setHoveredArchAnchorIdx] = useState<
		number | null
	>(null);
	const [isDraggingNerveNode, setIsDraggingNerveNode] = useState<number | null>(
		null,
	);

	const pendingCrosshairMmRef = useRef<Point3D | null>(null);
	const rafCrosshairIdRef = useRef<number | null>(null);
	const pendingObliqueAnglesRef = useRef<ObliqueRotationAngles | null>(null);
	const rafObliqueIdRef = useRef<number | null>(null);
	const pendingArchAnchorMmRef = useRef<{
		index: number;
		positionMm: Point2D;
	} | null>(null);
	const rafArchAnchorIdRef = useRef<number | null>(null);
	const hasDraggedZoomRef = useRef<boolean>(false);
	const wheelAccumulatorsRef = useRef<
		Partial<Record<CbctViewportType, number>>
	>({});
	const rafWheelIdRef = useRef<number | null>(null);
	const latestShiftKeyRef = useRef<boolean>(false);

	useEffect(() => {
		return () => {
			if (rafWheelIdRef.current !== null) {
				cancelAnimationFrame(rafWheelIdRef.current);
				rafWheelIdRef.current = null;
			}
		};
	}, []);

	// Clean up transient preview states when active tool switches
	useEffect(() => {
		if (activeTool !== "probe" && activeProbe) setActiveProbe(null);
		if (activeTool !== "angle" && activeAngle) setActiveAngle(null);
		if (activeTool !== "ruler" && activeRuler) setActiveRuler(null);
	}, [
		activeTool,
		activeProbe,
		activeAngle,
		activeRuler,
		setActiveProbe,
		setActiveAngle,
		setActiveRuler,
	]);

	const handleSelectTooth = useCallback(
		(toothFdi: number | string) => {
			const nav = calculateToothNavigationTarget(
				toothFdi,
				crossSections,
				archCurve,
				crosshairMm.z,
				jawType,
			);
			if (nav.switchedJaw && onSwitchJaw) {
				onSwitchJaw(nav.switchedJaw);
				return;
			}
			if (nav.target) {
				setActiveCrossSectionIdx(nav.target.crossSectionIdx);
				setCrosshairMm(nav.target.positionMm);
				showToast(
					`Навигация к зубу FDI #${nav.target.nearestToothFdi} (Срез #${nav.target.crossSectionIdx + 1})`,
					"info",
				);
			}
		},
		[
			crossSections,
			archCurve,
			crosshairMm.z,
			setActiveCrossSectionIdx,
			setCrosshairMm,
			jawType,
			onSwitchJaw,
		],
	);

	// Curved viewports (panoramic & cross-section) interaction handlers
	const curvedHandlers = useCbctCurvedViewportHandlers({
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
		crosshairMm,
		setCrosshairMm,
		archCurve,
		panoramicData,
		crossSections,
		activeCrossSection,
		setActiveCrossSectionIdx,
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
		setSelectedMeasurement: setSelectedMeasurement as React.Dispatch<
			React.SetStateAction<any>
		>,
		handleSelectTooth,
		panoCanvasRef,
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
		hoveredMeasurementHandle,
		setHoveredMeasurementHandle,
		draggingMeasurementHandle,
		setDraggingMeasurementHandle,
	});

	// Canvas mouse and wheel event handlers
	const canvasHandlers = useMprCanvasEventHandlers({
		volume,
		crosshairMm,
		setCrosshairMm,
		obliqueAngles,
		setObliqueAngles,
		activeTool,
		studioMode,
		windowWidth,
		setWindowWidth,
		windowLevel,
		setWindowLevel,
		transforms,
		setTransforms,
		rulers,
		setRulers,
		activeRuler,
		setActiveRuler,
		angles,
		setAngles,
		activeAngle,
		setActiveAngle,
		probeMarkers,
		setProbeMarkers,
		activeProbe,
		setActiveProbe,
		selectedMeasurement,
		setSelectedMeasurement,
		hoveredMeasurementHandle,
		setHoveredMeasurementHandle,
		draggingMeasurementHandle,
		setDraggingMeasurementHandle,
		nervePoints,
		setNervePoints,
		selectedNerveNodeIdx,
		setSelectedNerveNodeIdx,
		showDentalArch,
		archCurve,
		setArchCurve,
		crossSections,
		setActiveCrossSectionIdx,
		handleToggleMaximize,
		isDraggingCrosshair,
		setIsDraggingCrosshair,
		activeRotationHandle,
		setActiveRotationHandle,
		hoveredHandle,
		setHoveredHandle,
		isShiftRotating,
		setIsShiftRotating,
		isPanning,
		setIsPanning,
		isDraggingZoom,
		setIsDraggingZoom,
		isDraggingWL,
		setIsDraggingWL,
		isDraggingArchAnchor,
		setIsDraggingArchAnchor,
		hoveredArchAnchorIdx,
		setHoveredArchAnchorIdx,
		isDraggingNerveNode,
		setIsDraggingNerveNode,
		pendingCrosshairMmRef,
		rafCrosshairIdRef,
		pendingObliqueAnglesRef,
		rafObliqueIdRef,
		pendingArchAnchorMmRef,
		rafArchAnchorIdRef,
		hasDraggedZoomRef,
		wheelAccumulatorsRef,
		rafWheelIdRef,
		latestShiftKeyRef,
	});

	// Global mouseup window listener
	useEffect(() => {
		if (
			isDraggingCrosshair === null &&
			activeRotationHandle === null &&
			isShiftRotating === null &&
			isPanning === null &&
			isDraggingZoom === null &&
			isDraggingWL === null &&
			!curvedHandlers.isDraggingPano &&
			isDraggingArchAnchor === null &&
			!draggingMeasurementHandle &&
			!dragImplantPart
		) {
			return;
		}

		const handleGlobalMouseUp = () => {
			canvasHandlers.handleCanvasMouseUp();
			curvedHandlers.handlePanoMouseUp();
			curvedHandlers.handleCrossSectionMouseUp();
		};

		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => {
			window.removeEventListener("mouseup", handleGlobalMouseUp);
		};
	}, [
		isDraggingCrosshair,
		activeRotationHandle,
		isShiftRotating,
		isPanning,
		isDraggingZoom,
		isDraggingWL,
		curvedHandlers,
		isDraggingArchAnchor,
		draggingMeasurementHandle,
		dragImplantPart,
		canvasHandlers,
	]);

	// Native non-passive wheel listeners on canvas refs to prevent parasitic page scroll behind modal
	useEffect(() => {
		const canvases = [
			axialCanvasRef?.current,
			coronalCanvasRef?.current,
			sagittalCanvasRef?.current,
			panoCanvasRef?.current,
			crossSectionCanvasRef?.current,
		];
		const onNativeWheel = (e: WheelEvent) => {
			e.preventDefault();
		};
		for (const canvas of canvases) {
			if (canvas)
				canvas.addEventListener("wheel", onNativeWheel, { passive: false });
		}
		return () => {
			for (const canvas of canvases) {
				if (canvas) canvas.removeEventListener("wheel", onNativeWheel);
			}
		};
	}, [
		axialCanvasRef,
		coronalCanvasRef,
		sagittalCanvasRef,
		panoCanvasRef,
		crossSectionCanvasRef,
	]);

	return {
		activeRotationHandle,
		hoveredHandle,
		isShiftRotating,
		isDraggingCrosshair,
		isDraggingArchAnchor,
		hoveredArchAnchorIdx,
		handleSelectTooth,
		handlePanoMouseDown: curvedHandlers.handlePanoMouseDown,
		handlePanoMouseMove: curvedHandlers.handlePanoMouseMove,
		handlePanoMouseUp: curvedHandlers.handlePanoMouseUp,
		handleCrossSectionMouseDown: curvedHandlers.handleCrossSectionMouseDown,
		handleCrossSectionMouseMove: curvedHandlers.handleCrossSectionMouseMove,
		handleCrossSectionMouseUp: curvedHandlers.handleCrossSectionMouseUp,
		handleCanvasMouseDown: canvasHandlers.handleCanvasMouseDown,
		handleCanvasMouseMove: canvasHandlers.handleCanvasMouseMove,
		handleCanvasMouseUp: canvasHandlers.handleCanvasMouseUp,
		handleCanvasDoubleClick: canvasHandlers.handleCanvasDoubleClick,
		getCanvasCursor: canvasHandlers.getCanvasCursor,
		handleCanvasWheel: canvasHandlers.handleCanvasWheel,
	};
}
