/**
 * hardwareScannerEngine.ts — Central Hardware & Peripherals Coordinator:
 * Coordinates WebRTC 60 FPS camera stream, ML Kit native mobile bridge,
 * USB HID burst scanner, Web Serial / WebUSB peripherals, and SanPiN 3.3686-21 verification.
 */

import {
	classifyBarcodeScan,
	type BarcodeFormat,
	type CameraScanOptions,
	type HardwareScanResult,
	type KraftPackageVerificationVerdict,
} from "@dental/shared";
import {
	isMobileApp,
	getMobileNativeApi,
	triggerHaptic,
	playClinicalAudioFeedback,
	parseGs1DataMatrix,
} from "../../../native/mobileBridge.js";
import { parseSanpinBarcode, parseUniversalBarcode } from "../usbBarcodeScanner.js";
import { clinicalProceduralAudio } from "../../audio/clinicalProceduralAudio.js";
import type {
	DeviceScanOptions,
	HardwareDevice,
	HardwareScannerErrorSubscriber,
	HardwareScannerState,
	HardwareScannerSubscriber,
} from "./types.js";
import {
	getAvailableSerialPorts,
	isWebSerialSupported,
	subscribeSerialPortEvents,
} from "./serialPortScanner.js";
import {
	getAvailableUsbDevices,
	isWebUsbSupported,
	subscribeUsbDeviceEvents,
} from "./usbDeviceScanner.js";
import { scanLocalNetworkDevices } from "./networkDeviceScanner.js";
import { verifyKraftPackageBarcode } from "./sanpinPackageVerifier.js";
import {
	classifyCameraErrorCode,
	classifyCameraErrorMessage,
	mapBarcodeDetectorFormat,
	scanImageDataFallback,
} from "./cameraErrorClassifier.js";

export class HardwareScanner {
	private state: HardwareScannerState = "idle";
	private activeMediaStream: MediaStream | null = null;
	private activeVideoElement: HTMLVideoElement | null = null;
	private animationFrameId: number | null = null;
	private subscribers = new Set<HardwareScannerSubscriber>();
	private errorSubscribers = new Set<HardwareScannerErrorSubscriber>();
	private lastScannedCode = "";
	private lastScanTimestamp = 0;
	private debounceMs = 400;
	private torchEnabled = false;
	private barcodeDetectorInstance: unknown = null;

	// Peripherals registry & cleanup handles
	private discoveredDevices: HardwareDevice[] = [];
	private cleanupCallbacks: Array<() => void> = [];

	constructor() {
		this.initDetectorIfAvailable();
		if (typeof window !== "undefined") {
			const onNativeBarcode = (event: Event) => {
				const customEv = event as CustomEvent<{ barcode: string; format?: string }>;
				if (customEv.detail?.barcode) {
					this.handleScannedCode(customEv.detail.barcode, customEv.detail.format as BarcodeFormat, "camera_mlkit_native");
				}
			};

			const onUsbBarcode = (event: Event) => {
				const customEv = event as CustomEvent<{ code?: string; rawCode?: string; format?: string }>;
				const code = customEv.detail?.rawCode || customEv.detail?.code;
				if (code) {
					this.handleScannedCode(code, customEv.detail?.format as BarcodeFormat, "usb_hid_keyboard");
				}
			};

			const onGenericBarcode = (event: Event) => {
				const customEv = event as CustomEvent<{ code?: string; rawCode?: string; format?: string; source?: string }>;
				const code = customEv.detail?.rawCode || customEv.detail?.code;
				if (code) {
					const source = customEv.detail?.source === "usb_hid_scanner" ? "usb_hid_keyboard" : "camera_mlkit_native";
					this.handleScannedCode(code, customEv.detail?.format as BarcodeFormat, source);
				}
			};

			window.addEventListener("NATIVE_BARCODE_SCANNED", onNativeBarcode);
			window.addEventListener("dente:usb-barcode-scanned", onUsbBarcode);
			window.addEventListener("dente:barcode-scanned", onGenericBarcode);

			this.cleanupCallbacks.push(() => {
				window.removeEventListener("NATIVE_BARCODE_SCANNED", onNativeBarcode);
				window.removeEventListener("dente:usb-barcode-scanned", onUsbBarcode);
				window.removeEventListener("dente:barcode-scanned", onGenericBarcode);
			});

			// Subscribe to Web Serial & WebUSB lifecycle events
			if (isWebSerialSupported()) {
				const unsubSerial = subscribeSerialPortEvents(
					(dev) => this.registerDevice(dev),
					() => this.scanSerialDevices(),
				);
				this.cleanupCallbacks.push(unsubSerial);
			}

			if (isWebUsbSupported()) {
				const unsubUsb = subscribeUsbDeviceEvents(
					(dev) => this.registerDevice(dev),
					() => this.scanUsbDevices(),
				);
				this.cleanupCallbacks.push(unsubUsb);
			}
		}
	}

