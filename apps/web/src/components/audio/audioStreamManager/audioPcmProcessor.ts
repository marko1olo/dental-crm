/**
 * audioPcmProcessor.ts — Layer 2: Pure PCM processing, resampling, and WAV container assembly.
 * Строго <= 120 строк по Мандату 8b.
 */

export function exportCombinedInt16Array(chunks: Int16Array[]): Int16Array {
	let totalLen = 0;
	for (const chunk of chunks) totalLen += chunk.length;
	const result = new Int16Array(totalLen);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}

export function writeAsciiString(view: DataView, offset: number, str: string): void {
	for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

export function exportWavBlob(pcm: Int16Array, sampleRate: number): Blob {
	const rate = sampleRate;
	const numChannels = 1;
	const bitsPerSample = 16;
	const byteRate = (rate * numChannels * bitsPerSample) / 8;
	const blockAlign = (numChannels * bitsPerSample) / 8;
	const dataSize = pcm.length * 2;
	const totalSize = 44 + dataSize;

	const buffer = new ArrayBuffer(totalSize);
	const view = new DataView(buffer);

	writeAsciiString(view, 0, "RIFF");
	view.setUint32(4, totalSize - 8, true);
	writeAsciiString(view, 8, "WAVE");

	writeAsciiString(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numChannels, true);
	view.setUint32(24, rate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitsPerSample, true);

	writeAsciiString(view, 36, "data");
	view.setUint32(40, dataSize, true);

	let offset = 44;
	for (let i = 0; i < pcm.length; i++) {
		view.setInt16(offset, pcm[i] ?? 0, true);
		offset += 2;
	}

	return new Blob([buffer], { type: "audio/wav" });
}

export function calculateAudioLevelFromAnalyser(analyserNode: AnalyserNode | null): number {
	if (!analyserNode) return 0;
	const buffer = new Uint8Array(analyserNode.frequencyBinCount);
	analyserNode.getByteTimeDomainData(buffer);
	let sumSq = 0;
	for (let i = 0; i < buffer.length; i++) {
		const sample = buffer[i] ?? 128;
		const norm = (sample - 128) / 128.0;
		sumSq += norm * norm;
	}
	const rms = Math.sqrt(sumSq / buffer.length);
	return Math.min(1.0, rms * 4.0);
}

export function calculateRms(input: Float32Array): number {
	if (!input || input.length === 0) return 0;
	let sumSq = 0;
	for (let i = 0; i < input.length; i++) {
		const sample = input[i] ?? 0;
		sumSq += sample * sample;
	}
	return Math.sqrt(sumSq / input.length);
}

export function resampleFloat32ToInt16(input: Float32Array, ratio: number): Int16Array {
	const outLen = Math.floor(input.length / ratio);
	const pcm = new Int16Array(outLen);
	for (let i = 0; i < outLen; i++) {
		const srcIdx = Math.floor(i * ratio);
		const sample = Math.max(-1.0, Math.min(1.0, input[srcIdx] ?? 0));
		pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
	}
	return pcm;
}
