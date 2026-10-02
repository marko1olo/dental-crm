/**
 * audioDspFilters.test.ts — Исчерпывающее Red Team тестирование клинического DSP,
 * фильтров шумоподавления, сатуратора, Noise Gate и симулятора шумов кабинета.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DENTAL_DSP_PRESETS,
	type DentalDspProfile,
	softClipSample,
	applySoftClippingBuffer,
	calculateSnrDb,
	evaluateAcousticQuality,
	processNoiseGatePcm,
	DentalCabinetAcousticSimulator,
} from "../../voice/audioFilters";
import { parseDentalVoiceSpeech } from "../../voice/dentalGrammarParser";
import { VoiceAudioProcessor } from "../../voice/voiceProcessor";

describe("Dental DSP Presets & Configurations", () => {
	it("provides all 4 canonical clinical profiles with specialized parameters", () => {
		const profiles: DentalDspProfile[] = [
			"clean_studio",
			"dental_balanced",
			"far_field_boost",
			"ultra_noise_rejection",
		];

		for (const p of profiles) {
			const preset = DENTAL_DSP_PRESETS[p];
			assert.ok(preset, `Preset for ${p} must exist`);
			assert.strictEqual(preset.profile, p);
			assert.ok(preset.highpassFrequency >= 70 && preset.highpassFrequency <= 150);
			assert.ok(preset.notch1Frequency === 4500, "Notch 1 must target 4500 Hz turbine whistle");
			assert.ok(preset.notch2Frequency === 6000, "Notch 2 must target 6000 Hz ultrasound scaler");
		}
	});

	it("far_field_boost provides high makeup gain and aggressive compressor threshold", () => {
		const farField = DENTAL_DSP_PRESETS.far_field_boost;
		assert.strictEqual(farField.enableCompressor, true);
		assert.ok(farField.compressorThreshold <= -36, "Far field must have deep compressor threshold");
		assert.ok(farField.makeupGainDb >= 12, "Far field must provide at least +12dB makeup gain");
		assert.strictEqual(farField.enableLimiter, true, "Must have brickwall limiter enabled for far field");
	});

	it("ultra_noise_rejection provides high Q narrow notch filters and lowpass cutoff", () => {
		const ultra = DENTAL_DSP_PRESETS.ultra_noise_rejection;
		assert.strictEqual(ultra.enableTurbineNotch1, true);
		assert.strictEqual(ultra.enableTurbineNotch2, true);
		assert.ok(ultra.notch1Q >= 7.0, "High Q factor for surgical notch cut");
		assert.ok(ultra.notch2Q >= 7.0, "High Q factor for ultrasound cut");
		assert.strictEqual(ultra.enableNoiseGate, true);
	});
});

describe("Non-Linear Soft-Clipping Saturation Guard", () => {
	it("remains strictly linear for small amplitude speech signals (|x| < 0.6)", () => {
		assert.strictEqual(softClipSample(0.0), 0.0);
		assert.strictEqual(softClipSample(0.1), 0.1);
		assert.strictEqual(softClipSample(-0.1), -0.1);
		assert.strictEqual(softClipSample(0.5), 0.5);
		assert.strictEqual(softClipSample(-0.5), -0.5);
	});

	it("smoothly compresses high amplitude overshoots (|x| >= 0.8) without hard clipping", () => {
		const compressedPos = softClipSample(1.5);
		const compressedNeg = softClipSample(-1.5);

		assert.ok(compressedPos > 0.8 && compressedPos < 1.0, `Expected smooth saturation, got ${compressedPos}`);
		assert.ok(compressedNeg < -0.8 && compressedNeg > -1.0, `Expected smooth saturation, got ${compressedNeg}`);
		assert.ok(Math.abs(compressedPos + compressedNeg) < 1e-6, "Must be odd-symmetric: f(-x) == -f(x)");
	});

	it("applySoftClippingBuffer processes full audio buffer and preserves shape", () => {
		const input = new Float32Array([0.0, 0.3, 0.7, 1.2, -1.4, -0.2]);
		const output = applySoftClippingBuffer(input, 1.0);

		assert.strictEqual(output.length, input.length);
		assert.strictEqual(output[0], 0.0);
		assert.ok(Math.abs((output[1] ?? 0) - 0.3) < 1e-5, "Small sample must match with Float32 precision");
		assert.ok((output[3] ?? 0) < 1.0, "Overshoot must be compressed below 1.0");
		assert.ok((output[4] ?? 0) > -1.0, "Negative overshoot must be compressed above -1.0");
	});
});

describe("SNR Calculation & Cabinet Acoustic Evaluation", () => {
	it("calculates exact Signal-to-Noise Ratio (SNR) in dB", () => {
		const snr1 = calculateSnrDb(-20.0, -60.0);
		assert.strictEqual(snr1, 40.0);

		const snr2 = calculateSnrDb(-25.5, -40.0);
		assert.strictEqual(snr2, 14.5);
	});

	it("evaluates acoustic quality and maps to appropriate DSP profiles", () => {
		// Excellent: 30 dB SNR -> clean_studio
		const reportExcellent = evaluateAcousticQuality(-20.0, -50.0);
		assert.strictEqual(reportExcellent.quality, "excellent");
		assert.strictEqual(reportExcellent.suggestedProfile, "clean_studio");

		// Good: 18 dB SNR -> dental_balanced
		const reportGood = evaluateAcousticQuality(-22.0, -40.0);
		assert.strictEqual(reportGood.quality, "good");
		assert.strictEqual(reportGood.suggestedProfile, "dental_balanced");

		// Moderate (distant mic / noisy suction): 12 dB SNR -> far_field_boost
		const reportModerate = evaluateAcousticQuality(-26.0, -38.0);
		assert.strictEqual(reportModerate.quality, "moderate");
		assert.strictEqual(reportModerate.suggestedProfile, "far_field_boost");

		// Noisy cabinet (active drill): 6 dB SNR -> ultra_noise_rejection
		const reportNoisy = evaluateAcousticQuality(-30.0, -36.0);
		assert.strictEqual(reportNoisy.quality, "noisy_cabinet");
		assert.strictEqual(reportNoisy.suggestedProfile, "ultra_noise_rejection");
	});
});

describe("Spectral Noise Gate", () => {
	it("passes signals above threshold and attenuates silence / steady suction hum", () => {
		const sampleRate = 16000;
		// 4800 samples (300ms) of quiet suction hum (-50 dB, amplitude ~0.003)
		const quietHum = new Float32Array(4800).fill(0.003);
		const gatedHum = processNoiseGatePcm(quietHum, -40.0, -20.0, 10, 40, sampleRate);

		// Output samples after gate decay (>100ms) should be attenuated by ~20 dB (0.1x amplitude ~0.0003)
		const tailSample = gatedHum[4000] ?? 0;
		assert.ok(Math.abs(tailSample) < 0.0008, `Hum must be attenuated, got ${tailSample}`);

		// 4800 samples of active doctor voice (-18 dB, amplitude ~0.12)
		const activeVoice = new Float32Array(4800).fill(0.12);
		const passedVoice = processNoiseGatePcm(activeVoice, -40.0, -20.0, 10, 40, sampleRate);
		const midVoice = passedVoice[2400] ?? 0;
		assert.ok(midVoice > 0.11, `Voice should pass freely, got ${midVoice}`);
	});
});

describe("DentalCabinetAcousticSimulator & Far-Field Stress Test", () => {
	it("generates synthetic dental noise with compressor hum and turbine frequencies", () => {
		const simulator = new DentalCabinetAcousticSimulator(16000);
		const noise = simulator.generateCabinetNoise(3200, {
			enableCompressorHum: true,
			enableTurbineWhistle: true,
			enableAspirationNoise: true,
			noiseLevelRms: 0.05,
		});

		assert.strictEqual(noise.length, 3200);

		// Calculate RMS of generated noise
		let sumSq = 0;
		for (let i = 0; i < noise.length; i++) {
			const s = noise[i] ?? 0;
			sumSq += s * s;
		}
		const rms = Math.sqrt(sumSq / noise.length);
		assert.ok(rms > 0.01 && rms < 0.1, `Generated noise RMS should be around 0.05, got ${rms}`);
	});

	it("simulates far-field acoustic attenuation (3 meters) and room reflections", () => {
		const simulator = new DentalCabinetAcousticSimulator(16000);
		// Clean speech impulse
		const clean = new Float32Array(1600);
		clean[100] = 0.8;

		const simulated = simulator.applyCabinetAcousticsToSpeech(clean, {
			distanceMeters: 3.0,
			roomReverbAmount: 0.3,
			noiseLevelRms: 0.001, // Low noise to test attenuation
		});

		assert.strictEqual(simulated.length, clean.length);
		// Direct peak at 100 should be attenuated by ~1/3 = ~0.267
		const attenuatedPeak = simulated[100] ?? 0;
		assert.ok(
			attenuatedPeak < 0.4 && attenuatedPeak > 0.2,
			`Far field peak should be attenuated by ~1/r (got ${attenuatedPeak})`,
		);

		// Echo reflection at sample 100 + delay (~35ms @ 16kHz = 560 samples -> sample 660)
		const reflection = simulated[100 + 560] ?? 0;
		assert.ok(reflection > 0.01, `Expected early tile reflection at sample 660, got ${reflection}`);
	});
});

describe("VoiceAudioProcessor: State, Telemetry & Profile Management", () => {
	it("initializes with default profile and responds to profile changes", () => {
		const processor = new VoiceAudioProcessor("dental_balanced");
		assert.strictEqual(processor.getProfile(), "dental_balanced");

		let notifiedProfile = "";
		processor.subscribe({
			onProfileChange: (p) => {
				notifiedProfile = p;
			},
		});

		processor.setProfile("far_field_boost");
		assert.strictEqual(processor.getProfile(), "far_field_boost");
		assert.strictEqual(notifiedProfile, "far_field_boost");
		assert.strictEqual(processor.getDspConfig().profile, "far_field_boost");

		processor.dispose();
	});

	it("processOfflinePcm applies soft clipping with AGC drive", () => {
		const processor = new VoiceAudioProcessor("far_field_boost");
		const input = new Float32Array([0.1, 0.4, 0.9, -0.9]);
		const output = processor.processOfflinePcm(input, 16000);

		assert.strictEqual(output.length, input.length);
		for (let i = 0; i < output.length; i++) {
			assert.ok(Math.abs(output[i] ?? 0) <= 1.0, "All samples must be bounded within [-1.0, 1.0]");
		}
		processor.dispose();
	});
});

describe("Dental Formula Recognition Robustness (Noise & Distance Scenarios)", () => {
	it("accurately extracts teeth numbers and clinical statuses from clinical phrases", () => {
		const testCases = [
			{
				phrase: "шестнадцать кариес дентина глубокий",
				expectedTeeth: [16],
				expectedStatus: "CARIES",
			},
			{
				phrase: "сорок семь острый пульпит",
				expectedTeeth: [47],
				expectedStatus: "PULPITIS",
			},
			{
				phrase: "двадцать один имплантат установлен",
				expectedTeeth: [21],
				expectedStatus: "IMPLANT",
			},
			{
				phrase: "тридцать шесть световая пломба",
				expectedTeeth: [36],
				expectedStatus: "RESTORATION",
			},
			{
				phrase: "четырнадцать хронический верхушечный периодонтит",
				expectedTeeth: [14],
				expectedStatus: "PERIODONTITIS",
			},
		];

		for (const tc of testCases) {
			const intent = parseDentalVoiceSpeech(tc.phrase);
			assert.ok(intent.detectedTeeth.length > 0, `Must detect tooth in '${tc.phrase}'`);
			assert.strictEqual(intent.detectedTeeth[0], tc.expectedTeeth[0]);
			assert.ok(intent.teethUpdates.length > 0, `Must generate tooth update in '${tc.phrase}'`);
			assert.strictEqual(intent.teethUpdates[0]?.clinicalStatus, tc.expectedStatus);
		}
	});
});
