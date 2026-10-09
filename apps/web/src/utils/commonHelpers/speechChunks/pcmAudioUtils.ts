import {
	loadImageFromDataUrl,
	readFileAsDataUrl,
} from "../../ImagingHelpers";
import type { PricelistImageMimeType } from "./types";

export const pricelistImageMimeTypes: PricelistImageMimeType[] = [
	"image/jpeg",
	"image/png",
	"image/webp",
];

export const maxPricelistImageBase64Chars = 3_800_000;

/**
 * Конвертация Float32Array [-1.0 .. 1.0] в 16-битный линейный PCM (Int16Array)
 * с гарантированным насыщением (hard-clipping) во избежание переполнения.
 */
export function float32ToInt16Pcm(input: Float32Array): Int16Array {
	const output = new Int16Array(input.length);
	for (let i = 0; i < input.length; i++) {
		const s = Math.max(-1, Math.min(1, input[i] ?? 0));
		output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
	}
	return output;
}

/**
 * Конвертация Int16 PCM [-32768 .. 32767] во Float32Array [-1.0 .. 1.0].
 */
export function int16PcmToFloat32(input: Int16Array): Float32Array {
	const output = new Float32Array(input.length);
	for (let i = 0; i < input.length; i++) {
		const sample = input[i] ?? 0;
		output[i] = sample < 0 ? sample / 0x8000 : sample / 0x7fff;
	}
	return output;
}

/**
 * Преобразование Int16 PCM в строку Base64.
 */
export function int16PcmToBase64(pcm: Int16Array): string {
	const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
	let binary = "";
	const len = bytes.byteLength;
	const chunkSize = 0x8000; // 32KB порции для избежания RangeError: Maximum call stack
	for (let i = 0; i < len; i += chunkSize) {
		const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
		binary += String.fromCharCode(...sub);
	}
	return btoa(binary);
}

/**
 * Декодирование Base64 строки обратно в Int16 PCM буфер.
 */
export function base64ToInt16Pcm(base64: string): Int16Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
}

/**
 * Запись 44-байтного канонического заголовка RIFF WAV в ArrayBuffer.
 */
export function pcmToWavArrayBuffer(
	pcm: Int16Array,
	sampleRate = 16000,
	numChannels = 1,
): ArrayBuffer {
	const byteRate = sampleRate * numChannels * 2;
	const blockAlign = numChannels * 2;
	const dataSize = pcm.byteLength;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	// RIFF chunk descriptor
	view.setUint32(0, 0x52494646, false); // "RIFF"
	view.setUint32(4, 36 + dataSize, true); // chunkSize
	view.setUint32(8, 0x57415645, false); // "WAVE"

	// "fmt " sub-chunk
	view.setUint32(12, 0x666d7420, false); // "fmt "
	view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
	view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
	view.setUint16(22, numChannels, true); // NumChannels
	view.setUint32(24, sampleRate, true); // SampleRate
	view.setUint32(28, byteRate, true); // ByteRate
	view.setUint16(32, blockAlign, true); // BlockAlign
	view.setUint16(34, 16, true); // BitsPerSample (16 bits)

	// "data" sub-chunk
	view.setUint32(36, 0x64617461, false); // "data"
	view.setUint32(40, dataSize, true); // Subchunk2Size

	// Запись PCM данных
	const targetBytes = new Uint8Array(buffer, 44, dataSize);
	const sourceBytes = new Uint8Array(pcm.buffer, pcm.byteOffset, dataSize);
	targetBytes.set(sourceBytes);

	return buffer;
}

/**
 * Создание Blob формата audio/wav из сырого Int16 PCM.
 */
export function pcmToWavBlob(
	pcm: Int16Array,
	sampleRate = 16000,
	numChannels = 1,
): Blob {
	const wavBuffer = pcmToWavArrayBuffer(pcm, sampleRate, numChannels);
	return new Blob([wavBuffer], { type: "audio/wav" });
}

/**
 * Линейный ресемплинг аудиопотока Float32Array до целевой частоты (обычно 16000 Гц).
 */
