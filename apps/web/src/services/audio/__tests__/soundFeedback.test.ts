/**
 * soundFeedback.test.ts — Исчерпывающие модульные тесты для аппаратного синтезатора
 * звуковых эффектов (Web Audio API) и тактильной отдачи (Haptics) в DENTE CRM.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
	SoundFeedbackService,
	SOUND_STORAGE_KEYS,
	CHORD_C6_HZ,
	CHORD_E6_HZ,
	CHORD_G6_HZ,
	type SoundEffectType,
} from "../SoundFeedbackService";

// Mock-структуры для тестирования Web Audio API параметров
interface MockAudioParamCall {
	method: "setValueAtTime" | "linearRampToValueAtTime" | "exponentialRampToValueAtTime";
	value: number;
	time: number;
}

class MockAudioParam {
	public value: number;
	public calls: MockAudioParamCall[] = [];

	constructor(defaultValue = 1.0) {
		this.value = defaultValue;
	}

	public setValueAtTime(value: number, time: number): void {
		this.value = value;
		this.calls.push({ method: "setValueAtTime", value, time });
	}

	public linearRampToValueAtTime(value: number, time: number): void {
		this.value = value;
		this.calls.push({ method: "linearRampToValueAtTime", value, time });
	}

	public exponentialRampToValueAtTime(value: number, time: number): void {
		this.value = value;
		this.calls.push({ method: "exponentialRampToValueAtTime", value, time });
	}
}

class MockAudioNode {
	public connectedTo: MockAudioNode[] = [];

	public connect(destination: MockAudioNode): MockAudioNode {
		this.connectedTo.push(destination);
		return destination;
	}

	public disconnect(): void {
		this.connectedTo = [];
	}
}

class MockOscillatorNode extends MockAudioNode {
	public type: OscillatorType = "sine";
	public frequency = new MockAudioParam(440);
	public startedAt: number | null = null;
	public stoppedAt: number | null = null;

	public start(time = 0): void {
		this.startedAt = time;
	}

	public stop(time = 0): void {
		this.stoppedAt = time;
	}
}

class MockGainNode extends MockAudioNode {
	public gain = new MockAudioParam(1.0);
}

class MockBiquadFilterNode extends MockAudioNode {
	public type: BiquadFilterType = "lowpass";
	public frequency = new MockAudioParam(350);
	public Q = new MockAudioParam(1);
}

class MockAudioContext {
	public currentTime = 10.0;
	public state: AudioContextState = "running";
	public destination = new MockAudioNode();
	public oscillators: MockOscillatorNode[] = [];
	public gainNodes: MockGainNode[] = [];
	public biquadFilters: MockBiquadFilterNode[] = [];
	public isResumed = false;
	public isSuspended = false;
	public isClosed = false;

	public createOscillator(): MockOscillatorNode {
		const osc = new MockOscillatorNode();
		this.oscillators.push(osc);
		return osc;
	}

	public createGain(): MockGainNode {
		const gain = new MockGainNode();
		this.gainNodes.push(gain);
		return gain;
	}

	public createBiquadFilter(): MockBiquadFilterNode {
		const filter = new MockBiquadFilterNode();
		this.biquadFilters.push(filter);
		return filter;
	}

	public async resume(): Promise<void> {
		this.state = "running";
		this.isResumed = true;
	}

	public async suspend(): Promise<void> {
		this.state = "suspended";
		this.isSuspended = true;
	}

	public async close(): Promise<void> {
		this.state = "closed";
		this.isClosed = true;
	}
}

// In-memory mock localStorage
const mockStorage = new Map<string, string>();
const mockWindow = {
	localStorage: {
		getItem: (key: string) => mockStorage.get(key) ?? null,
		setItem: (key: string, val: string) => mockStorage.set(key, val),
		removeItem: (key: string) => mockStorage.delete(key),
		clear: () => mockStorage.clear(),
	},
};

// Mock navigator with vibrate recording
let lastVibratePattern: number | number[] | null = null;
const setupNavigatorMock = () => {
	lastVibratePattern = null;
	if (typeof globalThis.navigator === "undefined") {
		// biome-ignore lint/suspicious/noExplicitAny: test environment mock
		(globalThis as any).navigator = {};
	}
	Object.defineProperty(globalThis.navigator, "vibrate", {
		value: (pattern: number | number[]) => {
			lastVibratePattern = pattern;
			return true;
		},
		configurable: true,
		writable: true,
	});
};

const cleanupNavigatorMock = () => {
	try {
		// biome-ignore lint/suspicious/noExplicitAny: test environment cleanup
		delete (globalThis.navigator as any).vibrate;
	} catch {}
};

describe("SoundFeedbackService: Constants and Mathematical Frequencies", () => {
	it("exports canonical C6, E6, G6 frequencies for major medical chord", () => {
		assert.strictEqual(CHORD_C6_HZ, 1046.5);
		assert.strictEqual(CHORD_E6_HZ, 1318.51);
		assert.strictEqual(CHORD_G6_HZ, 1567.98);
	});

	it("exports correct storage keys", () => {
		assert.strictEqual(SOUND_STORAGE_KEYS.ENABLED, "dente_sound_feedback_enabled");
		assert.strictEqual(SOUND_STORAGE_KEYS.VOLUME, "dente_sound_feedback_volume");
		assert.strictEqual(SOUND_STORAGE_KEYS.HAPTICS, "dente_sound_feedback_haptics");
	});
});

describe("SoundFeedbackService: Volume, Settings & Persistence", () => {
	beforeEach(() => {
		mockStorage.clear();
		// biome-ignore lint/suspicious/noExplicitAny: test environment mock
		(globalThis as any).window = mockWindow;
		setupNavigatorMock();
	});

	afterEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: test environment cleanup
		delete (globalThis as any).window;
		cleanupNavigatorMock();
		SoundFeedbackService.resetInstance();
	});

	it("initializes with default enabled=true, volume=0.7, hapticsEnabled=true", () => {
		const service = new SoundFeedbackService();
		assert.strictEqual(service.isEnabled(), true);
		assert.strictEqual(service.getVolume(), 0.7);
		assert.strictEqual(service.isHapticsEnabled(), true);
	});

	it("clamps volume strictly between 0.0 and 1.0 and saves to localStorage", () => {
		const service = new SoundFeedbackService();

		service.setVolume(0.5);
		assert.strictEqual(service.getVolume(), 0.5);
		assert.strictEqual(mockStorage.get(SOUND_STORAGE_KEYS.VOLUME), "0.5");

		// Overshoot clamping
		service.setVolume(2.5);
		assert.strictEqual(service.getVolume(), 1.0);
		assert.strictEqual(mockStorage.get(SOUND_STORAGE_KEYS.VOLUME), "1");

		// Undershoot clamping
		service.setVolume(-0.8);
		assert.strictEqual(service.getVolume(), 0.0);
		assert.strictEqual(mockStorage.get(SOUND_STORAGE_KEYS.VOLUME), "0");
	});

	it("toggles enabled state and updates localStorage", () => {
		const service = new SoundFeedbackService();
		service.setEnabled(false);
		assert.strictEqual(service.isEnabled(), false);
		assert.strictEqual(mockStorage.get(SOUND_STORAGE_KEYS.ENABLED), "false");

		service.setEnabled(true);
		assert.strictEqual(service.isEnabled(), true);
		assert.strictEqual(mockStorage.get(SOUND_STORAGE_KEYS.ENABLED), "true");
	});

	it("toggles haptics state and updates localStorage", () => {
		const service = new SoundFeedbackService();
		service.setHapticsEnabled(false);
		assert.strictEqual(service.isHapticsEnabled(), false);
		assert.strictEqual(mockStorage.get(SOUND_STORAGE_KEYS.HAPTICS), "false");

		service.setHapticsEnabled(true);
		assert.strictEqual(service.isHapticsEnabled(), true);
		assert.strictEqual(mockStorage.get(SOUND_STORAGE_KEYS.HAPTICS), "true");
	});

	it("restores previously saved settings on initialization", () => {
		mockStorage.set(SOUND_STORAGE_KEYS.ENABLED, "false");
		mockStorage.set(SOUND_STORAGE_KEYS.VOLUME, "0.35");
		mockStorage.set(SOUND_STORAGE_KEYS.HAPTICS, "false");

		const service = new SoundFeedbackService();
		assert.strictEqual(service.isEnabled(), false);
		assert.strictEqual(service.getVolume(), 0.35);
		assert.strictEqual(service.isHapticsEnabled(), false);
	});
});

describe("SoundFeedbackService: Web Audio DSP Synthesis & Oscillators", () => {
	let mockCtx: MockAudioContext;
	let service: SoundFeedbackService;

	beforeEach(() => {
		mockStorage.clear();
		// biome-ignore lint/suspicious/noExplicitAny: test environment mock
		(globalThis as any).window = mockWindow;
		setupNavigatorMock();

		mockCtx = new MockAudioContext();
		// biome-ignore lint/suspicious/noExplicitAny: mock AudioContext
		service = new SoundFeedbackService(mockCtx as any);
	});

	afterEach(() => {
		service.dispose();
		// biome-ignore lint/suspicious/noExplicitAny: test environment cleanup
		delete (globalThis as any).window;
		cleanupNavigatorMock();
	});

	it("playMicStart: synthesizes ascending chirp 880Hz -> 1760Hz over 80ms with 30ms haptic", async () => {
		await service.playMicStart();

		// Oscillator checks
		assert.strictEqual(mockCtx.oscillators.length, 1);
		const osc = mockCtx.oscillators[0]!;
		assert.strictEqual(osc.type, "sine");
		assert.strictEqual(osc.startedAt, 10.0);
		assert.ok(osc.stoppedAt! >= 10.08);

		// Frequency ramp
		const freqCalls = osc.frequency.calls;
		assert.strictEqual(freqCalls.length, 2);
		assert.strictEqual(freqCalls[0]!.value, 880);
		assert.strictEqual(freqCalls[0]!.time, 10.0);
		assert.strictEqual(freqCalls[1]!.method, "exponentialRampToValueAtTime");
		assert.strictEqual(freqCalls[1]!.value, 1760);
		assert.strictEqual(Math.round(freqCalls[1]!.time * 100) / 100, 10.08);

		// Gain envelope
		assert.strictEqual(mockCtx.gainNodes.length, 1);
		const gain = mockCtx.gainNodes[0]!;
		assert.ok(gain.gain.calls.length >= 3);

		// Haptics
		assert.strictEqual(lastVibratePattern, 30);
	});

	it("playMicStop: synthesizes descending chirp 1760Hz -> 440Hz over 80ms with 20ms haptic", async () => {
		await service.playMicStop();

		assert.strictEqual(mockCtx.oscillators.length, 1);
		const osc = mockCtx.oscillators[0]!;
		assert.strictEqual(osc.type, "sine");
		assert.strictEqual(osc.startedAt, 10.0);

		// Frequency ramp descending
		const freqCalls = osc.frequency.calls;
		assert.strictEqual(freqCalls.length, 2);
		assert.strictEqual(freqCalls[0]!.value, 1760);
		assert.strictEqual(freqCalls[0]!.time, 10.0);
		assert.strictEqual(freqCalls[1]!.method, "exponentialRampToValueAtTime");
		assert.strictEqual(freqCalls[1]!.value, 440);
		assert.strictEqual(Math.round(freqCalls[1]!.time * 100) / 100, 10.08);

		// Haptics
		assert.strictEqual(lastVibratePattern, 20);
	});

	it("playSpeechCaptured: synthesizes 1200Hz soft click (40ms) with 15ms haptic", async () => {
		await service.playSpeechCaptured();

		assert.strictEqual(mockCtx.oscillators.length, 1);
		const osc = mockCtx.oscillators[0]!;
		assert.strictEqual(osc.type, "sine");
		assert.strictEqual(osc.frequency.calls[0]!.value, 1200);
		assert.ok(osc.stoppedAt! >= 10.04);

		// Haptics
		assert.strictEqual(lastVibratePattern, 15);
	});

	it("playActionSuccess: synthesizes polyphonic major medical chord (C6 1046.5Hz, E6 1318.5Hz, G6 1568.0Hz) with [40,30,40] haptics", async () => {
		await service.playActionSuccess();

		// 3 sine oscillators for the triad
		assert.strictEqual(mockCtx.oscillators.length, 3);
		const freqs = mockCtx.oscillators.map((o) => o.frequency.calls[0]!.value);
		assert.deepStrictEqual(freqs, [CHORD_C6_HZ, CHORD_E6_HZ, CHORD_G6_HZ]);

		// Master gain + 3 note gains = 4 gain nodes
		assert.strictEqual(mockCtx.gainNodes.length, 4);

		// Haptics
		assert.deepStrictEqual(lastVibratePattern, [40, 30, 40]);
	});

	it("playWarningAlert: synthesizes dual filtered sawtooth (220Hz + 180Hz) with 650Hz lowpass filter and [60,40,60] haptics", async () => {
		await service.playWarningAlert();

		// 2 sawtooth oscillators
		assert.strictEqual(mockCtx.oscillators.length, 2);
		const freqs = mockCtx.oscillators.map((o) => o.frequency.calls[0]!.value);
		assert.deepStrictEqual(freqs, [220, 180]);
		for (const osc of mockCtx.oscillators) {
			assert.strictEqual(osc.type, "sawtooth");
		}

		// Low-pass filter created and configured
		assert.strictEqual(mockCtx.biquadFilters.length, 1);
		const filter = mockCtx.biquadFilters[0]!;
		assert.strictEqual(filter.type, "lowpass");
		assert.strictEqual(filter.frequency.calls[0]!.value, 650);

		// Dual pulse master gain
		assert.strictEqual(mockCtx.gainNodes.length, 1);
		const masterGain = mockCtx.gainNodes[0]!;
		assert.ok(masterGain.gain.calls.length >= 4);

		// Haptics
		assert.deepStrictEqual(lastVibratePattern, [60, 40, 60]);
	});

	it("playSound: correctly routes all SoundEffectType values", async () => {
		const types: SoundEffectType[] = [
			"mic_start",
			"mic_stop",
			"speech_captured",
			"action_success",
			"warning_alert",
		];

		for (const type of types) {
			mockCtx.oscillators = [];
			await service.playSound(type);
			assert.ok(mockCtx.oscillators.length > 0, `Type ${type} must trigger oscillator synthesis`);
		}
	});

	it("does not synthesize or vibrate when disabled or volume is 0", async () => {
		service.setEnabled(false);
		await service.playMicStart();
		assert.strictEqual(mockCtx.oscillators.length, 0);
		assert.strictEqual(lastVibratePattern, null);

		service.setEnabled(true);
		service.setVolume(0);
		await service.playActionSuccess();
		assert.strictEqual(mockCtx.oscillators.length, 0);
	});

	it("resumes suspended AudioContext prior to playback", async () => {
		mockCtx.state = "suspended";
		await service.playMicStart();
		assert.strictEqual(mockCtx.isResumed, true);
		assert.strictEqual(mockCtx.state, "running");
	});
});
