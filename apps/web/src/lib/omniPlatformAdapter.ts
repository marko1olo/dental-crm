/**
 * DENTE CRM — Universal Omni-Platform Adapter Implementation
 *
 * Provides unified platform & hardware detection across all runtime targets:
 * 1) Web Browser (Chrome, Firefox, Safari, Edge)
 * 2) Desktop Windows (.EXE via Electron or Tauri)
 * 3) Android (.APK via Capacitor or Android WebView)
 * 4) Progressive Web App (PWA Standalone Window)
 *
 * Ergonomics & Pointer Resolution (Mandates 8c, 8e, 8n):
 * - Mouse / fine pointer (`pointer: fine`): compact clinical desktop density (28–36px height)
 * - Touch / coarse pointer (`pointer: coarse`): expanded hit targets (>= 44x44px, primary >= 48px)
 * - Safe area insets for notches / home indicators
 * - DOM attribute synchronization on documentElement:
 *   data-platform="web|desktop|android|pwa"
 *   data-pointer="fine|coarse"
 *   data-form-factor="desktop|tablet|phone"
 *
 * Implements OmniPlatformContract from @dental/shared.
 */

import {
	DESKTOP_FINE_ERGONOMICS,
	TABLET_TOUCH_ERGONOMICS,
	PHONE_TOUCH_ERGONOMICS,
	DOCTOR_HOTKEYS,
	type OmniPlatformContract,
	type OmniEnvironment,
	type PointerType,
	type DeviceFormFactor,
	type UniversalPrintJobPayload,
	type UniversalPrintResultContract,
	type PlatformNetworkStatus,
	type UnifiedStorageEngineContract,
	type OfflineDraftRecord,
	type OfflineMutationQueueRecord,
	type ChairsidePhotoOptions,
	type ChairsidePhotoResult,
	type ControlDimensions,
	type PlatformCapabilitiesMatrix,
} from "@dental/shared";
import { isDesktopApp } from "../native/desktopBridge";
import {
	getDeviceFormFactor,
	getSafeAreaInsets,
	isMobileApp,
	isNativePlatform,
} from "../native/mobileBridge";
import {
	determineNetworkConnectivity,
	createNetworkMonitor,
	formatHumanStatusText,
} from "../utils/networkConnectivity";
import {
	saveOfflineDraft,
	loadOfflineDraft,
	deleteOfflineDraft,
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	updateOfflineMutationStatus,
	isIndexedDbAvailable,
} from "../services/offline";

export type { OmniEnvironment, PointerType };
export type FormFactor = DeviceFormFactor;

export interface OmniPlatformInfo {
	/** Active runtime execution environment */
	environment: OmniEnvironment;
	/** Primary pointing device type: fine (mouse) vs coarse (finger/touchscreen) */
	pointerType: PointerType;
	/** Screen topology and form factor */
	formFactor: FormFactor;
	/** Whether running in desktop EXE shell */
	isDesktop: boolean;
	/** Whether running in Android APK native shell */
	isAndroid: boolean;
	/** Whether running in standalone installed PWA window */
	isPwa: boolean;
	/** Whether running in regular browser tab */
	isWeb: boolean;
	/** Whether the device has a touch screen active */
	isTouch: boolean;
	/** Whether the device is operated primarily via mouse/trackpad */
	isMouse: boolean;
	/** Whether running on a tablet (iPad, Galaxy Tab chairside) */
	isTablet: boolean;
	/** Whether running on a phone */
	isPhone: boolean;
	/** Safe area insets in CSS pixels */
	safeArea: { top: number; bottom: number; left: number; right: number };
	/** Recommended minimum control height for current pointer */
	controlHeights: {
		/** Primary action button (Save, Print, Pay) */
		primaryActionMinHeightPx: number;
		/** Standard button / input min height */
		standardMinHeightPx: number;
		/** Dense secondary chip / tab min height */
		denseMinHeightPx: number;
	};
	/** Hardware capabilities matrix */
	capabilities: {
		canSilentPrintThermal: boolean;
		canPrintA4: boolean;
		canDirectTwainVisiograph: boolean;
		canCameraScanBarcode: boolean;
		canUsbHidScanner: boolean;
		canNativeBiometrics: boolean;
		canOfflineStorage: boolean;
	};
}