	public handleScannedCode(
		rawCode: string,
		format?: BarcodeFormat,
		source: "camera_webrtc" | "camera_mlkit_native" | "usb_hid_keyboard" | "manual_input" = "camera_mlkit_native",
	): void {
		const clean = rawCode.trim();
		if (!clean) return;
		const now = Date.now();
		if (clean === this.lastScannedCode && now - this.lastScanTimestamp < this.debounceMs) {
			return;
		}
		this.lastScannedCode = clean;
		this.lastScanTimestamp = now;

		triggerHaptic("success");
		void clinicalProceduralAudio.playScannerBeep();
		playClinicalAudioFeedback("scan_success");

		this.emitScan({
			success: true,
			rawCode: clean,
			format: format ?? "unknown",
			timestamp: now,
			source,
			durationMs: 0,
		});
	}

	private async initDetectorIfAvailable(): Promise<void> {
		if (typeof window !== "undefined" && window.BarcodeDetector) {
			try {
				let supportedFormats = [
					"data_matrix",
					"qr_code",
					"code_128",
					"ean_13",
					"ean_8",
					"code_39",
					"upc_a",
				];
				if (typeof window.BarcodeDetector.getSupportedFormats === "function") {
					try {
						const available = await window.BarcodeDetector.getSupportedFormats();
						if (Array.isArray(available) && available.length > 0) {
							supportedFormats = supportedFormats.filter((f) => available.includes(f));
						}
					} catch (formatErr: unknown) {
						console.warn("[HardwareScanner] BarcodeDetector.getSupportedFormats failed:", formatErr);
					}
				}
				this.barcodeDetectorInstance = new window.BarcodeDetector({
					formats: supportedFormats.length > 0 ? supportedFormats : ["qr_code", "data_matrix", "code_128"],
				});
			} catch (err) {
				console.warn("[HardwareScanner] BarcodeDetector init fallback:", err);
			}
		}
	}

	public isCapacitorNative(): boolean {
		return isMobileApp();
	}

