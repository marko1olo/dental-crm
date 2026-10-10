/**
 * pcmAudioProcessor.ts — Чистые функции обработки PCM16 аудиопотока:
 * 1. Конвертация Float32 в Int16 PCM с защитой от клиппинга.
 * 2. Линейный ресэмплинг произвольной частоты (48kHz / 44.1kHz) в целевую 16kHz.
 * 3. Расчет среднеквадратичной энергии сигнала (RMS).
 * 4. Кодирование Int16Array / Uint8Array / WAV Blob в Base64 для WebSocket и HTTP транспорта.
 * 5. Сборка 16-bit Mono WAV с 44-байтовым RIFF заголовком и склейка чанков.
 * 6. Форматирование двухслойного транскрипта (finalized + interim).
 */

import type { PcmAudioChunk, TwoLayerTranscriptState } from "./types";

/**
 * Расчет RMS (Root Mean Square) энергии для буфера Float32 [-1.0..1.0].
 */
export function calculateFloat32Rms(samples: Float32Array): number {
	if (!samples || samples.length === 0) return 0;
	let sumSq = 0;
	for (let i = 0; i < samples.length; i++) {
		const sample = samples[i] ?? 0;
		sumSq += sample * sample;
	}
	return Math.sqrt(sumSq / samples.length);
}

/**
 * Расчет нормализованной RMS энергии [0.0..1.0] для буфера Int16 [-32768..32767].
 */
export function calculateInt16Rms(pcm: Int16Array): number {
	if (!pcm || pcm.length === 0) return 0;
	let sumSq = 0;
	for (let i = 0; i < pcm.length; i++) {
		const normalized = (pcm[i] ?? 0) / 32768;
		sumSq += normalized * normalized;
	}
	return Math.sqrt(sumSq / pcm.length);
}

/**
 * Конвертация сэмплов Float32 [-1.0..1.0] в Int16 PCM [-32768..32767] без ресэмплинга.
 */
export function float32ToInt16Pcm(input: Float32Array): Int16Array {
	const pcm = new Int16Array(input.length);
	for (let i = 0; i < input.length; i++) {
		const clamped = Math.max(-1.0, Math.min(1.0, input[i] ?? 0));
		pcm[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
	}
	return pcm;
}

/**
 * Ресэмплинг буфера Float32 из исходной частоты дискретизации в целевую (например, 48000 -> 16000 Hz)
 * с одновременным квантованием в 16-bit Signed PCM.
 */
export function resampleFloat32ToInt16Pcm(
	input: Float32Array,
	inputSampleRate: number,
	targetSampleRate = 16000,
): Int16Array {
	if (!input || input.length === 0) return new Int16Array(0);
	if (
		inputSampleRate <= 0 ||
		targetSampleRate <= 0 ||
		inputSampleRate === targetSampleRate
	) {
		return float32ToInt16Pcm(input);
	}

	const ratio = inputSampleRate / targetSampleRate;
	const outLen = Math.floor(input.length / ratio);
	const pcm = new Int16Array(outLen);
	for (let i = 0; i < outLen; i++) {
		const srcIdx = Math.floor(i * ratio);
		const sample = Math.max(-1.0, Math.min(1.0, input[srcIdx] ?? 0));
		pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
	}
	return pcm;
}

/**
 * Склейка массива чанков Int16Array в единый непрерывный буфер Int16Array.
 */
export function combineInt16Chunks(chunks: readonly Int16Array[]): Int16Array {
	let totalLen = 0;
	for (const chunk of chunks) {
		totalLen += chunk.length;
	}
	const combined = new Int16Array(totalLen);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}
	return combined;
}

/**
 * Склейка буферизованных PcmAudioChunk в единый Int16Array.
 */
