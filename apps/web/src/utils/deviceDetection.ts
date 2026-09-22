/**
 * DENTE CRM — Multi-Platform Device & Runtime Detection Utilities
 *
 * Provides reactive & imperative device classification:
 * 1. Desktop EXE (Electron / Tauri on Windows 10/11)
 * 2. Mobile Android (.APK / Capacitor tablet at dental chair or front desk)
 * 3. Web Browser (Chrome, Edge, Safari, Firefox)
 * 4. PWA (Progressive Web App Standalone Window with ServiceWorker)
 *
 * Enforces Clinical Ergonomics (Mandates 8c, 8e, 8n):
 * - Fine Pointer: Dense desktop layout (28–36px controls, mouse/keyboard)
 * - Coarse Pointer: Touch targets >= 44x44px, primary >= 48px for medical gloves
 * - Complete Doctor Hotkey Interception (F1–F12, Ctrl+S, Esc)
 */

import {
	DESKTOP_FINE_ERGONOMICS,
	DOCTOR_HOTKEYS,
	TABLET_TOUCH_ERGONOMICS,
	PHONE_TOUCH_ERGONOMICS,
	type ControlDimensions,
	type ChairsidePhotoOptions,
	type ChairsidePhotoResult,
	type DoctorHotkeyDefinition,
	type OmniEnvironment,
	type PointerType,
	type DeviceFormFactor,
	type PlatformCapabilitiesMatrix,
} from "@dental/shared";
import {
	detectOmniEnvironment,
	detectPointerType,
	getOmniPlatformInfo,
	isAndroidNativeApp,
	isDesktopExecutable,
	isStandalonePwa,
	syncPlatformDomAttributes,
	type OmniPlatformInfo,
} from "../lib/omniPlatformAdapter";
import { getDeviceFormFactor } from "../native/mobileBridge";

export type RuntimeDevicePlatform = "desktop" | "android" | "pwa" | "web";

/**
 * Returns simplified runtime platform code.
 */
export function detectPlatform(): RuntimeDevicePlatform {
	const env = detectOmniEnvironment();
	switch (env) {
		case "desktop_exe":
			return "desktop";
		case "android_apk":
			return "android";
		case "pwa_standalone":
			return "pwa";
		default:
			return "web";
	}
}

export function isDesktopExe(): boolean {
	return isDesktopExecutable();
}

export function isAndroidApk(): boolean {
	return isAndroidNativeApp();
}

export function isPwa(): boolean {
	return isStandalonePwa();
}

export function isTouchDevice(): boolean {
	return detectPointerType() === "coarse";
}

export function isFinePointerDevice(): boolean {
	return detectPointerType() === "fine";
}

export function isTablet(): boolean {
	return getDeviceFormFactor() === "tablet";
}

export function isPhone(): boolean {
	return getDeviceFormFactor() === "phone";
}

export type HardwareResourceTier = "low" | "medium" | "high";

/**
 * Automatically detects whether current device is low-spec hardware:
 * - 4GB RAM or less (navigator.deviceMemory <= 4)
 * - 4 CPU cores or less (typical Intel Celeron / Atom / dual-core clinic laptop)
 * - Save-Data mode or slow network connection
 * - Or explicit low-spec DOM attribute / class / query param (?lowspec=1)
 *
 * Guarantees 60 FPS on integrated GPUs (Intel HD Graphics) and slow 5400 RPM HDDs
 * by enabling low-spec CSS profile, disabling heavy backdrop-filter blur,
 * and reducing CPU/disk thrashing (Mandates 8c, 8e, 8k, 8n).
 */