/**
 * Detects whether the current runtime is a desktop executable (Electron or Tauri).
 */
export function isDesktopExecutable(): boolean {
	if (typeof window === "undefined") return false;

	// 1. DENTE desktop native bridge injected
	if (isDesktopApp()) return true;

	// 2. Electron window object or user agent
	const win = window as unknown as {
		electron?: unknown;
		process?: { type?: string; versions?: { electron?: string } };
	};
	if (win.electron !== undefined) return true;
	if (win.process?.versions?.electron !== undefined) return true;

	// 3. Tauri window object
	const tauriWin = window as unknown as {
		__TAURI__?: unknown;
		__TAURI_INTERNALS__?: unknown;
	};
	if (tauriWin.__TAURI__ !== undefined || tauriWin.__TAURI_INTERNALS__ !== undefined) {
		return true;
	}

	// 4. User Agent heuristics
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		if (/Electron|Tauri|DenteDesktop/i.test(navigator.userAgent)) {
			return true;
		}
	}

	return false;
}

/**
 * Detects whether the app is running as an installed PWA in standalone display mode.
 */
export function isStandalonePwa(): boolean {
	if (typeof window === "undefined") return false;

	// 1. CSS display-mode standalone media query
	if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
		return true;
	}

	// 2. iOS Safari standalone property
	const nav = typeof navigator !== "undefined" ? (navigator as unknown as { standalone?: boolean }) : undefined;
	if (nav?.standalone === true) {
		return true;
	}

	// 3. Android WebAPK launch intent referrer
	if (typeof document !== "undefined" && document.referrer.startsWith("android-app://")) {
		return true;
	}

	return false;
}

/**
 * Detects whether the app is running in an Android APK native shell.
 */
export function isAndroidNativeApp(): boolean {
	if (typeof window === "undefined") return false;

	if (isNativePlatform() || isMobileApp()) {
		return true;
	}

	// Android WebView user agent inspection
	if (typeof navigator !== "undefined" && navigator.userAgent) {
		const ua = navigator.userAgent;
		if (/Android/i.test(ua) && (/wv|Version\/.*Chrome/i.test(ua) || /Capacitor/i.test(ua))) {
			return true;
		}
	}

	return false;
}

/**
 * Classifies the exact active omni-platform environment.
 */
export function detectOmniEnvironment(): OmniEnvironment {
	if (isDesktopExecutable()) return "desktop_exe";
	if (isAndroidNativeApp()) return "android_apk";
	if (isStandalonePwa()) return "pwa_standalone";
	return "web_browser";
}

/**
 * Determines primary pointing device precision (Mandate 8c):
 * - "coarse": Finger / glove on touchscreen (requires >= 44x44px targets)
 * - "fine": Mouse / trackpad (retains dense 28–36px desktop clinical layout)
 */
export function detectPointerType(): PointerType {
	if (typeof window === "undefined") return "fine";

	// 1. Standard CSS Media Query matchMedia
	if (window.matchMedia) {
		if (window.matchMedia("(pointer: coarse)").matches) {
			return "coarse";
		}
		if (window.matchMedia("(pointer: fine)").matches) {
			return "fine";
		}
	}

	// 2. Fallback to navigator touch points
	if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) {
		return "coarse";
	}

	return "fine";
}

/**
 * Returns comprehensive platform, pointer, and hardware topology.
 */
