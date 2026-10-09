import assert from "node:assert/strict";
import test from "node:test";
import {
	applyNoiseGate,
	base64ToInt16Pcm,
	calculateRmsDb,
	calculateRmsFromInt16,
	detectVoiceActivity,
	float32ToInt16Pcm,
	int16PcmToBase64,
	int16PcmToFloat32,
	isSilenceSegment,
	pcmToWavArrayBuffer,
	resampleInt16Pcm,
	SpeechChunkStreamingPipeline,
	suppressMicrophoneClicks,
	VadSilenceDetector,
} from "../index";
import * as facade from "../../speechChunkHelpers";

test("PCM / Audio Conversion: Float32 <-> Int16 roundtrip and Base64 encoding", () => {
	const floatData = new Float32Array([-1.0, -0.5, 0.0, 0.5, 1.0]);
	const pcmData = float32ToInt16Pcm(floatData);

	assert.strictEqual(pcmData.length, 5);
	assert.strictEqual(pcmData[0], -32768);
	assert.strictEqual(pcmData[2], 0);
	assert.strictEqual(pcmData[4], 32767);

	const reconstructedFloat = int16PcmToFloat32(pcmData);
	for (let i = 0; i < floatData.length; i++) {
		const diff = Math.abs((floatData[i] ?? 0) - (reconstructedFloat[i] ?? 0));
		assert.ok(diff < 0.001, `Sample ${i} precision mismatch`);
	}

	const base64 = int16PcmToBase64(pcmData);
	assert.ok(typeof base64 === "string" && base64.length > 0);
	const decodedPcm = base64ToInt16Pcm(base64);
	assert.deepStrictEqual(Array.from(decodedPcm), Array.from(pcmData));
});

test("WAV Header Generator: Valid 44-byte RIFF WAV structure", () => {
	const pcm = new Int16Array([1000, -1000, 2000, -2000]);
	const wavBuffer = pcmToWavArrayBuffer(pcm, 16000, 1);
	const view = new DataView(wavBuffer);

	assert.strictEqual(wavBuffer.byteLength, 44 + 8);
	// RIFF magic
	assert.strictEqual(view.getUint32(0, false), 0x52494646); // 'RIFF'
	// WAVE magic
	assert.strictEqual(view.getUint32(8, false), 0x57415645); // 'WAVE'
	// fmt magic
	assert.strictEqual(view.getUint32(12, false), 0x666d7420); // 'fmt '
	// Sample rate
	assert.strictEqual(view.getUint32(24, true), 16000);
	// 16 bits per sample
	assert.strictEqual(view.getUint16(34, true), 16);
	// data magic
	assert.strictEqual(view.getUint32(36, false), 0x64617461); // 'data'
	// data size
	assert.strictEqual(view.getUint32(40, true), 8);
});

test("Audio Filtering: suppressMicrophoneClicks & applyNoiseGate", () => {
	// Синтезируем сигнал с единичным импульсным щелчком микрофона
	const pcmWithClick = new Int16Array([500, 520, 28000, 510, 490]);
	const cleaned = suppressMicrophoneClicks(pcmWithClick, 10000);

	assert.strictEqual(cleaned.length, 5);
	// Щелчок на индексе 2 должен быть подавлен
	assert.ok(cleaned[2]! < 5000, `Click was not suppressed: ${cleaned[2]}`);

	// Тихий сигнал ниже шумового гейта
	const quietPcm = new Int16Array([10, -15, 20, -10]);
	const gated = applyNoiseGate(quietPcm, 100);
	for (let i = 0; i < gated.length; i++) {
		assert.strictEqual(gated[i], 0, "Noise gate did not mute quiet samples");
	}
});

test("RMS & dB Calculations: accurate energy scale", () => {
	const silentBlock = new Int16Array(100).fill(0);
	const loudBlock = new Int16Array(100).fill(16384);

	assert.strictEqual(calculateRmsFromInt16(silentBlock), 0);
	assert.ok(isSilenceSegment(silentBlock, -50.0));

	const loudRms = calculateRmsFromInt16(loudBlock);
	assert.ok(loudRms > 0.49 && loudRms < 0.51);
	const loudDb = calculateRmsDb(loudRms);
	assert.ok(loudDb > -7.0 && loudDb < -5.0);
	assert.ok(detectVoiceActivity(loudBlock, -45.0));
});

