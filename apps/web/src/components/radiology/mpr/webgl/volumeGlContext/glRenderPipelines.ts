/**
 * DENTE CRM — WebGL2 Hardware GPU 3D-Texture Engine (FEAT-010 / GPU Overhaul)
 * Render Pipelines & Draw Call Dispatch (Mandate 8b / Layer 1)
 */

import {
	type GlSliceCoordinates,
	type GlSliceRenderOptions,
	applySafeDprToCanvas,
	resolveColorMapCode,
	resolveInterpolationCode,
} from "../CbctVolumeGlTextures";
import type { GlSliceDrawResult, GlUniformLocations, GlVolumeUploadDim } from "./types";

export function clearCanvasToBlack(gl: WebGL2RenderingContext): void {
	if (typeof gl.clearColor === "function") {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
	}
	if (typeof gl.clear === "function" && typeof gl.COLOR_BUFFER_BIT === "number") {
		gl.clear(gl.COLOR_BUFFER_BIT);
	}
}

export function updateSliceBasisUniformsOnProgram(
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
	uniforms: GlUniformLocations,
	coords: GlSliceCoordinates,
): boolean {
	gl.useProgram(program);
	if (uniforms.sliceOrigin) gl.uniform3fv(uniforms.sliceOrigin, coords.sliceOrigin);
	if (uniforms.axisU) gl.uniform3fv(uniforms.axisU, coords.axisU);
	if (uniforms.axisV) gl.uniform3fv(uniforms.axisV, coords.axisV);
	if (uniforms.axisNorm) gl.uniform3fv(uniforms.axisNorm, coords.axisNorm);
	return true;
}

export function dispatchSliceDrawPipeline(
	gl: WebGL2RenderingContext,
	canvas: HTMLCanvasElement,
	vao: WebGLVertexArrayObject | null,
	volumeTexture: WebGLTexture | null,
	uploadDim: GlVolumeUploadDim | null,
	prog: WebGLProgram,
	uniforms: GlUniformLocations,
	coords: GlSliceCoordinates,
	options: GlSliceRenderOptions,
	fallbackColorMap: number,
	fallbackSharpenAmount: number,
	targetCanvas?: HTMLCanvasElement | null | undefined,
	readPixels?: boolean | undefined,
): GlSliceDrawResult | null {
	if (targetCanvas) {
		if (options.clampDpr) {
			applySafeDprToCanvas(targetCanvas, coords.widthPx, coords.heightPx, options.safeDpr);
		} else if (targetCanvas.width !== coords.widthPx || targetCanvas.height !== coords.heightPx) {
			targetCanvas.width = coords.widthPx;
			targetCanvas.height = coords.heightPx;
		}
		if (canvas.width < coords.widthPx || canvas.height < coords.heightPx) {
			canvas.width = Math.max(canvas.width, coords.widthPx);
			canvas.height = Math.max(canvas.height, coords.heightPx);
		}
	} else if (canvas.width !== coords.widthPx || canvas.height !== coords.heightPx) {
		canvas.width = coords.widthPx;
		canvas.height = coords.heightPx;
	}

	gl.viewport(0, 0, coords.widthPx, coords.heightPx);
	gl.useProgram(prog);
	if (vao && gl.bindVertexArray) gl.bindVertexArray(vao);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_3D, volumeTexture);
	if (uniforms.volume) gl.uniform1i(uniforms.volume, 0);

	if (uniforms.volumeDim && uploadDim) {
		gl.uniform3f(uniforms.volumeDim, uploadDim.width, uploadDim.height, uploadDim.depth);
	}

	if (uniforms.sliceOrigin) gl.uniform3fv(uniforms.sliceOrigin, coords.sliceOrigin);
	if (uniforms.axisU) gl.uniform3fv(uniforms.axisU, coords.axisU);
	if (uniforms.axisV) gl.uniform3fv(uniforms.axisV, coords.axisV);
	if (uniforms.axisNorm) gl.uniform3fv(uniforms.axisNorm, coords.axisNorm);
	if (uniforms.windowWidth) gl.uniform1f(uniforms.windowWidth, options.windowWidth);
	if (uniforms.windowLevel) gl.uniform1f(uniforms.windowLevel, options.windowLevel);
	if (uniforms.invert) gl.uniform1i(uniforms.invert, options.invert ? 1 : 0);
	if (uniforms.slabMode) gl.uniform1i(uniforms.slabMode, coords.slabModeCode);
	if (uniforms.slabSteps) gl.uniform1i(uniforms.slabSteps, coords.slabSteps);
	const interpCode = resolveInterpolationCode(options.interpolation);
	if (uniforms.interpolationMode) gl.uniform1i(uniforms.interpolationMode, interpCode);
	if (uniforms.trilinear) gl.uniform1i(uniforms.trilinear, interpCode !== 0 ? 1 : 0);

	const colorMapCode = options.colorMap !== undefined ? resolveColorMapCode(options.colorMap) : fallbackColorMap;
	const sharpenAmount = options.sharpenAmount !== undefined
		? Math.max(0.0, Math.min(1.0, options.sharpenAmount))
		: fallbackSharpenAmount;

	if (uniforms.colorMap) gl.uniform1i(uniforms.colorMap, colorMapCode);
	if (uniforms.sharpenAmount) gl.uniform1f(uniforms.sharpenAmount, sharpenAmount);
	if (uniforms.gamma) gl.uniform1f(uniforms.gamma, options.gamma ?? 1.50);
	if (uniforms.useSoftKnee) gl.uniform1i(uniforms.useSoftKnee, options.useSoftKnee ? 1 : 0);
	if (uniforms.softKneeCeiling) gl.uniform1f(uniforms.softKneeCeiling, options.softKneeCeiling ?? 215.0);
	if (uniforms.airCutoffHU) gl.uniform1f(uniforms.airCutoffHU, options.airCutoffHU ?? -500.0);

	const tDrawStart = typeof performance !== "undefined" ? performance.now() : 0;
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	const elapsed = tDrawStart > 0 && typeof performance !== "undefined" ? performance.now() - tDrawStart : 0.05;

	let pixelData: Uint8ClampedArray | undefined;
	if (readPixels) {
		const raw = new Uint8Array(coords.widthPx * coords.heightPx * 4);
		gl.readPixels(0, 0, coords.widthPx, coords.heightPx, gl.RGBA, gl.UNSIGNED_BYTE, raw);
		pixelData = new Uint8ClampedArray(coords.widthPx * coords.heightPx * 4);
		const rowBytes = coords.widthPx * 4;
		for (let y = 0; y < coords.heightPx; y++) {
			const srcY = coords.heightPx - 1 - y;
			pixelData.set(raw.subarray(srcY * rowBytes, (srcY + 1) * rowBytes), y * rowBytes);
		}
	}

	if (targetCanvas) {
		const targetCtx = targetCanvas.getContext("2d");
		if (targetCtx) {
			const sourceY = canvas.height - coords.heightPx;
			targetCtx.drawImage(
				canvas,
				0,
				sourceY,
				coords.widthPx,
				coords.heightPx,
				0,
				0,
				targetCanvas.width,
				targetCanvas.height,
			);
		}
	}

	return { coords, pixelData, renderTimeMs: elapsed };
}