export function resampleFloat32Linear(
	input: Float32Array,
	inputSampleRate: number,
	targetSampleRate = 16000,
): Float32Array {
	if (inputSampleRate === targetSampleRate || input.length === 0) {
		return input.slice();
	}

	const ratio = targetSampleRate / inputSampleRate;
	const newLength = Math.max(1, Math.round(input.length * ratio));
	const output = new Float32Array(newLength);

	for (let i = 0; i < newLength; i++) {
		const srcIndex = i / ratio;
		const i0 = Math.floor(srcIndex);
		const i1 = Math.min(i0 + 1, input.length - 1);
		const fraction = srcIndex - i0;
		const s0 = input[i0] ?? 0;
		const s1 = input[i1] ?? 0;
		output[i] = s0 + fraction * (s1 - s0);
	}

	return output;
}

/**
 * Ресемплинг Int16 PCM до целевой частоты.
 */
export function resampleInt16Pcm(
	input: Int16Array,
	inputSampleRate: number,
	targetSampleRate = 16000,
): Int16Array {
	const floatSamples = int16PcmToFloat32(input);
	const resampledFloat = resampleFloat32Linear(floatSamples, inputSampleRate, targetSampleRate);
	return float32ToInt16Pcm(resampledFloat);
}

/**
 * Подавление резких кликов и импульсных всплесков микрофона врача.
 */
export function suppressMicrophoneClicks(
	pcm: Int16Array,
	thresholdDelta = 12000,
): Int16Array {
	if (pcm.length < 3) return pcm.slice();
	const result = new Int16Array(pcm.length);
	result[0] = pcm[0] ?? 0;

	for (let i = 1; i < pcm.length - 1; i++) {
		const prev = result[i - 1] ?? 0;
		const curr = pcm[i] ?? 0;
		const next = pcm[i + 1] ?? 0;
		const deltaPrev = Math.abs(curr - prev);
		const deltaNext = Math.abs(curr - next);

		if (deltaPrev > thresholdDelta && deltaNext > thresholdDelta && Math.abs(prev - next) < thresholdDelta / 2) {
			// Импульсный щелчок — интерполируем по соседям
			result[i] = Math.round((prev + next) / 2);
		} else {
			result[i] = curr;
		}
	}

	result[pcm.length - 1] = pcm[pcm.length - 1] ?? 0;
	return result;
}

/**
 * Мягкий шумовой гейт (Noise Gate) для отсечения фонового шума компрессора/аспиратора.
 */
export function applyNoiseGate(
	pcm: Int16Array,
	thresholdRms = 120,
): Int16Array {
	let sumSquares = 0;
	for (let i = 0; i < pcm.length; i++) {
		const val = pcm[i] ?? 0;
		sumSquares += val * val;
	}
	const blockRms = Math.sqrt(sumSquares / Math.max(1, pcm.length));

	if (blockRms < thresholdRms) {
		// Ниже порога шума — затухание
		return new Int16Array(pcm.length);
	}
	return pcm.slice();
}

/**
 * Подготовка и масштабирование фото прайс-листа клиники для оптического распознавания.
 */
export async function preparePricelistImage(file: File): Promise<{
	base64: string;
	mimeType: PricelistImageMimeType;
	note: string;
}> {
	if (!pricelistImageMimeTypes.includes(file.type as PricelistImageMimeType)) {
		throw new Error("Поддерживаются JPEG, PNG или WebP.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	const image = await loadImageFromDataUrl(dataUrl);
	const originalLongestSide = Math.max(image.naturalWidth, image.naturalHeight);
	const outputMimeType: PricelistImageMimeType = "image/jpeg";

	for (const maxSide of [1600, 1200, 900, 720]) {
		const scale = Math.min(1, maxSide / originalLongestSide);
		const width = Math.max(1, Math.round(image.naturalWidth * scale));
		const height = Math.max(1, Math.round(image.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas недоступен для сжатия изображения.");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, width, height);
		context.drawImage(image, 0, 0, width, height);

		for (const quality of [0.82, 0.72, 0.62]) {
			const compressed = canvas.toDataURL(outputMimeType, quality);
			const base64 = compressed.split(",")[1] ?? "";
			if (base64.length <= maxPricelistImageBase64Chars) {
				const megapixels = ((width * height) / 1_000_000).toFixed(1);
				return {
					base64,
					mimeType: outputMimeType,
					note: `Фото подготовлено: ${width}x${height}, ${megapixels} Мп, JPEG ${Math.round(quality * 100)}%.`,
				};
			}
		}
	}

	throw new Error(
		"Фото прайса слишком большое даже после сжатия. Нужен более четкий фрагмент страницы.",
	);
}
