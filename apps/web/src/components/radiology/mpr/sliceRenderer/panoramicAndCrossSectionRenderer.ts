/**
 * DENTE CRM — CBCT Panoramic Arch Curve & Cross-Section Base Slice Renderer (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Mandate 8b: Decomposed from useCbctSliceRenderer.ts into sliceRenderer/ modular DAG.
 *
 * Responsibilities:
 * 1. Layer 1c: Panoramic curved reconstruction base slice rendering via OffscreenCanvas & ImageData.
 * 2. Layer 1d: Cross-section base slice rendering with Hardware GPU WebGL2 priority (< 0.5 ms) + 2D ImageData fallback.
 */

import { DEFAULT_VIEWPORT_TRANSFORM } from "../../cbctMprMath";
import { resolveAdaptiveInterpolationMethod } from "../cbctAdaptiveSlicePipeline";
import { getSharedCbctGlContext } from "../webgl/CbctVolumeGlContext";
import { drawOffscreenToCanvas } from "./slicePixelBufferBuilder";
import type {
	CrossSectionSliceRenderParams,
	PanoramicSliceRenderParams,
} from "./types";

/**
 * LAYER 1c: PANORAMIC BASE SLICE REDRAW
 */
export function renderPanoramicBaseSlice(params: PanoramicSliceRenderParams): void {
	const {
		isOpen,
		panoramicData,
		transform,
		panoBaseCanvasRef,
		panoOffscreenRef,
		panoImgDataRef,
	} = params;

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
		transform ?? DEFAULT_VIEWPORT_TRANSFORM,
		pw,
		ph,
	);
}

/**
 * LAYER 1d: CROSS-SECTION BASE SLICE REDRAW (Hardware GPU WebGL2 Priority — < 0.5 ms)
 */
export function renderCrossSectionBaseSlice(params: CrossSectionSliceRenderParams): void {
	const {
		isOpen,
		volume,
		activeCrossSection,
		windowWidth,
		windowLevel,
		invertColors,
		slabMode,
		slabThicknessMm,
		doctorCbctDefaults,
		isInteracting,
		transform,
		crossSectionBaseCanvasRef,
		crossSectionOffscreenRef,
		crossSectionImgDataRef,
	} = params;

	if (!isOpen || !crossSectionBaseCanvasRef.current || !activeCrossSection) return;
	const canvas = crossSectionBaseCanvasRef.current;
	const cw = activeCrossSection.widthPx;
	const ch = activeCrossSection.heightPx;
	if (!crossSectionOffscreenRef.current && typeof document !== "undefined") {
		crossSectionOffscreenRef.current = document.createElement("canvas");
	}
	const off = crossSectionOffscreenRef.current;
	if (!off) return;
	if (off.width !== cw || off.height !== ch) {
		off.width = cw;
		off.height = ch;
	}

	let renderedByGl = false;
	const glContext = getSharedCbctGlContext();
	if (volume && glContext.isAvailable()) {
		const targetMethod = doctorCbctDefaults.interpolationMethod ?? "bilinear";
		const effectiveInterpolation = resolveAdaptiveInterpolationMethod(
			targetMethod,
			isInteracting,
		);

		const glRes = glContext.renderCrossSection(
			volume,
			activeCrossSection.centerPointMm,
			activeCrossSection.normalVector2D,
			{
				windowWidth,
				windowLevel,
				invert: invertColors,
				slabMode,
				slabThicknessMm,
				interpolation: effectiveInterpolation,
				widthMm: activeCrossSection.widthMm,
				heightMm: activeCrossSection.heightMm,
				pixelSpacingMm: activeCrossSection.pixelSpacingMm,
			},
			off,
		);
		if (glRes) renderedByGl = true;
	}

	if (!renderedByGl) {
		const offCtx = off.getContext("2d");
		if (offCtx) {
			if (!crossSectionImgDataRef.current || crossSectionImgDataRef.current.width !== cw || crossSectionImgDataRef.current.height !== ch) {
				crossSectionImgDataRef.current = offCtx.createImageData(cw, ch);
			}
			crossSectionImgDataRef.current.data.set(activeCrossSection.pixelData);
			offCtx.putImageData(crossSectionImgDataRef.current, 0, 0);
		}
	}

	drawOffscreenToCanvas(
		canvas,
		off,
		transform ?? DEFAULT_VIEWPORT_TRANSFORM,
		cw,
		ch,
	);
}
