/**
 * VisiographProgressiveTypes.ts
 * Types and thresholds for progressive 16-bit RVG scan loading.
 */

export interface VisiographProgressiveConfig {
	readonly zoomThreshold?: number | undefined;
	readonly defaultWindowWidth?: number | undefined;
	readonly defaultWindowCenter?: number | undefined;
}

export interface ProgressiveScanState {
	readonly previewUrl: string;
	readonly raw16BitUrl?: string | undefined;
	readonly width: number;
	readonly height: number;
	is16BitLoaded: boolean;
	isLoading16Bit: boolean;
	raw16BitBuffer: Uint16Array | null;
}

export const DEFAULT_VISIOGRAPH_ZOOM_THRESHOLD = 1.25;

export function shouldLoad16BitBuffer(
	zoomLevel: number,
	threshold = DEFAULT_VISIOGRAPH_ZOOM_THRESHOLD,
): boolean {
	return zoomLevel > threshold;
}
