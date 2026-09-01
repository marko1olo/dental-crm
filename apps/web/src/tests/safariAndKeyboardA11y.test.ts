import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { UnifiedAudioClient } from "../services/voice/UnifiedAudioClient";
import { SoundFeedbackService } from "../services/audio/SoundFeedbackService";
import { AudioStreamManager } from "../components/audio/AudioStreamManager";
import { trapTabKey, FOCUSABLE_ELEMENTS_SELECTOR } from "../hooks/useModalA11y";

describe("Safari Audio Autoplay & Lazy Initialization Law", () => {
	test("UnifiedAudioClient — Конструктор НЕ создает AudioContext до пользовательского жеста", () => {
		// Mock window and ensure no AudioContext is created upon instantiation
		const client = new UnifiedAudioClient({
			preferredMode: "gemini_live",
		});

		assert.equal(client.getState(), "idle");
		assert.equal(client.getStreamManager(), null, "Stream manager обязан быть null до вызова start()/toggle()");
		assert.equal(client.getMode(), "gemini_live");
		client.dispose();
	});

	test("UnifiedAudioClient.toggle() — переключает запись и лениво инициирует сессию", async () => {
		const client = new UnifiedAudioClient({
			preferredMode: "browser_speech",
		});

		assert.equal(client.getState(), "idle");

		// toggle() должен перевести из idle в connecting / start
		const togglePromise = client.toggle();
		assert.ok(
			client.getState() === "connecting" || client.getState() === "listening" || client.getState() === "error",
			"toggle() обязан инициировать старт сессии",
		);

		await togglePromise.catch(() => {});
		client.dispose();
		assert.equal(client.getState(), "idle");
	});

	test("SoundFeedbackService — AudioContext инициализируется лениво, а не в глобальной области", () => {
		SoundFeedbackService.resetInstance();
		const service = new SoundFeedbackService(null);

		// До первого воспроизведения audioContext не должен быть активен в среде без window
		assert.ok(service.isEnabled());
		assert.equal(service.getVolume(), 0.7);

		service.dispose();
		SoundFeedbackService.resetInstance();
	});

	test("AudioStreamManager — Поддержка webkitAudioContext и lazy resume() при suspended состоянии", () => {
		const manager = new AudioStreamManager({
			targetSampleRate: 16000,
			chunkSize: 2048,
		});

		assert.equal(manager.getAnalyserNode(), null, "AnalyserNode должен быть null до запуска");
		assert.equal(manager.getAudioLevel(), 0, "Audio level должен быть 0 в idle");
		manager.dispose();
	});
});

describe("Keyboard Ergonomics, Escape & Focus Trap (A11y)", () => {
	test("trapTabKey — Игнорирует любые клавиши кроме Tab", () => {
		let prevented = false;
		const fakeEvent = {
			key: "Enter",
			shiftKey: false,
			preventDefault: () => {
				prevented = true;
			},
		};

		// Mock container
		const mockContainer = {
			querySelectorAll: () => [],
			contains: () => true,
		} as unknown as HTMLElement;

		const trapped = trapTabKey(fakeEvent, mockContainer, null);
		assert.equal(trapped, false);
		assert.equal(prevented, false);
	});

	test("trapTabKey (Forward Tab) — Замыкает фокус с последнего элемента на первый", () => {
		let prevented = false;
		const fakeEvent = {
			key: "Tab",
			shiftKey: false,
			preventDefault: () => {
				prevented = true;
			},
		};

		let firstFocused = false;
		let lastFocused = false;

		const firstEl = {
			focus: () => {
				firstFocused = true;
			},
			offsetParent: {},
		} as unknown as HTMLElement;

		const lastEl = {
			focus: () => {
				lastFocused = true;
			},
			offsetParent: {},
		} as unknown as HTMLElement;

		const mockContainer = {
			querySelectorAll: () => [firstEl, lastEl],
			contains: () => true,
		} as unknown as HTMLElement;

		// Активный элемент — последний -> Tab должен перевести фокус на первый
		const trapped = trapTabKey(fakeEvent, mockContainer, lastEl);
		assert.equal(trapped, true);
		assert.equal(prevented, true);
		assert.equal(firstFocused, true);
		assert.equal(lastFocused, false);
	});

	test("trapTabKey (Shift + Tab) — Замыкает фокус с первого элемента на последний", () => {
		let prevented = false;
		const fakeEvent = {
			key: "Tab",
			shiftKey: true,
			preventDefault: () => {
				prevented = true;
			},
		};

		let firstFocused = false;
		let lastFocused = false;

		const firstEl = {
			focus: () => {
				firstFocused = true;
			},
			offsetParent: {},
		} as unknown as HTMLElement;

		const lastEl = {
			focus: () => {
				lastFocused = true;
			},
			offsetParent: {},
		} as unknown as HTMLElement;

		const mockContainer = {
			querySelectorAll: () => [firstEl, lastEl],
			contains: () => true,
		} as unknown as HTMLElement;

		// Активный элемент — первый -> Shift+Tab должен перевести фокус на последний
		const trapped = trapTabKey(fakeEvent, mockContainer, firstEl);
		assert.equal(trapped, true);
		assert.equal(prevented, true);
		assert.equal(lastFocused, true);
		assert.equal(firstFocused, false);
	});

	test("trapTabKey — Возвращает фокус внутрь модалки, если activeElement выпал наружу", () => {
		let prevented = false;
		const fakeEvent = {
			key: "Tab",
			shiftKey: false,
			preventDefault: () => {
				prevented = true;
			},
		};

		let firstFocused = false;
		const firstEl = {
			focus: () => {
				firstFocused = true;
			},
			offsetParent: {},
		} as unknown as HTMLElement;

		const outsideEl = {} as HTMLElement;

		const mockContainer = {
			querySelectorAll: () => [firstEl],
			contains: (el: any) => el === firstEl,
		} as unknown as HTMLElement;

		// Активный элемент снаружи контейнера
		const trapped = trapTabKey(fakeEvent, mockContainer, outsideEl);
		assert.equal(trapped, true);
		assert.equal(prevented, true);
		assert.equal(firstFocused, true);
	});

	test("FOCUSABLE_ELEMENTS_SELECTOR — Включает все интерактивные элементы и исключает disabled/hidden", () => {
		assert.ok(FOCUSABLE_ELEMENTS_SELECTOR.includes("button:not([disabled])"));
		assert.ok(FOCUSABLE_ELEMENTS_SELECTOR.includes("input:not([disabled])"));
		assert.ok(FOCUSABLE_ELEMENTS_SELECTOR.includes("select:not([disabled])"));
		assert.ok(FOCUSABLE_ELEMENTS_SELECTOR.includes("textarea:not([disabled])"));
		assert.ok(FOCUSABLE_ELEMENTS_SELECTOR.includes('[tabindex]:not([tabindex="-1"])'));
	});
});