export function isLowSpecHardware(): boolean {
	// 1. Check DOM root attributes or classes
	if (typeof document !== "undefined" && document.documentElement) {
		const el = document.documentElement;
		if (
			el.getAttribute("data-low-spec") === "true" ||
			el.getAttribute("data-hardware-tier") === "low" ||
			el.getAttribute("data-perf") === "low" ||
			el.classList.contains("low-spec-mode") ||
			el.classList.contains("low-spec-perf")
		) {
			return true;
		}
		if (
			el.getAttribute("data-hardware-tier") === "high" ||
			el.getAttribute("data-perf") === "high"
		) {
			return false;
		}
	}

	// 2. Check query string or localStorage manual overrides
	if (typeof window !== "undefined") {
		try {
			if (window.location?.search) {
				const params = new URLSearchParams(window.location.search);
				const urlFlag = params.get("lowspec") ?? params.get("low-spec");
				if (urlFlag === "1" || urlFlag === "true") return true;
				if (urlFlag === "0" || urlFlag === "false") return false;
			}
		} catch {
			// Ignore URL parse errors
		}
		try {
			const stored = window.localStorage?.getItem("dente:low-spec-mode");
			if (stored === "true" || stored === "1") return true;
			if (stored === "false" || stored === "0") return false;
		} catch {
			// Ignore localStorage access errors
		}
	}

	// 3. Navigator hardware checks
	if (typeof navigator !== "undefined") {
		// Memory (GB) — Chromium Device Memory API
		const navMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
		if (typeof navMem === "number" && navMem <= 4) {
			return true;
		}

		// CPU cores (hardwareConcurrency) — <= 4 cores typical for Celeron / older laptop
		const cores = navigator.hardwareConcurrency;
		if (typeof cores === "number" && cores > 0 && cores <= 4) {
			return true;
		}

		// Save-Data network flag
		const navConn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
		if (navConn?.saveData === true) {
			return true;
		}
		if (navConn?.effectiveType === "slow-2g" || navConn?.effectiveType === "2g" || navConn?.effectiveType === "3g") {
			return true;
		}
	}

	return false;
}

/**
 * Classifies runtime hardware into resource tiers:
 * - "low": Celeron / dual-core, <= 4GB RAM, 5400 RPM HDD, battery saver
 * - "medium": 4-6 cores, 6-8GB RAM (mid-range office PC)
 * - "high": >= 8 cores, >= 8GB RAM (modern doctor workstation)
 */
export function getHardwareResourceTier(): HardwareResourceTier {
	if (typeof document !== "undefined" && document.documentElement) {
		const tier = document.documentElement.getAttribute("data-hardware-tier");
		if (tier === "low" || tier === "medium" || tier === "high") {
			return tier;
		}
	}

	if (isLowSpecHardware()) {
		return "low";
	}

	if (typeof navigator !== "undefined") {
		const cores = navigator.hardwareConcurrency;
		const navMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;

		const hasHighCores = typeof cores === "number" && cores >= 8;
		const hasHighMem = typeof navMem === "number" ? navMem >= 8 : true;

		if (hasHighCores && hasHighMem) {
			return "high";
		}

		if ((typeof cores === "number" && cores >= 6) || (typeof navMem === "number" && navMem >= 6)) {
			return "medium";
		}
	}

	return "high";
}

/**
 * Returns true if the device is a high-performance workstation capable of full visual fidelity,
 * 60/120 FPS animations, rich backdrop-filter blur effects, and real-time 3D rendering.
 */
export function isHighPerformanceWorkstation(): boolean {
	return getHardwareResourceTier() === "high";
}

/**
 * Calculates adaptive polling interval to protect low-spec machines and slow 5400 RPM HDDs:
 * - Low-spec: 2.5x to 4x interval (min 15s) to eliminate disk queue thrashing and CPU starvation
 * - Medium-spec: 1.5x interval
 * - High-spec: Full speed (1.0x) base interval
 */
export function getAdaptivePollingIntervalMs(baseIntervalMs: number): number {
	if (baseIntervalMs <= 0) return baseIntervalMs;

	const tier = getHardwareResourceTier();
	if (tier === "low") {
		return Math.max(Math.round(baseIntervalMs * 2.5), 15_000);
	}
	if (tier === "medium") {
		return Math.max(Math.round(baseIntervalMs * 1.5), baseIntervalMs);
	}
	return baseIntervalMs;
}

/**
 * Determines whether DOM list virtualization should be enforced aggressively
 * (e.g. for patient tables, appointment slots, catalogs) to preserve RAM and avoid GC pressure.
 */
export function shouldVirtualizeListsAggressively(): boolean {
	return isLowSpecHardware();
}

/**
 * Synchronizes DOM root attributes with hardware capabilities so low-spec-hardware.css
 * immediately strips backdrop-filter blur, simplifies shadows, and enables layout containment.
 */
