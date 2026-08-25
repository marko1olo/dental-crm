/**
 * DENTE CRM — Universal USB HID 2D Barcode & GS1 DataMatrix Scanner Service
 *
 * Provides industrial-grade global hardware barcode interception:
 * 1. Global window keydown listener without requiring active input focus.
 * 2. High-speed burst detection (< 30-35ms inter-key delay threshold).
 * 3. Structured parsing for:
 *    - GS1 DataMatrix (Честный ЗНАК / МДЛП / 86-ФЗ: GTIN, Serial, Crypto, Expiration)
 *    - SanPiN 3.3686-21 Autoclave sterilization package barcodes (SANPIN-*, KB-*)
 *    - Dental Lab work orders (LAB-*, ORD-*)
 *    - Medical Waste tracking barcodes (WASTE-*, CLASS_B-*)
 *    - Standard 1D EAN-13 / Code-128 codes
 * 4. Active input protection: intercepts scanner bursts without typing garbage into form inputs.
 * 5. Native haptic and audio feedback triggers on successful scans.
 */

import {
	parseGs1DataMatrix as parseGs1DataMatrixFn,
	triggerHaptic,
	type ParsedGs1DataMatrix,
} from "../../native/mobileBridge";

export const parseGs1DataMatrix = parseGs1DataMatrixFn;
export type { ParsedGs1DataMatrix };


export type BarcodeClassification =
	| "gs1_datamatrix"
	| "sanpin_sterilization"
	| "lab_order"
	| "medical_waste"
	| "ean13"
	| "code128"
	| "raw";

export interface ParsedSanpinSterilizationBarcode {
	readonly batchId?: string | undefined;
	readonly autoclaveId?: string | undefined;
	readonly cycleNumber?: number | undefined;
	readonly packDate?: string | undefined;
	readonly expDate?: string | undefined;
	readonly operatorId?: string | undefined;
	readonly toolSetId?: string | undefined;
	readonly serialNumber?: number | undefined;
	readonly isExpired?: boolean | undefined;
}

export interface ParsedLabOrderBarcode {
	readonly orderNumber: string;
	readonly labId?: string | undefined;
	readonly patientId?: string | undefined;
}

export interface ParsedMedicalWasteBarcode {
	readonly wasteClass: "A" | "B" | "V" | "G";
	readonly bagSerialNumber: string;
	readonly weightKg?: number | undefined;
	readonly departmentCode?: string | undefined;
}

export interface UniversalBarcodeData {
	readonly rawCode: string;
	readonly classification: BarcodeClassification;
	readonly isValid: boolean;
	readonly gs1?: ParsedGs1DataMatrix | undefined;
	readonly sanpin?: ParsedSanpinSterilizationBarcode | undefined;
	readonly labOrder?: ParsedLabOrderBarcode | undefined;
	readonly medicalWaste?: ParsedMedicalWasteBarcode | undefined;
	readonly ean13ChecksumValid?: boolean | undefined;
}

export interface UsbBarcodeScanEvent {
	readonly rawCode: string;
	readonly data: UniversalBarcodeData;
	readonly timestamp: number;
	readonly durationMs: number;
	readonly charCount: number;
	readonly source: "usb_hid_scanner" | "emulated_scan";
}

export interface UsbBarcodeScannerConfig {
	/** Max milliseconds between consecutive keystrokes to be considered hardware scanner burst (default: 35ms) */
	readonly maxInterKeyDelayMs: number;
	/** Minimum barcode character length (default: 3) */
	readonly minBarcodeLength: number;
	/** Whether to preventDefault and stopPropagation on Enter/Tab terminator when hardware scan is recognized (default: true) */
	readonly preventDefaultOnScan: boolean;
	/** Whether to clear focused input value if hardware scanner typed into an active input (default: true) */
	readonly protectActiveInput: boolean;
	/** Whether to trigger tactile haptic feedback on scan (default: true) */
	readonly enableHaptic: boolean;
	/** Debounce threshold in milliseconds to prevent double-scanning the same code (default: 300ms) */
	readonly debounceMs: number;
}

