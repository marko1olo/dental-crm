/**
 * DENTE CRM — CBCT Curved Viewport Handler Types
 * Layer 0: Type contracts and DTO interfaces (0 runtime dependencies)
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import type React from "react";
import type { CbctToolMode } from "../../CbctLeftToolDock";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctViewportType,
	CbctVoxelVolume,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import type {
	CrossSectionSliceData,
	DentalArchCurve,
	PanoramicReconstructionResult,
} from "../../dentalCurveEngine";
import type { VirtualImplantSpec } from "../../implantSafetyEngine";
import type { StudioMode } from "../cbctStudioTypes";

/**
 * 2D Spline control point on axial projection plane
 */
export interface SplineControlPoint2D {
	x: number;
	y: number;
	arcDistanceMm?: number;
}

/**
 * Normal and tangent 2D vector for orthogonal cross-section orientation
 */
export interface SplineTangentNormal2D {
	tangent: { x: number; y: number };
	normal: { x: number; y: number };
}

/**
 * Specification for an individual cross-section reconstruction plane
 */
export interface CurvedCrossSectionPlaneSpec {
	index: number;
	sliceCenterMm: Point3D;
	normalVector: { x: number; y: number };
	tangentVector: { x: number; y: number };
	arcDistanceMm: number;
	widthMm: number;
	heightMm: number;
}

/**
 * Pending panoramic synchronization state for RAF throttler
 */
export interface PendingPanoSync {
	crossSectionIdx: number;
	worldMm: Point3D;
}

/**
 * Dragging state snapshot for cross-section virtual implant repositioning
 */
export interface ImplantDragState {
	clientX: number;
	clientY: number;
	startX: number;
	startY: number;
	startAng: number;
}

/**
 * Active drag descriptor for measurement handles (rulers and angles)
 */
export interface MeasurementHandleDragDescriptor {
	type?: string;
	id: string;
	handleIndex: number;
	plane?: CbctViewportType | string;
}

/**
 * Parameters for the useCbctCurvedViewportHandlers hook
 */
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
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>;
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
	crossSectionDragStart: ImplantDragState | null;
	setCrossSectionDragStart: React.Dispatch<
		React.SetStateAction<ImplantDragState | null>
	>;
	setSelectedMeasurement: React.Dispatch<
		React.SetStateAction<CbctMeasurementRuler | null>
	>;
	handleSelectTooth: (toothFdi: number | string) => void;
	panoCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	isDraggingWL: {
		startX: number;
		startY: number;
		startWW: number;
		startWL: number;
	} | null;
	setIsDraggingWL: React.Dispatch<
		React.SetStateAction<{
			startX: number;
			startY: number;
			startWW: number;
			startWL: number;
		} | null>
	>;
	isPanning: {
		plane: CbctViewportType;
		startX: number;
		startY: number;
		startPanX: number;
		startPanY: number;
	} | null;
	setIsPanning: React.Dispatch<
		React.SetStateAction<{
			plane: CbctViewportType;
			startX: number;
			startY: number;
			startPanX: number;
			startPanY: number;
		} | null>
	>;
	isDraggingZoom: {
		plane: CbctViewportType;
		startY: number;
		startZoom: number;
	} | null;
	setIsDraggingZoom: React.Dispatch<
		React.SetStateAction<{
			plane: CbctViewportType;
			startY: number;
			startZoom: number;
		} | null>
	>;
	hasDraggedZoomRef: React.MutableRefObject<boolean>;
	rulers: CbctMeasurementRuler[];
	setRulers: React.Dispatch<React.SetStateAction<CbctMeasurementRuler[]>>;
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	setActiveRuler: React.Dispatch<
		React.SetStateAction<(CbctMeasurementRuler & { currentMm: Point3D }) | null>
	>;
	angles: CbctAngleMeasurement[];
	setAngles: React.Dispatch<React.SetStateAction<CbctAngleMeasurement[]>>;
	activeAngle:
		| (CbctAngleMeasurement & { currentMm: Point3D; step?: "vertex" | "end" })
		| null;
	setActiveAngle: React.Dispatch<
		React.SetStateAction<
			| (CbctAngleMeasurement & { currentMm: Point3D; step?: "vertex" | "end" })
			| null
		>
	>;
	hoveredMeasurementHandle: MeasurementHandleDragDescriptor | null;
	setHoveredMeasurementHandle: React.Dispatch<React.SetStateAction<any>>;
	draggingMeasurementHandle: MeasurementHandleDragDescriptor | null;
	setDraggingMeasurementHandle: React.Dispatch<React.SetStateAction<any>>;
}

/**
 * Result handlers returned by useCbctCurvedViewportHandlers
 */
export interface UseCbctCurvedViewportHandlersResult {
	isDraggingPano: boolean;
	handlePanoMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handlePanoMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handlePanoMouseUp: () => void;
	handleCrossSectionMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handleCrossSectionMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handleCrossSectionMouseUp: () => void;
}