export function applyLowSpecOptimizationsToDom(forcedLow?: boolean): void {
	if (typeof document === "undefined" || !document.documentElement) return;

	const isLow = forcedLow !== undefined ? forcedLow : isLowSpecHardware();
	const root = document.documentElement;

	if (isLow) {
		root.setAttribute("data-low-spec", "true");
		root.setAttribute("data-hardware-tier", "low");
		root.setAttribute("data-perf", "low");
		root.classList.add("low-spec-mode");
		root.classList.add("low-spec-perf");
	} else {
		root.removeAttribute("data-low-spec");
		root.setAttribute("data-hardware-tier", "high");
		root.setAttribute("data-perf", "high");
		root.classList.remove("low-spec-mode");
		root.classList.remove("low-spec-perf");
	}
}

/**
 * Returns exact clinical control dimensions based on active pointer.
 * Guarantees that desktop workstations retain dense 28–36px layouts,
 * while tablets at the dental chair expand to 44–48px for medical gloves.
 */
export function getControlDimensions(): ControlDimensions {
	const pointer = detectPointerType();
	const formFactor = getDeviceFormFactor();

	if (pointer === "fine") {
		return DESKTOP_FINE_ERGONOMICS;
	}

	if (formFactor === "phone") {
		return PHONE_TOUCH_ERGONOMICS;
	}

	return TABLET_TOUCH_ERGONOMICS;
}

/**
 * Returns detailed capabilities matrix for active runtime.
 */
export function getPlatformCapabilities(): PlatformCapabilitiesMatrix {
	const info = getOmniPlatformInfo();
	return {
		canSilentPrintThermal: info.capabilities.canSilentPrintThermal,
		canDirectFiscalKktTcp: info.isDesktop,
		canPrintA4: info.capabilities.canPrintA4,
		canDirectTwainVisiograph: info.capabilities.canDirectTwainVisiograph,
		canCameraCapturePhoto: typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
		canCameraScanBarcode: info.capabilities.canCameraScanBarcode,
		canUsbHidScanner: info.capabilities.canUsbHidScanner,
		canNativeBiometrics: info.capabilities.canNativeBiometrics,
		canOfflineStorage: info.capabilities.canOfflineStorage,
		canHardwareHotkeys: info.isDesktop,
	};
}

export interface DoctorHotkeyHandlers {
	/** F1: Open 804n / clinical hints */
	onF1Help?: () => void;
	/** F2 or Ctrl+K / Cmd+K: Quick patient search modal / Omnibar */
	onF2SearchPatient?: () => void;
	/** Ctrl+K / Cmd+K / F2: Quick search alias */
	onSearch?: () => void;
	/** F3: Quick new booking / next patient */
	onF3NewAppointment?: () => void;
	/** F4: Odontogram FDI formula */
	onF4Odontogram?: () => void;
	/** F5: Schedule refresh without losing drafts */
	onF5RefreshSchedule?: () => void;
	/** F6: Clinical rules / warnings panel */
	onF6ClinicalRules?: () => void;
	/** F7: Visiograph / X-Ray image capture */
	onF7Visiograph?: () => void;
	/** F8: Treatment plan / stages overview */
	onF8TreatmentPlan?: () => void;
	/** F9: Open payment / fiscal checkout */
	onF9Checkout?: () => void;
	/** F10: Outpatient documents / Form 043/u */
	onF10Documents?: () => void;
	/** F11: Toggle fullscreen kiosk */
	onF11ToggleKiosk?: () => void;
	/** F12: Quick print Form 043/u diary */
	onF12PrintDiary?: () => void;
	/** Ctrl+S / Cmd+S: Instant debounced autosave */
	onSave?: () => void | Promise<void>;
	/** Escape: Close modal / drawer */
	onEscape?: () => void;
}

/**
 * Checks whether the focused element is currently typing in an input field.
 */
function isUserTypingInTextInput(target: EventTarget | null): boolean {
	if (!target) return false;
	const el = target as { tagName?: string; isContentEditable?: boolean; type?: string };
	if (!el.tagName) return false;
	const tag = el.tagName.toUpperCase();
	if (tag === "TEXTAREA" || el.isContentEditable) return true;
	if (tag === "INPUT") {
		const type = (el.type || "").toLowerCase();
		const nonText = ["checkbox", "radio", "button", "submit", "reset", "file", "range", "color"];
		return !nonText.includes(type);
	}
	return false;
}

