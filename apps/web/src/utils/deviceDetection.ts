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
	/** F2: Quick patient search modal */
	onF2SearchPatient?: () => void;
	/** F3: Quick new booking / next patient */
	onF3NewAppointment?: () => void;
	/** F4: Odontogram FDI formula */
	onF4Odontogram?: () => void;
	/** F5: Schedule refresh without losing drafts */
	onF5RefreshSchedule?: () => void;
	/** F9: Open payment / fiscal checkout */
	onF9Checkout?: () => void;
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
	options: { target?: Window | HTMLElement; enabled?: boolean } = {},
): () => void {
	if (typeof window === "undefined") return () => {};

	const target = options.target ?? window;
	const isEnabled = options.enabled !== false;
	if (!isEnabled) return () => {};

	const handleKeyDown = (event: KeyboardEvent) => {
		const key = event.key ? event.key.toLowerCase() : "";
		const code = event.code || "";
		const isCtrlOrMeta = event.ctrlKey || event.metaKey;
		const isTyping = isUserTypingInTextInput(event.target);

		// 1. F1: Nomenclature 804n & Clinical Guidelines
		if (event.key === "F1" || code === "F1") {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF1Help?.();
			return;
		}

		// 2. F2: Quick patient search in Omnibar
		if (event.key === "F2" || code === "F2") {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF2SearchPatient?.();
			return;
		}

		// 3. F3: New appointment / Quick booking
		if (event.key === "F3" || code === "F3") {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF3NewAppointment?.();
			return;
		}

		// 4. F4: Odontogram FDI tooth formula
		if (event.key === "F4" || code === "F4") {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF4Odontogram?.();
			return;
		}

		// 5. F5: Soft schedule refresh (prevent tab reload which destroys drafts)
		if (event.key === "F5" || code === "F5") {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF5RefreshSchedule?.();
			return;
		}

		// 6. F9: Fast fiscal payment tender (54-FZ)
		if (event.key === "F9" || code === "F9") {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF9Checkout?.();
			return;
		}

		// 7. F11: Kiosk / Fullscreen operatory mode
		if (event.key === "F11" || code === "F11") {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF11ToggleKiosk?.();
			return;
		}

		// 8. F12: Quick print Form 043/u
		if (event.key === "F12" || code === "F12") {
			event.preventDefault();
			event.stopPropagation();
			handlers.onF12PrintDiary?.();
			return;
		}

		// 9. Ctrl+S / Cmd+S: Instant debounced autosave (Mandate 8e)
		// Supports Cyrillic layout "ы" (KeyS)
		if (isCtrlOrMeta && (key === "s" || key === "ы" || code === "KeyS") && !event.altKey && !event.shiftKey) {
			event.preventDefault();
			event.stopPropagation();
			void handlers.onSave?.();
			return;
		}

		// 10. Escape: Close top modal or side drawer
		if (event.key === "Escape" || code === "Escape") {
			if (handlers.onEscape) {
				event.preventDefault();
				event.stopPropagation();
				handlers.onEscape();
				return;
			}
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