export function getOmniPlatformInfo(): OmniPlatformInfo {
	const environment = detectOmniEnvironment();
	const pointerType = detectPointerType();
	const formFactor = getDeviceFormFactor();
	const isDesktop = environment === "desktop_exe";
	const isAndroid = environment === "android_apk";
	const isPwa = environment === "pwa_standalone";
	const isWeb = environment === "web_browser";
	const isTouch = pointerType === "coarse";
	const isMouse = pointerType === "fine";
	const isTablet = formFactor === "tablet";
	const isPhone = formFactor === "phone";
	const safeArea = getSafeAreaInsets();

	// Calculate recommended control dimensions based on pointer precision
	const controlHeights = isTouch
		? {
				primaryActionMinHeightPx: isPhone ? 52 : 48,
				standardMinHeightPx: 44,
				denseMinHeightPx: 36,
			}
		: {
				primaryActionMinHeightPx: 36,
				standardMinHeightPx: 32,
				denseMinHeightPx: 28,
			};

	const capabilities = {
		canSilentPrintThermal: isDesktop,
		canPrintA4: true,
		canDirectTwainVisiograph: isDesktop,
		canCameraScanBarcode: isAndroid || (typeof navigator !== "undefined" && Boolean(navigator.mediaDevices)),
		canUsbHidScanner: isDesktop || isWeb || isPwa,
		canNativeBiometrics: isAndroid,
		canOfflineStorage: typeof window !== "undefined" && (Boolean(window.indexedDB) || Boolean(window.localStorage)),
	};

	return {
		environment,
		pointerType,
		formFactor,
		isDesktop,
		isAndroid,
		isPwa,
		isWeb,
		isTouch,
		isMouse,
		isTablet,
		isPhone,
		safeArea,
		controlHeights,
		capabilities,
	};
}

/**
 * Synchronizes platform and pointer data attributes on document.documentElement.
 * Enables zero-JS CSS selectors:
 * `[data-pointer="coarse"] .btn { min-height: 44px; }`
 * `[data-pointer="fine"] .btn { min-height: 32px; }`
 * `[data-platform="desktop"] .titlebar { display: flex; }`
 */
export function syncPlatformDomAttributes(info?: OmniPlatformInfo): void {
	if (typeof document === "undefined" || !document.documentElement) return;

	const platformInfo = info ?? getOmniPlatformInfo();
	const root = document.documentElement;

	const platformMap: Record<OmniEnvironment, string> = {
		desktop_exe: "desktop",
		android_apk: "android",
		pwa_standalone: "pwa",
		web_browser: "web",
	};

	root.setAttribute("data-platform", platformMap[platformInfo.environment]);
	root.setAttribute("data-pointer", platformInfo.pointerType);
	root.setAttribute("data-form-factor", platformInfo.formFactor);

	if (platformInfo.isTouch) {
		root.classList.add("pointer-coarse");
		root.classList.remove("pointer-fine");
	} else {
		root.classList.add("pointer-fine");
		root.classList.remove("pointer-coarse");
	}
}

// ============================================================================
// UNIFIED STORAGE ENGINE IMPLEMENTATION
// ============================================================================

class WebUnifiedStorageEngine implements UnifiedStorageEngineContract {
	async saveDraft(draft: OfflineDraftRecord): Promise<boolean> {
		try {
			await saveOfflineDraft(draft.key, {
				visitId: draft.visitId,
				patientId: draft.patientId,
				doctorId: draft.doctorId,
				payload: draft.payloadJson,
				version: draft.version,
				updatedAt: draft.updatedAt,
			});
			return true;
		} catch {
			return false;
		}
	}

	async getDraft(key: string): Promise<OfflineDraftRecord | null> {
		try {
			const res = await loadOfflineDraft<{
				visitId?: string;
				patientId?: string;
				doctorId?: string;
				payload?: string;
				version?: number;
				updatedAt?: string;
			}>(key);
			if (!res) return null;
			return {
				key,
				visitId: res.data?.visitId,
				patientId: res.data?.patientId,
				doctorId: res.data?.doctorId,
				payloadJson: typeof res.data?.payload === "string" ? res.data.payload : JSON.stringify(res.data),
				updatedAt: res.data?.updatedAt || res.updatedAt || new Date().toISOString(),
				version: res.data?.version ?? 1,
			};
		} catch {
			return null;
		}
	}

	async removeDraft(key: string): Promise<boolean> {
		try {
			await deleteOfflineDraft(key);
			return true;
		} catch {
			return false;
		}
	}

	async enqueueMutation(
		mutation: Omit<OfflineMutationQueueRecord, "id" | "createdAt" | "synced" | "retryAttempts">,
	): Promise<OfflineMutationQueueRecord> {
		const res = await enqueueOfflineMutation({
			entityType: mutation.entityType as any,
			entityId: mutation.entityId,
			action: mutation.action,
			payload: { json: mutation.payloadJson },
			organizationId: mutation.organizationId,
		});

		return {
			id: res.id,
			organizationId: res.organizationId,
			entityType: res.entityType,
			entityId: res.entityId,
			action: res.action as "create" | "update" | "delete",
			payloadJson: JSON.stringify(res.payload),
			createdAt: res.createdAt,
			synced: res.status === "synced",
			retryAttempts: res.retryCount ?? 0,
			lastError: res.lastError,
		};
	}

