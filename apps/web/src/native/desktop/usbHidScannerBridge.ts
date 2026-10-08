/**
 * DENTE CRM — Desktop Windows (.EXE) USB HID Scanner Bridge (Layer 2)
 *
 * Autonomous USB HID 2D barcode / DataMatrix scanner detector:
 * - Intercepts rapid keyboard emulation bursts (< 30-35ms) without requiring active input focus.
 * - Parses Честный ЗНАК / МДЛП GS1 DataMatrix identifiers.
 * - Dispenses haptic / audio feedback upon barcode capture.
 */

import { parseGs1DataMatrix } from "../mobile/gs1Scanner";
import { triggerHaptic } from "../mobile/hapticsAndAudio";
import type { UsbHidScanEvent, UsbHidScannerOptions } from "./types";

/**
 * Validates whether a stream of recorded keystrokes represents a high-speed hardware scanner burst.
 * Incorporates adaptive scheduling jitter tolerance (up to 140ms) for low-spec clinic workstations.
 */
export function isUsbHidScanBurst(
	keystrokes: Array<{ key: string; timestamp: number }>,
	maxInterKeyDelayMs = 65,
	minBarcodeLength = 3,
): boolean {
	if (!keystrokes || keystrokes.length < minBarcodeLength) {
		return false;
	}

	const charCount = keystrokes.length;
	const first = keystrokes[0];
	const last = keystrokes[charCount - 1];
	const totalDuration = first && last ? last.timestamp - first.timestamp : 0;
	const avgDelta = charCount > 1 ? totalDuration / (charCount - 1) : 0;

	// On slow CPUs (5400 RPM HDD, GC pauses, Celeron/Atom dental clinics),
	// physical USB HID 2D scanners can suffer event loop hiccups between characters.
	// If average burst speed is rapid (<= 55ms/char) and barcode is substantial (>= 8 chars),
	// allow temporary OS/scheduler jitter up to 140ms for individual inter-key gaps.
	const allowJitter = charCount >= 8 && avgDelta <= 55;
	const maxGapLimit = allowJitter ? Math.max(140, maxInterKeyDelayMs) : maxInterKeyDelayMs;

	for (let i = 1; i < keystrokes.length; i++) {
		const curr = keystrokes[i];
		const prev = keystrokes[i - 1];
		if (!curr || !prev) continue;
		const delta = curr.timestamp - prev.timestamp;
		if (delta > maxGapLimit) {
			return false;
		}
	}

	return true;
}

/**
 * Creates an autonomous USB HID 2D barcode / DataMatrix scanner detector.
 * Intercepts rapid keyboard emulation bursts (< 30-35ms) without requiring active input focus.
 */
