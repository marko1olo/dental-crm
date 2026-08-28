/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY IMAGE FILTER ENGINE
 * CLAHE, Unsharp Mask, Invert/Negative, 16-Bit Grayscale & Endodontic Presets
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * ─── 1. ТИПЫ И ИНТЕРФЕЙСЫ ФИЛЬТРОВ ───
 */

export interface ClaheOptions {
	readonly tileGridSize?: readonly [number, number] | undefined; // [gridRows, gridCols], default [8, 8]
	readonly clipLimit?: number | undefined; // default 2.5
	readonly bitDepth?: 8 | 12 | 14 | 16 | undefined; // default 16
}

export interface UnsharpMaskOptions {
	readonly radius?: number | undefined; // blur kernel radius (1 to 5), default 2
	readonly amount?: number | undefined; // sharpness boost multiplier (0.1 to 5.0), default 1.5
	readonly threshold?: number | undefined; // noise cutoff threshold (0 to 500), default 10
	readonly bitDepth?: 8 | 12 | 14 | 16 | undefined; // default 16
}

export interface WindowLevelOptions {
	readonly windowWidth: number;
	readonly windowCenter: number;
	readonly invert?: boolean | undefined;
	readonly gamma?: number | undefined; // default 1.0
	readonly maxBitDepth?: 8 | 12 | 14 | 16 | undefined; // default 16
}

/**
 * ─── 2. CLAHE (CONTRAST LIMITED ADAPTIVE HISTOGRAM EQUALIZATION) ───
 */

/**
 * Применяет CLAHE к 16-битному или 8-битному монохромному буферу рентгенограммы.
 * Предотвращает пересвет эмали и вытягивает трабекулярную структуру кости и корневые каналы.
 */
export function applyClahe16Bit(
	srcPixels: Uint16Array,
	width: number,
	height: number,
	options?: ClaheOptions | undefined,
): Uint16Array {
	const gridRows = Math.max(1, options?.tileGridSize?.[0] ?? 8);
	const gridCols = Math.max(1, options?.tileGridSize?.[1] ?? 8);
	const clipLimitRatio = Math.max(1.0, options?.clipLimit ?? 2.5);
	const bitDepth = options?.bitDepth ?? 16;
	const numBins = bitDepth <= 8 ? 256 : 1024; // 1024 bins для высокой скорости 16-битного CLAHE
	const maxVal = (1 << bitDepth) - 1;
	const binShift = bitDepth <= 8 ? 0 : Math.max(0, bitDepth - 10);

	const dest = new Uint16Array(width * height);
	const tileW = width / gridCols;
	const tileH = height / gridRows;

	// Массив CDF для каждого тайла [gridRows][gridCols][numBins]
	const cdfs: Float32Array[] = new Array(gridRows * gridCols);

	// 1. Построение гистограмм и CDF для каждого тайла с ограничением контраста
	for (let tr = 0; tr < gridRows; tr++) {
		for (let tc = 0; tc < gridCols; tc++) {
			const startX = Math.floor(tc * tileW);
			const endX = Math.min(width, Math.floor((tc + 1) * tileW));
			const startY = Math.floor(tr * tileH);
			const endY = Math.min(height, Math.floor((tr + 1) * tileH));
			const tilePixelsCount = (endX - startX) * (endY - startY);

			const hist = new Uint32Array(numBins);

			for (let y = startY; y < endY; y++) {
				for (let x = startX; x < endX; x++) {
					const val = srcPixels[y * width + x]!;
					const bin = Math.min(numBins - 1, val >> binShift);
					hist[bin] = (hist[bin] ?? 0) + 1;
				}
			}

			// Ограничение клиппинга (Clip Limit)
			const clipLimit = Math.max(1, Math.round((clipLimitRatio * tilePixelsCount) / numBins));
			let excess = 0;
			for (let b = 0; b < numBins; b++) {
				if (hist[b]! > clipLimit) {
					excess += hist[b]! - clipLimit;
					hist[b] = clipLimit;
				}
			}

			// Равномерное перераспределение избытка
			const bonusPerBin = Math.floor(excess / numBins);
			const remainder = excess % numBins;
			for (let b = 0; b < numBins; b++) {
				hist[b] = (hist[b] ?? 0) + bonusPerBin + (b < remainder ? 1 : 0);
			}

			// Расчёт нормализованной CDF (0..1)
			const cdf = new Float32Array(numBins);
			let cumulative = 0;
			for (let b = 0; b < numBins; b++) {
				cumulative += hist[b]!;
				cdf[b] = cumulative / tilePixelsCount;
			}

			cdfs[tr * gridCols + tc] = cdf;
		}
	}

	// 2. Билинейная интерполяция между центрами 4 окружающих тайлов
	for (let y = 0; y < height; y++) {
		const normY = (y - tileH / 2) / tileH;
		const r0 = Math.max(0, Math.min(gridRows - 1, Math.floor(normY)));
		const r1 = Math.min(gridRows - 1, r0 + 1);
		const fy = Math.max(0, Math.min(1, normY - r0));

		for (let x = 0; x < width; x++) {
			const normX = (x - tileW / 2) / tileW;
			const c0 = Math.max(0, Math.min(gridCols - 1, Math.floor(normX)));
			const c1 = Math.min(gridCols - 1, c0 + 1);
			const fx = Math.max(0, Math.min(1, normX - c0));

			const val = srcPixels[y * width + x]!;
			const bin = Math.min(numBins - 1, val >> binShift);

			const cdfTL = cdfs[r0 * gridCols + c0]![bin]!;
			const cdfTR = cdfs[r0 * gridCols + c1]![bin]!;
			const cdfBL = cdfs[r1 * gridCols + c0]![bin]!;
			const cdfBR = cdfs[r1 * gridCols + c1]![bin]!;

			// Билинейная интерполяция значений CDF
			const top = cdfTL * (1 - fx) + cdfTR * fx;
			const bottom = cdfBL * (1 - fx) + cdfBR * fx;
			const finalCdf = top * (1 - fy) + bottom * fy;

			const equalized = Math.round(finalCdf * maxVal);
			dest[y * width + x] = Math.max(0, Math.min(maxVal, equalized));
		}
	}

	return dest;
}