	async getPendingMutations(): Promise<OfflineMutationQueueRecord[]> {
		try {
			const pending = await getPendingOfflineMutations();
			return pending.map((m) => ({
				id: m.id,
				organizationId: m.organizationId,
				entityType: m.entityType,
				entityId: m.entityId,
				action: m.action as "create" | "update" | "delete",
				payloadJson: JSON.stringify(m.payload),
				createdAt: m.createdAt,
				synced: m.status === "synced",
				retryAttempts: m.retryCount ?? 0,
				lastError: m.lastError,
			}));
		} catch {
			return [];
		}
	}

	async markMutationSynced(mutationId: string): Promise<boolean> {
		try {
			await updateOfflineMutationStatus(mutationId, "synced");
			return true;
		} catch {
			return false;
		}
	}

	async getStorageStatus(): Promise<{ engine: "indexeddb" | "sqlite" | "localstorage"; isAvailable: boolean; pendingCount: number }> {
		const isIdb = isIndexedDbAvailable();
		const pending = await this.getPendingMutations();
		return {
			engine: isIdb ? "indexeddb" : "localstorage",
			isAvailable: true,
			pendingCount: pending.length,
		};
	}
}

const unifiedStorageInstance = new WebUnifiedStorageEngine();

// ============================================================================
// UNIFIED OMNI-PLATFORM RUNTIME ADAPTER SINGLETON
// ============================================================================

export class UnifiedOmniPlatformAdapter implements OmniPlatformContract {
	get environment(): OmniEnvironment {
		return detectOmniEnvironment();
	}

	get pointerType(): PointerType {
		return detectPointerType();
	}

	get formFactor(): DeviceFormFactor {
		return getDeviceFormFactor();
	}

