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
} from "../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	extractObliqueMprSlice,
} from "../cbctMprMath";
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

	// LAYER 1: BASE SLICES EXTRACTION & DRAWING
	useEffect(() => {
		if (!volume || !isOpen) return;

		// 1. Axial Base Slice
		if (axialBaseCanvasRef.current) {
			const canvas = axialBaseCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = extractObliqueMprSlice(volume, "axial", crosshairMm, obliqueAngles, {
					windowWidth,
					windowLevel,
					invert: invertColors,
					slabMode,
					slabThicknessMm,
					interpolation: "trilinear",
				});
				if (!axialOffscreenRef.current) {
					axialOffscreenRef.current = document.createElement("canvas");
				}
				const off = axialOffscreenRef.current;
				if (off.width !== metadata.widthPx || off.height !== metadata.heightPx) {
					off.width = metadata.widthPx;
					off.height = metadata.heightPx;
				}
				const offCtx = off.getContext("2d");
				if (offCtx) {
					if (!axialImgDataRef.current || axialImgDataRef.current.width !== metadata.widthPx || axialImgDataRef.current.height !== metadata.heightPx) {
						axialImgDataRef.current = offCtx.createImageData(metadata.widthPx, metadata.heightPx);
					}
					axialImgDataRef.current.data.set(data);
					offCtx.putImageData(axialImgDataRef.current, 0, 0);
				}
				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}
				ctx.save();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				const transform = transforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);
				ctx.drawImage(off, 0, 0);
				ctx.restore();
			}
		}

		// 2. Coronal Base Slice
		if (coronalBaseCanvasRef.current) {
			const canvas = coronalBaseCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = extractObliqueMprSlice(volume, "coronal", crosshairMm, obliqueAngles, {
					windowWidth,
					windowLevel,
					invert: invertColors,
					slabMode,
					slabThicknessMm,
					interpolation: "trilinear",
				});
				if (!coronalOffscreenRef.current) {
					coronalOffscreenRef.current = document.createElement("canvas");
				}
				const off = coronalOffscreenRef.current;
				if (off.width !== metadata.widthPx || off.height !== metadata.heightPx) {
					off.width = metadata.widthPx;
					off.height = metadata.heightPx;
				}
				const offCtx = off.getContext("2d");
				if (offCtx) {
					if (!coronalImgDataRef.current || coronalImgDataRef.current.width !== metadata.widthPx || coronalImgDataRef.current.height !== metadata.heightPx) {
						coronalImgDataRef.current = offCtx.createImageData(metadata.widthPx, metadata.heightPx);
					}
					coronalImgDataRef.current.data.set(data);
					offCtx.putImageData(coronalImgDataRef.current, 0, 0);
				}
				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}
				ctx.save();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				const transform = transforms.coronal ?? DEFAULT_VIEWPORT_TRANSFORM;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);
				ctx.drawImage(off, 0, 0);
				ctx.restore();
			}
		}

		// 3. Sagittal Base Slice
		if (sagittalBaseCanvasRef.current) {
			const canvas = sagittalBaseCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				const { data, metadata } = extractObliqueMprSlice(volume, "sagittal", crosshairMm, obliqueAngles, {
					windowWidth,
					windowLevel,
					invert: invertColors,
					slabMode,
					slabThicknessMm,
					interpolation: "trilinear",
				});
				if (!sagittalOffscreenRef.current) {
					sagittalOffscreenRef.current = document.createElement("canvas");
				}
				const off = sagittalOffscreenRef.current;
				if (off.width !== metadata.widthPx || off.height !== metadata.heightPx) {
					off.width = metadata.widthPx;
					off.height = metadata.heightPx;
				}
				const offCtx = off.getContext("2d");
				if (offCtx) {
					if (!sagittalImgDataRef.current || sagittalImgDataRef.current.width !== metadata.widthPx || sagittalImgDataRef.current.height !== metadata.heightPx) {
						sagittalImgDataRef.current = offCtx.createImageData(metadata.widthPx, metadata.heightPx);
					}
					sagittalImgDataRef.current.data.set(data);
					offCtx.putImageData(sagittalImgDataRef.current, 0, 0);
				}
				if (canvas.width !== metadata.widthPx || canvas.height !== metadata.heightPx) {
					canvas.width = metadata.widthPx;
					canvas.height = metadata.heightPx;
				}
				ctx.save();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				const transform = transforms.sagittal ?? DEFAULT_VIEWPORT_TRANSFORM;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);
				ctx.drawImage(off, 0, 0);
				ctx.restore();
			}
		}

		// 4. Panoramic Base Slice
		if (panoBaseCanvasRef.current && panoramicData) {
			const canvas = panoBaseCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
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
				if (canvas.width !== pw || canvas.height !== ph) {
					canvas.width = pw;
					canvas.height = ph;
				}
				ctx.save();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				const transform = transforms.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);
				ctx.drawImage(off, 0, 0);
				ctx.restore();
			}
		}

		// 5. Cross-Section Base Slice
		if (crossSectionBaseCanvasRef.current && activeCrossSection) {
			const canvas = crossSectionBaseCanvasRef.current;
			const ctx = canvas.getContext("2d");
			if (ctx) {
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
				if (canvas.width !== cw || canvas.height !== ch) {
					canvas.width = cw;
					canvas.height = ch;
				}
				ctx.save();
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				const transform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
				ctx.translate(transform.panX, transform.panY);
				ctx.scale(transform.zoom, transform.zoom);
				ctx.drawImage(off, 0, 0);
				ctx.restore();
			}
		}
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
		transforms,
		maximizedViewport,
		viewLayout,
		layoutBurstCount,
		panoramicData,
		activeCrossSection,
		axialBaseCanvasRef,
		coronalBaseCanvasRef,
		sagittalBaseCanvasRef,
		panoBaseCanvasRef,
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