/**
 * ─── 3. UNSHARP MASK (ПОВЫШЕНИЕ РЕЗКОСТИ КРАЕВ ПЛОМБ И КОРНЕВЫХ КАНАЛОВ) ───
 */

/**
 * Быстрое 2D размытие с сепарабельным ядром Гаусса
 */
export function fastGaussianBlur16Bit(
	src: Uint16Array,
	width: number,
	height: number,
	radius = 2,
): Uint16Array {
	const total = width * height;
	const temp = new Float32Array(total);
	const dest = new Uint16Array(total);

	const kernelSize = radius * 2 + 1;
	const kernel = new Float32Array(kernelSize);
	const sigma = Math.max(0.5, radius / 2);
	let kSum = 0;

	for (let i = -radius; i <= radius; i++) {
		const w = Math.exp(-(i * i) / (2 * sigma * sigma));
		kernel[i + radius] = w;
		kSum += w;
	}
	for (let i = 0; i < kernelSize; i++) {
		const val = kernel[i];
		if (val !== undefined) {
			kernel[i] = val / kSum;
		}
	}

	// Горизонтальный проход
	for (let y = 0; y < height; y++) {
		const rowOffset = y * width;
		for (let x = 0; x < width; x++) {
			let acc = 0;
			for (let k = -radius; k <= radius; k++) {
				const sx = Math.min(width - 1, Math.max(0, x + k));
				acc += src[rowOffset + sx]! * kernel[k + radius]!;
			}
			temp[rowOffset + x] = acc;
		}
	}

	// Вертикальный проход
	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) {
			let acc = 0;
			for (let k = -radius; k <= radius; k++) {
				const sy = Math.min(height - 1, Math.max(0, y + k));
				acc += temp[sy * width + x]! * kernel[k + radius]!;
			}
			dest[y * width + x] = Math.round(acc);
		}
	}

	return dest;
}

/**
 * Фильтр Unsharp Mask для выявления нависающих краев пломб, ступеней и переломов корня
 */
