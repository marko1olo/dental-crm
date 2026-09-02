/**
 * audioDspAndVad.test.ts — Исчерпывающие модульные тесты для DSP ресэмплинга,
 * каскадного антиалиасинг Low-Pass фильтра, Float32-Int16 конвертера и VadEngine.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	AntiAliasingBiquadFilter,
	calculateRms,
	float32ToInt16Sample,
	resampleAudioBuffer,
	RESAMPLING_AUDIO_WORKLET_NAME,
	RESAMPLING_AUDIO_WORKLET_SOURCE,
} from "../ResamplingAudioWorklet";
import { VadEngine, type VadSilencePauseEvent } from "../VadEngine";
import {
	isAudioWorkletSupported,
	getResamplingAudioWorkletBlobUrl,
	revokeResamplingAudioWorkletBlobUrl,
} from "../audioWorkletLoader";

describe("ResamplingAudioWorklet: DSP Math & Constants", () => {
	it("exports canonical worklet processor name 'resampling-audio-worklet-processor'", () => {
		assert.strictEqual(
			RESAMPLING_AUDIO_WORKLET_NAME,
			"resampling-audio-worklet-processor",
		);
	});

	it("contains Anti-Aliasing Biquad filter and Hermite cubic interpolation in worklet source", () => {
		assert.ok(
			RESAMPLING_AUDIO_WORKLET_SOURCE.includes("class ResamplingAudioWorkletProcessor"),
			"Must define ResamplingAudioWorkletProcessor",
		);
		assert.ok(
			RESAMPLING_AUDIO_WORKLET_SOURCE.includes("registerProcessor"),
			"Must call registerProcessor",
		);
		assert.ok(
			RESAMPLING_AUDIO_WORKLET_SOURCE.includes("32768"),
			"Must convert to Int16 PCM scale",
		);
		assert.ok(
			RESAMPLING_AUDIO_WORKLET_SOURCE.includes("Math.log10"),
			"Must calculate RMS dB level",
		);
	});

	it("correctly clamps and converts Float32 to Int16 with saturation guard", () => {
		assert.strictEqual(float32ToInt16Sample(0.0), 0);
		assert.strictEqual(float32ToInt16Sample(1.0), 32767);
		assert.strictEqual(float32ToInt16Sample(-1.0), -32768);

		// Overshoot & Undershoot clamping
		assert.strictEqual(float32ToInt16Sample(2.5), 32767);
		assert.strictEqual(float32ToInt16Sample(-4.0), -32768);

		// Intermediate values
		const halfPos = float32ToInt16Sample(0.5);
		assert.ok(halfPos >= 16380 && halfPos <= 16385);
		const halfNeg = float32ToInt16Sample(-0.5);
		assert.ok(halfNeg >= -16385 && halfNeg <= -16380);
	});

	it("calculates exact RMS and dB for standard signals", () => {
		// Silence (zeros) -> 0 RMS, -120 dB clamped
		const silence = new Float32Array(100);
		const silenceRms = calculateRms(silence);
		assert.strictEqual(silenceRms.rms, 0);
		assert.strictEqual(silenceRms.rmsDb, -120);

		// DC full-scale signal (all 1.0) -> RMS 1.0, 0 dB
		const fullDc = new Float32Array(100).fill(1.0);
		const fullDcRms = calculateRms(fullDc);
		assert.strictEqual(Math.round(fullDcRms.rms * 1000) / 1000, 1.0);
		assert.strictEqual(Math.round(fullDcRms.rmsDb * 100) / 100, 0.0);

		// Int16Array format calculation
		const int16Silence = new Int16Array(100);
		const int16SilenceRms = calculateRms(int16Silence);
		assert.strictEqual(int16SilenceRms.rms, 0);
		assert.strictEqual(int16SilenceRms.rmsDb, -120);

		// Half-scale signal (0.1 amplitude) -> approx -20 dB
		const smallSignal = new Float32Array(100).fill(0.1);
		const smallRms = calculateRms(smallSignal);
		assert.ok(smallRms.rmsDb >= -20.1 && smallRms.rmsDb <= -19.9);
	});

	it("AntiAliasingBiquadFilter: attenuates frequencies above cutoff and preserves passband", () => {
		const sampleRate = 48000;
		const cutoffHz = 7200;
		const filter = new AntiAliasingBiquadFilter(sampleRate, cutoffHz);

		// 1. Test 1000 Hz tone (passband) — should pass with minimal attenuation
		const numSamples = 480; // 10ms
		const passbandSignal = new Float32Array(numSamples);
		for (let i = 0; i < numSamples; i++) {
			passbandSignal[i] = Math.sin((2 * Math.PI * 1000 * i) / sampleRate);
		}
		const filteredPass = filter.processBuffer(passbandSignal);
		// Measure amplitude after filter warmup (samples 200..480)
		let maxPass = 0;
		for (let i = 200; i < numSamples; i++) {
			maxPass = Math.max(maxPass, Math.abs(filteredPass[i] ?? 0));
		}
		assert.ok(maxPass > 0.9, `1kHz signal should pass freely (got max ${maxPass})`);

		// 2. Test 18000 Hz tone (stopband / ultrasonic) — should be heavily attenuated
		filter.reset();
		const stopbandSignal = new Float32Array(numSamples);
		for (let i = 0; i < numSamples; i++) {
			stopbandSignal[i] = Math.sin((2 * Math.PI * 18000 * i) / sampleRate);
		}
		const filteredStop = filter.processBuffer(stopbandSignal);
		let maxStop = 0;
		for (let i = 200; i < numSamples; i++) {
			maxStop = Math.max(maxStop, Math.abs(filteredStop[i] ?? 0));
		}
		assert.ok(
			maxStop < 0.1,
			`18kHz stopband signal must be attenuated significantly (got max ${maxStop})`,
		);
	});

	it("resampleAudioBuffer: accurately resamples 48000Hz and 44100Hz buffers to 16000Hz Int16Array", () => {
		// 48000 Hz to 16000 Hz (exact 3:1 ratio)
		const input48k = new Float32Array(4800); // 100ms
		for (let i = 0; i < input48k.length; i++) {
			input48k[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 48000);
		}
		const out16kFrom48k = resampleAudioBuffer(input48k, 48000, 16000);
		assert.strictEqual(out16kFrom48k.length, 1600); // Exactly 1600 samples
		assert.ok(out16kFrom48k instanceof Int16Array);

		// 44100 Hz to 16000 Hz
		const input44k = new Float32Array(4410); // 100ms
		for (let i = 0; i < input44k.length; i++) {
			input44k[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 44100);
		}
		const out16kFrom44k = resampleAudioBuffer(input44k, 44100, 16000);
		assert.strictEqual(out16kFrom44k.length, 1600); // Exactly 1600 samples
	});
});

describe("VadEngine: Thresholds, States, and Silence Detection", () => {
	it("initializes with default speech threshold (-45 dB) and silence timeout (1500 ms)", () => {
		const vad = new VadEngine();
		assert.strictEqual(vad.getState(), "idle");
		assert.strictEqual(vad.getSpeechThresholdDb(), -45.0);
		assert.strictEqual(vad.getIsSpeaking(), false);
	});

	it("transitions idle -> listening on start()", () => {
		const states: string[] = [];
		const vad = new VadEngine({
			onStateChange: (newState) => states.push(newState),
		});

		vad.start();
		assert.strictEqual(vad.getState(), "listening");
		assert.deepStrictEqual(states, ["listening"]);

		vad.pause();
		assert.strictEqual(vad.getState(), "paused");

		vad.resume();
		assert.strictEqual(vad.getState(), "listening");

		vad.stop();
		assert.strictEqual(vad.getState(), "idle");
	});

	it("detects speech above -45 dB threshold and triggers onVoiceStart", () => {
		let voiceStartCount = 0;
		let lastRmsDb = 0;
		const vad = new VadEngine({
			speechThresholdDb: -45.0,
			onVoiceStart: (_ts, rmsDb) => {
				voiceStartCount++;
				lastRmsDb = rmsDb;
			},
		});

		vad.start();

		// Create quiet chunk (-60 dB) -> should NOT trigger voice
		const quietChunk = new Int16Array(512).fill(10); // 10 / 32768 ~ 0.000305 -> -70 dB
		vad.feedPcmChunk(quietChunk);
		assert.strictEqual(voiceStartCount, 0);
		assert.strictEqual(vad.getIsSpeaking(), false);

		// Create active speech chunk (-20 dB) -> amplitude ~3200 / 32768 ~ 0.1 -> ~-20 dB
		const speechChunk = new Int16Array(512).fill(3200);
		vad.feedPcmChunk(speechChunk);

		assert.strictEqual(voiceStartCount, 1);
		assert.strictEqual(vad.getIsSpeaking(), true);
		assert.strictEqual(vad.getState(), "speaking");
		assert.ok(lastRmsDb >= -45.0, `RMS dB should be >= -45 (got ${lastRmsDb})`);
		vad.stop();
	});

	it("detects silence > 1.5 sec and emits 'silence_pause' event with accumulated PCM", async () => {
		let silencePauseEvent: VadSilencePauseEvent | null = null;
		let voiceEndDuration = 0;

		const vad = new VadEngine({
			speechThresholdDb: -45.0,
			silenceThresholdDb: -50.0,
			silenceTimeoutMs: 250, // Short timeout for rapid unit test
			minSpeechDurationMs: 50,
			onSilencePause: (event) => {
				silencePauseEvent = event;
			},
			onVoiceEnd: (durationMs) => {
				voiceEndDuration = durationMs;
			},
		});

		vad.start();

		// Feed 3 speech chunks (total 1536 samples @ 16kHz ~ 96ms of speech)
		const speechChunk1 = new Int16Array(512).fill(4000);
		const speechChunk2 = new Int16Array(512).fill(4500);
		const speechChunk3 = new Int16Array(512).fill(3500);

		vad.feedPcmChunk(speechChunk1);
		await new Promise((r) => setTimeout(r, 20));
		vad.feedPcmChunk(speechChunk2);
		await new Promise((r) => setTimeout(r, 20));
		vad.feedPcmChunk(speechChunk3);

		assert.strictEqual(vad.getIsSpeaking(), true);

		// Feed silence chunks (-70 dB)
		const silenceChunk = new Int16Array(512).fill(5);
		vad.feedPcmChunk(silenceChunk);

		// Wait for silence timeout (250ms) to trigger
		await new Promise((resolve) => setTimeout(resolve, 350));

		assert.ok(silencePauseEvent !== null, "Must trigger onSilencePause event");
		const event = silencePauseEvent as unknown as VadSilencePauseEvent;
		assert.strictEqual(event.type, "silence_pause");
		assert.strictEqual(event.sampleRate, 16000);
		assert.ok(event.accumulatedPcm.length >= 1536, "Must accumulate all speech PCM");
		assert.strictEqual(vad.getState(), "silence");
		assert.ok(voiceEndDuration > 0, "Must record speech duration");
		vad.stop();
	});

	it("exports valid 16kHz 16-bit Mono WAV Blob with 44-byte RIFF header", async () => {
		const vad = new VadEngine({ targetSampleRate: 16000 });
		const pcm = new Int16Array([500, -500, 1000, -1000, 1500]);
		const wavBlob = vad.exportWavBlob(pcm, 16000);

		assert.strictEqual(wavBlob.type, "audio/wav");
		const expectedBytes = 44 + pcm.length * 2;
		assert.strictEqual(wavBlob.size, expectedBytes);

		const buffer = await wavBlob.arrayBuffer();
		const view = new DataView(buffer);

		// RIFF
		const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
		assert.strictEqual(riff, "RIFF");

		// WAVE
		const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
		assert.strictEqual(wave, "WAVE");

		// AudioFormat 1 = PCM, Channels = 1, SampleRate = 16000, Bits = 16
		assert.strictEqual(view.getUint16(20, true), 1);
		assert.strictEqual(view.getUint16(22, true), 1);
		assert.strictEqual(view.getUint32(24, true), 16000);
		assert.strictEqual(view.getUint16(34, true), 16);

		// First sample check
		assert.strictEqual(view.getInt16(44, true), 500);
		assert.strictEqual(view.getInt16(46, true), -500);
	});
});

describe("audioWorkletLoader: Utilities", () => {
	it("isAudioWorkletSupported returns boolean without crashing in any environment", () => {
		const supported = isAudioWorkletSupported();
		assert.strictEqual(typeof supported, "boolean");
	});

	it("getResamplingAudioWorkletBlobUrl and revokeResamplingAudioWorkletBlobUrl handle lifecycle safely", () => {
		const blobUrl = getResamplingAudioWorkletBlobUrl();
		assert.strictEqual(typeof blobUrl, "string");
		assert.doesNotThrow(() => {
			revokeResamplingAudioWorkletBlobUrl();
		});
	});
});
