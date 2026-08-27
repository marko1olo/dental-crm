/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LARGE CBCT SERIES GPU MEMORY MANAGEMENT & WEBGL TEXTURE DISPOSAL
 * Prevents VRAM exhaustion and GPU Context Lost for > 400 slice series
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface CbctSeriesVramStats {
    readonly sliceCount: number;
    readonly width: number;
    readonly height: number;
    readonly bytesPerPixel: number;
    readonly bytesPerSlice: number;
    readonly totalVramBytes: number;
    readonly totalVramMb: number;
    readonly exceedsBudget: boolean;
}
export declare const DEFAULT_MAX_CBCT_VRAM_BUDGET_MB = 512;
/**
 * Calculates accurate VRAM footprint for large CBCT series in MB.
 */
export declare function calculateCbctVramUsage(sliceCount: number, width?: number, height?: number, bytesPerPixel?: number, // 16-bit DICOM
maxVramBudgetMb?: number): CbctSeriesVramStats;
/**
 * Determines whether a CBCT series exceeds the specified GPU memory budget.
 */
export declare function isVramBudgetExceeded(sliceCount: number, width?: number, height?: number, maxVramBudgetMb?: number, bytesPerPixel?: number): boolean;
export interface WebGlDisposalReport {
    readonly texturesDisposed: number;
    readonly buffersDisposed: number;
    readonly programsDisposed: number;
    readonly framebuffersDisposed: number;
    readonly contextLostTriggered: boolean;
    readonly estimatedVramFreedMb: number;
}
/**
 * Safely unloads and deletes an array of WebGL textures in batch from GPU VRAM.
 */
export declare function disposeCbctSeriesTextures(gl: any, textures: readonly (any | null | undefined)[], width?: number, height?: number, bytesPerPixel?: number): {
    readonly texturesDisposed: number;
    readonly estimatedVramFreedMb: number;
};
/**
 * Fully purges WebGL / Canvas resources (textures, buffers, shaders, framebuffers)
 * and triggers loseContext to prevent GPU memory leaks across sessions.
 */
export declare function disposeFullWebGlPipeline(gl: any, resources?: {
    readonly textures?: readonly (any | null | undefined)[];
    readonly buffers?: readonly (any | null | undefined)[];
    readonly programs?: readonly (any | null | undefined)[];
    readonly framebuffers?: readonly (any | null | undefined)[];
    readonly sliceWidth?: number;
    readonly sliceHeight?: number;
    readonly bytesPerPixel?: number;
}): WebGlDisposalReport;