export function applyUnsharpMask16Bit(
	srcPixels: Uint16Array,
	width: number,
	height: number,
	options?: UnsharpMaskOptions | undefined,
): Uint16Array {
	const radius = options?.radius ?? 2;
	const amount = options?.amount ?? 1.5;
	const threshold = options?.threshold ?? 10;
	const bitDepth = options?.bitDepth ?? 16;
	const maxVal = (1 << bitDepth) - 1;

	const blurred = fastGaussianBlur16Bit(srcPixels, width, height, radius);
	const dest = new Uint16Array(width * height);

	for (let i = 0; i < srcPixels.length; i++) {
		const orig = srcPixels[i]!;
		const blur = blurred[i]!;
		const diff = orig - blur;

		if (Math.abs(diff) >= threshold) {
			const sharpened = Math.round(orig + amount * diff);
			dest[i] = Math.max(0, Math.min(maxVal, sharpened));
		} else {
			dest[i] = orig;
		}
	}

	return dest;
}

/**
 * ─── 4. ИНВЕРСИЯ (НЕГАТИВ) ДЛЯ ПОИСКА СКРЫТОГО КАРИЕСА ───
 */

export function applyInvertFilter16Bit(
	srcPixels: Uint16Array,
	bitDepth: 8 | 12 | 14 | 16 = 16,
): Uint16Array {
	const maxVal = (1 << bitDepth) - 1;
	const dest = new Uint16Array(srcPixels.length);
	for (let i = 0; i < srcPixels.length; i++) {
		dest[i] = maxVal - srcPixels[i]!;
	}
	return dest;
}

/**
 * ─── 5. 3X3 МЕДИАННЫЙ ФИЛЬТР ПОДАВЛЕНИЯ КВАНТОВОГО ШУМА РЕНТГЕНА ───
 */

export function applyMedianFilter3x3(
	srcPixels: Uint16Array,
	width: number,
	height: number,
): Uint16Array {
	const dest = new Uint16Array(width * height);
	const neighborhood = new Uint16Array(9);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let count = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const sx = Math.min(width - 1, Math.max(0, x + dx));
					const sy = Math.min(height - 1, Math.max(0, y + dy));
					neighborhood[count++] = srcPixels[sy * width + sx]!;
				}
			}

			// Быстрая частичная сортировка 9 элементов для нахождения медианы (элемент index 4)
			neighborhood.sort();
			dest[y * width + x] = neighborhood[4]!;
		}
	}

	return dest;
}

/**
 * ─── 6. РЕЛЬЕФНЫЙ ФИЛЬТР ПЕРИОДОНТАЛЬНОЙ ЩЕЛИ (PDL EMBOSS) ───
 */

export function applyPeriodontalReliefFilter(
	srcPixels: Uint16Array,
	width: number,
	height: number,
	bitDepth: 8 | 12 | 14 | 16 = 16,
): Uint16Array {
	const maxVal = (1 << bitDepth) - 1;
	const midVal = 1 << (bitDepth - 1);
	const dest = new Uint16Array(width * height);

	// Ядро Sobel/Emboss под 45 градусов для подчеркивания корней
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const pTL = srcPixels[(y - 1) * width + (x - 1)]!;
			const pBR = srcPixels[(y + 1) * width + (x + 1)]!;
			const diff = pTL - pBR;
			const relief = midVal + diff * 2;
			dest[y * width + x] = Math.max(0, Math.min(maxVal, relief));
		}
	}

	return dest;
}

/**
 * ─── 7. ПРЕОБРАЗОВАНИЕ 16-BIT В 8-BIT С WINDOW / LEVEL (WL/WW) ДЛЯ РЕНДЕРИНГА НА CANVAS ───
 */

