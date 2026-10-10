/**
 * DENTE CRM — CBCT MPR Slice Pixel Buffer & Orthogonal Reslice Pipeline (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Mandate 8b: Decomposed from useCbctSliceRenderer.ts into sliceRenderer/ modular DAG.
 *
 * Responsibilities:
 * 1. Offscreen HTMLCanvasElement & ImageData buffer management (updateOffscreenSlice).
 * 2. Fast zero-GC 60 FPS viewport pan & zoom blit (drawOffscreenToCanvas).
 * 3. Layer 1a Orthogonal MPR extraction: Hardware GPU WebGL2 priority (< 0.5 ms) + Web Worker fallback.
 * 4. Layer 1b Fast viewport transform redraw across all 5 viewports.
 * 5. Deterministic offscreen backing-store release on unmount/close.
 */

import type React from "react";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	type MprSliceExtractionResult,
	type ViewportTransform,
} from "../../cbctMprMath";
import { resolveAdaptiveInterpolationMethod } from "../cbctAdaptiveSlicePipeline";
import { CbctWorkerBridge, isStaleSliceRequestError } from "../cbctWorkerBridge";
import { getSharedCbctGlContext } from "../webgl/CbctVolumeGlContext";
import type {
	OrthogonalMprSliceRenderContext,
	SliceOffscreenCacheRefs,
	ViewportTransformRedrawParams,
} from "./types";

export const safeRequestAnimFrame = (cb: () => void): number => {
	if (typeof requestAnimationFrame === "function") {
		return requestAnimationFrame(cb);
	}
	return setTimeout(cb, 0) as unknown as number;
};

export const safeCancelAnimFrame = (id: number): void => {
	if (typeof cancelAnimationFrame === "function") {
		cancelAnimationFrame(id);
	} else {
		clearTimeout(id as unknown as NodeJS.Timeout);
	}
};

export function drawOffscreenToCanvas(
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

export function updateOffscreenSlice(
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

export function releaseSliceOffscreenCaches(cacheRefs: SliceOffscreenCacheRefs): void {
	const {
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
	} = cacheRefs;

	for (const offRef of [
		axialOffscreenRef,
		coronalOffscreenRef,
		sagittalOffscreenRef,
		panoOffscreenRef,
		crossSectionOffscreenRef,
	]) {
		if (offRef.current) {
			offRef.current.width = 0;
			offRef.current.height = 0;
			offRef.current = null;
		}
	}
	axialImgDataRef.current =
		coronalImgDataRef.current =
		sagittalImgDataRef.current =
		panoImgDataRef.current =
		crossSectionImgDataRef.current =
			null;
}

/**
 * LAYER 1a: HARDWARE GPU WEBGL2 (PRIORITY) & ASYNCHRONOUS WEB WORKER (FALLBACK) MPR SLICE EXTRACTION
 */
export function renderOrthogonalMprSlices(ctx: OrthogonalMprSliceRenderContext): void {
	const {
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
		isInteracting,
		latestRenderReqIdRef,
		bridgeRef,
		transformsRef,
		cacheRefs,
		axialBaseCanvasRef,
		coronalBaseCanvasRef,
		sagittalBaseCanvasRef,
	} = ctx;

	const {
		axialOffscreenRef,
		axialImgDataRef,
		coronalOffscreenRef,
		coronalImgDataRef,
		sagittalOffscreenRef,
		sagittalImgDataRef,
	} = cacheRefs;

	const targetMethod = doctorCbctDefaults.interpolationMethod ?? "bilinear";
	const effectiveInterpolation = resolveAdaptiveInterpolationMethod(
		targetMethod,
		isInteracting,
	);

	// LAYER 1a (Hardware GPU WebGL2 Priority — < 0.5 ms instantaneous MPR rendering, CPU sleeps)
	const glContext = getSharedCbctGlContext();
	if (glContext.isAvailable()) {
		if (!axialOffscreenRef.current && typeof document !== "undefined") {
			axialOffscreenRef.current = document.createElement("canvas");
		}
		if (!coronalOffscreenRef.current && typeof document !== "undefined") {
			coronalOffscreenRef.current = document.createElement("canvas");
		}
		if (!sagittalOffscreenRef.current && typeof document !== "undefined") {
			sagittalOffscreenRef.current = document.createElement("canvas");
		}

		const glResult = glContext.renderAllPlanes(
			volume,
			crosshairMm,
			obliqueAngles,
			{
				windowWidth,
				windowLevel,
				invert: invertColors,
				slabMode,
				slabThicknessMm,
				interpolation: effectiveInterpolation,
				gamma: 1.50,
				useSoftKnee: false,
				softKneeCeiling: 215.0,
				airCutoffHU: -500.0,
			},
			{
				axial: axialOffscreenRef.current,
				coronal: coronalOffscreenRef.current,
				sagittal: sagittalOffscreenRef.current,
			},
		);

		if (glResult) {
			const currentTransforms = transformsRef.current;
			drawOffscreenToCanvas(
				axialBaseCanvasRef.current,
				axialOffscreenRef.current,
				currentTransforms.axial ?? DEFAULT_VIEWPORT_TRANSFORM,
				glResult.axial.widthPx,
				glResult.axial.heightPx,
			);
			drawOffscreenToCanvas(
				coronalBaseCanvasRef.current,
				coronalOffscreenRef.current,
				currentTransforms.coronal ?? DEFAULT_VIEWPORT_TRANSFORM,
				glResult.coronal.widthPx,
				glResult.coronal.heightPx,
			);
			drawOffscreenToCanvas(
				sagittalBaseCanvasRef.current,
				sagittalOffscreenRef.current,
				currentTransforms.sagittal ?? DEFAULT_VIEWPORT_TRANSFORM,
				glResult.sagittal.widthPx,
				glResult.sagittal.heightPx,
			);
			return;
		}
	}

	// LAYER 1b (Transparent Fallback: Asynchronous Web Worker / Synchronous CPU ONLY when WebGL2 GPU is unavailable)
	if (!bridgeRef.current) {
		bridgeRef.current = new CbctWorkerBridge();
	}
	const bridge = bridgeRef.current;
	bridge.initVolume(volume);

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
				interpolation: effectiveInterpolation === "nearest" ? "nearest" : "trilinear",
				gamma: 1.50,
				useSoftKnee: false,
				softKneeCeiling: 215.0,
				airCutoffHU: -500.0,
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
			if (isStaleSliceRequestError(err)) {
				return;
			}
			console.warn("[useCbctSliceRenderer] Background slice render error:", err);
		});
}

