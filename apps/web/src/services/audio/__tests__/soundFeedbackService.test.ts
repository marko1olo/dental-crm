/**
 * soundFeedbackService.test.ts — Модульные тесты для централизованного аудио-сервиса SoundFeedbackService
 * и звуковых сигналов онлайн-записи и таймера слота врача.
 */

import assert from "node:assert/strict";
import test, { beforeEach, describe } from "node:test";
import { SoundFeedbackService } from "../SoundFeedbackService.js";

// Mock localStorage if in node environment
const mockStorage = new Map<string, string>();
const fakeLocalStorage: Storage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, value: string) => {
		mockStorage.set(key, value);
	},
	removeItem: (key: string) => {
		mockStorage.delete(key);
	},
	clear: () => {
		mockStorage.clear();
	},
	key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
	get length() {
		return mockStorage.size;
	},
};

(globalThis as unknown as { window: { localStorage: Storage } }).window = {
	localStorage: fakeLocalStorage,
};

describe("SoundFeedbackService Core & Chime Lifecycle", () => {
	beforeEach(() => {
		mockStorage.clear();
		SoundFeedbackService.resetInstance();
	});

	test("singleton initializes with sane defaults and persists volume", () => {
		const service = SoundFeedbackService.getInstance();
		assert.equal(service.isEnabled(), true);
		assert.equal(service.isHapticsEnabled(), true);
		assert.equal(service.getVolume(), 0.7);

		service.setVolume(0.85);
		assert.equal(service.getVolume(), 0.85);
		assert.equal(mockStorage.get("dente_sound_feedback_volume"), "0.85");

		service.setEnabled(false);
		assert.equal(service.isEnabled(), false);
		assert.equal(mockStorage.get("dente_sound_feedback_enabled"), "false");
	});

	test("playOnlineBookingChime and playSlotEndWarningChime execute safely in headless environment", async () => {
		const service = SoundFeedbackService.getInstance();
		// In headless Node, no Web Audio API is available, method must not throw
		await assert.doesNotReject(async () => {
			await service.playOnlineBookingChime();
		});

		await assert.doesNotReject(async () => {
			await service.playSlotEndWarningChime();
		});
	});

	test("playSound router supports online_booking_chime and slot_end_warning_chime", async () => {
		const service = SoundFeedbackService.getInstance();
		await assert.doesNotReject(async () => {
			await service.playSound("online_booking_chime");
			await service.playSound("slot_end_warning_chime");
			await service.playSound("action_success");
			await service.playSound("warning_alert");
		});
	});

	test("synthesizes accurate tones when mock AudioContext is supplied", async () => {
		let createdOscillators = 0;
		let startedOscillators = 0;
		let stoppedOscillators = 0;
		const frequencies: number[] = [];

		const mockGain = {
			gain: {
				setValueAtTime: () => {},
				linearRampToValueAtTime: () => {},
				exponentialRampToValueAtTime: () => {},
			},
			connect: () => {},
		};

		const mockOsc = {
			type: "sine",
			frequency: {
				setValueAtTime: (freq: number) => {
					frequencies.push(freq);
				},
			},
			connect: () => {},
			start: () => {
				startedOscillators++;
			},
			stop: () => {
				stoppedOscillators++;
			},
		};

		const mockCtx = {
			currentTime: 10,
			state: "running",
			destination: {},
			createGain: () => mockGain,
			createOscillator: () => {
				createdOscillators++;
				return mockOsc;
			},
			resume: async () => {},
			suspend: async () => {},
			close: async () => {},
		} as unknown as AudioContext;

		const customService = new SoundFeedbackService(mockCtx);

		// Test online booking chime (tones: 440 Hz and 660 Hz)
		await customService.playOnlineBookingChime();
		assert.equal(createdOscillators, 2, "Must create exactly 2 oscillators for ascending chord");
		assert.equal(startedOscillators, 2);
		assert.equal(stoppedOscillators, 2);
		assert.ok(frequencies.includes(440), "Must include 440 Hz fundamental");
		assert.ok(frequencies.includes(660), "Must include 660 Hz fifth");

		// Test slot end warning chime (tones: 880 Hz and 660 Hz)
		frequencies.length = 0;
		createdOscillators = 0;
		startedOscillators = 0;
		stoppedOscillators = 0;

		await customService.playSlotEndWarningChime();
		assert.equal(createdOscillators, 2, "Must create 2 oscillators for descending soft chime");
		assert.equal(startedOscillators, 2);
		assert.equal(stoppedOscillators, 2);
		assert.ok(frequencies.includes(880), "Must include 880 Hz high warning");
		assert.ok(frequencies.includes(660), "Must include 660 Hz soft resolve");

		customService.dispose();
	});
});