export function map16BitTo8BitGrayscale(
	srcPixels: Uint16Array,
	options: WindowLevelOptions,
): Uint8Array {
	const dest = new Uint8Array(srcPixels.length);
	const ww = Math.max(1, options.windowWidth);
	const wl = options.windowCenter;
	const invert = Boolean(options.invert);
	const gamma = Math.max(0.1, Math.min(4.0, options.gamma ?? 1.0));
	const invGamma = 1.0 / gamma;

	const minVal = wl - ww / 2;
	const maxVal = wl + ww / 2;

	for (let i = 0; i < srcPixels.length; i++) {
		const val = srcPixels[i]!;
		let normalized: number;

		if (val <= minVal) {
			normalized = 0;
		} else if (val >= maxVal) {
			normalized = 255;
		} else {
			normalized = ((val - minVal) / (maxVal - minVal)) * 255;
		}

		if (gamma !== 1.0) {
			normalized = 255 * (normalized / 255) ** invGamma;
		}

		let byte = Math.round(Math.max(0, Math.min(255, normalized)));
		if (invert) {
			byte = 255 - byte;
		}

		dest[i] = byte;
	}

	return dest;
}

/**
 * Преобразует 16-битный монохромный буфер в RGBA ImageData массив (Uint8ClampedArray)
 */
export function map16BitToRgbaClamped(
	srcPixels: Uint16Array,
	options: WindowLevelOptions,
): Uint8ClampedArray {
	const totalPixels = srcPixels.length;
	const rgba = new Uint8ClampedArray(totalPixels * 4);
	const grayscale = map16BitTo8BitGrayscale(srcPixels, options);

	for (let i = 0; i < totalPixels; i++) {
		const g = grayscale[i]!;
		const idx = i * 4;
		rgba[idx] = g; // R
		rgba[idx + 1] = g; // G
		rgba[idx + 2] = g; // B
		rgba[idx + 3] = 255; // Alpha
	}

	return rgba;
}

/**
 * ─── 8. КЛИНИЧЕСКИЕ КОМПЛЕКСНЫЕ ПРЕСЕТЫ ОБРАБОТКИ ───
 */

export type ClinicalFilterPreset =
	| "STANDARD_DIAGNOSTIC"
	| "ROOT_CANAL_ENDODONTIC"
	| "CARIES_ENAMEL_DETECTION"
	| "PERIODONTAL_BONE_MARGIN"
	| "IMPLANT_TRABECULAR_DENSITY";

export function applyClinicalRadiologyPreset(
	srcPixels: Uint16Array,
	width: number,
	height: number,
	preset: ClinicalFilterPreset,
	bitDepth: 8 | 12 | 14 | 16 = 16,
): Uint16Array {
	switch (preset) {
		case "ROOT_CANAL_ENDODONTIC": {
			// Медианная фильтрация шума -> CLAHE -> Агрессивный Unsharp Mask для визуализации инструментов ISO 06/08/10
			const denoised = applyMedianFilter3x3(srcPixels, width, height);
			const clahe = applyClahe16Bit(denoised, width, height, { clipLimit: 3.0, bitDepth });
			return applyUnsharpMask16Bit(clahe, width, height, { radius: 2, amount: 2.2, threshold: 5, bitDepth });
		}
		case "CARIES_ENAMEL_DETECTION": {
			// Легкий CLAHE + инверсия для поиска апроксимального кариеса и очагов деминерализации
			const clahe = applyClahe16Bit(srcPixels, width, height, { clipLimit: 2.0, bitDepth });
			return applyInvertFilter16Bit(clahe, bitDepth);
		}
		case "PERIODONTAL_BONE_MARGIN": {
			// Рельеф периодонтальной щели и края альвеолярного отростка
			const denoised = applyMedianFilter3x3(srcPixels, width, height);
			return applyPeriodontalReliefFilter(denoised, width, height, bitDepth);
		}
		case "IMPLANT_TRABECULAR_DENSITY": {
			// Мягкий CLAHE с широким окном для оценки кортикального слоя и кости D1-D4
			return applyClahe16Bit(srcPixels, width, height, { clipLimit: 1.8, bitDepth });
		}
		case "STANDARD_DIAGNOSTIC":
		default: {
			// Базовый сбалансированный CLAHE + мягкий шарп
			const clahe = applyClahe16Bit(srcPixels, width, height, { clipLimit: 2.2, bitDepth });
			return applyUnsharpMask16Bit(clahe, width, height, { radius: 1, amount: 1.2, threshold: 12, bitDepth });
		}
	}
}
