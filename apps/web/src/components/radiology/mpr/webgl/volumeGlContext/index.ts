/**
 * DENTE CRM — WebGL2 Hardware GPU 3D-Texture Engine (FEAT-010 / GPU Overhaul)
 * Volume GL Context Module Master Index (Mandate 8b / Layer 3)
 */

import { CbctVolumeGlContext } from "./CbctVolumeGlContextCore";

// ─── SHARED POOL MANAGEMENT ──────────────────────────────────────────────────

let sharedGlContext: CbctVolumeGlContext | null = null;

export function getSharedCbctGlContext(): CbctVolumeGlContext {
	if (!sharedGlContext) {
		sharedGlContext = new CbctVolumeGlContext();
	}
	return sharedGlContext;
}

export function disposeSharedCbctGlContext(): void {
	if (sharedGlContext) {
		sharedGlContext.dispose();
		sharedGlContext = null;
	}
}

// ─── PUBLIC RE-EXPORTS ───────────────────────────────────────────────────────

export * from "../CbctVolumeGlTextures";
export * from "./types";
export * from "./glShaderPrograms";
export * from "./glTextureManager";
export * from "./glRenderPipelines";
export * from "./CbctVolumeGlContextCore";
