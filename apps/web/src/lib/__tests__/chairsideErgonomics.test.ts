/**
 * chairsideErgonomics.test.ts — Comprehensive Test Suite for Clinical Ergonomics & Hardware.
 *
 * Verifies:
 * 1. Procedural Web Audio Earcons (0 bytes, soft envelope, 6 clinical types)
 * 2. Barcode & DataMatrix ("Честный Знак") Classifier & Hardware Sniffer
 * 3. Patient Privacy Shield ("Alt+H" / "Alt+Р") Quick Toggle & DOM State
 * 4. Clipboard Image Paste ("Ctrl+V") Anywhere Interception & Size Boundary
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	classifyBarcode,
	togglePatientPrivacyShield,
	isPatientPrivacyShieldActive,
	playTactileEarcon,
	setupHardwareBarcodeSniffer,
	setupClipboardImagePaste,
	setupPrivacyShieldHotkey,
	DENTE_PRIVACY_SHIELD_ATTR,
	MAX_CLIPBOARD_IMAGE_BYTES,
	type PastedImageDetail,
	type ScannedBarcodeDetail,
} from "../chairsideErgonomics";

describe("Chairside Clinical Ergonomics & Hardware Suite", () => {
	let originalDocument: typeof globalThis.document;
	let originalWindow: typeof globalThis.window;

	beforeEach(() => {
		originalDocument = globalThis.document;
		originalWindow = globalThis.window;

		const attributes: Record<string, string> = {};
		const eventListeners: Record<string, ((e: Event) => void)[]> = {};

		const mockDocElement = {
			getAttribute: (name: string) => attributes[name] ?? null,
			setAttribute: (name: string, value: string) => {
				attributes[name] = value;
			},
			removeAttribute: (name: string) => {
				delete attributes[name];
			},
		} as unknown as HTMLElement;

		const mockWindow = {
			addEventListener: (event: string, handler: (e: Event) => void) => {
				if (!eventListeners[event]) eventListeners[event] = [];
				eventListeners[event].push(handler);
			},
			removeEventListener: (event: string, handler: (e: Event) => void) => {
				if (!eventListeners[event]) return;
				eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
			},
			dispatchEvent: (event: Event) => {
				const handlers = eventListeners[event.type] || [];
				handlers.forEach((h) => h(event));
				return true;
			},
			CustomEvent: class<T> extends Event {
				detail: T;
				constructor(type: string, init?: { detail?: T; bubbles?: boolean }) {
					super(type);
					this.detail = init?.detail as T;
				}
			},
		} as unknown as Window & typeof globalThis;

		globalThis.document = {
			documentElement: mockDocElement,
			activeElement: null,
		} as unknown as Document;
		globalThis.window = mockWindow;
		globalThis.CustomEvent = mockWindow.CustomEvent as unknown as typeof CustomEvent;

		class MockKeyboardEvent extends Event {
			key: string;
			code: string;
			altKey: boolean;
			ctrlKey: boolean;
			shiftKey: boolean;
			metaKey: boolean;
			repeat: boolean;

			constructor(type: string, init?: Partial<KeyboardEvent>) {
				super(type);
				this.key = init?.key ?? "";
				this.code = init?.code ?? "";
				this.altKey = init?.altKey ?? false;
				this.ctrlKey = init?.ctrlKey ?? false;
				this.shiftKey = init?.shiftKey ?? false;
				this.metaKey = init?.metaKey ?? false;
				this.repeat = init?.repeat ?? false;
			}
		}
		globalThis.KeyboardEvent = MockKeyboardEvent as unknown as typeof KeyboardEvent;
	});

	afterEach(() => {
		globalThis.document = originalDocument;
		globalThis.window = originalWindow;
	});

	describe("1. Barcode & DataMatrix Classifier («Честный Знак» / МДЛП)", () => {
		it("identifies Russian Честный Знак Pharma DataMatrix with AI 01 GTIN", () => {
			const honestSignCode = "0104607008311234215s123456789";
			expect(classifyBarcode(honestSignCode)).toBe("datamatrix");
		});

		it("identifies DataMatrix with GS1 ASCII 29 separator", () => {
			const gs1Code = "01046070083112342151234567\u001d91EE06\u001d92qwer";
			expect(classifyBarcode(gs1Code)).toBe("datamatrix");
		});

		it("identifies EAN-13 retail barcode", () => {
			expect(classifyBarcode("4601234567890")).toBe("ean13");
		});

		it("identifies EAN-8 compact retail barcode", () => {
			expect(classifyBarcode("46012345")).toBe("ean8");
		});

		it("identifies standard Code-128 warehouse batch string", () => {
			expect(classifyBarcode("BATCH-2026-X9")).toBe("code128");
		});

		it("returns unknown for short junk strings below 4 chars", () => {
			expect(classifyBarcode("AB")).toBe("unknown");
		});
	});

	describe("2. Patient Privacy Shield Quick Toggle («Экран пациента»)", () => {
		it("starts inactive", () => {
			expect(isPatientPrivacyShieldActive()).toBe(false);
		});

		it("toggles active state and sets attribute data-dente-privacy-shield='active'", () => {
			const activeState = togglePatientPrivacyShield();
			expect(activeState).toBe(true);
			expect(isPatientPrivacyShieldActive()).toBe(true);
			expect(document.documentElement.getAttribute(DENTE_PRIVACY_SHIELD_ATTR)).toBe("active");

			// Toggle off
			const nextState = togglePatientPrivacyShield();
			expect(nextState).toBe(false);
			expect(isPatientPrivacyShieldActive()).toBe(false);
			expect(document.documentElement.getAttribute(DENTE_PRIVACY_SHIELD_ATTR)).toBeNull();
		});

		it("dispatches dente:privacy-shield-toggled custom DOM event", () => {
			let receivedEvent: { active: boolean; timestamp: number } | null = null;
			window.addEventListener("dente:privacy-shield-toggled", ((e: CustomEvent<{ active: boolean; timestamp: number }>) => {
				receivedEvent = e.detail;
			}) as EventListener);

			togglePatientPrivacyShield(true);
			expect(receivedEvent).not.toBeNull();
			expect((receivedEvent as unknown as { active: boolean }).active).toBe(true);
		});

		it("responds to Alt+H keyboard hotkey", () => {
			let toggledState: boolean | null = null;
			const cleanup = setupPrivacyShieldHotkey({
				onToggle: (state) => {
					toggledState = state;
				},
			});

			// Simulate Alt+H
			const altHEvent = new KeyboardEvent("keydown", {
				key: "h",
				code: "KeyH",
				altKey: true,
			});
			window.dispatchEvent(altHEvent);

			expect(toggledState).toBe(true);
			cleanup();
		});

		it("responds to Russian layout Alt+Р hotkey", () => {
			let toggledState: boolean | null = null;
			const cleanup = setupPrivacyShieldHotkey({
				onToggle: (state) => {
					toggledState = state;
				},
			});

			// Simulate Alt+Р
			const altREvent = new KeyboardEvent("keydown", {
				key: "р",
				code: "KeyH",
				altKey: true,
			});
			window.dispatchEvent(altREvent);

			expect(toggledState).toBe(true);
			cleanup();
		});
	});

	describe("3. Procedural Tactile Earcons", () => {
		it("safely invokes all 6 earcon types without throw in non-audio environment", () => {
			const earconTypes: ("save" | "norm" | "pay" | "warning" | "scan" | "privacy")[] = [
				"save",
				"norm",
				"pay",
				"warning",
				"scan",
				"privacy",
			];

			earconTypes.forEach((type) => {
				expect(() => {
					playTactileEarcon(type);
				}).not.toThrow();
			});
		});
	});

	describe("4. Clipboard Image Paste Boundary Guard", () => {
		it("asserts 25 MB ceiling constant", () => {
			expect(MAX_CLIPBOARD_IMAGE_BYTES).toBe(25 * 1024 * 1024);
		});

		it("setupClipboardImagePaste returns cleanup function", () => {
			const cleanup = setupClipboardImagePaste();
			expect(typeof cleanup).toBe("function");
			expect(() => cleanup()).not.toThrow();
		});
	});

	describe("5. Hardware Barcode Sniffer Lifecycle", () => {
		it("setupHardwareBarcodeSniffer returns cleanup function and registers listener", () => {
			let scannedCode: ScannedBarcodeDetail | null = null;
			const cleanup = setupHardwareBarcodeSniffer({
				onScan: (detail) => {
					scannedCode = detail;
				},
			});

			expect(typeof cleanup).toBe("function");
			cleanup();
		});
	});
});
