/**
 * DENTE CRM — CBCT MPR Vector Overlays Dispatcher (Layer 2)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8b: Decomposed from useCbctSliceRenderer.ts to maintain strict modularity (<= 800 lines).
 */

import React from "react";
import type {
	CbctVoxelVolume,
	Point3D,
	SlabProjectionMode,
	ObliqueRotationAngles,
	RotationHandlePosition,
	ViewportTransform,
	CbctMeasurementRuler,
	CbctAngleMeasurement,
	CbctProbeMarker,
	MprPlane,
	CbctViewportType,
} from "../cbctMprMath";
import { DEFAULT_VIEWPORT_TRANSFORM } from "../cbctMprMath";
import type {
	DentalArchCurve,
	PanoramicReconstructionResult,
	CrossSectionSliceData,
} from "../dentalCurveEngine";
import type {
	Implant3DWorldProjection,
	NerveSafetyAuditResult,
	CrossSectionImplantPose,
	MandibularCanalCrossSection,
	VirtualImplantSpec,
} from "../implantSafetyEngine";
import type { CbctToolMode } from "../CbctLeftToolDock";
import type { StudioMode } from "./cbctStudioTypes";
import type { MprOverlayParams } from "./cbctOverlayTypes";
import {
	drawAxialMprOverlay,
	drawCoronalMprOverlay,
	drawSagittalMprOverlay,
} from "./cbctMprOverlayRenderers";
import {
	drawPanoramicOverlay,
	drawCrossSectionOverlay,
} from "./cbctCurvedOverlayRenderers";

export interface RenderAllSliceOverlaysParams {
	readonly volume: CbctVoxelVolume;
	readonly crosshairMm: Point3D;
	readonly obliqueAngles: ObliqueRotationAngles;
	readonly invertColors: boolean;
	readonly slabMode: SlabProjectionMode;
	readonly slabThicknessMm: number;
	readonly transforms: Record<CbctViewportType, ViewportTransform>;
	readonly rulers: CbctMeasurementRuler[];
	readonly activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	readonly angles: CbctAngleMeasurement[];
	readonly activeAngle: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	readonly probeMarkers: CbctProbeMarker[];
	readonly activeProbe: (CbctProbeMarker & { hu: number; tissueName: string }) | null;
	readonly selectedMeasurement: CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null;
	readonly hoveredMeasurementHandle: { id: string; handleIndex: number } | null;
	readonly draggingMeasurementHandle: { id: string; handleIndex: number } | null;
	readonly activeTool: CbctToolMode;
	readonly studioMode: StudioMode;
	readonly implant3DWorld: Implant3DWorldProjection | null;
	readonly currentImplantPose: CrossSectionImplantPose;
	readonly currentImplantSpec: VirtualImplantSpec;
	readonly nerveAuditResult: NerveSafetyAuditResult;
	readonly interpolatedNerve3D: Point3D[];
	readonly nervePoints: readonly Point3D[];
	readonly nerveTotalLengthMm: number;
	readonly selectedNerveNodeIdx: number | null;
	readonly activeRotationHandle: { plane: MprPlane; handle: RotationHandlePosition; centerPx: { x: number; y: number } } | null;
	readonly hoveredHandle: { plane: MprPlane; handle: RotationHandlePosition } | null;
	readonly showDentalArch: boolean;
	readonly showEdgeRulers?: boolean | undefined;
	readonly hoveredViewport?: CbctViewportType | null | undefined;
	readonly archCurve: DentalArchCurve;
	readonly activeCrossSection: CrossSectionSliceData | null;
	readonly crossSections: CrossSectionSliceData[];
	readonly activeCrossSectionIdx: number;
	readonly currentCanal: MandibularCanalCrossSection;
	readonly selectedArchAnchorIdx: number | null;
	readonly hoveredArchAnchorIdx: number | null;
	readonly isDraggingArchAnchor: number | null;
	readonly panoramicData: PanoramicReconstructionResult | null;
	readonly hoveredImplantPart: string | null;
	readonly dragImplantPart: string | null;
	// Canvas refs
	readonly axialOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly coronalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly sagittalOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly panoOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly crossSectionOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function renderAllSliceOverlays(params: RenderAllSliceOverlaysParams): void {
	const {
		volume,
		crosshairMm,
		obliqueAngles,
		invertColors,
		slabMode,
		slabThicknessMm,
		transforms,
		rulers,
		activeRuler,
		angles,
		activeAngle,
		probeMarkers,
		activeProbe,
		selectedMeasurement,
		hoveredMeasurementHandle,
		draggingMeasurementHandle,
		activeTool,
		studioMode,
		implant3DWorld,
		currentImplantPose,
		currentImplantSpec,
		nerveAuditResult,
		interpolatedNerve3D,
		nervePoints,
		nerveTotalLengthMm,
		selectedNerveNodeIdx,
		activeRotationHandle,
		hoveredHandle,
		showDentalArch,
		showEdgeRulers,
		hoveredViewport,
		archCurve,
		activeCrossSection,
		crossSections,
		activeCrossSectionIdx,
		currentCanal,
		selectedArchAnchorIdx,
		hoveredArchAnchorIdx,
		isDraggingArchAnchor,
		panoramicData,
		hoveredImplantPart,
		dragImplantPart,
		axialOverlayCanvasRef,
		coronalOverlayCanvasRef,
		sagittalOverlayCanvasRef,
		panoOverlayCanvasRef,
		crossSectionOverlayCanvasRef,
	} = params;

	const baseOverlayParams: MprOverlayParams = {
		volume,
		crosshairMm,
		transform: DEFAULT_VIEWPORT_TRANSFORM,
		invertColors,
		slabMode,
		slabThicknessMm,
		rulers,
		activeRuler,
		angles,
		activeAngle,
		probeMarkers,
		activeProbe,
		selectedMeasurement,
		hoveredMeasurementHandle,
		draggingMeasurementHandle,
		activeTool,
		studioMode,
		implant3DWorld,
		nerveAuditResult,
		interpolatedNerve3D,
		nervePoints,
		nerveTotalLengthMm,
		selectedNerveNodeIdx,
		obliqueAngles,
		activeRotationHandle: activeRotationHandle
			? { plane: activeRotationHandle.plane, handle: activeRotationHandle.handle }
			: null,
		hoveredHandle,
		showDentalArch,
		showEdgeRulers,
		archCurve,
		activeCrossSection,
		crossSections,
		activeCrossSectionIdx,
		selectedArchAnchorIdx,
		hoveredArchAnchorIdx,
		isDraggingArchAnchor,
	};

	// 1. Axial Overlay
	if (axialOverlayCanvasRef.current) {
		const canvas = axialOverlayCanvasRef.current;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const w = volume.dimensions.width;
			const h = volume.dimensions.height;
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			ctx.clearRect(0, 0, w, h);
			drawAxialMprOverlay(ctx, {
				...baseOverlayParams,
				isHovered: hoveredViewport === "axial",
				transform: transforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM,
			});
		}
	}