/**
 * Registers global doctor keyboard shortcuts (F1–F12, Ctrl+S, Esc).
 * Strictly prevents destructive browser defaults (e.g. Ctrl+S opening "Save Webpage As HTML",
 * F1 opening Windows Help, F5 dumping dirty form drafts).
 */
export function registerDoctorHotkeys(
	handlers: DoctorHotkeyHandlers,
	options: { target?: Window | HTMLElement | EventTarget; enabled?: boolean } = {},
): () => void {
	const target = options.target ?? (typeof window !== "undefined" ? window : undefined);
	if (!target || typeof (target as { addEventListener?: unknown }).addEventListener !== "function") {
		return () => {};
	}

	const isEnabled = options.enabled !== false;
	if (!isEnabled) return () => {};

	const handleKeyDown = (event: KeyboardEvent) => {
		const key = event.key ? event.key.toLowerCase() : "";
		const code = event.code || "";
		const isCtrlOrMeta = event.ctrlKey || event.metaKey;

		// 1. F1: Nomenclature 804n & Clinical Guidelines
		if ((event.key === "F1" || code === "F1") && handlers.onF1Help) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF1Help();
			return;
		}

		// 2. F2 / Ctrl+K / Cmd+K: Quick patient search in Omnibar
		const isCtrlK =
			isCtrlOrMeta &&
			(key === "k" || key === "л" || code === "KeyK") &&
			!event.altKey &&
			!event.shiftKey;
		if (
			((event.key === "F2" || code === "F2") && (handlers.onF2SearchPatient || handlers.onSearch)) ||
			(isCtrlK && (handlers.onSearch || handlers.onF2SearchPatient))
		) {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onSearch) {
				handlers.onSearch();
			} else if (handlers.onF2SearchPatient) {
				handlers.onF2SearchPatient();
			}
			return;
		}

		// 3. F3: New appointment / Quick booking
		if ((event.key === "F3" || code === "F3") && handlers.onF3NewAppointment) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF3NewAppointment();
			return;
		}

		// 4. F4: Odontogram FDI tooth formula
		if ((event.key === "F4" || code === "F4") && handlers.onF4Odontogram) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF4Odontogram();
			return;
		}

		// 5. F5: Soft schedule refresh (prevent tab reload which destroys drafts)
		if ((event.key === "F5" || code === "F5") && handlers.onF5RefreshSchedule) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF5RefreshSchedule();
			return;
		}

		// 5A. F6: Clinical rules / warnings panel
		if ((event.key === "F6" || code === "F6") && handlers.onF6ClinicalRules) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF6ClinicalRules();
			return;
		}

		// 5B. F7: Visiograph / X-Ray image capture
		if ((event.key === "F7" || code === "F7") && handlers.onF7Visiograph) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF7Visiograph();
			return;
		}

		// 5C. F8: Treatment plan / stages overview
		if ((event.key === "F8" || code === "F8") && handlers.onF8TreatmentPlan) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF8TreatmentPlan();
			return;
		}

		// 6. F9: Fast fiscal payment tender (54-FZ)
		if ((event.key === "F9" || code === "F9") && handlers.onF9Checkout) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF9Checkout();
			return;
		}

		// 6B. F10: Outpatient documents / Form 043/u
		if ((event.key === "F10" || code === "F10") && handlers.onF10Documents) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF10Documents();
			return;
		}

		// 7. F11: Kiosk / Fullscreen operatory mode
		if ((event.key === "F11" || code === "F11") && handlers.onF11ToggleKiosk) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF11ToggleKiosk();
			return;
		}

		// 8. F12: Quick print Form 043/u
		if ((event.key === "F12" || code === "F12") && handlers.onF12PrintDiary) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF12PrintDiary();
			return;
		}

		// 9. Ctrl+S / Cmd+S: Instant debounced autosave (Mandate 8e)
		// Supports Cyrillic layout "ы" (KeyS)
		if (handlers.onSave && isCtrlOrMeta && (key === "s" || key === "ы" || code === "KeyS") && !event.altKey && !event.shiftKey) {
			event.preventDefault();
			event.stopPropagation();
			void handlers.onSave();
			return;
		}

		// 10. Escape: Close top modal or side drawer
		if ((event.key === "Escape" || code === "Escape") && handlers.onEscape) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onEscape();
			return;
		}
	};

	target.addEventListener("keydown", handleKeyDown as EventListener, true);
	return () => {
		target.removeEventListener("keydown", handleKeyDown as EventListener, true);
	};
}

