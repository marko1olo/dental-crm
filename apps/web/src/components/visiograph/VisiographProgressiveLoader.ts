/**
 * VisiographProgressiveLoader.ts
 *
 * DENTE Dental CRM — Прогрессивная подгрузка радиовизиографических снимков.
 * Compliance: Mandates 8e, 8k, 8n (Instant Preview & Low-RAM 4GB Protection).
 *
 * АРХИТЕКТУРНЫЙ ИНВАРИАНТ:
 * 1. При открытии снимка (зум 1.0x / fit-to-screen) мгновенно (<50 мс) декодируется
 *    легковесное JPEG/WebP превью (~40-80 КБ). Врач видит снимок без задержек.
 * 2. Сырой 16-битный буфер датчика (Uint16Array, 6-12 МБ) НЕ загружается и НЕ выделяется
 *    в куче (heap RAM) при обычном просмотре.
 * 3. Подгрузка 16-битного буфера инициируется ТОЛЬКО при приближении (zoom > 1.25x),
 *    что обеспечивает медицинскую детализацию без зависаний на слабых ПК (4 ГБ RAM, Celeron).
 */

export interface VisiographProgressiveConfig {
	/** Порог зума для инициации подгрузки 16-битного буфера (по умолчанию 1.25x) */
	readonly zoomThreshold?: number | undefined;
	/** Ширина окна радиометрии (Window Width) */
	readonly defaultWindowWidth?: number | undefined;
	/** Центр окна радиометрии (Window Center) */
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

/**
 * Проверяет, требуется ли подгрузка 16-битного сырого буфера при текущем масштабе.
 */
export function shouldLoad16BitBuffer(
	zoomLevel: number,
	threshold = DEFAULT_VISIOGRAPH_ZOOM_THRESHOLD,
): boolean {
	return zoomLevel > threshold;
}

/**
 * Мгновенно декодирует легковесное превью снимка (JPEG/WebP) через decode() браузера.
 */
export async function decodeVisiographPreview(
	previewUrl: string,
): Promise<HTMLImageElement> {
	if (typeof Image === "undefined") {
		throw new Error("decodeVisiographPreview requires a browser DOM environment with Image constructor");
	}

	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => {
			if (typeof img.decode === "function") {
				img.decode()
					.then(() => resolve(img))
					.catch(() => resolve(img)); // Fallback if decode() rejects
			} else {
				resolve(img);
			}
		};

		img.onerror = (e) => {
			reject(new Error(`Failed to load visiograph preview from: ${previewUrl}`));
		};

		img.src = previewUrl;
	});
}

/**
 * Конвертирует 16-битный массив пикселей (Uint16Array, 0..65535) в 8-битный RGBA ImageData
 * с применением радиометрического окна (Window Width / Window Center).
 */
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

	// Create 8-bit RGBA clamped array (width * height * 4)
	const rgbaBytes = new Uint8ClampedArray(totalPixels * 4);

	for (let i = 0; i < totalPixels; i++) {
		const rawVal = raw16[i] ?? 0;
		// Linear window/level mapping
		let normalized = ((rawVal - minVal) / range) * 255;
		let clamped = Math.max(0, Math.min(255, Math.round(normalized)));

		if (invert) {
			clamped = 255 - clamped;
		}

		const byteIdx = i * 4;
		rgbaBytes[byteIdx] = clamped; // R
		rgbaBytes[byteIdx + 1] = clamped; // G
		rgbaBytes[byteIdx + 2] = clamped; // B
		rgbaBytes[byteIdx + 3] = 255; // Alpha
	}

	if (typeof ImageData !== "undefined") {
		return new ImageData(rgbaBytes, width, height);
	}

	throw new Error(
		"convert16BitToRgbaImageData requires a browser DOM environment with ImageData constructor",
	);
}

/**
 * Контроллер прогрессивной загрузки снимка.
 * Хранит состояние превью и отложенно загружает 16-битный буфер при превышении zoomThreshold.
 */
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

	/**
	 * Проверяет текущий зум и при необходимости инициирует загрузку 16-битного буфера.
	 */
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

	/**
	 * Освобождает 16-битный буфер из RAM при уменьшении зума или выходе.
	 */
	public releaseRawBuffer(): void {
		this.state.raw16BitBuffer = null;
		this.state.is16BitLoaded = false;
		this.state.isLoading16Bit = false;
	}
}