/**
 * LAYER 1b: FAST ZERO-GC VIEWPORT PAN & ZOOM REDRAW (60 FPS) & WORKSPACE SWITCH TRANSFERS
 */
export function redrawViewportTransformsFromOffscreen(params: ViewportTransformRedrawParams): void {
	const {
		isOpen,
		transformsRef,
		cacheRefs,
		axialBaseCanvasRef,
		coronalBaseCanvasRef,
		sagittalBaseCanvasRef,
		panoBaseCanvasRef,
		crossSectionBaseCanvasRef,
	} = params;

	if (!isOpen) return;
	const curT = transformsRef.current;
	const {
		axialOffscreenRef,
		coronalOffscreenRef,
		sagittalOffscreenRef,
		panoOffscreenRef,
		crossSectionOffscreenRef,
	} = cacheRefs;

	if (axialOffscreenRef.current?.width && axialBaseCanvasRef.current) {
		drawOffscreenToCanvas(
			axialBaseCanvasRef.current,
			axialOffscreenRef.current,
			curT.axial ?? DEFAULT_VIEWPORT_TRANSFORM,
			axialOffscreenRef.current.width,
			axialOffscreenRef.current.height,
		);
	}
	if (coronalOffscreenRef.current?.width && coronalBaseCanvasRef.current) {
		drawOffscreenToCanvas(
			coronalBaseCanvasRef.current,
			coronalOffscreenRef.current,
			curT.coronal ?? DEFAULT_VIEWPORT_TRANSFORM,
			coronalOffscreenRef.current.width,
			coronalOffscreenRef.current.height,
		);
	}
	if (sagittalOffscreenRef.current?.width && sagittalBaseCanvasRef.current) {
		drawOffscreenToCanvas(
			sagittalBaseCanvasRef.current,
			sagittalOffscreenRef.current,
			curT.sagittal ?? DEFAULT_VIEWPORT_TRANSFORM,
			sagittalOffscreenRef.current.width,
			sagittalOffscreenRef.current.height,
		);
	}
	if (panoOffscreenRef.current?.width && panoBaseCanvasRef.current) {
		drawOffscreenToCanvas(
			panoBaseCanvasRef.current,
			panoOffscreenRef.current,
			curT.panoramic ?? DEFAULT_VIEWPORT_TRANSFORM,
			panoOffscreenRef.current.width,
			panoOffscreenRef.current.height,
		);
	}
	if (crossSectionOffscreenRef.current?.width && crossSectionBaseCanvasRef.current) {
		drawOffscreenToCanvas(
			crossSectionBaseCanvasRef.current,
			crossSectionOffscreenRef.current,
			curT.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM,
			crossSectionOffscreenRef.current.width,
			crossSectionOffscreenRef.current.height,
		);
	}
}