export const DEFAULT_SCANNER_CONFIG: UsbBarcodeScannerConfig = {
	maxInterKeyDelayMs: 35,
	minBarcodeLength: 3,
	preventDefaultOnScan: true,
	protectActiveInput: true,
	enableHaptic: true,
	debounceMs: 300,
};

/**
 * Validates EAN-13 check digit algorithm.
 */
export function validateEan13Checksum(code: string): boolean {
	if (!code || !/^\d{13}$/.test(code.trim())) {
		return false;
	}
	const digits = code.trim().split("").map((d) => Number.parseInt(d, 10));
	let sum = 0;
	for (let i = 0; i < 12; i++) {
		sum += (digits[i] ?? 0) * (i % 2 === 0 ? 1 : 3);
	}
	const checksum = (10 - (sum % 10)) % 10;
	return digits[12] === checksum;
}

/**
 * Parses SanPiN 3.3686-21 sterilization package barcode string.
 * Supports structured format: BATCH#SERIAL|AUTOCLAVE|CYC{N}|PACK_DATE|EXP_DATE|OPERATOR|TOOLSET
 * and standard 1D format: SANPIN-MELAG01-042-20260822-001 or KB{BATCH}{SERIAL}
 */
export function parseSanpinBarcode(rawCode: string): ParsedSanpinSterilizationBarcode | null {
	if (!rawCode || typeof rawCode !== "string") return null;
	const clean = rawCode.trim();

	// Format 1: 2D DataMatrix pipe-delimited payload
	if (clean.includes("|") && (clean.includes("CYC") || clean.includes("MELAG") || clean.includes("CSO"))) {
		const parts = clean.split("|");
		const batchAndSerial = parts[0] || "";
		let batchId = batchAndSerial;
		let serialNumber: number | undefined;
		if (batchAndSerial.includes("#")) {
			const [bId, sNum] = batchAndSerial.split("#");
			batchId = bId || "";
			serialNumber = sNum ? Number.parseInt(sNum, 10) : undefined;
		}

		const autoclaveId = parts[1] || "";
		const cycPart = parts[2] || "";
		const cycleMatch = cycPart.match(/CYC(\d+)/i);
		const cycleNumber = cycleMatch ? Number.parseInt(cycleMatch[1] ?? "0", 10) : undefined;
		const packDate = parts[3] || undefined;
		const expDate = parts[4] || undefined;
		const operatorId = parts[5] || undefined;
		const toolSetId = parts[6] || undefined;

		let isExpired = false;
		if (expDate) {
			const expTime = new Date(expDate).getTime();
			if (!Number.isNaN(expTime)) {
				isExpired = Date.now() > expTime;
			}
		}

		return {
			batchId,
			autoclaveId,
			cycleNumber,
			packDate,
			expDate,
			operatorId,
			toolSetId,
			serialNumber,
			isExpired,
		};
	}

	// Format 2: 1D Barcode SANPIN-AUTOCLAVE-CYC-DATE-SERIAL
	if (clean.startsWith("SANPIN-") || clean.startsWith("SAN-")) {
		const parts = clean.split("-");
		if (parts.length >= 4) {
			const autoclaveId = parts[1] || "";
			const cycleNumber = Number.parseInt(parts[2] || "0", 10);
			const packDate = parts[3] || "";
			const serialNumber = parts[4] ? Number.parseInt(parts[4], 10) : undefined;
			return {
				batchId: clean,
				autoclaveId,
				cycleNumber,
				packDate,
				serialNumber,
			};
		}
	}

	// Format 3: Kraft 1D prefix KB{BATCH}{SERIAL}
	if (clean.startsWith("KB") && clean.length >= 8) {
		const serialStr = clean.slice(-4);
		const batchPart = clean.slice(2, -4);
		return {
			batchId: `BATCH-${batchPart}`,
			serialNumber: Number.parseInt(serialStr, 10) || undefined,
		};
	}

	return null;
}

