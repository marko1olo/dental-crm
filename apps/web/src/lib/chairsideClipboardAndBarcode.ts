/**
 * chairsideClipboardAndBarcode.ts — Clipboard Image Interception & Hardware Barcode Sniffer.
 *
 * Submodule of Chairside Clinical Ergonomics Suite.
 * - Global Clipboard Image Interception ("Ctrl+V Paste Anywhere") with WebP conversion & 25MB boundary guard.
 * - Hardware Barcode & DataMatrix Sniffer («Честный Знак» Protection against input field pollution).
 *
 * Constitution: THE_HAMMER_MASTER_PROMPT.md, AGENTS.md, DESIGNER_VISUAL_INQUISITION_BIBLE.md
 */

import { playTactileEarcon } from "./chairsideErgonomics";

// ============================================================================
// 1. GLOBAL CLIPBOARD IMAGE INTERCEPTION ("Ctrl+V Paste Anywhere")
// ============================================================================

export interface PastedImageDetail {
	readonly id: string;
	readonly dataUrl: string;
	readonly blob: Blob;
	readonly name: string;
	readonly size: number;
	readonly type: string;
	readonly width: number;
	readonly height: number;
	readonly timestamp: number;
}

export const MAX_CLIPBOARD_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB ceiling

export interface ClipboardPasteOptions {
	onPaste?: (detail: PastedImageDetail) => void;
	onError?: (error: string) => void;
	maxBytes?: number;
}

/**
 * Sets up global paste listener on window.
 * Allows doctor to take a CT screenshot or dental photo via Snipping Tool (Win+Shift+S)
 * and press Ctrl+V anywhere in the application.
 */
