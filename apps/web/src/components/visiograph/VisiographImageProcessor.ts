/**
 * VisiographImageProcessor.ts — Единый процессор обработки изображений визиографа (Мандаты 8b, 8e).
 *
 * Объединяет:
 * 1. 256-элементная таблица преобразования LUT (Gamma, Contrast, Brightness, Negative Invert).
 * 2. Адаптивный фильтр повышения резкости Unsharp Mask с пороговым шумоподавлением (Noise Coring).
 * 3. Пространственные фильтры: Псевдо-рельеф (Emboss 45°), High-Boost (13.0) и фаска сенсора.
 * 4. Полный пайплайн рендеринга на Canvas 2D с фолбеком на аппаратные CSS-фильтры.
 *
 * Sweet Spot: 240–280 строк.
 */

export interface VisiographImageParams {
	/** Яркость снимка [-100 .. +100], норма = 0 */
	brightness: number;
	/** Контрастность снимка [-100 .. +100], норма = 0 */
	contrast: number;
	/** Гамма-коррекция [0.1 .. 5.0], норма = 1.0 */
	gamma: number;
	/** Повышение резкости Unsharp Mask [0 .. 100], норма = 0 */
	sharpness: number;
	/** Негативное отображение (рентгеновская инверсия) */
	invert: boolean;
	/** Ширина окна оптической плотности/HU */
	windowWidth?: number | undefined;
	/** Центр окна оптической плотности/HU */
	windowCenter?: number | undefined;
	/** Экстремальное подчеркивание границ (High-Boost) для апикального отверстия */
	maxSharpness?: boolean | undefined;
	/** Рельефный фильтр Emboss 45° для микротрещин корня */
	pseudoRelief?: boolean | undefined;
	/** Срез скошенного угла анатомического датчика */
	cutCornerChamfer?: boolean | undefined;
}

export const DEFAULT_VISIOGRAPH_IMAGE_PARAMS: VisiographImageParams = {
	brightness: 0,
	contrast: 0,
	gamma: 1.0,
	sharpness: 0,
	invert: false,
	maxSharpness: false,
	pseudoRelief: false,
	cutCornerChamfer: false,
};

/** Быстрая генерация 256-байтовой таблицы LUT (Gamma, Contrast, Brightness, Negative) */
export function buildVisiographLUT(params: VisiographImageParams): Uint8Array {
	const lut = new Uint8Array(256);
	const gamma = Math.max(0.05, Math.min(5.0, params.gamma || 1.0));
	const invGamma = 1.0 / gamma;

	const contrast = Math.max(-100, Math.min(100, params.contrast || 0));
	const contrastFactor =
		(259 * (contrast + 255)) / Math.max(1, 255 * (259 - contrast));

	const brightness = Math.max(-100, Math.min(100, params.brightness || 0));
	const brightnessShift = brightness * 2.55;
	const invert = Boolean(params.invert);

	for (let i = 0; i < 256; i++) {
		let v = 255 * (i / 255) ** invGamma;
		v = contrastFactor * (v - 128) + 128;
		v += brightnessShift;
		let clamped = Math.round(Math.max(0, Math.min(255, v)));
		if (invert) {
			clamped = 255 - clamped;
		}
		lut[i] = clamped;
	}

	return lut;
}