	// 2. Coronal Overlay
	if (coronalOverlayCanvasRef.current) {
		const canvas = coronalOverlayCanvasRef.current;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const spX = volume.spacingMm.x || 0.2;
			const spZ = volume.spacingMm.z || 0.2;
			const w = volume.dimensions.width;
			const h = Math.max(1, Math.round((volume.dimensions.depth * spZ) / spX));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			ctx.clearRect(0, 0, w, h);
			drawCoronalMprOverlay(ctx, {
				...baseOverlayParams,
				isHovered: hoveredViewport === "coronal",
				transform: transforms.coronal ?? DEFAULT_VIEWPORT_TRANSFORM,
			});
		}
	}

	// 3. Sagittal Overlay
	if (sagittalOverlayCanvasRef.current) {
		const canvas = sagittalOverlayCanvasRef.current;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const spY = volume.spacingMm.y || 0.2;
			const spZ = volume.spacingMm.z || 0.2;
			const w = volume.dimensions.height;
			const h = Math.max(1, Math.round((volume.dimensions.depth * spZ) / spY));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			ctx.clearRect(0, 0, w, h);
			drawSagittalMprOverlay(ctx, {
				...baseOverlayParams,
				isHovered: hoveredViewport === "sagittal",
				transform: transforms.sagittal ?? DEFAULT_VIEWPORT_TRANSFORM,
			});
		}
	}

	// 4. Panoramic Overlay
	if (panoOverlayCanvasRef.current && panoramicData) {
		const canvas = panoOverlayCanvasRef.current;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const pw = panoramicData.widthPx;
			const ph = panoramicData.heightPx;
			if (canvas.width !== pw || canvas.height !== ph) {
				canvas.width = pw;
				canvas.height = ph;
			}
			ctx.clearRect(0, 0, pw, ph);
			drawPanoramicOverlay(ctx, {
				activePano: panoramicData,
				volume,
				crosshairMm,
				transform: transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM,
				slabMode,
				slabThicknessMm,
				interpolatedNerve3D,
				archCurve,
				nervePoints,
				studioMode,
				activeCrossSection,
				implant3DWorld,
				nerveAuditResult,
				crossSections,
				hoveredToothMarkerFdi: null,
				invertColors,
				rulers,
				activeRuler,
				angles,
				activeAngle,
				selectedMeasurement,
				hoveredMeasurementHandle,
				draggingMeasurementHandle,
			});
		}
	}

	// 5. Cross-Section Overlay
	if (crossSectionOverlayCanvasRef.current && activeCrossSection) {
		const canvas = crossSectionOverlayCanvasRef.current;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const cw = activeCrossSection.widthPx;
			const ch = activeCrossSection.heightPx;
			if (canvas.width !== cw || canvas.height !== ch) {
				canvas.width = cw;
				canvas.height = ch;
			}
			ctx.clearRect(0, 0, cw, ch);
			drawCrossSectionOverlay(ctx, {
				activeCrossSection,
				transform: transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM,
				studioMode,
				currentCanal,
				currentImplantPose,
				currentImplantSpec,
				nerveAuditResult,
				selectedMeasurement,
				hoveredImplantPart,
				dragImplantPart,
				invertColors,
				rulers,
				activeRuler,
				angles,
				activeAngle,
				hoveredMeasurementHandle,
				draggingMeasurementHandle,
			});
		}
	}
}
