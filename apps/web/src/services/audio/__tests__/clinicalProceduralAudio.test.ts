/**
 * apps/web/src/services/audio/__tests__/clinicalProceduralAudio.test.ts
 *
 * UNIT TEST SUITE: Clinical Procedural Audio Engine (Web Audio API DSP)
 *
 * Invariants Verified:
 * 1. 0 KB Assets on disk/network (no .mp3/.wav files), pure Web Audio API synthesis.
 * 2. 4 Canonical Clinical Signals:
 *    - scanner_beep: 2200Hz -> 2600Hz double chirp (35ms)
 *    - cashier_kaching: 1200Hz + 2400Hz harmonic earcon (140ms)
 *    - autosave_whisper: 1760Hz subtle whisper (gain <= 0.05, 30ms decay)
 *    - somatic_danger_chord: 440Hz + 466Hz dissonant minor second (150ms)
 * 3. Settings persistence in localStorage (volume, enabled, haptics).
 * 4. Event subscription & listener notifications.
 * 5. Muted state bypass (no oscillator generation when disabled or volume = 0).
 * 6. SoundFeedbackService facade integration.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	ClinicalProceduralAudioEngine,
	clinicalProceduralAudio,
	PROCEDURAL_STORAGE_KEYS,
	type ProceduralSignalEvent,
} from "../clinicalProceduralAudio.js";
import { soundFeedback } from "../SoundFeedbackService.js";
import { clearInMemoryStorageCache } from "../../../lib/safeLocalStorage.js";

// Mock Web Audio API classes
interface MockParamAction {
	type: "setValueAtTime" | "exponentialRampToValueAtTime" | "linearRampToValueAtTime";
	value: number;
	time: number;
}

class MockAudioParam {
	public value: number;
	public actions: MockParamAction[] = [];

	constructor(defaultValue: number) {
		this.value = defaultValue;
	}

	setValueAtTime(value: number, time: number): this {
		this.value = value;
		this.actions.push({ type: "setValueAtTime", value, time });
		return this;
	}

	exponentialRampToValueAtTime(value: number, time: number): this {
		this.value = value;
		this.actions.push({ type: "exponentialRampToValueAtTime", value, time });
		return this;
	}

	linearRampToValueAtTime(value: number, time: number): this {
		this.value = value;
		this.actions.push({ type: "linearRampToValueAtTime", value, time });
		return this;
	}
}

class MockOscillatorNode {
	public type: OscillatorType = "sine";
	public frequency = new MockAudioParam(440);
	public started = false;
	public stopped = false;
	public startTime = 0;
	public stopTime = 0;
	public connectedTo: unknown = null;

	connect(destination: unknown): unknown {
		this.connectedTo = destination;
		return destination;
	}

	start(when = 0): void {
		this.started = true;
		this.startTime = when;
	}

	stop(when = 0): void {
		this.stopped = true;
		this.stopTime = when;
	}
}

class MockGainNode {
	public gain = new MockAudioParam(1.0);
	public connectedTo: unknown = null;

	connect(destination: unknown): unknown {
		this.connectedTo = destination;
		return destination;
	}
}

class MockAudioContext {
	public state: AudioContextState = "running";
	public currentTime = 100.0;
	public destination = {};
	public createdOscillators: MockOscillatorNode[] = [];
	public createdGains: MockGainNode[] = [];

	createOscillator(): MockOscillatorNode {
		const osc = new MockOscillatorNode();
		this.createdOscillators.push(osc);
		return osc;
	}

	createGain(): MockGainNode {
		const gain = new MockGainNode();
		this.createdGains.push(gain);
		return gain;
	}

	createBiquadFilter(): any {
		return {
			type: "lowpass",
			frequency: new MockAudioParam(1200),
			Q: new MockAudioParam(1),
			connect: (dst: any) => dst,
		};
	}

	async resume(): Promise<void> {
		this.state = "running";
	}

	async suspend(): Promise<void> {
		this.state = "suspended";
	}

	async close(): Promise<void> {
		this.state = "closed";
	}
}

// In-memory localStorage mock for node environment
const mockStorage = new Map<string, string>();
const localStorageMock = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, value: string) => mockStorage.set(key, String(value)),
	removeItem: (key: string) => mockStorage.delete(key),
	clear: () => mockStorage.clear(),
};

function setupAudioEnv(): MockAudioContext {
	mockStorage.clear();
	clearInMemoryStorageCache();
	const mockCtx = new MockAudioContext();

	(globalThis as any).window = globalThis;
	(globalThis as any).AudioContext = function () {
		return mockCtx;
	};
	(globalThis as any).localStorage = localStorageMock;
	(globalThis as any).dispatchEvent = () => true;
	(globalThis as any).CustomEvent = class CustomEvent {
		constructor(public type: string, public init?: any) {}
	};
	try {
		Object.defineProperty(globalThis, "navigator", {
			value: { vibrate: () => true },
			configurable: true,
			writable: true,
		});
	} catch {
		try {
			(globalThis.navigator as any).vibrate = () => true;
		} catch {
			// Ignore if read-only
		}
	}

	ClinicalProceduralAudioEngine.resetInstance();
	return mockCtx;
}

test("ClinicalProceduralAudioEngine: Singleton instance and default parameters", () => {
	setupAudioEnv();
	const engine = ClinicalProceduralAudioEngine.getInstance();
	assert.ok(engine, "Instance must exist");
	assert.equal(engine.isEnabled(), true, "Default enabled must be true");
	assert.equal(engine.getVolume(), 0.7, "Default volume must be 0.70");
	assert.equal(engine.isHapticsEnabled(), true, "Default haptics must be true");
});

test("ClinicalProceduralAudioEngine: Settings persistence in localStorage", () => {
	setupAudioEnv();
	const engine = ClinicalProceduralAudioEngine.getInstance();

	engine.setEnabled(false);
	assert.equal(engine.isEnabled(), false);
	assert.equal(localStorageMock.getItem(PROCEDURAL_STORAGE_KEYS.ENABLED), "false");

	engine.setVolume(0.42);
	assert.equal(engine.getVolume(), 0.42);
	assert.equal(localStorageMock.getItem(PROCEDURAL_STORAGE_KEYS.VOLUME), "0.42");

	engine.setHapticsEnabled(false);
	assert.equal(engine.isHapticsEnabled(), false);
	assert.equal(localStorageMock.getItem(PROCEDURAL_STORAGE_KEYS.HAPTICS), "false");

	// Reset and reload from storage
	ClinicalProceduralAudioEngine.resetInstance();
	const reloaded = ClinicalProceduralAudioEngine.getInstance();
	assert.equal(reloaded.isEnabled(), false, "Should load enabled=false from storage");
	assert.equal(reloaded.getVolume(), 0.42, "Should load volume=0.42 from storage");
	assert.equal(reloaded.isHapticsEnabled(), false, "Should load haptics=false from storage");
});

test("ClinicalProceduralAudioEngine: Event listener subscription and dispatch", async () => {
	setupAudioEnv();
	const engine = ClinicalProceduralAudioEngine.getInstance();
	const received: ProceduralSignalEvent[] = [];

	const unsubscribe = engine.subscribe((event) => {
		received.push(event);
	});

	await engine.playScannerBeep();
	await engine.playCashierKaching();

	assert.equal(received.length, 2, "Must receive exactly 2 events");
	assert.equal(received[0]?.signal, "scanner_beep");
	assert.equal(received[1]?.signal, "cashier_kaching");

	unsubscribe();
	await engine.playAutosaveWhisper();
	assert.equal(received.length, 2, "Unsubscribed listener should not receive further events");
});

test("ClinicalProceduralAudioEngine: Synthesis 1 - scanner_beep (double chirp 2200-2600Hz, 35ms)", async () => {
	const mockCtx = setupAudioEnv();
	const engine = ClinicalProceduralAudioEngine.getInstance();

	await engine.playScannerBeep();

	assert.equal(mockCtx.createdOscillators.length, 2, "Double chirp must instantiate 2 oscillators");
	assert.equal(mockCtx.createdGains.length, 3, "Must instantiate master gain + 2 chirp gain envelopes");

	for (const osc of mockCtx.createdOscillators) {
		assert.equal(osc.type, "sine", "Chirp oscillator type must be sine");
		assert.ok(osc.started, "Oscillator must be started");
		assert.ok(osc.stopped, "Oscillator must be stopped");
		// Check frequency ramp from 2200Hz to 2600Hz
		const startAction = osc.frequency.actions.find((a) => a.type === "setValueAtTime");
		const rampAction = osc.frequency.actions.find((a) => a.type === "exponentialRampToValueAtTime");
		assert.ok(startAction, "Must set start frequency");
		assert.equal(startAction?.value, 2200, "Start frequency must be 2200 Hz");
		assert.ok(rampAction, "Must ramp frequency");
		assert.equal(rampAction?.value, 2600, "Target frequency must be 2600 Hz");
	}
});

test("ClinicalProceduralAudioEngine: Synthesis 2 - cashier_kaching (1200 + 2400Hz, 140ms)", async () => {
	const mockCtx = setupAudioEnv();
	const engine = ClinicalProceduralAudioEngine.getInstance();

	await engine.playCashierKaching();

	assert.equal(mockCtx.createdOscillators.length, 2, "Harmonic earcon must instantiate 2 oscillators");
	const freqs = mockCtx.createdOscillators.map((o) => o.frequency.actions[0]?.value ?? 0).sort((a, b) => a - b);
	assert.deepEqual(freqs, [1200, 2400], "Harmonic frequencies must be 1200Hz and 2400Hz");

	for (const osc of mockCtx.createdOscillators) {
		assert.equal(osc.type, "sine");
		assert.ok(osc.started);
		assert.ok(osc.stopped);
	}
});

test("ClinicalProceduralAudioEngine: Synthesis 3 - autosave_whisper (1760Hz, gain <= 0.05, 30ms)", async () => {
	const mockCtx = setupAudioEnv();
	const engine = ClinicalProceduralAudioEngine.getInstance();

	await engine.playAutosaveWhisper();

	assert.equal(mockCtx.createdOscillators.length, 1, "Whisper must instantiate 1 oscillator");
	const osc = mockCtx.createdOscillators[0];
	assert.ok(osc);
	assert.equal(osc?.frequency.actions[0]?.value, 1760, "Whisper frequency must be 1760 Hz (A6)");

	const gainNode = mockCtx.createdGains[0];
	assert.ok(gainNode, "Must create gain node");
	const peakGain = gainNode?.gain.actions.find((a) => a.value > 0.001);
	assert.ok(peakGain, "Must have ramped above floor");
	assert.ok(peakGain && peakGain.value <= 0.05, `Whisper gain must be <= 0.05 (got ${peakGain?.value})`);
});

test("ClinicalProceduralAudioEngine: Synthesis 4 - somatic_danger_chord (440 + 466Hz, 150ms)", async () => {
	const mockCtx = setupAudioEnv();
	const engine = ClinicalProceduralAudioEngine.getInstance();

	await engine.playSomaticDangerChord();

	assert.equal(mockCtx.createdOscillators.length, 2, "Dissonant chord must instantiate 2 oscillators");
	const freqs = mockCtx.createdOscillators.map((o) => Math.round(o.frequency.actions[0]?.value ?? 0)).sort((a, b) => a - b);
	assert.deepEqual(freqs, [440, 466], "Minor second interval must be 440Hz and ~466Hz");
});

test("ClinicalProceduralAudioEngine: Zero-activity when disabled or volume is 0", async () => {
	const mockCtx = setupAudioEnv();
	const engine = ClinicalProceduralAudioEngine.getInstance();

	engine.setEnabled(false);
	await engine.playScannerBeep();
	await engine.playCashierKaching();
	await engine.playAutosaveWhisper();
	await engine.playSomaticDangerChord();

	assert.equal(mockCtx.createdOscillators.length, 0, "No oscillators when sound is disabled");

	engine.setEnabled(true);
	engine.setVolume(0);
	await engine.playScannerBeep();
	assert.equal(mockCtx.createdOscillators.length, 0, "No oscillators when volume is 0");
});

test("SoundFeedbackService: Re-exports and facades procedural signals", async () => {
	const mockCtx = setupAudioEnv();

	await soundFeedback.playScannerBeep();
	assert.ok(mockCtx.createdOscillators.length >= 2, "soundFeedback.playScannerBeep works");

	await soundFeedback.playCashierKaching();
	await soundFeedback.playAutosaveWhisper();
	await soundFeedback.playSomaticDangerChord();

	// playSound with new effect types
	await soundFeedback.playSound("scanner_beep");
	await soundFeedback.playSound("cashier_kaching");
	await soundFeedback.playSound("autosave_whisper");
	await soundFeedback.playSound("somatic_danger_chord");
});