/** Адаптивная нерезкая маска (Unsharp Mask) с Noise Coring для выделения апикальных деталей */
export function applyUnsharpMaskToImageData(
	imageData: ImageData,
	sharpness: number,
	coringThreshold = 5,
): void {
	if (sharpness <= 0) return;
	const { width, height, data } = imageData;
	const copy = new Uint8ClampedArray(data);
	const weight = (Math.max(0, Math.min(100, sharpness)) / 100.0) * 1.6;

	for (let y = 0; y < height; y++) {
		const yOffset = y * width;
		const yPrev = Math.max(0, y - 1) * width;
		const yNext = Math.min(height - 1, y + 1) * width;

		for (let x = 0; x < width; x++) {
			const xPrev = Math.max(0, x - 1);
			const xNext = Math.min(width - 1, x + 1);

			const idx = (yOffset + x) << 2;
			const idxTL = (yPrev + xPrev) << 2;
			const idxTC = (yPrev + x) << 2;
			const idxTR = (yPrev + xNext) << 2;
			const idxML = (yOffset + xPrev) << 2;
			const idxMR = (yOffset + xNext) << 2;
			const idxBL = (yNext + xPrev) << 2;
			const idxBC = (yNext + x) << 2;
			const idxBR = (yNext + xNext) << 2;

			for (let c = 0; c < 3; c++) {
				const center = copy[idx + c] ?? 0;
				const avgNeighbors =
					((copy[idxTL + c] ?? 0) +
						(copy[idxTC + c] ?? 0) +
						(copy[idxTR + c] ?? 0) +
						(copy[idxML + c] ?? 0) +
						(copy[idxMR + c] ?? 0) +
						(copy[idxBL + c] ?? 0) +
						(copy[idxBC + c] ?? 0) +
						(copy[idxBR + c] ?? 0)) *
					0.125;

				const diff = center - avgNeighbors;
				if (Math.abs(diff) > coringThreshold) {
					const coredDiff = Math.sign(diff) * (Math.abs(diff) - coringThreshold);
					const val = center + weight * coredDiff;
					data[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
				} else {
					data[idx + c] = center;
				}
			}
		}
	}
}

/** Псевдо-рельефный фильтр Emboss 45° для микротрещин корня */
export function applyEmboss45ToImageData(imageData: ImageData): void {
	const { width, height, data } = imageData;
	const copy = new Uint8ClampedArray(data);

	for (let y = 0; y < height; y++) {
		const yOffset = y * width;
		const yPrev = Math.max(0, y - 1) * width;
		const yNext = Math.min(height - 1, y + 1) * width;

		for (let x = 0; x < width; x++) {
			const xPrev = Math.max(0, x - 1);
			const xNext = Math.min(width - 1, x + 1);

			const idx = (yOffset + x) << 2;
			const idxTL = (yPrev + xPrev) << 2;
			const idxTC = (yPrev + x) << 2;
			const idxML = (yOffset + xPrev) << 2;
			const idxMR = (yOffset + xNext) << 2;
			const idxBC = (yNext + x) << 2;
			const idxBR = (yNext + xNext) << 2;

			for (let c = 0; c < 3; c++) {
				const tl = copy[idxTL + c] ?? 0;
				const tc = copy[idxTC + c] ?? 0;
				const ml = copy[idxML + c] ?? 0;
				const mr = copy[idxMR + c] ?? 0;
				const bc = copy[idxBC + c] ?? 0;
				const br = copy[idxBR + c] ?? 0;
				const gradient = -2 * tl - tc - ml + mr + bc + 2 * br;
				const embossed = 128 + gradient * 0.4;
				data[idx + c] = Math.max(0, Math.min(255, Math.round(embossed)));
			}
		}
	}
}

/** Высокочастотное усиление High-Boost (13.0) */
export function applyHighBoostToImageData(imageData: ImageData): void {
	const { width, height, data } = imageData;
	const copy = new Uint8ClampedArray(data);

	for (let y = 0; y < height; y++) {
		const yOffset = y * width;
		const yPrev = Math.max(0, y - 1) * width;
		const yNext = Math.min(height - 1, y + 1) * width;

		for (let x = 0; x < width; x++) {
			const xPrev = Math.max(0, x - 1);
			const xNext = Math.min(width - 1, x + 1);

			const idx = (yOffset + x) << 2;
			const idxTL = (yPrev + xPrev) << 2;
			const idxTC = (yPrev + x) << 2;
			const idxTR = (yPrev + xNext) << 2;
			const idxML = (yOffset + xPrev) << 2;
			const idxMR = (yOffset + xNext) << 2;
			const idxBL = (yNext + xPrev) << 2;
			const idxBC = (yNext + x) << 2;
			const idxBR = (yNext + xNext) << 2;

			for (let c = 0; c < 3; c++) {
				const center = copy[idx + c] ?? 0;
				const tc = copy[idxTC + c] ?? 0;
				const bc = copy[idxBC + c] ?? 0;
				const ml = copy[idxML + c] ?? 0;
				const mr = copy[idxMR + c] ?? 0;
				const tl = copy[idxTL + c] ?? 0;
				const tr = copy[idxTR + c] ?? 0;
				const bl = copy[idxBL + c] ?? 0;
				const br = copy[idxBR + c] ?? 0;
				const val =
					13.0 * center -
					2.0 * (tc + bc + ml + mr) -
					1.0 * (tl + tr + bl + br);
				data[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
			}
		}
	}
}

/** Маскирование скошенного угла сенсора */
export function applyChamferCornerCutToImageData(
	imageData: ImageData,
	chamferPx = 65,
): void {
	const { width, height, data } = imageData;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (x + (height - 1 - y) < chamferPx) {
				const idx = (y * width + x) << 2;
				data[idx] = 0;
				data[idx + 1] = 0;
				data[idx + 2] = 0;
				data[idx + 3] = 255;
			}
		}
	}
}

