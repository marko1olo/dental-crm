/**
 * DENTE CRM — CBCT MPR Slice Renderer Hook with Multi-Threaded Web Worker (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Mandate 8b: Decomposed modular entry point (sliceRenderer/index.ts).
 *
 * Capabilities:
 * 1. Offloads sub-voxel trilinear slice reslicing to dedicated Web Worker thread.
 * 2. Instantaneous (60 FPS) viewport pan & zoom without slice re-computation.
 * 3. Request cancellation & animation frame batching during rapid scrubbing/scroll.
 * 4. Transparent fallback to synchronous rendering in Node/SSR/CSP environments.
 * 5. Full overlay vector layers for calipers, nerves, implants, and dental arch.
 */

import React, { useEffect, useRef } from "react";
import {
	loadDoctorCbctSettings,
	type DoctorCbctDefaultSettings,
} from "../../cbctLutMath";
import {
	CBCT_ADAPTIVE_INTERACTION_DEBOUNCE_MS,
	CBCT_INTERACTION_EVENT,
	notifyCbctSliceInteraction,
	resolveAdaptiveInterpolationMethod,
	useCbctAdaptiveInteraction,
} from "../cbctAdaptiveSlicePipeline";
import type { CbctWorkerBridge } from "../cbctWorkerBridge";
import {
	disposeSharedCbctGlContext,
	getSharedCbctGlContext,
} from "../webgl/CbctVolumeGlContext";
import {
	renderCrossSectionBaseSlice,
	renderPanoramicBaseSlice,
} from "./panoramicAndCrossSectionRenderer";
import {
	renderAllSliceOverlays,
	renderSliceOverlays,
} from "./sliceOverlayDrawer";
import {
	drawOffscreenToCanvas,
	redrawViewportTransformsFromOffscreen,
	releaseSliceOffscreenCaches,
	renderOrthogonalMprSlices,
	safeCancelAnimFrame,
	safeRequestAnimFrame,
	updateOffscreenSlice,
} from "./slicePixelBufferBuilder";
import type {
	CrossSectionSliceRenderParams,
	OrthogonalMprSliceRenderContext,
	PanoramicSliceRenderParams,
	SliceOffscreenCacheRefs,
	UseCbctSliceRendererParams,
	ViewportTransformRedrawParams,
} from "./types";

export {
	CBCT_ADAPTIVE_INTERACTION_DEBOUNCE_MS,
	CBCT_INTERACTION_EVENT,
	notifyCbctSliceInteraction,
	resolveAdaptiveInterpolationMethod,
	safeRequestAnimFrame,
	safeCancelAnimFrame,
	drawOffscreenToCanvas,
	updateOffscreenSlice,
	releaseSliceOffscreenCaches,
	renderOrthogonalMprSlices,
	redrawViewportTransformsFromOffscreen,
	renderPanoramicBaseSlice,
	renderCrossSectionBaseSlice,
	renderSliceOverlays,
	renderAllSliceOverlays,
};

