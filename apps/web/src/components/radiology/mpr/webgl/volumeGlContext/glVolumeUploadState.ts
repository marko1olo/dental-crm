import type { CbctVoxelVolume } from "../../../cbctMprMath";
import type { CbctRenderingTier } from "@dental/shared";
import type { GlVolumeUploadDim } from "./types";
import { uploadCbctVolumeTexture } from "./glTextureManager";

export class GlVolumeUploadState {
	public activeVolumeId: string | null = null;
	public activeVolume: CbctVoxelVolume | null = null;
	public volumeTexture: WebGLTexture | null = null;
	public uploadDim: GlVolumeUploadDim | null = null;
	public downsampleStep = 1;
	public activeTier: CbctRenderingTier | null = null;
	public targetMaxDim: number | null = null;
	public uploadedTier: CbctRenderingTier | null = null;
	public uploadedTargetMaxDim: number | null = null;

	public upload(
		gl: WebGL2RenderingContext,
		volume: CbctVoxelVolume,
		contextLossCount: number,
		options?: { forceReupload?: boolean; targetMaxDim?: number; tier?: CbctRenderingTier },
	): boolean {
		const tier = options?.tier ?? this.activeTier ?? undefined;
		const targetMaxDim = options?.targetMaxDim ?? this.targetMaxDim ?? undefined;

		if (
			!options?.forceReupload &&
			this.activeVolumeId === volume.id &&
			this.volumeTexture &&
			this.uploadedTier === (tier ?? null) &&
			this.uploadedTargetMaxDim === (targetMaxDim ?? null)
		) {
			return true;
		}

		let max3dSize = 2048;
		try {
			if (typeof gl.getParameter === "function" && gl.MAX_3D_TEXTURE_SIZE !== undefined) {
				const param = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) as number;
				if (typeof param === "number" && param > 0) max3dSize = param;
			}
		} catch { max3dSize = 2048; }

		if (contextLossCount > 0) {
			max3dSize = Math.min(max3dSize, contextLossCount >= 2 ? 256 : 512);
		}

		if (this.volumeTexture) {
			gl.deleteTexture(this.volumeTexture);
			this.volumeTexture = null;
			this.activeVolumeId = null;
		}

		const result = uploadCbctVolumeTexture(gl, volume, {
			max3dSize,
			...(targetMaxDim !== undefined ? { targetMaxDim } : {}),
			...(tier !== undefined ? { tier } : {}),
		});
		if (!result) {
			this.reset();
			return false;
		}

		this.downsampleStep = result.downsampleStep;
		this.volumeTexture = result.texture;
		this.activeVolumeId = volume.id;
		this.activeVolume = volume;
		this.uploadDim = result.uploadDim;
		this.uploadedTier = tier ?? null;
		this.uploadedTargetMaxDim = targetMaxDim ?? null;
		return true;
	}

	public reset(): void {
		this.activeVolumeId = null;
		this.activeVolume = null;
		this.volumeTexture = null;
		this.uploadDim = null;
		this.downsampleStep = 1;
		this.uploadedTier = null;
		this.uploadedTargetMaxDim = null;
	}

	public resetTextureOnly(): void {
		this.activeVolumeId = null;
		this.volumeTexture = null;
		this.uploadDim = null;
		this.downsampleStep = 1;
		this.uploadedTier = null;
		this.uploadedTargetMaxDim = null;
	}
}
