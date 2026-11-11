/**
 * radiologyProgressiveLoader.ts — Прогрессивная подгрузка радиовизиографических снимков.
 *
 * Compliance: Mandates 8e, 8k, 8n (Instant Preview & Low-RAM 4GB Protection).
 * Modular decomposition <= 120 lines (Mandate 8b).
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

export async function decodeVisiographPreview(previewUrl: string): Promise<HTMLImageElement> {
	if (typeof Image === "undefined") {
		throw new Error("decodeVisiographPreview requires a browser DOM environment with Image constructor");
	}
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			if (typeof img.decode === "function") {
				img.decode().then(() => resolve(img)).catch(() => resolve(img));
			} else {
				resolve(img);
			}
		};
		img.onerror = () => reject(new Error(`Failed to load visiograph preview from: ${previewUrl}`));
		img.src = previewUrl;
	});
}

export function convert16BitToRgbaImageData(
	raw16: Uint16Array,
	width: number,
	height: number,
	options?: {
		windowWidth?: number | undefined;
		windowCenter?: number | undefined;
		invert?: boolean | undefined;
	} | undefined,
): ImageData {
	const totalPixels = width * height;
	if (raw16.length < totalPixels) {
		throw new Error(
			`16-bit buffer length (${raw16.length}) is smaller than dimensions (${width}x${height} = ${totalPixels})`,
		);
	}

	const windowWidth = options?.windowWidth ?? 4096;
	const windowCenter = options?.windowCenter ?? 2048;
	const invert = Boolean(options?.invert);
	const minVal = windowCenter - windowWidth / 2;
	const maxVal = windowCenter + windowWidth / 2;
	const range = Math.max(1, maxVal - minVal);
	const rgbaBytes = new Uint8ClampedArray(totalPixels * 4);

	for (let i = 0; i < totalPixels; i++) {
		const rawVal = raw16[i] ?? 0;
		let normalized = ((rawVal - minVal) / range) * 255;
		let clamped = Math.max(0, Math.min(255, Math.round(normalized)));
		if (invert) clamped = 255 - clamped;

		const byteIdx = i * 4;
		rgbaBytes[byteIdx] = clamped;
		rgbaBytes[byteIdx + 1] = clamped;
		rgbaBytes[byteIdx + 2] = clamped;
		rgbaBytes[byteIdx + 3] = 255;
	}

	if (typeof ImageData !== "undefined") {
		return new ImageData(rgbaBytes, width, height);
	}
	if (typeof globalThis !== "undefined" && typeof (globalThis as any).ImageData === "function") {
		return new (globalThis as any).ImageData(rgbaBytes, width, height);
	}
	throw new Error("convert16BitToRgbaImageData requires a browser DOM environment with ImageData constructor");
}

export class ProgressiveVisiographController {
	private state: ProgressiveScanState;
	private readonly zoomThreshold: number;
	private readonly rawBufferFetcher?: (() => Promise<Uint16Array | ArrayBuffer>) | undefined;

	constructor(
		previewUrl: string,
		width: number,
		height: number,
		options?: {
			raw16BitUrl?: string | undefined;
			rawBufferFetcher?: (() => Promise<Uint16Array | ArrayBuffer>) | undefined;
			zoomThreshold?: number | undefined;
		} | undefined,
	) {
		this.zoomThreshold = options?.zoomThreshold ?? DEFAULT_VISIOGRAPH_ZOOM_THRESHOLD;
		this.rawBufferFetcher = options?.rawBufferFetcher;
		this.state = {
			previewUrl,
			raw16BitUrl: options?.raw16BitUrl,
			width,
			height,
			is16BitLoaded: false,
			isLoading16Bit: false,
			raw16BitBuffer: null,
		};
	}

	public getState(): Readonly<ProgressiveScanState> {
		return this.state;
	}

	public async onZoomChanged(zoomLevel: number): Promise<boolean> {
		if (
			!shouldLoad16BitBuffer(zoomLevel, this.zoomThreshold) ||
			this.state.is16BitLoaded ||
			this.state.isLoading16Bit
		) {
			return false;
		}

		if (!this.rawBufferFetcher && !this.state.raw16BitUrl) {
			return false;
		}

		this.state.isLoading16Bit = true;
		try {
			let buffer: Uint16Array;
			if (this.rawBufferFetcher) {
				const res = await this.rawBufferFetcher();
				buffer = res instanceof Uint16Array ? res : new Uint16Array(res);
			} else if (this.state.raw16BitUrl && typeof fetch === "function") {
				const res = await fetch(this.state.raw16BitUrl);
				const arrayBuf = await res.arrayBuffer();
				buffer = new Uint16Array(arrayBuf);
			} else {
				this.state.isLoading16Bit = false;
				return false;
			}

			this.state.raw16BitBuffer = buffer;
			this.state.is16BitLoaded = true;
			this.state.isLoading16Bit = false;
			return true;
		} catch {
			this.state.isLoading16Bit = false;
			return false;
		}
	}

	public releaseRawBuffer(): void {
		this.state.raw16BitBuffer = null;
		this.state.is16BitLoaded = false;
		this.state.isLoading16Bit = false;
	}
}