test("VAD Detector: Speech detection and silence pause triggering", () => {
	const vad = new VadSilenceDetector({
		speechThresholdDb: -40.0,
		silenceThresholdDb: -48.0,
		silenceTimeoutMs: 1500,
		minSpeechDurationMs: 200,
	});

	const speechFrame = new Int16Array(1600).fill(12000); // Громкая речь ~100ms
	const silenceFrame = new Int16Array(1600).fill(50); // Тишина ~100ms

	let t = 1000;
	// 3 фрейма речи (300 мс)
	for (let i = 0; i < 3; i++) {
		const res = vad.processPcmChunk(speechFrame, t);
		assert.strictEqual(res.isSpeaking, true);
		assert.strictEqual(res.isPauseDetected, false);
		t += 100;
	}

	// 14 фреймов тишины (1400 мс — еще не пауза)
	for (let i = 0; i < 14; i++) {
		const res = vad.processPcmChunk(silenceFrame, t);
		assert.strictEqual(res.isPauseDetected, false);
		t += 100;
	}

	// 15-й фрейм тишины (превышен порог 1500 мс тишины)
	t += 100;
	const pauseRes = vad.processPcmChunk(silenceFrame, t);
	assert.strictEqual(pauseRes.isPauseDetected, true);
	assert.ok(pauseRes.pauseEvent !== null);
	assert.strictEqual(pauseRes.pauseEvent?.type, "silence_pause");
});

test("SpeechChunkStreamingPipeline: Quantization & Flush", () => {
	const pipeline = new SpeechChunkStreamingPipeline({
		recordingId: "rec-test-123",
		language: "ru",
		source: "visit",
		config: {
			targetSampleRate: 16000,
			chunkDurationMs: 5000,
			maxChunkDurationMs: 10000,
			vadPauseCutoffMs: 1500,
		},
	});

	// Подаем сэмплы
	const speechFrame = new Int16Array(8000).fill(8000); // 0.5 сек
	const resNull = pipeline.feedPcmFrame(speechFrame, 1000);
	assert.strictEqual(resNull, null, "Should not flush prematurely");

	// Принудительный flush
	const flushed = pipeline.flush(true);
	assert.ok(flushed !== null, "Flushed chunk result should not be null");
	assert.strictEqual(flushed.chunk.recordingId, "rec-test-123");
	assert.strictEqual(flushed.chunk.mimeType, "audio/wav");
	assert.strictEqual(flushed.chunk.language, "ru");
	assert.strictEqual(flushed.chunk.source, "visit");
	assert.ok(
		typeof flushed.chunk.audioBase64 === "string" &&
			flushed.chunk.audioBase64.length > 0,
		"audioBase64 must be non-empty string",
	);
	assert.strictEqual(flushed.samplesCount, 8000);
});

test("Facade 100% Backward Compatibility: Re-exports intact", () => {
	assert.strictEqual(typeof facade.createLocalQueueId, "function");
	assert.strictEqual(typeof facade.queuePendingSpeechChunk, "function");
	assert.strictEqual(typeof facade.loadPendingSpeechChunks, "function");
	assert.strictEqual(typeof facade.removePendingSpeechChunkById, "function");
	assert.strictEqual(typeof facade.float32ToInt16Pcm, "function");
	assert.strictEqual(typeof facade.int16PcmToBase64, "function");
	assert.strictEqual(typeof facade.pcmToWavArrayBuffer, "function");
	assert.strictEqual(typeof facade.VadSilenceDetector, "function");
	assert.strictEqual(typeof facade.SpeechChunkStreamingPipeline, "function");
	assert.strictEqual(typeof facade.preparePricelistImage, "function");
	assert.strictEqual(typeof facade.collectDicomWorkstationClientFacts, "function");
	assert.strictEqual(typeof facade.formatDateTime, "function");
	assert.strictEqual(typeof facade.isSpeechTranscriptionSource, "function");
	assert.strictEqual(typeof facade.normalizeSpeechTranscriptionSource, "function");
});