export function createUsbHidScannerDetector(options: UsbHidScannerOptions = {}) {
	const maxInterKeyDelayMs = options.maxInterKeyDelayMs ?? 65;
	const minBarcodeLength = options.minBarcodeLength ?? 3;
	const preventDefault = options.preventDefault ?? true;

	let buffer: Array<{ key: string; timestamp: number }> = [];
	let active = false;

	const processKey = (key: string, timestamp = Date.now()): UsbHidScanEvent | null => {
		if (key === "Enter" || key === "Tab") {
			if (isUsbHidScanBurst(buffer, maxInterKeyDelayMs, minBarcodeLength)) {
				const rawCode = buffer.map((b) => b.key).join("");
				const first = buffer[0];
				const last = buffer[buffer.length - 1];
				const durationMs =
					first && last && buffer.length > 1
						? last.timestamp - first.timestamp
						: 0;
				const parsedGs1 = parseGs1DataMatrix(rawCode);
				const scanEvent: UsbHidScanEvent = {
					rawCode,
					parsedGs1,
					timestamp,
					durationMs,
					charCount: rawCode.length,
					source: "usb_hid_scanner",
				};

				triggerHaptic("success");
				options.onScan?.(scanEvent);

				if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
					try {
						window.dispatchEvent(
							new CustomEvent("dente:usb-barcode-scanned", {
								detail: {
									code: rawCode,
									rawCode,
									format: parsedGs1.isValidMdlp || Boolean(parsedGs1.gtin) ? "gs1_datamatrix" : "code128",
									parsedGs1,
									timestamp,
									durationMs,
									source: "usb_hid_scanner",
								},
							}),
						);
						window.dispatchEvent(
							new CustomEvent("dente:barcode-scanned", {
								detail: {
									code: rawCode,
									rawCode,
									format: parsedGs1.isValidMdlp || Boolean(parsedGs1.gtin) ? "gs1_datamatrix" : "code128",
									parsedGs1,
									source: "usb_hid_scanner",
								},
							}),
						);
					} catch {
						// Ignore event dispatch failure in non-browser envs
					}
				}

				buffer = [];
				return scanEvent;
			}
			buffer = [];
			return null;
		}

		// Filter out non-printable modifier keys (keep printable single characters)
		if (key.length === 1) {
			if (buffer.length > 0) {
				const last = buffer[buffer.length - 1];
				if (last) {
					const delta = timestamp - last.timestamp;
					// If we already accumulated a partial burst (>= 6 chars), allow up to 140ms for slow CPU scheduling hiccups
					const gapLimit =
						buffer.length >= 6
							? Math.max(140, maxInterKeyDelayMs)
							: maxInterKeyDelayMs;
					if (delta > gapLimit) {
						// Typing too slow -> reset buffer to current key (human typing)
						buffer = [];
					}
				}
			}
			buffer.push({ key, timestamp });
		}

		return null;
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (!active) return;
		const result = processKey(event.key, Date.now());
		if (result) {
			if (preventDefault && typeof event.preventDefault === "function") {
				event.preventDefault();
				event.stopPropagation();
			}

			// Clean up focused input if scanner typed into it
			if (typeof document !== "undefined" && document.activeElement) {
				const activeEl = document.activeElement as any;
				const isInput =
					(typeof HTMLInputElement !== "undefined" && activeEl instanceof HTMLInputElement) ||
					(typeof HTMLTextAreaElement !== "undefined" && activeEl instanceof HTMLTextAreaElement) ||
					Boolean(
						activeEl &&
							typeof activeEl.value === "string" &&
							typeof activeEl.tagName === "string" &&
							["INPUT", "TEXTAREA"].includes(activeEl.tagName),
					);
				if (isInput) {
					try {
						if (activeEl.value && activeEl.value.includes(result.rawCode)) {
							activeEl.value = activeEl.value.replace(result.rawCode, "").trim();
							if (typeof activeEl.dispatchEvent === "function" && typeof Event !== "undefined") {
								activeEl.dispatchEvent(new Event("input", { bubbles: true }));
							}
						}
					} catch {}
				}
			}
		}
	};

	const start = () => {
		if (active) return;
		active = true;
		buffer = [];
		if (typeof window !== "undefined" && window.addEventListener) {
			window.addEventListener("keydown", handleKeyDown, true);
		}
	};

	const stop = () => {
		active = false;
		buffer = [];
		if (typeof window !== "undefined" && window.removeEventListener) {
			window.removeEventListener("keydown", handleKeyDown, true);
		}
	};

	return {
		start,
		stop,
		destroy: stop,
		processKey,
		getBuffer: () => [...buffer],
	};
}

/**
 * Global subscription helper for USB HID 2D scanner events.
 */
export function subscribeUsbHidScanner(
	callback: (event: UsbHidScanEvent) => void,
	options: Omit<UsbHidScannerOptions, "onScan"> = {},
): () => void {
	const detector = createUsbHidScannerDetector({
		...options,
		onScan: callback,
	});
	detector.start();
	return () => {
		detector.destroy();
	};
}