	get capabilities(): PlatformCapabilitiesMatrix {
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

	get controlDimensions(): ControlDimensions {
		const pointer = this.pointerType;
		const formFactor = this.formFactor;

		if (pointer === "fine") {
			return DESKTOP_FINE_ERGONOMICS;
		}
		if (formFactor === "phone") {
			return PHONE_TOUCH_ERGONOMICS;
		}
		return TABLET_TOUCH_ERGONOMICS;
	}

	async printDirect(job: UniversalPrintJobPayload): Promise<UniversalPrintResultContract> {
		const now = new Date().toISOString();

		// 1. A4 Document: standard print layer
		if (job.type === "a4_document") {
			const { printA4Document } = await import("./hardwarePrinting.js");
			const res = await printA4Document(job.html || job.rawText || "", { title: job.title });
			return {
				success: res.success,
				methodUsed: res.method === "desktop_silent" ? "desktop_silent" : "browser_print",
				printedAt: now,
				error: res.error,
			};
		}

		// 2. Fiscal Receipt: direct TCP on Desktop EXE, or thermal service on Web/Mobile
		if (job.type === "fiscal_receipt") {
			if (isDesktopExecutable() && job.kktConnection) {
				const { printDesktopFiscalReceiptTcp } = await import("../native/desktopBridge.js");
				try {
					const res = await printDesktopFiscalReceiptTcp({
						host: job.kktConnection.host,
						port: job.kktConnection.port,
						protocol: job.kktConnection.protocol,
						payload: JSON.parse(job.kktConnection.payloadJson),
					});
					return {
						success: res.success,
						methodUsed: "desktop_silent",
						printedAt: res.printedAt || now,
						fiscalSign: res.fiscalSign,
						fiscalDocNum: res.fiscalDocNum,
						kktSerialNumber: res.kktSerialNumber,
						error: res.error,
					};
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : "Ошибка TCP печати ККТ";
					return { success: false, methodUsed: "desktop_silent", printedAt: now, error: message };
				}
			}

			// Fallback: print thermal receipt via hardwarePrinting pipeline
			const { printThermalReceipt } = await import("./hardwarePrinting.js");
			const dummyFiscalPayload = {
				receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
				shiftNumber: 1,
				cashierFullName: "Кассир",
				operationType: "income" as const,
				totalRub: 0,
				taxSystem: "usn_income" as const,
				items: [],
				issuedAtIso: now,
			};
			const res = await printThermalReceipt(dummyFiscalPayload, {
				paperWidthMm: job.paperWidthMm ?? 58,
				silent: job.silent,
				printerName: job.printerName,
				rawEscPos: job.rawText,
				copies: job.copies,
			});
			return {
				success: res.success,
				methodUsed: res.method === "desktop_silent" ? "desktop_silent" : "browser_print",
				printedAt: now,
				fiscalSign: res.fiscalSign,
				fiscalDocNum: res.fiscalDocNum,
				kktSerialNumber: res.kktSerialNumber,
				error: res.error,
			};
		}

		// 3. Thermal Receipt ESC/POS (Non-fiscal orders / lab stubs)
		if (job.type === "thermal_receipt_escpos") {
			const { dispatchEscPosReceiptPrint } = await import("../native/hardwareDispatcher.js");
			const res = await dispatchEscPosReceiptPrint({
				rawEscPosBase64: job.rawBase64,
				text: job.rawText,
				html: job.html,
				printerName: job.printerName,
				silent: job.silent !== false,
				widthMm: job.paperWidthMm ?? 80,
				copies: job.copies ?? 1,
			});
			return {
				success: res.success,
				methodUsed: isDesktopExecutable() ? "desktop_silent" : "browser_print",
				printedAt: res.printedAt || now,
				printerName: res.printerName || res.printerUsed,
				error: res.error,
			};
		}

		// 4. SanPiN Sterilization Label
		if (job.type === "sterilization_label_sanpin") {
			const { dispatchThermalLabelPrint } = await import("../native/hardwareDispatcher.js");
			const res = await dispatchThermalLabelPrint({
				html: job.html,
				text: job.rawText,
				printerName: job.printerName,
				silent: job.silent !== false,
				widthMm: job.paperWidthMm ?? 58,
				copies: job.copies ?? 1,
			});
			return {
				success: res.success,
				methodUsed: isDesktopExecutable() ? "desktop_silent" : "browser_print",
				printedAt: res.printedAt || now,
				printerName: res.printerName || res.printerUsed,
				error: res.error,
			};
		}

		return {
			success: false,
			methodUsed: "browser_print",
			printedAt: now,
			error: `Неизвестный тип задания печати: ${(job as any).type}`,
		};
	}

	async getNetworkStatus(): Promise<PlatformNetworkStatus> {
		const state = await determineNetworkConnectivity();
		return {
			mode: state.mode,
			isOnline: state.isOnline,
			isLan: state.isLan,
			rttMs: state.rttMs,
			lastCheckedAt: state.lastCheckedAt || new Date().toISOString(),
			labelRu: state.label,
			descriptionRu: formatHumanStatusText(state.mode, state.rttMs),
		};
	}

	listenNetworkStatus(callback: (status: PlatformNetworkStatus) => void): () => void {
		return createNetworkMonitor((state) => {
			callback({
				mode: state.mode,
				isOnline: state.isOnline,
				isLan: state.isLan,
				rttMs: state.rttMs,
				lastCheckedAt: state.lastCheckedAt || new Date().toISOString(),
				labelRu: state.label,
				descriptionRu: formatHumanStatusText(state.mode, state.rttMs),
			});
		});
	}

	getStorageEngine(): UnifiedStorageEngineContract {
		return unifiedStorageInstance;
	}

	async captureChairsidePhoto(options?: ChairsidePhotoOptions): Promise<ChairsidePhotoResult> {
		const { captureChairsidePhoto } = await import("../utils/deviceDetection.js");
		return captureChairsidePhoto(options);
	}
}

export const omniPlatformAdapter = new UnifiedOmniPlatformAdapter();
export const omniPlatform = omniPlatformAdapter;

export {
	DESKTOP_FINE_ERGONOMICS,
	TABLET_TOUCH_ERGONOMICS,
	PHONE_TOUCH_ERGONOMICS,
	DOCTOR_HOTKEYS,
};