export function combineBufferedPcmChunks(
	chunks: readonly PcmAudioChunk[],
): Int16Array {
	const totalLen = chunks.reduce((acc, c) => acc + c.pcm.length, 0);
	const combined = new Int16Array(totalLen);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk.pcm, offset);
		offset += chunk.pcm.length;
	}
	return combined;
}

/**
 * Кодирование произвольного байтового массива Uint8Array в строку Base64.
 */
export function encodeUint8ToBase64(uint8Buffer: Uint8Array): string {
	let binary = "";
	const len = uint8Buffer.byteLength;
	for (let i = 0; i < len; i++) {
		const byte = uint8Buffer[i] ?? 0;
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

/**
 * Кодирование 16-битного PCM-чанка в Base64 для отправки по WebSocket.
 */
export function encodePcm16ToBase64(pcm: Int16Array): string {
	const uint8Buffer = new Uint8Array(
		pcm.buffer,
		pcm.byteOffset,
		pcm.byteLength,
	);
	return encodeUint8ToBase64(uint8Buffer);
}

/**
 * Асинхронное чтение Blob (например, WAV) и кодирование в Base64.
 */
export async function encodeBlobToBase64(blob: Blob): Promise<string> {
	const arrayBuffer = await blob.arrayBuffer();
	const uint8 = new Uint8Array(arrayBuffer);
	return encodeUint8ToBase64(uint8);
}

/**
 * Расчет длительности PCM-аудиофрагмента в миллисекундах.
 */
export function calculatePcmDurationMs(
	sampleCount: number,
	sampleRate = 16000,
): number {
	if (sampleCount <= 0 || sampleRate <= 0) return 0;
	return Math.round((sampleCount / sampleRate) * 1000);
}

function writeAsciiStringToView(
	view: DataView,
	offset: number,
	str: string,
): void {
	for (let i = 0; i < str.length; i++) {
		view.setUint8(offset + i, str.charCodeAt(i));
	}
}

/**
 * Сборка валидного 16-bit Mono WAV Blob со стандартным 44-байтовым RIFF заголовком.
 */
export function encodePcm16ToWavBlob(
	chunks: readonly Int16Array[],
	sampleRate = 16000,
): Blob {
	const pcm = combineInt16Chunks(chunks);
	const numChannels = 1;
	const bitsPerSample = 16;
	const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
	const blockAlign = (numChannels * bitsPerSample) / 8;
	const dataSize = pcm.length * 2;
	const headerSize = 44;
	const totalSize = headerSize + dataSize;

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);

	writeAsciiStringToView(view, 0, "RIFF");
	view.setUint32(4, totalSize - 8, true);
	writeAsciiStringToView(view, 8, "WAVE");

	writeAsciiStringToView(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitsPerSample, true);

	writeAsciiStringToView(view, 36, "data");
	view.setUint32(40, dataSize, true);

	let offset = 44;
	for (let i = 0; i < pcm.length; i++) {
		view.setInt16(offset, pcm[i] ?? 0, true);
		offset += 2;
	}

	return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Формирование двухслойного состояния транскрипта (финализированный + интерим).
 */
export function buildTwoLayerTranscript(
	finalized: string,
	interim: string,
): TwoLayerTranscriptState {
	const fullWithInterim = interim.trim()
		? finalized.trim()
			? `${finalized.trim()} ${interim.trim()}`
			: interim.trim()
		: finalized.trim();
	return { finalized, interim, fullWithInterim };
}

/**
 * Аккуратное добавление нового распознанного предложения к накопленному тексту
 * с автоматической расстановкой точки при отсутствии завершающей пунктуации.
 */
export function appendSentenceToTranscript(
	accumulatedText: string,
	newSegment: string,
): string {
	const clean = newSegment.trim();
	if (!clean) return accumulatedText;

	if (accumulatedText.length > 0) {
		const endsWithPunct = /[.?!,]$/.test(accumulatedText.trim());
		return `${accumulatedText}${endsWithPunct ? " " : ". "}${clean}`;
	}
	return clean;
}
