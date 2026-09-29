/**
 * DENTE CRM — CBCT MPR Slice Renderer Hook with Multi-Threaded Web Worker (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Capabilities:
 * 1. Offloads sub-voxel trilinear slice reslicing to dedicated Web Worker thread.
 * 2. Instantaneous (60 FPS) viewport pan & zoom without slice re-computation.
 * 3. Request cancellation & animation frame batching during rapid scrubbing/scroll.
 * 4. Transparent fallback to synchronous rendering in Node/SSR/CSP environments.
 * 5. Full overlay vector layers for calipers, nerves, implants, and dental arch.
 */

import React, { useEffect, useRef } from "react";
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
	MprSliceExtractionResult,
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
import type { StudioMode, ViewLayoutMode } from "./cbctStudioTypes";
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
import { CbctWorkerBridge } from "./cbctWorkerBridge";

export interface UseCbctSliceRendererParams {
	isOpen: boolean;
	volume: CbctVoxelVolume | null;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
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

// ─── UTILITY RENDER HELPERS ──────────────────────────────────────────────────

const safeRequestAnimFrame = (cb: () => void): number => {
	if (typeof requestAnimationFrame === "function") {
		return requestAnimationFrame(cb);
	}
	return setTimeout(cb, 0) as unknown as number;
};

const safeCancelAnimFrame = (id: number): void => {
	if (typeof cancelAnimationFrame === "function") {
		cancelAnimationFrame(id);
	} else {
		clearTimeout(id as unknown as NodeJS.Timeout);
	}
};

function drawOffscreenToCanvas(
	canvas: HTMLCanvasElement | null,
	offscreen: HTMLCanvasElement | null,
	transform: ViewportTransform,
	widthPx: number,
	heightPx: number,
): void {
	if (!canvas || !offscreen || offscreen.width === 0 || offscreen.height === 0) return;
	if (canvas.width !== widthPx || canvas.height !== heightPx) {
		canvas.width = widthPx;
		canvas.height = heightPx;
	}
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	ctx.save();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const t = transform ?? DEFAULT_VIEWPORT_TRANSFORM;
	ctx.translate(t.panX, t.panY);
	ctx.scale(t.zoom, t.zoom);
	ctx.drawImage(offscreen, 0, 0);
	ctx.restore();
}

function updateOffscreenSlice(
	offRef: React.MutableRefObject<HTMLCanvasElement | null>,
	imgDataRef: React.MutableRefObject<ImageData | null>,
	slice: MprSliceExtractionResult,
): void {
	if (typeof document === "undefined") return;
	const { widthPx, heightPx } = slice.metadata;
	if (!offRef.current) {
		offRef.current = document.createElement("canvas");
	}
	const off = offRef.current;
	if (off.width !== widthPx || off.height !== heightPx) {
		off.width = widthPx;
		off.height = heightPx;
	}
	const offCtx = off.getContext("2d");
	if (!offCtx) return;

	if (!imgDataRef.current || imgDataRef.current.width !== widthPx || imgDataRef.current.height !== heightPx) {
		imgDataRef.current = offCtx.createImageData(widthPx, heightPx);
	}
	imgDataRef.current.data.set(slice.data);
	offCtx.putImageData(imgDataRef.current, 0, 0);
}

// ─── HOOK IMPLEMENTATION ─────────────────────────────────────────────────────

export function useCbctSliceRenderer(params: UseCbctSliceRendererParams): void {
	const {
		isOpen,
		volume,
		crosshairMm,
		obliqueAngles,
		windowWidth,
		windowLevel,
		invertColors,
		slabMode,
		slabThicknessMm,
		transforms,
		maximizedViewport,
		viewLayout,
		layoutBurstCount,
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
		axialBaseCanvasRef,
		axialOverlayCanvasRef,
		coronalBaseCanvasRef,
		coronalOverlayCanvasRef,
		sagittalBaseCanvasRef,
		sagittalOverlayCanvasRef,
		panoBaseCanvasRef,
		panoOverlayCanvasRef,
		crossSectionBaseCanvasRef,
		crossSectionOverlayCanvasRef,
	} = params;

	// Persistent offscreens and ImageData caches
	const axialOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const axialImgDataRef = useRef<ImageData | null>(null);
	const coronalOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const coronalImgDataRef = useRef<ImageData | null>(null);
	const sagittalOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const sagittalImgDataRef = useRef<ImageData | null>(null);
	const panoOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const panoImgDataRef = useRef<ImageData | null>(null);
	const crossSectionOffscreenRef = useRef<HTMLCanvasElement | null>(null);
	const crossSectionImgDataRef = useRef<ImageData | null>(null);

	// Web Worker Bridge & RAF Request Tracking
	const bridgeRef = useRef<CbctWorkerBridge | null>(null);
	const latestRenderReqIdRef = useRef<number>(0);
	const pendingRafRef = useRef<number | null>(null);
	const transformsRef = useRef(transforms);
	transformsRef.current = transforms;

	// Deterministic release of offscreen canvas backing stores and bridge on modal close or unmount
	useEffect(() => {
		const releaseOffscreens = () => {
			if (pendingRafRef.current !== null) {
				safeCancelAnimFrame(pendingRafRef.current);
				pendingRafRef.current = null;
			}
			if (bridgeRef.current) {
				bridgeRef.current.dispose();
				bridgeRef.current = null;
			}
			const offscreens = [
				axialOffscreenRef,
				coronalOffscreenRef,
				sagittalOffscreenRef,
				panoOffscreenRef,
				crossSectionOffscreenRef,
			];
			for (const offRef of offscreens) {
				if (offRef.current) {
					offRef.current.width = 0;
					offRef.current.height = 0;
					offRef.current = null;
				}
			}
			axialImgDataRef.current = null;
			coronalImgDataRef.current = null;
			sagittalImgDataRef.current = null;
			panoImgDataRef.current = null;
			crossSectionImgDataRef.current = null;
		};

		if (!isOpen) {
			releaseOffscreens();
		}

		return () => {
			releaseOffscreens();
		};
	}, [isOpen]);

	// LAYER 1a: ASYNCHRONOUS WEB WORKER MPR BASE SLICE EXTRACTION & BATCHING
	useEffect(() => {
		if (!volume || !isOpen) return;

		if (!bridgeRef.current) {
			bridgeRef.current = new CbctWorkerBridge();
		}
		const bridge = bridgeRef.current;
		bridge.initVolume(volume);

		const reqId = ++latestRenderReqIdRef.current;

		if (pendingRafRef.current !== null) {
			safeCancelAnimFrame(pendingRafRef.current);
			pendingRafRef.current = null;
		}

		pendingRafRef.current = safeRequestAnimFrame(() => {
			pendingRafRef.current = null;
			if (!isOpen || !volume) return;

			bridge
				.renderAllPlanes({
					volume,
					crosshairMm,
					obliqueAngles,
					options: {
						windowWidth,
						windowLevel,
						invert: invertColors,
						slabMode,
						slabThicknessMm,
						interpolation: "trilinear",
					},
					requestId: reqId,
				})
				.then((slices) => {
					// Discard outdated render response
					if (reqId !== latestRenderReqIdRef.current || !isOpen) {
						return;
					}

					updateOffscreenSlice(axialOffscreenRef, axialImgDataRef, slices.axial);
					updateOffscreenSlice(coronalOffscreenRef, coronalImgDataRef, slices.coronal);
					updateOffscreenSlice(sagittalOffscreenRef, sagittalImgDataRef, slices.sagittal);

					const currentTransforms = transformsRef.current;

					drawOffscreenToCanvas(
						axialBaseCanvasRef.current,
						axialOffscreenRef.current,
						currentTransforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM,
						slices.axial.metadata.widthPx,
						slices.axial.metadata.heightPx,
					);
					drawOffscreenToCanvas(
						coronalBaseCanvasRef.current,
						coronalOffscreenRef.current,
						currentTransforms.coronal ?? DEFAULT_VIEWPORT_TRANSFORM,
						slices.coronal.metadata.widthPx,
						slices.coronal.metadata.heightPx,
					);
					drawOffscreenToCanvas(
						sagittalBaseCanvasRef.current,
						sagittalOffscreenRef.current,
						currentTransforms.sagittal ?? DEFAULT_VIEWPORT_TRANSFORM,
						slices.sagittal.metadata.widthPx,
						slices.sagittal.metadata.heightPx,
					);
				})
				.catch((err) => {
					console.warn("[useCbctSliceRenderer] Background slice render error:", err);
				});
		});

		return () => {
			if (pendingRafRef.current !== null) {
				safeCancelAnimFrame(pendingRafRef.current);
				pendingRafRef.current = null;
			}
		};
	}, [
		volume,
		isOpen,
		crosshairMm,
		obliqueAngles,
		windowWidth,
		windowLevel,
		invertColors,
		slabMode,
		slabThicknessMm,
		maximizedViewport,
		viewLayout,
		layoutBurstCount,
		axialBaseCanvasRef,
		coronalBaseCanvasRef,
		sagittalBaseCanvasRef,
	]);

	// LAYER 1b: FAST ZERO-GC VIEWPORT PAN & ZOOM REDRAW (60 FPS)
	useEffect(() => {
		if (!isOpen) return;

		if (axialOffscreenRef.current && axialOffscreenRef.current.width > 0) {
			drawOffscreenToCanvas(
				axialBaseCanvasRef.current,
				axialOffscreenRef.current,
				transforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM,
				axialOffscreenRef.current.width,
				axialOffscreenRef.current.height,
			);
		}
		if (coronalOffscreenRef.current && coronalOffscreenRef.current.width > 0) {
			drawOffscreenToCanvas(
				coronalBaseCanvasRef.current,
				coronalOffscreenRef.current,
				transforms.coronal ?? DEFAULT_VIEWPORT_TRANSFORM,
				coronalOffscreenRef.current.width,
				coronalOffscreenRef.current.height,
			);
		}
		if (sagittalOffscreenRef.current && sagittalOffscreenRef.current.width > 0) {
			drawOffscreenToCanvas(
				sagittalBaseCanvasRef.current,
				sagittalOffscreenRef.current,
				transforms.sagittal ?? DEFAULT_VIEWPORT_TRANSFORM,
				sagittalOffscreenRef.current.width,
				sagittalOffscreenRef.current.height,
			);
		}
	}, [
		isOpen,
		transforms.axial,
		transforms.coronal,
		transforms.sagittal,
		axialBaseCanvasRef,
		coronalBaseCanvasRef,
		sagittalBaseCanvasRef,
	]);

	// LAYER 1c: PANORAMIC BASE SLICE REDRAW
	useEffect(() => {
		if (!isOpen || !panoBaseCanvasRef.current || !panoramicData) return;
		const canvas = panoBaseCanvasRef.current;
		const pw = panoramicData.widthPx;
		const ph = panoramicData.heightPx;
		if (!panoOffscreenRef.current) {
			panoOffscreenRef.current = document.createElement("canvas");
		}
		const off = panoOffscreenRef.current;
		if (off.width !== pw || off.height !== ph) {
			off.width = pw;
			off.height = ph;
		}
		const offCtx = off.getContext("2d");
		if (offCtx) {
			if (!panoImgDataRef.current || panoImgDataRef.current.width !== pw || panoImgDataRef.current.height !== ph) {
				panoImgDataRef.current = offCtx.createImageData(pw, ph);
			}
			panoImgDataRef.current.data.set(panoramicData.pixelData);
			offCtx.putImageData(panoImgDataRef.current, 0, 0);
		}
		drawOffscreenToCanvas(
			canvas,
			off,
			transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM,
			pw,
			ph,
		);
	}, [
		isOpen,
		panoramicData,
		transforms.panoramic,
		panoBaseCanvasRef,
	]);

	// LAYER 1d: CROSS-SECTION BASE SLICE REDRAW
	useEffect(() => {
		if (!isOpen || !crossSectionBaseCanvasRef.current || !activeCrossSection) return;
		const canvas = crossSectionBaseCanvasRef.current;
		const cw = activeCrossSection.widthPx;
		const ch = activeCrossSection.heightPx;
		if (!crossSectionOffscreenRef.current) {
			crossSectionOffscreenRef.current = document.createElement("canvas");
		}
		const off = crossSectionOffscreenRef.current;
		if (off.width !== cw || off.height !== ch) {
			off.width = cw;
			off.height = ch;
		}
		const offCtx = off.getContext("2d");
		if (offCtx) {
			if (!crossSectionImgDataRef.current || crossSectionImgDataRef.current.width !== cw || crossSectionImgDataRef.current.height !== ch) {
				crossSectionImgDataRef.current = offCtx.createImageData(cw, ch);
			}
			crossSectionImgDataRef.current.data.set(activeCrossSection.pixelData);
			offCtx.putImageData(crossSectionImgDataRef.current, 0, 0);
		}
		drawOffscreenToCanvas(
			canvas,
			off,
			transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM,
			cw,
			ch,
		);
	}, [
		isOpen,
		activeCrossSection,
		transforms.cross_section,
		crossSectionBaseCanvasRef,
	]);

	// LAYER 2: OVERLAY VECTOR RENDERING
	useEffect(() => {
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
			activeRotationHandle: activeRotationHandle ? { plane: activeRotationHandle.plane, handle: activeRotationHandle.handle } : null,
			hoveredHandle,
			showDentalArch,
			archCurve,
			activeCrossSection,
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
					transform: transforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM,
				});
			}
		}

		// 2. Coronal Overlay
		if (coronalOverlayCanvasRef.current) {
			const canvas = coronalOverlayCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const w = volume.dimensions.width;
				const h = volume.dimensions.depth;
				if (canvas.width !== w || canvas.height !== h) {
					canvas.width = w;
					canvas.height = h;
				}
				ctx.clearRect(0, 0, w, h);
				drawCoronalMprOverlay(ctx, {
					...baseOverlayParams,
					transform: transforms.coronal ?? DEFAULT_VIEWPORT_TRANSFORM,
				});
			}
		}

		// 3. Sagittal Overlay
		if (sagittalOverlayCanvasRef.current) {
			const canvas = sagittalOverlayCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const w = volume.dimensions.height;
				const h = volume.dimensions.depth;
				if (canvas.width !== w || canvas.height !== h) {
					canvas.width = w;
					canvas.height = h;
				}
				ctx.clearRect(0, 0, w, h);
				drawSagittalMprOverlay(ctx, {
					...baseOverlayParams,
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
				});
			}
		}
	}, [
		volume,
		isOpen,
		crosshairMm,
		obliqueAngles,
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
		selectedArchAnchorIdx,
		hoveredArchAnchorIdx,
		isDraggingArchAnchor,
		panoramicData,
		crossSections,
		activeCrossSectionIdx,
		currentCanal,
		hoveredImplantPart,
		dragImplantPart,
		transforms,
		maximizedViewport,
		viewLayout,
		layoutBurstCount,
		axialOverlayCanvasRef,
		coronalOverlayCanvasRef,
		sagittalOverlayCanvasRef,
		panoOverlayCanvasRef,
		crossSectionOverlayCanvasRef,
	]);
}