/** Применяет комплексную цепочку фильтров и LUT к ImageData */
export function processVisiographImageData(
	imageData: ImageData,
	params: VisiographImageParams,
): void {
	if (params.cutCornerChamfer) applyChamferCornerCutToImageData(imageData);
	if (params.pseudoRelief) {
		applyEmboss45ToImageData(imageData);
	} else if (params.maxSharpness) {
		applyHighBoostToImageData(imageData);
	} else if (params.sharpness > 0) {
		applyUnsharpMaskToImageData(imageData, params.sharpness);
	}

	const lut = buildVisiographLUT(params);
	const data = imageData.data;
	const len = data.length;
	for (let i = 0; i < len; i += 4) {
		const r = data[i] ?? 0;
		const g = data[i + 1] ?? 0;
		const b = data[i + 2] ?? 0;
		data[i] = lut[r] ?? r;
		data[i + 1] = lut[g] ?? g;
		data[i + 2] = lut[b] ?? b;
	}
}

/** Рендерер изображения визиографа с кэшированием и аппаратным фолбеком */
export class VisiographImageProcessor {
	public render(
		source: HTMLImageElement | HTMLCanvasElement,
		targetCanvas: HTMLCanvasElement,
		params: VisiographImageParams = DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
	): void {
		const srcWidth = "naturalWidth" in source ? source.naturalWidth || source.width : source.width;
		const srcHeight = "naturalHeight" in source ? source.naturalHeight || source.height : source.height;
		if (!srcWidth || !srcHeight) return;

		targetCanvas.width = srcWidth;
		targetCanvas.height = srcHeight;
		const targetCtx = targetCanvas.getContext("2d", { willReadFrequently: true });
		if (!targetCtx) return;

		targetCtx.drawImage(source, 0, 0, srcWidth, srcHeight);
		const isNeutral =
			params.brightness === 0 &&
			params.contrast === 0 &&
			params.gamma === 1.0 &&
			params.sharpness === 0 &&
			!params.invert &&
			!params.maxSharpness &&
			!params.pseudoRelief &&
			!params.cutCornerChamfer;

		if (isNeutral) return;

		try {
			const imgData = targetCtx.getImageData(0, 0, srcWidth, srcHeight);
			processVisiographImageData(imgData, params);
			targetCtx.putImageData(imgData, 0, 0);
		} catch {
			this.applyCssFilterFallback(targetCanvas, targetCtx, source, params);
		}
	}

	private applyCssFilterFallback(
		targetCanvas: HTMLCanvasElement,
		targetCtx: CanvasRenderingContext2D,
		source: HTMLImageElement | HTMLCanvasElement,
		params: VisiographImageParams,
	): void {
		const filters: string[] = [];
		if (params.brightness !== 0) filters.push(`brightness(${100 + params.brightness}%)`);
		if (params.contrast !== 0) filters.push(`contrast(${100 + params.contrast}%)`);
		if (params.invert) filters.push("invert(100%)");

		targetCtx.save();
		targetCtx.filter = filters.length > 0 ? filters.join(" ") : "none";
		targetCtx.drawImage(source, 0, 0, targetCanvas.width, targetCanvas.height);
		targetCtx.restore();
	}
}