/**
 * Captures chairside dental photograph (Form 043/u photo protocol, tooth macro, X-ray light box).
 * Leverages native tablet camera if available, or HTML5 MediaDevices / video stream fallback.
 */
export async function captureChairsidePhoto(
	options: ChairsidePhotoOptions = {},
): Promise<ChairsidePhotoResult> {
	const now = new Date().toISOString();

	if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
		return {
			success: false,
			capturedAt: now,
			error: "Камера недоступна в данном окружении или требуется HTTPS-соединение.",
		};
	}

	try {
		const targetWidth = options.resolution === "macro" ? 3840 : options.resolution === "high" ? 1920 : 1280;
		const targetHeight = options.resolution === "macro" ? 2160 : options.resolution === "high" ? 1080 : 720;

		const stream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: options.facingMode ?? "environment",
				width: { ideal: targetWidth },
				height: { ideal: targetHeight },
			},
			audio: false,
		});

		const video = document.createElement("video");
		video.playsInline = true;
		video.muted = true;
		video.srcObject = stream;

		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => {
				video.play().then(() => resolve()).catch(reject);
			};
			video.onerror = () => reject(new Error("Не удалось инициализировать видеопоток с камеры"));
			setTimeout(() => resolve(), 1500); // 1.5s timeout safety
		});

		// Render frame to canvas
		const width = video.videoWidth || targetWidth;
		const height = video.videoHeight || targetHeight;
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			stream.getTracks().forEach((track) => track.stop());
			return {
				success: false,
				capturedAt: now,
				error: "Ошибка создания 2D-контекста для фотоснимка",
			};
		}

		ctx.drawImage(video, 0, 0, width, height);

		// Stop tracks immediately to free hardware sensor
		stream.getTracks().forEach((track) => track.stop());

		const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

		return {
			success: true,
			dataUrl,
			mimeType: "image/jpeg",
			widthPx: width,
			heightPx: height,
			capturedAt: now,
			toothCode: options.toothCode,
			viewCategory: options.viewCategory,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка работы с камерой";
		return {
			success: false,
			capturedAt: now,
			error: message,
		};
	}
}

/**
 * Returns comprehensive diagnostic summary for logging and support tickets.
 */
export function getDeviceDiagnosticReport(): Record<string, unknown> {
	const info = getOmniPlatformInfo();
	const dimensions = getControlDimensions();
	const capabilities = getPlatformCapabilities();

	return {
		platform: detectPlatform(),
		environment: info.environment,
		pointerType: info.pointerType,
		formFactor: info.formFactor,
		isDesktop: info.isDesktop,
		isAndroid: info.isAndroid,
		isPwa: info.isPwa,
		isWeb: info.isWeb,
		isTouch: info.isTouch,
		isTablet: info.isTablet,
		controlDimensions: dimensions,
		capabilities,
		safeAreaInsets: info.safeArea,
		isLowSpec: isLowSpecHardware(),
		hardwareTier: getHardwareResourceTier(),
		isHighPerformance: isHighPerformanceWorkstation(),
		cores: typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? null) : null,
		deviceMemoryGb: typeof navigator !== "undefined" ? ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null) : null,
		shouldVirtualizeAggressively: shouldVirtualizeListsAggressively(),
		adaptivePollingInterval10s: getAdaptivePollingIntervalMs(10_000),
		userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "ssr",
		screenWidth: typeof window !== "undefined" ? window.innerWidth : 0,
		screenHeight: typeof window !== "undefined" ? window.innerHeight : 0,
		devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
	};
}

export {
	DESKTOP_FINE_ERGONOMICS,
	TABLET_TOUCH_ERGONOMICS,
	PHONE_TOUCH_ERGONOMICS,
	DOCTOR_HOTKEYS,
	syncPlatformDomAttributes,
};