export function setupClipboardImagePaste(options: ClipboardPasteOptions = {}): () => void {
	if (typeof window === "undefined") return () => {};

	const maxBytes = options.maxBytes ?? MAX_CLIPBOARD_IMAGE_BYTES;

	const handlePaste = (e: ClipboardEvent): void => {
		const items = e.clipboardData?.items;
		if (!items || items.length === 0) return;

		let imageItem: DataTransferItem | null = null;
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item && item.type && item.type.startsWith("image/")) {
				imageItem = item;
				break;
			}
		}

		// If no image is present, allow native text paste to proceed without interruption
		if (!imageItem) return;

		const file = imageItem.getAsFile();
		if (!file) return;

		// Prevent browser from doing default file navigation
		e.preventDefault();

		if (file.size > maxBytes) {
			const msg = `Изображение из буфера обмена (${(file.size / (1024 * 1024)).toFixed(1)} МБ) превышает лимит 25 МБ.`;
			playTactileEarcon("warning");
			if (options.onError) {
				options.onError(msg);
			}
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const rawDataUrl = reader.result as string;
			if (!rawDataUrl) return;

			// Extract image dimensions and attempt WebP compression
			const img = new Image();
			img.onload = () => {
				let finalDataUrl = rawDataUrl;
				let finalType = file.type;

				try {
					const canvas = document.createElement("canvas");
					canvas.width = img.width;
					canvas.height = img.height;
					const ctx = canvas.getContext("2d");
					if (ctx) {
						ctx.drawImage(img, 0, 0);
						const webpUrl = canvas.toDataURL("image/webp", 0.92);
						if (webpUrl && webpUrl.startsWith("data:image/webp")) {
							finalDataUrl = webpUrl;
							finalType = "image/webp";
						}
					}
				} catch {
					// Fallback to original DataURL
				}

				const detail: PastedImageDetail = {
					id: `clipboard-img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
					dataUrl: finalDataUrl,
					blob: file,
					name: file.name || `Снимок_буфера_${new Date().toISOString().slice(0, 10)}.png`,
					size: file.size,
					type: finalType,
					width: img.width || 800,
					height: img.height || 600,
					timestamp: Date.now(),
				};

				playTactileEarcon("save");

				// Dispatch global DOM custom event
				window.dispatchEvent(
					new CustomEvent<PastedImageDetail>("dente:clipboard-image-pasted", {
						detail,
						bubbles: true,
					}),
				);

				if (options.onPaste) {
					options.onPaste(detail);
				}
			};

			img.onerror = () => {
				const detail: PastedImageDetail = {
					id: `clipboard-img-${Date.now()}`,
					dataUrl: rawDataUrl,
					blob: file,
					name: file.name || "Снимок_буфера.png",
					size: file.size,
					type: file.type,
					width: 800,
					height: 600,
					timestamp: Date.now(),
				};
				playTactileEarcon("save");
				window.dispatchEvent(
					new CustomEvent<PastedImageDetail>("dente:clipboard-image-pasted", {
						detail,
						bubbles: true,
					}),
				);
				if (options.onPaste) options.onPaste(detail);
			};

			img.src = rawDataUrl;
		};

		reader.readAsDataURL(file);
	};

	window.addEventListener("paste", handlePaste);
	return () => {
		window.removeEventListener("paste", handlePaste);
	};
}

// ============================================================================
// 2. HARDWARE BARCODE & DATAMATRIX SNIFFER ("Честный Знак" Protection)
// ============================================================================

export type BarcodeKind = "datamatrix" | "ean13" | "ean8" | "code128" | "unknown";

export interface ScannedBarcodeDetail {
	readonly code: string;
	readonly type: BarcodeKind;
	readonly raw: string;
	readonly timestamp: number;
}

export interface BarcodeSnifferOptions {
	onScan?: (detail: ScannedBarcodeDetail) => void;
	/** Maximum milliseconds between keystrokes to consider them hardware scanner output (default: 38ms) */
	intervalThresholdMs?: number;
	/** Minimum characters in code (default: 4) */
	minLength?: number;
}

/**
 * Classifies barcode string by medical/retail standards.
 */
export function classifyBarcode(raw: string): BarcodeKind {
	const code = raw.trim();
	// Честный Знак / GS1 DataMatrix: Starts with Application Identifier 01 (GTIN) and length >= 20
	// or contains GS1 separator ASCII 29 (\u001d)
	if ((code.startsWith("01") && code.length >= 20) || code.includes("\u001d") || (code.length >= 29 && /\d{14}/.test(code))) {
		return "datamatrix";
	}
	if (/^\d{13}$/.test(code)) return "ean13";
	if (/^\d{8}$/.test(code)) return "ean8";
	if (code.length >= 4) return "code128";
	return "unknown";
}

/**
 * Hardware Barcode & DataMatrix Sniffer.
 * USB 2D scanners emulate keyboards and dump characters at < 35ms intervals ending with Enter.
 * When detected:
 * 1. Suppresses input pollution in active diary/complaints text fields (preventDefault).
 * 2. Cleans up any 1-2 leaked characters from the active input.
 * 3. Dispatches clean "dente:barcode-scanned" event.
 * 4. Plays procedural laser earcon.
 */
export function setupHardwareBarcodeSniffer(options: BarcodeSnifferOptions = {}): () => void {
	if (typeof window === "undefined") return () => {};

	const threshold = options.intervalThresholdMs ?? 38;
	const minLength = options.minLength ?? 4;

	let buffer = "";
	let lastCharTime = 0;
	let streak = 0;
	let isScannerBurst = false;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const resetState = () => {
		buffer = "";
		streak = 0;
		isScannerBurst = false;
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};

	const emitBarcode = (scannedCode: string) => {
		const cleanCode = scannedCode.trim();
		if (cleanCode.length < minLength) {
			resetState();
			return;
		}

		const type = classifyBarcode(cleanCode);
		const detail: ScannedBarcodeDetail = {
			code: cleanCode,
			type,
			raw: scannedCode,
			timestamp: Date.now(),
		};

		playTactileEarcon("scan");

		window.dispatchEvent(
			new CustomEvent<ScannedBarcodeDetail>("dente:barcode-scanned", {
				detail,
				bubbles: true,
			}),
		);

		if (options.onScan) {
			options.onScan(detail);
		}

		resetState();
	};

	const handleKeyDown = (e: KeyboardEvent): void => {
		if (e.repeat) return;
		if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) return;

		const now = performance.now();
		const delta = now - lastCharTime;
		lastCharTime = now;

		if (e.key === "Enter") {
			if (isScannerBurst && buffer.length >= minLength) {
				e.preventDefault();
				e.stopPropagation();
				emitBarcode(buffer);
				return;
			}
			resetState();
			return;
		}

		if (delta <= threshold) {
			streak++;
			buffer += e.key;

			if (streak >= 3) {
				isScannerBurst = true;
				e.preventDefault();
				e.stopPropagation();

				const active = document.activeElement;
				if (
					streak === 3 &&
					active &&
					(active.tagName === "INPUT" || active.tagName === "TEXTAREA")
				) {
					const inputEl = active as HTMLInputElement | HTMLTextAreaElement;
					const leakedChars = buffer.slice(0, 2);
					if (inputEl.value && inputEl.value.endsWith(leakedChars)) {
						inputEl.value = inputEl.value.slice(0, -leakedChars.length);
						inputEl.dispatchEvent(new Event("input", { bubbles: true }));
					}
				}
			}
		} else {
			if (streak < 3) {
				buffer = e.key;
				streak = 1;
				isScannerBurst = false;
			} else {
				if (buffer.length >= minLength) {
					emitBarcode(buffer);
				}
				resetState();
				buffer = e.key;
				streak = 1;
			}
		}

		if (timeoutId) clearTimeout(timeoutId);
		if (isScannerBurst) {
			timeoutId = setTimeout(() => {
				if (buffer.length >= minLength) {
					emitBarcode(buffer);
				} else {
					resetState();
				}
			}, 75);
		}
	};

	window.addEventListener("keydown", handleKeyDown, { capture: true });
	return () => {
		window.removeEventListener("keydown", handleKeyDown, { capture: true });
		if (timeoutId) clearTimeout(timeoutId);
	};
}
