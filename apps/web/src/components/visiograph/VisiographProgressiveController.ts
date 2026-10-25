/**
 * VisiographProgressiveController.ts
 * Progressive scan controller for deferred 16-bit loading on zoom threshold.
 */

import {
	type ProgressiveScanState,
	DEFAULT_VISIOGRAPH_ZOOM_THRESHOLD,
	shouldLoad16BitBuffer,
} from "./VisiographProgressiveTypes";

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