	public async isCameraAvailable(): Promise<boolean> {
		if (this.isCapacitorNative()) {
			return true;
		}
		if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
			return false;
		}
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			return devices.some((d) => d.kind === "videoinput");
		} catch {
			return false;
		}
	}

	/**
	 * Enumerates all available video input devices (front/rear cameras, external USB scanners).
	 */
	public async getCameraDevices(): Promise<MediaDeviceInfo[]> {
		if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
			return [];
		}
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			return devices.filter((d) => d.kind === "videoinput");
		} catch {
			return [];
		}
	}

	public getState(): HardwareScannerState {
		return this.state;
	}

	public subscribe(callback: HardwareScannerSubscriber): () => void {
		this.subscribers.add(callback);
		return () => {
			this.subscribers.delete(callback);
		};
	}

	public onError(callback: HardwareScannerErrorSubscriber): () => void {
		this.errorSubscribers.add(callback);
		return () => {
			this.errorSubscribers.delete(callback);
		};
	}

	/**
	 * Starts the WebRTC camera stream on a specified <video> element.
	 * Runs progressive constraint fallback (1080p continuous -> 720p -> standard -> default).
	 * Runs a 60 FPS detection loop for 2D DataMatrix and barcodes.
	 */
	public async startCameraStream(
		videoElement: HTMLVideoElement,
		options: CameraScanOptions = {},
	): Promise<MediaStream> {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("START_NATIVE_SCAN", {
					detail: options,
				}),
			);
		}
		this.stopCameraStream();
		this.state = "starting_camera";
		this.activeVideoElement = videoElement;
		this.debounceMs = options.debounceMs ?? 400;

		const facingMode = options.facingMode ?? "environment";
		const idealFps = options.targetFps ?? 60;

		if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
			const errText = "API камеры (getUserMedia) недоступно в данном браузере или среде выполнения (требуется HTTPS).";
			this.state = "error";
			this.emitError(errText, "CAMERA_NOT_SUPPORTED");
			throw new Error(errText);
		}

		// Progressive constraint ladder to prevent OverconstrainedError on low-end cameras
		const constraintLadder: MediaStreamConstraints[] = [
			// Tier 1: Continuous autofocus + High-res 1080p @ 60 FPS (Clinical Ideal)
			{
				audio: false,
				video: {
					facingMode: { ideal: facingMode },
					width: { ideal: 1920, min: 640 },
					height: { ideal: 1080, min: 480 },
					frameRate: { ideal: idealFps, min: 24 },
					// @ts-expect-error advanced continuous focus constraint on mobile Chrome
					advanced: [{ focusMode: "continuous" }],
				},
			},
			// Tier 2: 720p @ 30 FPS
			{
				audio: false,
				video: {
					facingMode: { ideal: facingMode },
					width: { ideal: 1280, min: 640 },
					height: { ideal: 720, min: 480 },
					frameRate: { ideal: 30 },
				},
			},
			// Tier 3: Standard facingMode
			{
				audio: false,
				video: {
					facingMode: { ideal: facingMode },
				},
			},
			// Tier 4: Basic video fallback
			{
				audio: false,
				video: true,
			},
		];

		let stream: MediaStream | null = null;
		let lastError: unknown = null;

		for (const constraints of constraintLadder) {
			try {
				stream = await navigator.mediaDevices.getUserMedia(constraints);
				if (stream) break;
			} catch (err: unknown) {
				lastError = err;
				// If user explicitly denied permission or security blocked, do not retry ladder
				const errName = (err as { name?: string })?.name || "";
				if (errName === "NotAllowedError" || errName === "PermissionDeniedError" || errName === "SecurityError") {
					break;
				}
			}
		}

		if (!stream) {
			this.state = "error";
			const code = classifyCameraErrorCode(lastError);
			const errorMsg = classifyCameraErrorMessage(lastError);
			this.emitError(errorMsg, code);
			throw new Error(errorMsg);
		}

		try {
			this.activeMediaStream = stream;
			videoElement.srcObject = stream;
			videoElement.setAttribute("playsinline", "true");
			videoElement.muted = true;

			await videoElement.play();
			this.state = "scanning";

			// Apply torch if requested and supported
			if (options.torch) {
				await this.setTorch(true);
			}

			this.startDetectionLoop(videoElement);
			return stream;
		} catch (playErr: unknown) {
			this.state = "error";
			if (stream) {
				for (const track of stream.getTracks()) {
					try {
						track.stop();
					} catch (trackErr: unknown) {
						console.warn("[HardwareScanner] track.stop error:", trackErr);
					}
				}
			}
			this.activeMediaStream = null;
			if (videoElement) {
				try {
					videoElement.srcObject = null;
				} catch (elemErr: unknown) {
					console.warn("[HardwareScanner] videoElement.srcObject clear error:", elemErr);
				}
			}
			const code = classifyCameraErrorCode(playErr);
			const errorMsg = classifyCameraErrorMessage(playErr);
			this.emitError(errorMsg, code);
			throw new Error(errorMsg);
		}
	}

	/**
	 * Stops the active camera stream and cancels detection loops.
	 */
	public stopCameraStream(): void {
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("STOP_NATIVE_SCAN"));
		}
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.activeMediaStream) {
			for (const track of this.activeMediaStream.getTracks()) {
				try {
					track.stop();
				} catch (trackErr: unknown) {
					console.warn("[HardwareScanner] activeMediaStream track.stop error:", trackErr);
				}
			}
			this.activeMediaStream = null;
		}

		if (this.activeVideoElement) {
			try {
				this.activeVideoElement.srcObject = null;
			} catch (elemErr: unknown) {
				console.warn("[HardwareScanner] activeVideoElement.srcObject clear error:", elemErr);
			}
			this.activeVideoElement = null;
		}

		this.torchEnabled = false;
		this.state = "idle";
	}

	/**
	 * Continuous 60 FPS detection loop using BarcodeDetector or Canvas analysis.
	 */
	private startDetectionLoop(video: HTMLVideoElement): void {
		let isProcessingFrame = false;
		let canvas: HTMLCanvasElement | null = null;
		let ctx: CanvasRenderingContext2D | null = null;

		const detectFrame = async () => {
			if (this.state !== "scanning" || !this.activeMediaStream) {
				return;
			}

			if (!isProcessingFrame && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
				isProcessingFrame = true;
				const startTs = performance.now();

				try {
					let detectedCode: string | null = null;
					let detectedFormat: BarcodeFormat = "unknown";

					// 1. Native High-Speed BarcodeDetector API (Chrome / Edge / Android 60 FPS)
					// biome-ignore lint/suspicious/noExplicitAny: BarcodeDetector dynamic call
					if (this.barcodeDetectorInstance && typeof (this.barcodeDetectorInstance as any).detect === "function") {
						// biome-ignore lint/suspicious/noExplicitAny: BarcodeDetector result
						const barcodes: any[] = await (this.barcodeDetectorInstance as any).detect(video);
						if (barcodes && barcodes.length > 0) {
							const first = barcodes[0];
							detectedCode = first.rawValue;
							detectedFormat = mapBarcodeDetectorFormat(first.format);
						}
					} else {
						// 2. Fallback Canvas Frame Scanner
						if (!canvas) {
							canvas = document.createElement("canvas");
							ctx = canvas.getContext("2d", { willReadFrequently: true });
						}
						if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
							canvas.width = Math.min(video.videoWidth, 640);
							canvas.height = Math.min(video.videoHeight, 480);
							ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

							// In fallback canvas mode, inspect image data
							const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
							const fallbackCode = scanImageDataFallback(imageData);
							if (fallbackCode) {
								detectedCode = fallbackCode;
								detectedFormat = "data_matrix";
							}
						}
					}

					if (detectedCode && detectedCode.trim()) {
						const clean = detectedCode.trim();
						const now = Date.now();

						// Debounce rapid duplicate scans
						if (clean !== this.lastScannedCode || now - this.lastScanTimestamp > this.debounceMs) {
							this.lastScannedCode = clean;
							this.lastScanTimestamp = now;
							const durationMs = Math.round(performance.now() - startTs);

							const scanResult: HardwareScanResult = {
								success: true,
								rawCode: clean,
								format: detectedFormat,
								timestamp: now,
								source: "camera_webrtc",
								durationMs,
							};

							// Trigger audio and haptic feedback
							triggerHaptic("success");
							playClinicalAudioFeedback("scan_success");

							this.emitScan(scanResult);
						}
					}
				} catch (_frameErr) {
					// Ignore individual frame decoding errors
				} finally {
					isProcessingFrame = false;
				}
			}

			if (this.state === "scanning") {
				this.animationFrameId = requestAnimationFrame(detectFrame);
			}
		};

		this.animationFrameId = requestAnimationFrame(detectFrame);
	}

	/**
	 * Single-shot scan method for modal triggers:
	 * Uses Capacitor Native ML Kit Barcode Scanner on mobile Android/iOS,
	 * or falls back to WebRTC / manual entry dialog.
	 */
	public async scanSingleCode(): Promise<HardwareScanResult> {
		// 1. Capacitor Native Mobile Platform
		if (this.isCapacitorNative()) {
			const nativeApi = getMobileNativeApi();
			if (nativeApi?.scanBarcode) {
				try {
					const res = await nativeApi.scanBarcode();
					if (res.success && res.barcode) {
						triggerHaptic("success");
						playClinicalAudioFeedback("scan_success");

						const format: BarcodeFormat = res.format === "DATA_MATRIX"
							? "data_matrix"
							: res.format === "QR_CODE"
								? "qr_code"
								: res.format === "CODE_128"
									? "code_128"
									: res.format === "EAN_13"
										? "ean_13"
										: "data_matrix";

						const result: HardwareScanResult = {
							success: true,
							rawCode: res.barcode,
							format,
							timestamp: Date.now(),
							source: "camera_mlkit_native",
						};
						this.emitScan(result);
						return result;
					}
					if (res.cancelled) {
						return {
							success: false,
							rawCode: "",
							format: "unknown",
							timestamp: Date.now(),
							source: "camera_mlkit_native",
							error: "Сканирование отменено пользователем",
						};
					}
				} catch (nativeErr: unknown) {
					const msg = nativeErr instanceof Error ? nativeErr.message : "Ошибка нативного сканера ML Kit";
					return {
						success: false,
						rawCode: "",
						format: "unknown",
						timestamp: Date.now(),
						source: "camera_mlkit_native",
						error: msg,
					};
				}
			}
		}

		// 2. Web browser: Return failure instructing user to open camera overlay or enter code manually
		return {
			success: false,
			rawCode: "",
			format: "unknown",
			timestamp: Date.now(),
			source: "camera_webrtc",
			error: "Откройте окно видеопотока камеры или введите код крафт-пакета вручную.",
		};
	}

	/**
	 * Toggles camera torch/flashlight if supported by the active video track.
	 */
	public async setTorch(enabled: boolean): Promise<boolean> {
		if (!this.activeMediaStream) return false;
		const videoTrack = this.activeMediaStream.getVideoTracks()[0];
		if (!videoTrack) return false;

		try {
			await videoTrack.applyConstraints({
				advanced: [{ torch: enabled } as MediaTrackConstraintSet & { torch?: boolean }],
			});
			this.torchEnabled = enabled;
			return true;
		} catch {
			this.torchEnabled = false;
			return false;
		}
	}

	public isTorchOn(): boolean {
		return this.torchEnabled;
	}

	/**
	 * Verifies SanPiN 3.3686-21 sterilization package barcode:
	 * Checks integrity, autoclave cycle, packaging date, shelf life, and expiration.
	 */
	public verifyKraftPackage(rawBarcode: string): KraftPackageVerificationVerdict {
		return verifyKraftPackageBarcode(rawBarcode);
	}

	public isTorchSupported(): boolean {
		if (!this.activeMediaStream) return false;
		const videoTrack = this.activeMediaStream.getVideoTracks()[0];
		if (!videoTrack) return false;
		try {
			const capabilities =
				typeof videoTrack.getCapabilities === "function"
					? (videoTrack.getCapabilities() as Record<string, unknown>)
					: null;
			return Boolean(capabilities?.torch);
		} catch {
			return false;
		}
	}

	/**
	 * Single-shot WebRTC barcode scanner that opens camera, awaits first valid detection, and cleans up.
	 */
	public async scanSingleWebcamCode(
		videoElement: HTMLVideoElement,
		timeoutMs = 15000,
	): Promise<HardwareScanResult> {
		return new Promise<HardwareScanResult>((resolve, reject) => {
			let unsubscribe: (() => void) | null = null;
			let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

			const cleanup = () => {
				if (timeoutTimer) {
					clearTimeout(timeoutTimer);
					timeoutTimer = null;
				}
				if (unsubscribe) {
					unsubscribe();
					unsubscribe = null;
				}
				this.stopCameraStream();
			};

			unsubscribe = this.subscribe((result) => {
				cleanup();
				resolve(result);
			});

			timeoutTimer = setTimeout(() => {
				cleanup();
				resolve({
					success: false,
					rawCode: "",
					format: "unknown",
					timestamp: Date.now(),
					source: "camera_webrtc",
					error: "Таймаут сканирования камеры",
				});
			}, timeoutMs);

			this.startCameraStream(videoElement, { facingMode: "environment" }).catch((err) => {
				cleanup();
				reject(err);
			});
		});
	}

	private emitScan(result: HardwareScanResult): void {
		for (const sub of this.subscribers) {
			try {
				sub(result);
			} catch (e) {
				console.error("[HardwareScanner] Subscriber error:", e);
			}
		}
	}

	private emitError(error: string, code: string): void {
		for (const sub of this.errorSubscribers) {
			try {
				sub(error, code);
			} catch (e) {
				console.error("[HardwareScanner] Error subscriber error:", e);
			}
		}
	}

	// ---------------------------------------------------------------------------
	// Peripherals & Hardware Discovery Operations
	// ---------------------------------------------------------------------------

	public getDiscoveredDevices(): HardwareDevice[] {
		return [...this.discoveredDevices];
	}

	private registerDevice(device: HardwareDevice): void {
		const existingIndex = this.discoveredDevices.findIndex((d) => d.id === device.id);
		if (existingIndex >= 0) {
			this.discoveredDevices[existingIndex] = device;
		} else {
			this.discoveredDevices.push(device);
		}
	}

	public async scanSerialDevices(): Promise<HardwareDevice[]> {
		const devices = await getAvailableSerialPorts();
		for (const dev of devices) {
			this.registerDevice(dev);
		}
		return devices;
	}

	public async scanUsbDevices(): Promise<HardwareDevice[]> {
		const devices = await getAvailableUsbDevices();
		for (const dev of devices) {
			this.registerDevice(dev);
		}
		return devices;
	}

	public async scanNetworkDevices(options?: DeviceScanOptions): Promise<HardwareDevice[]> {
		const devices = await scanLocalNetworkDevices(options);
		for (const dev of devices) {
			this.registerDevice(dev);
		}
		return devices;
	}

	public async scanAllHardware(options?: DeviceScanOptions): Promise<HardwareDevice[]> {
		const [serial, usb, network] = await Promise.all([
			this.scanSerialDevices(),
			this.scanUsbDevices(),
			this.scanNetworkDevices(options),
		]);
		return [...serial, ...usb, ...network];
	}

	/**
	 * Cleans up all active video streams, detection frames, and registered event listeners.
	 */
	public dispose(): void {
		this.stopCameraStream();
		this.subscribers.clear();
		this.errorSubscribers.clear();
		for (const cleanup of this.cleanupCallbacks) {
			try {
				cleanup();
			} catch (err) {
				console.warn("[HardwareScanner] Disposal error:", err);
			}
		}
		this.cleanupCallbacks = [];
	}
}

// Global Singleton Instance
export const hardwareScanner = new HardwareScanner();
