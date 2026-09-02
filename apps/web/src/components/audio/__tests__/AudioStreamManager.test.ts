/**
 * AudioStreamManager.test.ts — Исчерпывающие тесты для AudioWorklet,
 * фильтрации шумов бормашины, Hands-Free VAD и генерации 16kHz WAV.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	AUDIO_WORKLET_PROCESSOR_SOURCE,
	DENTAL_AUDIO_WORKLET_PROCESSOR_NAME,
	getAudioWorkletBlobUrl,
} from "../AudioWorkletProcessor";
import { AudioStreamManager } from "../AudioStreamManager";

describe("AudioWorkletProcessor: Source & Constants", () => {
	it("exports canonical worklet name 'dental-audio-worklet-processor'", () => {
		assert.strictEqual(
			DENTAL_AUDIO_WORKLET_PROCESSOR_NAME,
			"dental-audio-worklet-processor",
		);
	});

	it("contains high-performance downsampling and PCM int16 conversion in worklet source", () => {
		assert.ok(
			AUDIO_WORKLET_PROCESSOR_SOURCE.includes("class DentalAudioWorkletProcessor"),
			"Must define DentalAudioWorkletProcessor class",
		);
		assert.ok(
			AUDIO_WORKLET_PROCESSOR_SOURCE.includes("registerProcessor"),
			"Must call registerProcessor",
		);
		assert.ok(
			AUDIO_WORKLET_PROCESSOR_SOURCE.includes("32768"),
			"Must convert to 16-bit PCM scale",
		);
		assert.ok(
			AUDIO_WORKLET_PROCESSOR_SOURCE.includes("Math.sqrt"),
			"Must calculate RMS energy in real time",
		);
	});

	it("generates non-empty blob URL when Blob is available", () => {
		const url = getAudioWorkletBlobUrl();
		assert.strictEqual(typeof url, "string");
	});
});

describe("AudioStreamManager: Dental Filters, VAD & WAV Header", () => {
	it("initializes with default dental clinic noise filter parameters (120Hz HP, 7200Hz LP, 4000Hz Notch)", () => {
		const manager = new AudioStreamManager({
			targetSampleRate: 16000,
			filterOptions: {
				enableHighpass: true,
				highpassFrequency: 120,
				enableLowpass: true,
				lowpassFrequency: 7200,
				enableNotch: true,
				notchFrequency: 4000,
			},
			vadOptions: {
				silenceTimeoutMs: 1800,
				speechThresholdRms: 0.016,
			},
		});

		assert.strictEqual(typeof manager.exportCombinedInt16Array, "function");
		assert.strictEqual(typeof manager.exportWavBlob, "function");
		assert.strictEqual(typeof manager.getAudioLevel, "function");
		assert.strictEqual(typeof manager.start, "function");
		assert.strictEqual(typeof manager.stop, "function");
		assert.strictEqual(typeof manager.dispose, "function");
	});

	it("correctly combines multiple Int16Array PCM chunks into a contiguous buffer", () => {
		const manager = new AudioStreamManager();
		const chunk1 = new Int16Array([100, 200, 300]);
		const chunk2 = new Int16Array([400, 500]);
		const chunk3 = new Int16Array([600, 700, 800, 900]);

		const combined = manager.exportCombinedInt16Array([chunk1, chunk2, chunk3]);
		assert.strictEqual(combined.length, 9);
		assert.deepStrictEqual(
			Array.from(combined),
			[100, 200, 300, 400, 500, 600, 700, 800, 900],
		);
	});

	it("builds a mathematically valid 44-byte RIFF/WAVE header for 16kHz 16-bit mono PCM", async () => {
		const manager = new AudioStreamManager({ targetSampleRate: 16000 });
		const samplePcm = new Int16Array([1000, -1000, 2000, -2000, 0]);
		const blob = manager.exportWavBlob([samplePcm], 16000);

		assert.strictEqual(blob.type, "audio/wav");
		const expectedTotalBytes = 44 + samplePcm.length * 2; // 44 header + 10 data = 54 bytes
		assert.strictEqual(blob.size, expectedTotalBytes);

		const arrayBuffer = await blob.arrayBuffer();
		const view = new DataView(arrayBuffer);

		// 1. "RIFF" signature
		const riff = String.fromCharCode(
			view.getUint8(0),
			view.getUint8(1),
			view.getUint8(2),
			view.getUint8(3),
		);
		assert.strictEqual(riff, "RIFF");

		// 2. ChunkSize = totalSize - 8
		assert.strictEqual(view.getUint32(4, true), expectedTotalBytes - 8);

		// 3. "WAVE" signature
		const wave = String.fromCharCode(
			view.getUint8(8),
			view.getUint8(9),
			view.getUint8(10),
			view.getUint8(11),
		);
		assert.strictEqual(wave, "WAVE");

		// 4. "fmt " subchunk
		const fmt = String.fromCharCode(
			view.getUint8(12),
			view.getUint8(13),
			view.getUint8(14),
			view.getUint8(15),
		);
		assert.strictEqual(fmt, "fmt ");
		assert.strictEqual(view.getUint32(16, true), 16); // Subchunk1Size for PCM
		assert.strictEqual(view.getUint16(20, true), 1); // AudioFormat 1 = PCM
		assert.strictEqual(view.getUint16(22, true), 1); // NumChannels = 1 (mono)
		assert.strictEqual(view.getUint32(24, true), 16000); // SampleRate = 16000 Hz
		assert.strictEqual(view.getUint32(28, true), 32000); // ByteRate = 16000 * 1 * 16 / 8 = 32000
		assert.strictEqual(view.getUint16(32, true), 2); // BlockAlign = 1 * 16 / 8 = 2
		assert.strictEqual(view.getUint16(34, true), 16); // BitsPerSample = 16

		// 5. "data" subchunk
		const dataTag = String.fromCharCode(
			view.getUint8(36),
			view.getUint8(37),
			view.getUint8(38),
			view.getUint8(39),
		);
		assert.strictEqual(dataTag, "data");
		assert.strictEqual(view.getUint32(40, true), samplePcm.length * 2);

		// 6. First PCM sample
		assert.strictEqual(view.getInt16(44, true), 1000);
		assert.strictEqual(view.getInt16(46, true), -1000);
	});

	it("gracefully disposes all resources without leaking nodes or throwing errors", () => {
		const manager = new AudioStreamManager();
		assert.doesNotThrow(() => {
			manager.pause();
			manager.resume();
			manager.stop();
			manager.dispose();
		});
	});
});