/**
 * Parses Dental Lab Work Order barcode string (LAB-*, ORD-*, DL-*).
 */
export function parseLabOrderBarcode(rawCode: string): ParsedLabOrderBarcode | null {
	if (!rawCode || typeof rawCode !== "string") return null;
	const clean = rawCode.trim();

	if (/^(?:LAB|ORD|DL|DENTLAB)[-_#]/i.test(clean)) {
		const parts = clean.split(/[-_#]/);
		return {
			orderNumber: clean,
			labId: parts[1] ? `LAB-${parts[1]}` : undefined,
			patientId: parts[2] ? `PAT-${parts[2]}` : undefined,
		};
	}

	return null;
}

/**
 * Parses SanPiN Medical Waste barcode string (WASTE-B-*, CLASS_B-*, MOW-*).
 */
export function parseMedicalWasteBarcode(rawCode: string): ParsedMedicalWasteBarcode | null {
	if (!rawCode || typeof rawCode !== "string") return null;
	const clean = rawCode.trim();

	const wasteMatch = clean.match(/^(?:WASTE|MEDWASTE|CLASS|MOW)[-_]([ABVGАБВГ])[-_]([A-Za-z0-9]+)(?:[-_](\d+(?:\.\d+)?))?/i);
	if (wasteMatch) {
		const rawClass = (wasteMatch[1] || "B").toUpperCase();
		let wasteClass: "A" | "B" | "V" | "G" = "B";
		if (rawClass === "A" || rawClass === "А") wasteClass = "A";
		else if (rawClass === "B" || rawClass === "Б") wasteClass = "B";
		else if (rawClass === "V" || rawClass === "В") wasteClass = "V";
		else if (rawClass === "G" || rawClass === "Г") wasteClass = "G";

		const bagSerialNumber = wasteMatch[2] || clean;
		const weightKg = wasteMatch[3] ? Number.parseFloat(wasteMatch[3]) : undefined;

		return {
			wasteClass,
			bagSerialNumber,
			weightKg,
		};
	}

	return null;
}

/**
 * Universal classifier and parser for all dental CRM barcodes.
 */
export function parseUniversalBarcode(rawCode: string): UniversalBarcodeData {
	if (!rawCode || typeof rawCode !== "string") {
		return {
			rawCode: rawCode || "",
			classification: "raw",
			isValid: false,
		};
	}

	const cleaned = rawCode.trim();

	// 1. GS1 DataMatrix (Chestny ZNAK / MDLP)
	const gs1 = parseGs1DataMatrix(cleaned);
	if (gs1.isValidMdlp) {
		return {
			rawCode: cleaned,
			classification: "gs1_datamatrix",
			isValid: true,
			gs1,
		};
	}

	// 2. SanPiN Sterilization Package Barcode
	const sanpin = parseSanpinBarcode(cleaned);
	if (sanpin) {
		return {
			rawCode: cleaned,
			classification: "sanpin_sterilization",
			isValid: true,
			sanpin,
		};
	}

	// 3. Dental Lab Order Barcode
	const labOrder = parseLabOrderBarcode(cleaned);
	if (labOrder) {
		return {
			rawCode: cleaned,
			classification: "lab_order",
			isValid: true,
			labOrder,
		};
	}

	// 4. SanPiN Medical Waste Barcode
	const medicalWaste = parseMedicalWasteBarcode(cleaned);
	if (medicalWaste) {
		return {
			rawCode: cleaned,
			classification: "medical_waste",
			isValid: true,
			medicalWaste,
		};
	}

	// 5. 1D EAN-13 Barcode
	if (/^\d{13}$/.test(cleaned)) {
		const validEan = validateEan13Checksum(cleaned);
		return {
			rawCode: cleaned,
			classification: "ean13",
			isValid: validEan,
			ean13ChecksumValid: validEan,
		};
	}

	// 6. Generic 1D Code-128
	if (/^[A-Za-z0-9_.\-#/+=]{3,64}$/.test(cleaned)) {
		return {
			rawCode: cleaned,
			classification: "code128",
			isValid: true,
		};
	}

	return {
		rawCode: cleaned,
		classification: "raw",
		isValid: cleaned.length >= 3,
	};
}

/**
 * Checks if a sequence of keystrokes matches a hardware scanner burst (< threshold ms).
 */
export function isHardwareScanBurst(
	keystrokes: Array<{ key: string; timestamp: number }>,
	maxInterKeyDelayMs = 35,
	minBarcodeLength = 3,
): boolean {
	if (!keystrokes || keystrokes.length < minBarcodeLength) {
		return false;
	}

	for (let i = 1; i < keystrokes.length; i++) {
		const curr = keystrokes[i];
		const prev = keystrokes[i - 1];
		if (!curr || !prev) continue;
		if (curr.timestamp - prev.timestamp > maxInterKeyDelayMs) {
			return false;
		}
	}

	return true;
}

export type BarcodeScanSubscriber = (event: UsbBarcodeScanEvent) => void;

/**
 * Industrial USB HID Barcode & 2D DataMatrix Scanner Manager.
 */
export class UsbBarcodeScanner {
	private config: UsbBarcodeScannerConfig;
	private buffer: Array<{ key: string; timestamp: number }> = [];
	private subscribers: Set<BarcodeScanSubscriber> = new Set();
	private isListening = false;
	private lastScannedCode = "";
	private lastScanTimestamp = 0;
	private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
	private targetWindow: Window | null = null;

	constructor(config: Partial<UsbBarcodeScannerConfig> = {}) {
		this.config = { ...DEFAULT_SCANNER_CONFIG, ...config };
	}

	/**
	 * Starts listening for global keyboard scanner events on the window.
	 */
	public start(win: Window | typeof globalThis = typeof window !== "undefined" ? window : (globalThis as unknown as Window)): void {
		if (this.isListening || !win) return;
		this.targetWindow = win as Window;
		this.buffer = [];
		this.isListening = true;

		this.boundKeydownHandler = (event: KeyboardEvent) => this.handleGlobalKeyDown(event);
		if (this.targetWindow.addEventListener) {
			this.targetWindow.addEventListener("keydown", this.boundKeydownHandler, true);
		}
	}

	/**
	 * Stops listening and clears the buffer.
	 */
	public stop(): void {
		if (!this.isListening) return;
		if (this.targetWindow?.removeEventListener && this.boundKeydownHandler) {
			this.targetWindow.removeEventListener("keydown", this.boundKeydownHandler, true);
		}
		this.isListening = false;
		this.boundKeydownHandler = null;
		this.buffer = [];
	}

	public destroy(): void {
		this.stop();
		this.subscribers.clear();
	}

	/**
	 * Subscribes a listener to scanner events.
	 */
	public onScan(callback: BarcodeScanSubscriber): () => void {
		this.subscribers.add(callback);
		return () => {
			this.subscribers.delete(callback);
		};
	}

	/**
	 * Feeds an individual key event into the scanner burst detector.
	 * Returns UsbBarcodeScanEvent if a complete hardware scan was completed on Enter/Tab.
	 */
	public processKey(key: string, timestamp = Date.now()): UsbBarcodeScanEvent | null {
		if (key === "Enter" || key === "Tab") {
			if (isHardwareScanBurst(this.buffer, this.config.maxInterKeyDelayMs, this.config.minBarcodeLength)) {
				const rawCode = this.buffer.map((b) => b.key).join("");
				const first = this.buffer[0];
				const last = this.buffer[this.buffer.length - 1];
				const durationMs = first && last && this.buffer.length > 1 ? last.timestamp - first.timestamp : 0;

				this.buffer = [];

				// Check debounce threshold
				if (
					rawCode === this.lastScannedCode &&
					timestamp - this.lastScanTimestamp < this.config.debounceMs
				) {
					return null;
				}

				this.lastScannedCode = rawCode;
				this.lastScanTimestamp = timestamp;

				const parsedData = parseUniversalBarcode(rawCode);
				const scanEvent: UsbBarcodeScanEvent = {
					rawCode,
					data: parsedData,
					timestamp,
					durationMs,
					charCount: rawCode.length,
					source: "usb_hid_scanner",
				};

				if (this.config.enableHaptic) {
					triggerHaptic(parsedData.isValid ? "success" : "warning");
				}

				this.emitScan(scanEvent);
				return scanEvent;
			}

			// Not a rapid scan burst -> reset buffer
			this.buffer = [];
			return null;
		}

		// Collect printable characters
		if (key.length === 1) {
			if (this.buffer.length > 0) {
				const last = this.buffer[this.buffer.length - 1];
				if (last && timestamp - last.timestamp > this.config.maxInterKeyDelayMs) {
					// Typing too slow (human) -> reset buffer to start fresh from current key
					this.buffer = [];
				}
			}
			this.buffer.push({ key, timestamp });
		}

		return null;
	}

	/**
	 * Emulates a scan programmatically (e.g. for testing or software 2D camera scanner).
	 */
	public simulateScan(rawBarcode: string): UsbBarcodeScanEvent {
		const parsedData = parseUniversalBarcode(rawBarcode);
		const scanEvent: UsbBarcodeScanEvent = {
			rawCode: rawBarcode,
			data: parsedData,
			timestamp: Date.now(),
			durationMs: 15,
			charCount: rawBarcode.length,
			source: "emulated_scan",
		};

		if (this.config.enableHaptic) {
			triggerHaptic(parsedData.isValid ? "success" : "warning");
		}

		this.emitScan(scanEvent);
		return scanEvent;
	}

	public getBuffer(): ReadonlyArray<{ key: string; timestamp: number }> {
		return [...this.buffer];
	}

	public isRunning(): boolean {
		return this.isListening;
	}

	private handleGlobalKeyDown(event: KeyboardEvent): void {
		if (!this.isListening) return;

		const activeElement = typeof document !== "undefined" ? document.activeElement : null;
		const isInputActive =
			activeElement instanceof HTMLInputElement ||
			activeElement instanceof HTMLTextAreaElement;

		const result = this.processKey(event.key, Date.now());

		if (result) {
			if (this.config.preventDefaultOnScan && typeof event.preventDefault === "function") {
				event.preventDefault();
				event.stopPropagation();
			}

			// Clean up focused input if scanner typed into it
			if (isInputActive && this.config.protectActiveInput && activeElement) {
				try {
					const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
					if (input.value && input.value.includes(result.rawCode)) {
						input.value = input.value.replace(result.rawCode, "").trim();
						input.dispatchEvent(new Event("input", { bubbles: true }));
					}
				} catch {
					// Ignore DOM exceptions in headless environments
				}
			}
		}
	}

	private emitScan(event: UsbBarcodeScanEvent): void {
		for (const subscriber of this.subscribers) {
			try {
				subscriber(event);
			} catch (err) {
				console.error("[UsbBarcodeScanner] Error in scan subscriber:", err);
			}
		}
	}
}

// Global Singleton Instance
let globalScannerInstance: UsbBarcodeScanner | null = null;

export function getGlobalUsbBarcodeScanner(config?: Partial<UsbBarcodeScannerConfig>): UsbBarcodeScanner {
	if (!globalScannerInstance) {
		globalScannerInstance = new UsbBarcodeScanner(config);
		if (typeof window !== "undefined") {
			globalScannerInstance.start(window);
		}
	}
	return globalScannerInstance;
}

export function subscribeUsbBarcodeScanner(
	callback: BarcodeScanSubscriber,
	options: Partial<UsbBarcodeScannerConfig> = {},
): () => void {
	const scanner = getGlobalUsbBarcodeScanner(options);
	if (!scanner.isRunning() && typeof window !== "undefined") {
		scanner.start(window);
	}
	return scanner.onScan(callback);
}

export function createUsbBarcodeScanner(config: Partial<UsbBarcodeScannerConfig> = {}): UsbBarcodeScanner {
	return new UsbBarcodeScanner(config);
}
