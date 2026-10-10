/**
 * DENTE CRM — CBCT MPR Slice Renderer Types & Contracts (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Mandate 8b: Decomposed from useCbctSliceRenderer.ts into sliceRenderer/ modular DAG.
 */

import type React from "react";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctProbeMarker,
	CbctViewportType,
	CbctVoxelVolume,
	MprPlane,
	ObliqueRotationAngles,
	Point3D,
	RotationHandlePosition,
	SlabProjectionMode,
	ViewportTransform,
} from "../../cbctMprMath";
import type {
	CrossSectionSliceData,
	DentalArchCurve,
	PanoramicReconstructionResult,
} from "../../dentalCurveEngine";
import type {
	CrossSectionImplantPose,
	Implant3DWorldProjection,
	MandibularCanalCrossSection,
	NerveSafetyAuditResult,
	VirtualImplantSpec,
} from "../../implantSafetyEngine";
import type { CbctToolMode } from "../../CbctLeftToolDock";
import type { DoctorCbctDefaultSettings } from "../../cbctLutMath";
import type { StudioMode, ViewLayoutMode } from "../cbctStudioTypes";
import type { CbctWorkerBridge } from "../cbctWorkerBridge";

export interface UseCbctSliceRendererParams {
	isOpen: boolean;
	volume: CbctVoxelVolume | null;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	notifySliceInteractionRef?: React.MutableRefObject<(() => void) | null>;
	windowWidth: number;
	windowLevel: number;
	invertColors: boolean;
	slabMode: SlabProjectionMode;
	slabThicknessMm: number;
	transforms: Record<CbctViewportType, ViewportTransform>;
	maximizedViewport: CbctViewportType | null;
	viewLayout: ViewLayoutMode;
	layoutBurstCount: number;
	activeTool: CbctToolMode;
	studioMode: StudioMode;
	rulers: CbctMeasurementRuler[];
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	angles: CbctAngleMeasurement[];
	activeAngle: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	probeMarkers: CbctProbeMarker[];
	activeProbe: (CbctProbeMarker & { hu: number; tissueName: string }) | null;
	selectedMeasurement: CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null;
	hoveredMeasurementHandle: { id: string; handleIndex: number } | null;
	draggingMeasurementHandle: { id: string; handleIndex: number } | null;
	implant3DWorld: Implant3DWorldProjection | null;
	currentImplantPose: CrossSectionImplantPose;
	nerveAuditResult: NerveSafetyAuditResult;
	interpolatedNerve3D: Point3D[];
	nervePoints: readonly Point3D[];
	nerveTotalLengthMm: number;
	selectedNerveNodeIdx: number | null;
	activeRotationHandle: { plane: MprPlane; handle: RotationHandlePosition; centerPx: { x: number; y: number } } | null;
	hoveredHandle: { plane: MprPlane; handle: RotationHandlePosition } | null;
	showDentalArch: boolean;
	showEdgeRulers?: boolean;
	archCurve: DentalArchCurve;
	activeCrossSection: CrossSectionSliceData | null;
	currentImplantSpec: VirtualImplantSpec;
	selectedArchAnchorIdx: number | null;
	hoveredArchAnchorIdx: number | null;
	isDraggingArchAnchor: number | null;
	panoramicData: PanoramicReconstructionResult | null;
	crossSections: CrossSectionSliceData[];
	activeCrossSectionIdx: number;
	currentCanal: MandibularCanalCrossSection;
	hoveredImplantPart: string | null;
	dragImplantPart: string | null;
	hoveredViewport?: CbctViewportType | null;
	// Canvas refs
	axialBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	axialOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	coronalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	coronalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	sagittalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	sagittalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	panoBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	panoOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export interface SliceOffscreenCacheRefs {
	axialOffscreenRef: React.MutableRefObject<HTMLCanvasElement | null>;
	axialImgDataRef: React.MutableRefObject<ImageData | null>;
	coronalOffscreenRef: React.MutableRefObject<HTMLCanvasElement | null>;
	coronalImgDataRef: React.MutableRefObject<ImageData | null>;
	sagittalOffscreenRef: React.MutableRefObject<HTMLCanvasElement | null>;
	sagittalImgDataRef: React.MutableRefObject<ImageData | null>;
	panoOffscreenRef: React.MutableRefObject<HTMLCanvasElement | null>;
	panoImgDataRef: React.MutableRefObject<ImageData | null>;
	crossSectionOffscreenRef: React.MutableRefObject<HTMLCanvasElement | null>;
	crossSectionImgDataRef: React.MutableRefObject<ImageData | null>;
}

export interface OrthogonalMprSliceRenderContext {
	reqId: number;
	isOpen: boolean;
	volume: CbctVoxelVolume;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	windowWidth: number;
	windowLevel: number;
	invertColors: boolean;
	slabMode: SlabProjectionMode;
	slabThicknessMm: number;
	doctorCbctDefaults: DoctorCbctDefaultSettings;
	isInteracting: boolean;
	latestRenderReqIdRef: React.MutableRefObject<number>;
	bridgeRef: React.MutableRefObject<CbctWorkerBridge | null>;
	transformsRef: React.MutableRefObject<Record<CbctViewportType, ViewportTransform>>;
	cacheRefs: SliceOffscreenCacheRefs;
	axialBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	coronalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	sagittalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export interface ViewportTransformRedrawParams {
	isOpen: boolean;
	transformsRef: React.MutableRefObject<Record<CbctViewportType, ViewportTransform>>;
	cacheRefs: SliceOffscreenCacheRefs;
	axialBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	coronalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	sagittalBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	panoBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export interface PanoramicSliceRenderParams {
	isOpen: boolean;
	panoramicData: PanoramicReconstructionResult | null;
	transform: ViewportTransform | undefined;
	panoBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	panoOffscreenRef: React.MutableRefObject<HTMLCanvasElement | null>;
	panoImgDataRef: React.MutableRefObject<ImageData | null>;
}

export interface CrossSectionSliceRenderParams {
	isOpen: boolean;
	volume: CbctVoxelVolume | null;
	activeCrossSection: CrossSectionSliceData | null;
	windowWidth: number;
	windowLevel: number;
	invertColors: boolean;
	slabMode: SlabProjectionMode;
	slabThicknessMm: number;
	doctorCbctDefaults: DoctorCbctDefaultSettings;
	isInteracting: boolean;
	transform: ViewportTransform | undefined;
	crossSectionBaseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionOffscreenRef: React.MutableRefObject<HTMLCanvasElement | null>;
	crossSectionImgDataRef: React.MutableRefObject<ImageData | null>;
}