export type {
	UseCbctSliceRendererParams,
	SliceOffscreenCacheRefs,
	OrthogonalMprSliceRenderContext,
	ViewportTransformRedrawParams,
	PanoramicSliceRenderParams,
	CrossSectionSliceRenderParams,
};

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
	const isTabHiddenRef = useRef<boolean>(false);
	const [forceSliceRenderTick, setForceSliceRenderTick] = React.useState<number>(0);
	const [doctorCbctDefaults, setDoctorCbctDefaults] = React.useState<DoctorCbctDefaultSettings>(() =>
		loadDoctorCbctSettings(),
	);

	// Synchronize with doctor defaults changes (interpolation method, thicknesses)
	useEffect(() => {
		const handleDefaultsUpdate = (e: Event) => {
			const detail = (e as CustomEvent<DoctorCbctDefaultSettings>).detail;
			if (detail) {
				setDoctorCbctDefaults(detail);
			} else {
				setDoctorCbctDefaults(loadDoctorCbctSettings());
			}
			setForceSliceRenderTick((t) => t + 1);
		};
		if (typeof window !== "undefined") {
			window.addEventListener("dente:cbct-defaults-updated", handleDefaultsUpdate);
		}
		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener("dente:cbct-defaults-updated", handleDefaultsUpdate);
			}
		};
	}, []);

	// Tab Visibility Hibernation: cancel ongoing render loops when tab is hidden
	useEffect(() => {
		const onVisibilityChange = () => {
			const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
			isTabHiddenRef.current = hidden;
			if (hidden) {
				if (pendingRafRef.current !== null) {
					safeCancelAnimFrame(pendingRafRef.current);
					pendingRafRef.current = null;
				}
			} else {
				// Smooth restart on tab restore: schedule 1 slice redraw pass
				setForceSliceRenderTick((t) => t + 1);
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", onVisibilityChange);
		}
		return () => {
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", onVisibilityChange);
			}
		};
	}, []);

	// Two-Stage Adaptive Interaction Pipeline (FEAT-010):
	// Stage 1 (0–80 ms during active scroll/drag): hardware bilinear (120+ FPS)
	// Stage 2 (pause > 80 ms): refine slice with doctor's selected Lanczos-3 / Bilateral
	const { isInteractingRef, notifySliceInteraction, dispose: disposeAdaptiveInteraction } =
		useCbctAdaptiveInteraction({
			debounceMs: CBCT_ADAPTIVE_INTERACTION_DEBOUNCE_MS,
			onSettled: () => {
				setForceSliceRenderTick((t) => t + 1);
			},
		});

	if (params.notifySliceInteractionRef) {
		params.notifySliceInteractionRef.current = notifySliceInteraction;
	}

	// Automatic trigger on focal coordinate changes
	const prevCrosshairRef = useRef(crosshairMm);
	const prevObliqueRef = useRef(obliqueAngles);
	useEffect(() => {
		const prevC = prevCrosshairRef.current;
		const prevO = prevObliqueRef.current;
		const isMoved =
			prevC.x !== crosshairMm.x ||
			prevC.y !== crosshairMm.y ||
			prevC.z !== crosshairMm.z ||
			prevO.axialAngleDeg !== obliqueAngles.axialAngleDeg ||
			prevO.coronalTiltDeg !== obliqueAngles.coronalTiltDeg ||
			prevO.sagittalTiltDeg !== obliqueAngles.sagittalTiltDeg;

		if (isMoved) {
			prevCrosshairRef.current = crosshairMm;
			prevObliqueRef.current = obliqueAngles;
			notifySliceInteraction();
		}
	}, [crosshairMm, obliqueAngles, notifySliceInteraction]);

	// WebGL Context Lost & Restored Subscriptions
	useEffect(() => {
		const glContext = getSharedCbctGlContext();
		const unsubLost = glContext.addContextLostListener(() => {
			// Context lost: force slice re-render so worker fallback kicks in without black screen
			setForceSliceRenderTick((t) => t + 1);
		});
		const unsubRestored = glContext.addContextRestoredListener(() => {
			// Context restored: force slice re-render on revived hardware GPU
			setForceSliceRenderTick((t) => t + 1);
		});
		return () => {
			unsubLost();
			unsubRestored();
		};
	}, []);

	// Deterministic release of offscreen canvas backing stores and bridge on modal close or unmount
	useEffect(() => {
		const releaseOffscreens = () => {
			if (pendingRafRef.current !== null) {
				safeCancelAnimFrame(pendingRafRef.current);
				pendingRafRef.current = null;
			}
			disposeAdaptiveInteraction();
			if (bridgeRef.current) {
				bridgeRef.current.dispose();
				bridgeRef.current = null;
			}
			disposeSharedCbctGlContext();
			releaseSliceOffscreenCaches({
				axialOffscreenRef,
				axialImgDataRef,
				coronalOffscreenRef,
				coronalImgDataRef,
				sagittalOffscreenRef,
				sagittalImgDataRef,
				panoOffscreenRef,
				panoImgDataRef,
				crossSectionOffscreenRef,
				crossSectionImgDataRef,
			});
		};

		if (!isOpen) {
			releaseOffscreens();
		}

		return () => {
			releaseOffscreens();
		};
	}, [isOpen, disposeAdaptiveInteraction]);

	// LAYER 1a: HARDWARE GPU WEBGL2 (PRIORITY) & ASYNCHRONOUS WEB WORKER (FALLBACK) MPR SLICE EXTRACTION
	useEffect(() => {
		if (!volume || !isOpen || isTabHiddenRef.current) return;

		const reqId = ++latestRenderReqIdRef.current;

		if (pendingRafRef.current !== null) {
			safeCancelAnimFrame(pendingRafRef.current);
			pendingRafRef.current = null;
		}

		pendingRafRef.current = safeRequestAnimFrame(() => {
			pendingRafRef.current = null;
			if (!isOpen || !volume || isTabHiddenRef.current) return;

			renderOrthogonalMprSlices({
				reqId,
				isOpen,
				volume,
				crosshairMm,
				obliqueAngles,
				windowWidth,
				windowLevel,
				invertColors,
				slabMode,
				slabThicknessMm,
				doctorCbctDefaults,
				isInteracting: isInteractingRef.current,
				latestRenderReqIdRef,
				bridgeRef,
				transformsRef,
				cacheRefs: {
					axialOffscreenRef,
					axialImgDataRef,
					coronalOffscreenRef,
					coronalImgDataRef,
					sagittalOffscreenRef,
					sagittalImgDataRef,
					panoOffscreenRef,
					panoImgDataRef,
					crossSectionOffscreenRef,
					crossSectionImgDataRef,
				},
				axialBaseCanvasRef,
				coronalBaseCanvasRef,
				sagittalBaseCanvasRef,
			});
		});

		return () => {
			if (pendingRafRef.current !== null) {
				safeCancelAnimFrame(pendingRafRef.current);
				pendingRafRef.current = null;
			}
		};
	}, [
		volume, isOpen, crosshairMm, obliqueAngles, windowWidth, windowLevel, invertColors,
		slabMode, slabThicknessMm, maximizedViewport, viewLayout, layoutBurstCount, studioMode,
		axialBaseCanvasRef, coronalBaseCanvasRef, sagittalBaseCanvasRef, forceSliceRenderTick,
		doctorCbctDefaults.interpolationMethod,
	]);

	// LAYER 1b: FAST ZERO-GC VIEWPORT PAN & ZOOM REDRAW (60 FPS) & WORKSPACE SWITCH TRANSFERS
	useEffect(() => {
		redrawViewportTransformsFromOffscreen({
			isOpen,
			transformsRef,
			cacheRefs: {
				axialOffscreenRef,
				axialImgDataRef,
				coronalOffscreenRef,
				coronalImgDataRef,
				sagittalOffscreenRef,
				sagittalImgDataRef,
				panoOffscreenRef,
				panoImgDataRef,
				crossSectionOffscreenRef,
				crossSectionImgDataRef,
			},
			axialBaseCanvasRef,
			coronalBaseCanvasRef,
			sagittalBaseCanvasRef,
			panoBaseCanvasRef,
			crossSectionBaseCanvasRef,
		});
	}, [
		isOpen, studioMode, maximizedViewport, viewLayout,
		transforms.axial, transforms.coronal, transforms.sagittal, transforms.panoramic, transforms.cross_section,
		axialBaseCanvasRef, coronalBaseCanvasRef, sagittalBaseCanvasRef, panoBaseCanvasRef, crossSectionBaseCanvasRef,
	]);

	// LAYER 1c: PANORAMIC BASE SLICE REDRAW
	useEffect(() => {
		renderPanoramicBaseSlice({
			isOpen,
			panoramicData,
			transform: transforms.panoramic,
			panoBaseCanvasRef,
			panoOffscreenRef,
			panoImgDataRef,
		});
	}, [
		isOpen,
		studioMode,
		panoramicData,
		transforms.panoramic,
		panoBaseCanvasRef,
	]);

	// LAYER 1d: CROSS-SECTION BASE SLICE REDRAW (Hardware GPU WebGL2 Priority — < 0.5 ms)
	useEffect(() => {
		renderCrossSectionBaseSlice({
			isOpen,
			volume,
			activeCrossSection,
			windowWidth,
			windowLevel,
			invertColors,
			slabMode,
			slabThicknessMm,
			doctorCbctDefaults,
			isInteracting: isInteractingRef.current,
			transform: transforms.cross_section,
			crossSectionBaseCanvasRef,
			crossSectionOffscreenRef,
			crossSectionImgDataRef,
		});
	}, [
		isOpen,
		studioMode,
		volume,
		activeCrossSection,
		windowWidth,
		windowLevel,
		invertColors,
		slabMode,
		slabThicknessMm,
		transforms.cross_section,
		crossSectionBaseCanvasRef,
		forceSliceRenderTick,
		doctorCbctDefaults.interpolationMethod,
	]);

	// LAYER 2: OVERLAY VECTOR RENDERING
	useEffect(() => {
		renderSliceOverlays(params);
	}, [
		volume, isOpen, crosshairMm, obliqueAngles, invertColors, slabMode, slabThicknessMm,
		rulers, activeRuler, angles, activeAngle, probeMarkers, activeProbe,
		selectedMeasurement, hoveredMeasurementHandle, draggingMeasurementHandle,
		activeTool, studioMode, implant3DWorld, currentImplantPose, nerveAuditResult,
		interpolatedNerve3D, nervePoints, nerveTotalLengthMm, selectedNerveNodeIdx,
		activeRotationHandle, hoveredHandle, showDentalArch, params.showEdgeRulers,
		params.hoveredViewport, archCurve, activeCrossSection, selectedArchAnchorIdx,
		hoveredArchAnchorIdx, isDraggingArchAnchor, panoramicData, crossSections,
		activeCrossSectionIdx, currentCanal, hoveredImplantPart, dragImplantPart,
		transforms, maximizedViewport, viewLayout, layoutBurstCount,
		axialOverlayCanvasRef, coronalOverlayCanvasRef, sagittalOverlayCanvasRef,
		panoOverlayCanvasRef, crossSectionOverlayCanvasRef,
	]);
}
