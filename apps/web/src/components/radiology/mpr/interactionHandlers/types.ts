import type React from "react";
import type { CbctToolMode } from "../../CbctLeftToolDock";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctProbeMarker,
	CbctViewportType,
	CbctVoxelVolume,
	MprPlane,
	ObliqueRotationAngles,
	Point2D,
	Point3D,
	RotationHandlePosition,
	ViewportTransform,
} from "../../cbctMprMath";
import type {
	CrossSectionSliceData,
	DentalArchCurve,
	PanoramicReconstructionResult,
} from "../../dentalCurveEngine";
import type { VirtualImplantSpec } from "../../implantSafetyEngine";
import type { StudioMode } from "../cbctStudioTypes";

export interface UseCbctInteractionHandlersParams {
	volume: CbctVoxelVolume | null;
	crosshairMm: Point3D;
	setCrosshairMm: React.Dispatch<React.SetStateAction<Point3D>>;
	obliqueAngles: ObliqueRotationAngles;
	setObliqueAngles: React.Dispatch<React.SetStateAction<ObliqueRotationAngles>>;
	activeTool: CbctToolMode;
	studioMode: StudioMode;
	windowWidth: number;
	setWindowWidth: React.Dispatch<React.SetStateAction<number>>;
	windowLevel: number;
	setWindowLevel: React.Dispatch<React.SetStateAction<number>>;
	transforms: Record<CbctViewportType, ViewportTransform>;
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>;
	rulers: CbctMeasurementRuler[];
	setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>;
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	setActiveRuler: React.Dispatch<
		React.SetStateAction<(CbctMeasurementRuler & { currentMm: Point3D }) | null>
	>;
	angles: CbctAngleMeasurement[];
	setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>;
	activeAngle: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	setActiveAngle: React.Dispatch<
		React.SetStateAction<(CbctAngleMeasurement & { currentMm: Point3D }) | null>
	>;
	probeMarkers: CbctProbeMarker[];
	setProbeMarkers: React.Dispatch<React.SetStateAction<CbctProbeMarker[]>>;
	activeProbe: (CbctProbeMarker & { hu: number; tissueName: string }) | null;
	setActiveProbe: React.Dispatch<
		React.SetStateAction<
			(CbctProbeMarker & { hu: number; tissueName: string }) | null
		>
	>;
	selectedMeasurement:
		| CbctMeasurementRuler
		| CbctAngleMeasurement
		| CbctProbeMarker
		| null;
	setSelectedMeasurement: React.Dispatch<
		React.SetStateAction<
			CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null
		>
	>;
	hoveredMeasurementHandle: {
		id: string;
		handleIndex: number;
		plane?: MprPlane;
	} | null;
	setHoveredMeasurementHandle: React.Dispatch<
		React.SetStateAction<{
			id: string;
			handleIndex: number;
			plane?: MprPlane;
		} | null>
	>;
	draggingMeasurementHandle: {
		id: string;
		handleIndex: number;
		plane?: MprPlane;
		type?: string;
	} | null;
	setDraggingMeasurementHandle: React.Dispatch<
		React.SetStateAction<{
			id: string;
			handleIndex: number;
			plane?: MprPlane;
			type?: string;
		} | null>
	>;
	nervePoints: Point3D[];
	setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>;
	selectedNerveNodeIdx: number | null;
	setSelectedNerveNodeIdx: React.Dispatch<React.SetStateAction<number | null>>;
	showDentalArch: boolean;
	archCurve: DentalArchCurve;
	setArchCurve: React.Dispatch<React.SetStateAction<DentalArchCurve>>;
	panoramicData: PanoramicReconstructionResult | null;
	crossSections: CrossSectionSliceData[];
	activeCrossSection: CrossSectionSliceData | null;
	activeCrossSectionIdx: number;
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
	crossSectionDragStart: {
		clientX: number;
		clientY: number;
		startX: number;
		startY: number;
		startAng: number;
	} | null;
	setCrossSectionDragStart: React.Dispatch<
		React.SetStateAction<{
			clientX: number;
			clientY: number;
			startX: number;
			startY: number;
			startAng: number;
		} | null>
	>;
	handleToggleMaximize: (viewport: CbctViewportType) => void;
	jawType?: "mandible" | "maxilla";
	onSwitchJaw?: (newJaw: "mandible" | "maxilla") => void;
	panoCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	axialCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	coronalCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	sagittalCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export interface ActiveRotationHandleState {
	plane: MprPlane;
	handle: RotationHandlePosition;
	centerPx: { x: number; y: number };
}

export interface HoveredHandleState {
	plane: MprPlane;
	handle: RotationHandlePosition;
}

export interface ShiftRotatingState {
	plane: MprPlane;
	centerPx: { x: number; y: number };
	startPointerPx: { x: number; y: number };
	initialAngleDeg: number;
}

export interface PanningState {
	plane: CbctViewportType;
	startX: number;
	startY: number;
	startPanX: number;
	startPanY: number;
}

export interface DraggingZoomState {
	plane: CbctViewportType;
	startY: number;
	startZoom: number;
}

export interface DraggingWLState {
	startX: number;
	startY: number;
	startWW: number;
	startWL: number;
}

export interface CbctInteractionHandlersResult {
	activeRotationHandle: ActiveRotationHandleState | null;
	hoveredHandle: HoveredHandleState | null;
	isShiftRotating: ShiftRotatingState | null;
	isDraggingCrosshair: MprPlane | null;
	isDraggingArchAnchor: number | null;
	hoveredArchAnchorIdx: number | null;
	handleSelectTooth: (toothFdi: number | string) => void;
	handlePanoMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handlePanoMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handlePanoMouseUp: () => void;
	handleCrossSectionMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handleCrossSectionMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handleCrossSectionMouseUp: () => void;
	handleCanvasMouseDown: (
		plane: MprPlane,
		e: React.MouseEvent<HTMLCanvasElement>,
	) => void;
	handleCanvasMouseMove: (
		plane: MprPlane,
		e: React.MouseEvent<HTMLCanvasElement>,
	) => void;
	handleCanvasMouseUp: () => void;
	handleCanvasDoubleClick: (
		plane: MprPlane,
		e: React.MouseEvent<HTMLCanvasElement>,
	) => void;
	getCanvasCursor: (plane: MprPlane) => string;
	handleCanvasWheel: (
		viewport: CbctViewportType,
		e: React.WheelEvent<HTMLCanvasElement>,
	) => void;
}

export interface MprCanvasEventContext {
	volume: CbctVoxelVolume | null;
	crosshairMm: Point3D;
	setCrosshairMm: React.Dispatch<React.SetStateAction<Point3D>>;
	obliqueAngles: ObliqueRotationAngles;
	setObliqueAngles: React.Dispatch<React.SetStateAction<ObliqueRotationAngles>>;
	activeTool: CbctToolMode;
	studioMode: StudioMode;
	windowWidth: number;
	setWindowWidth: React.Dispatch<React.SetStateAction<number>>;
	windowLevel: number;
	setWindowLevel: React.Dispatch<React.SetStateAction<number>>;
	transforms: Record<CbctViewportType, ViewportTransform>;
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>;
	rulers: CbctMeasurementRuler[];
	setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>;
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	setActiveRuler: React.Dispatch<
		React.SetStateAction<(CbctMeasurementRuler & { currentMm: Point3D }) | null>
	>;
	angles: CbctAngleMeasurement[];
	setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>;
	activeAngle: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	setActiveAngle: React.Dispatch<
		React.SetStateAction<(CbctAngleMeasurement & { currentMm: Point3D }) | null>
	>;
	probeMarkers: CbctProbeMarker[];
	setProbeMarkers: React.Dispatch<React.SetStateAction<CbctProbeMarker[]>>;
	activeProbe: (CbctProbeMarker & { hu: number; tissueName: string }) | null;
	setActiveProbe: React.Dispatch<
		React.SetStateAction<
			(CbctProbeMarker & { hu: number; tissueName: string }) | null
		>
	>;
	selectedMeasurement:
		| CbctMeasurementRuler
		| CbctAngleMeasurement
		| CbctProbeMarker
		| null;
	setSelectedMeasurement: React.Dispatch<
		React.SetStateAction<
			CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null
		>
	>;
	hoveredMeasurementHandle: {
		id: string;
		handleIndex: number;
		plane?: MprPlane;
	} | null;
	setHoveredMeasurementHandle: React.Dispatch<
		React.SetStateAction<{
			id: string;
			handleIndex: number;
			plane?: MprPlane;
		} | null>
	>;
	draggingMeasurementHandle: {
		id: string;
		handleIndex: number;
		plane?: MprPlane;
		type?: string;
	} | null;
	setDraggingMeasurementHandle: React.Dispatch<
		React.SetStateAction<{
			id: string;
			handleIndex: number;
			plane?: MprPlane;
			type?: string;
		} | null>
	>;
	nervePoints: Point3D[];
	setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>;
	selectedNerveNodeIdx: number | null;
	setSelectedNerveNodeIdx: React.Dispatch<React.SetStateAction<number | null>>;
	showDentalArch: boolean;
	archCurve: DentalArchCurve;
	setArchCurve: React.Dispatch<React.SetStateAction<DentalArchCurve>>;
	crossSections: CrossSectionSliceData[];
	setActiveCrossSectionIdx: React.Dispatch<React.SetStateAction<number>>;
	handleToggleMaximize: (viewport: CbctViewportType) => void;
	isDraggingCrosshair: MprPlane | null;
	setIsDraggingCrosshair: React.Dispatch<React.SetStateAction<MprPlane | null>>;
	activeRotationHandle: ActiveRotationHandleState | null;
	setActiveRotationHandle: React.Dispatch<
		React.SetStateAction<ActiveRotationHandleState | null>
	>;
	hoveredHandle: HoveredHandleState | null;
	setHoveredHandle: React.Dispatch<
		React.SetStateAction<HoveredHandleState | null>
	>;
	isShiftRotating: ShiftRotatingState | null;
	setIsShiftRotating: React.Dispatch<
		React.SetStateAction<ShiftRotatingState | null>
	>;
	isPanning: PanningState | null;
	setIsPanning: React.Dispatch<React.SetStateAction<PanningState | null>>;
	isDraggingZoom: DraggingZoomState | null;
	setIsDraggingZoom: React.Dispatch<
		React.SetStateAction<DraggingZoomState | null>
	>;
	isDraggingWL: DraggingWLState | null;
	setIsDraggingWL: React.Dispatch<React.SetStateAction<DraggingWLState | null>>;
	isDraggingArchAnchor: number | null;
	setIsDraggingArchAnchor: React.Dispatch<React.SetStateAction<number | null>>;
	hoveredArchAnchorIdx: number | null;
	setHoveredArchAnchorIdx: React.Dispatch<React.SetStateAction<number | null>>;
	isDraggingNerveNode: number | null;
	setIsDraggingNerveNode: React.Dispatch<React.SetStateAction<number | null>>;
	pendingCrosshairMmRef: React.MutableRefObject<Point3D | null>;
	rafCrosshairIdRef: React.MutableRefObject<number | null>;
	pendingObliqueAnglesRef: React.MutableRefObject<ObliqueRotationAngles | null>;
	rafObliqueIdRef: React.MutableRefObject<number | null>;
	pendingArchAnchorMmRef: React.MutableRefObject<{
		index: number;
		positionMm: Point2D;
	} | null>;
	rafArchAnchorIdRef: React.MutableRefObject<number | null>;
	hasDraggedZoomRef: React.MutableRefObject<boolean>;
	wheelAccumulatorsRef: React.MutableRefObject<
		Partial<Record<CbctViewportType, number>>
	>;
	rafWheelIdRef: React.MutableRefObject<number | null>;
	latestShiftKeyRef: React.MutableRefObject<boolean>;
}
