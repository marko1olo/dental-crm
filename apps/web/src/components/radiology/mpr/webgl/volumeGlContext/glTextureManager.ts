/**
 * DENTE CRM — WebGL2 Hardware GPU 3D-Texture Engine (FEAT-010 / GPU Overhaul)
 * VRAM Texture & Buffer Resource Management (Mandate 8b / Layer 1)
 */

import type { CbctVoxelVolume } from "../../../cbctMprMath";
import type { CbctRenderingTier } from "@dental/shared";
import { uploadVolumeTo3DTexture } from "../CbctVolumeGlTextures";
import type { GlVolumeUploadDim } from "./types";

export interface GlVolumeTextureUploadResult {
	texture: WebGLTexture;
	downsampleStep: number;
	uploadDim: GlVolumeUploadDim;
}

export function resolveMax3dTextureSize(
	gl: WebGL2RenderingContext,
	contextLossCount: number,
): number {
	let max3dSize = 2048;
	try {
		if (typeof gl.getParameter === "function" && gl.MAX_3D_TEXTURE_SIZE !== undefined) {
			const param = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) as number;
			if (typeof param === "number" && param > 0) {
				max3dSize = param;
			}
		}
	} catch {
		max3dSize = 2048;
	}

	// Red Team TDR Prevention: Upon context loss degradation, clamp max 3D size to prevent re-crashing VRAM
	if (contextLossCount > 0) {
		max3dSize = Math.min(max3dSize, contextLossCount >= 2 ? 256 : 512);
	}
	return max3dSize;
}

export function uploadCbctVolumeTexture(
	gl: WebGL2RenderingContext,
	volume: CbctVoxelVolume,
	options: {
		max3dSize: number;
		targetMaxDim?: number;
		tier?: CbctRenderingTier;
	},
): GlVolumeTextureUploadResult | null {
	const result = uploadVolumeTo3DTexture(gl, volume, options);
	if (!result) return null;
	return {
		texture: result.texture,
		downsampleStep: result.downsampleStep,
		uploadDim: result.uploadDim,
	};
}

export function disposeVolumeTextures(
	gl: WebGL2RenderingContext,
	trackedTextures: Set<WebGLTexture>,
	volumeTexture: WebGLTexture | null,
): void {
	if (volumeTexture) {
		if (typeof gl.deleteTexture === "function") {
			gl.deleteTexture(volumeTexture);
		}
		trackedTextures.delete(volumeTexture);
	}

	for (const tex of trackedTextures) {
		if (typeof gl.deleteTexture === "function") {
			gl.deleteTexture(tex);
		}
	}
	trackedTextures.clear();
}

export function disposeGlBuffersAndArrays(
	gl: WebGL2RenderingContext,
	trackedBuffers: Set<WebGLBuffer>,
	trackedFramebuffers: Set<WebGLFramebuffer>,
	trackedRenderbuffers: Set<WebGLRenderbuffer>,
	vao: WebGLVertexArrayObject | null,
): void {
	for (const fb of trackedFramebuffers) {
		if (typeof gl.deleteFramebuffer === "function") {
			gl.deleteFramebuffer(fb);
		}
	}
	trackedFramebuffers.clear();

	for (const rb of trackedRenderbuffers) {
		if (typeof gl.deleteRenderbuffer === "function") {
			gl.deleteRenderbuffer(rb);
		}
	}
	trackedRenderbuffers.clear();

	for (const buf of trackedBuffers) {
		if (typeof gl.deleteBuffer === "function") {
			gl.deleteBuffer(buf);
		}
	}
	trackedBuffers.clear();

	if (vao && typeof gl.deleteVertexArray === "function") {
		gl.deleteVertexArray(vao);
	}
}
