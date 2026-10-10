/**
 * DENTE CRM — CBCT MPR Slice Overlay Vector Drawer (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Mandate 8b: Decomposed from useCbctSliceRenderer.ts into sliceRenderer/ modular DAG.
 *
 * Responsibilities:
 * 1. Layer 2 overlay vector rendering on 2D Canvas layers across all 5 viewports:
 *    - Axial MPR Overlay (crosshair lines, oblique rotation handles, dental arch spline, cross-section ticks, rulers, angles, HU probes)
 *    - Coronal MPR Overlay (anisotropic spacing scaling, crosshair, implant 3D projection, mandibular nerve canal)
 *    - Sagittal MPR Overlay (anisotropic spacing scaling, crosshair, implant 3D projection, mandibular nerve canal)
 *    - Panoramic Overlay (arch curve, nerve canal, 2mm implant safety zone projections, cross-section lines, rulers/angles)
 *    - Cross-Section Overlay (transversal implant pose, 2mm safety halo, mandibular canal cross-section, calipers)
 */

import { DEFAULT_VIEWPORT_TRANSFORM } from "../../cbctMprMath";
import {
	drawCrossSectionOverlay,
	drawPanoramicOverlay,
} from "../cbctCurvedOverlayRenderers";
import {
	drawAxialMprOverlay,
	drawCoronalMprOverlay,
	drawSagittalMprOverlay,
} from "../cbctMprOverlayRenderers";
import type { MprOverlayParams } from "../cbctOverlayTypes";
import { renderAllSliceOverlays } from "../cbctSliceOverlaysRenderer";
import type { UseCbctSliceRendererParams } from "./types";

export { renderAllSliceOverlays };

/**
 * LAYER 2: OVERLAY VECTOR RENDERING ACROSS ALL 5 VIEWPORTS
 */
export function renderSliceOverlays(params: UseCbctSliceRendererParams): void {
	const {
		isOpen,
		volume,
		crosshairMm,
		obliqueAngles,
		invertColors,
		slabMode,
		slabThicknessMm,
		transforms,
		activeTool,
		studioMode,
		rulers,
		activeRuler,
		angles,
		activeAngle,
		probeMarkers,
		activeProbe,
		selectedMeasurement,
		hoveredMeasurementHandle,
		draggingMeasurementHandle,
		implant3DWorld,
		currentImplantPose,
		nerveAuditResult,
		interpolatedNerve3D,
		nervePoints,
		nerveTotalLengthMm,
		selectedNerveNodeIdx,
		activeRotationHandle,
		hoveredHandle,
		showDentalArch,
		archCurve,
		activeCrossSection,
		currentImplantSpec,
		selectedArchAnchorIdx,
		hoveredArchAnchorIdx,
		isDraggingArchAnchor,
		panoramicData,
		crossSections,
		activeCrossSectionIdx,
		currentCanal,
		hoveredImplantPart,
		dragImplantPart,
		axialOverlayCanvasRef,
		coronalOverlayCanvasRef,
		sagittalOverlayCanvasRef,
		panoOverlayCanvasRef,
		crossSectionOverlayCanvasRef,
	} = params;

	if (!volume || !isOpen) return;

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
		showEdgeRulers: params.showEdgeRulers,
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
				isHovered: params.hoveredViewport === "axial",
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
				isHovered: params.hoveredViewport === "coronal",
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
				isHovered: params.hoveredViewport === "sagittal",
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
