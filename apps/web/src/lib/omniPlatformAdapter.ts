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
import { logger } from "../utils/logger";
import { registerDoctorHotkeys } from "../utils/deviceDetection.js";
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
		/** Minimum touch target hit size (>= 44px on coarse, primary >= 48px) */
		touchTargetMinPx: number;
		/** Recommended primary typography font size */
		fontSizePx: number;
	};
	/** Hardware capabilities matrix */
	capabilities: {
		canSilentPrintThermal: boolean;
		canDirectFiscalKktTcp: boolean;
		canDirectEscPosSocket: boolean;
		canHardwareHotkeys: boolean;
		canPrintA4: boolean;
		canDirectTwainVisiograph: boolean;
		canCameraScanBarcode: boolean;
		canUsbHidScanner: boolean;
		canNativeBiometrics: boolean;
		canOfflineStorage: boolean;
		hasPwaOfflineCache: boolean;
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
	if (typeof document !== "undefined" && typeof document.referrer === "string" && document.referrer.startsWith("android-app://")) {
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
 * Checks whether Service Worker is supported in the current browser runtime.
 */
export function isServiceWorkerSupported(): boolean {
	return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Checks if a Service Worker is currently registered and active for offline caching.
 */
export async function isServiceWorkerActive(): Promise<boolean> {
	if (!isServiceWorkerSupported()) return false;
	try {
		const reg = await navigator.serviceWorker.getRegistration();
		return Boolean(reg?.active);
	} catch {
		return false;
	}
}

/**
 * Registers PWA service worker for offline cache survivability.
 */
export async function registerPwaServiceWorker(swUrl = "/sw.js"): Promise<boolean> {
	if (!isServiceWorkerSupported()) return false;
	try {
		const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
		return Boolean(reg);
	} catch {
		return false;
	}
}

/**
 * Triggers a check for an updated Service Worker in PWA mode.
 * Returns true if an update is waiting to activate.
 */
export async function checkForPwaUpdate(): Promise<boolean> {
	if (!isServiceWorkerSupported()) return false;
	try {
		const reg = await navigator.serviceWorker.getRegistration();
		if (!reg) return false;
		await reg.update();
		return Boolean(reg.waiting);
	} catch {
		return false;
	}
}

/**
 * Caches essential static assets into CacheStorage for offline PWA operation.
 */
export async function cacheOfflineAssets(urls: string[] = ["/", "/index.html"]): Promise<boolean> {
	if (typeof window === "undefined" || !("caches" in window)) return false;
	try {
		const cache = await caches.open("dente-pwa-static-v1");
		await cache.addAll(urls);
		return true;
	} catch {
		return false;
	}
}

/**
 * Clears all ServiceWorker and PWA caches on application reset or version migration.
 */
export async function clearPwaCaches(): Promise<boolean> {
	if (typeof window === "undefined" || !("caches" in window)) return false;
	try {
		const keys = await caches.keys();
		await Promise.all(keys.map((k) => caches.delete(k)));
		return true;
	} catch {
		return false;
	}
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
				touchTargetMinPx: 44,
				fontSizePx: isPhone ? 15 : 14,
			}
		: {
				primaryActionMinHeightPx: 36,
				standardMinHeightPx: 32,
				denseMinHeightPx: 28,
				touchTargetMinPx: 28,
				fontSizePx: 13,
			};

	const capabilities = {
		canSilentPrintThermal: isDesktop,
		canDirectFiscalKktTcp: isDesktop,
		canDirectEscPosSocket: isDesktop,
		canHardwareHotkeys: isDesktop,
		canPrintA4: true,
		canDirectTwainVisiograph: isDesktop,
		canCameraScanBarcode: isAndroid || (typeof navigator !== "undefined" && Boolean(navigator.mediaDevices)),
		canUsbHidScanner: isDesktop || isWeb || isPwa,
		canNativeBiometrics: isAndroid,
		canOfflineStorage: typeof window !== "undefined" && (Boolean(window.indexedDB) || Boolean(window.localStorage)),
		hasPwaOfflineCache: typeof navigator !== "undefined" && "serviceWorker" in navigator,
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

	// Synchronize Safe Area Insets as CSS custom properties for notch and home bar
	if (root.style && typeof root.style.setProperty === "function") {
		root.style.setProperty("--sat", `${platformInfo.safeArea.top}px`);
		root.style.setProperty("--sab", `${platformInfo.safeArea.bottom}px`);
		root.style.setProperty("--sal", `${platformInfo.safeArea.left}px`);
		root.style.setProperty("--sar", `${platformInfo.safeArea.right}px`);
	}
}

// ============================================================================
// UNIFIED STORAGE ENGINE IMPLEMENTATION
// ============================================================================

class WebUnifiedStorageEngine implements UnifiedStorageEngineContract {
	async saveDraft(draft: OfflineDraftRecord): Promise<boolean> {
		try {
			await saveOfflineDraft(
				draft.key,
				"DIARY_043_DRAFT",
				draft.visitId || draft.patientId || draft.key,
				{
					...(draft.visitId ? { visitId: draft.visitId } : {}),
					...(draft.patientId ? { patientId: draft.patientId } : {}),
					...(draft.doctorId ? { doctorId: draft.doctorId } : {}),
					payload: draft.payloadJson,
					version: draft.version,
					updatedAt: draft.updatedAt,
				},
			);
			return true;
		} catch (err: unknown) {
			const isQuota =
				(err as Error)?.name === "QuotaExceededError" ||
				(err as { code?: number })?.code === 22 ||
				String(err).toLowerCase().includes("quota");
			if (isQuota) {
				try {
					const { purgeSyncedDraftsAndOldCache } = await import("../services/offline/offlineStorage.js");
					await purgeSyncedDraftsAndOldCache();
					await saveOfflineDraft(
						draft.key,
						"DIARY_043_DRAFT",
						draft.visitId || draft.patientId || draft.key,
						{
							...(draft.visitId ? { visitId: draft.visitId } : {}),
							...(draft.patientId ? { patientId: draft.patientId } : {}),
							...(draft.doctorId ? { doctorId: draft.doctorId } : {}),
							payload: draft.payloadJson,
							version: draft.version,
							updatedAt: draft.updatedAt,
						},
					);
					return true;
				} catch {
					return false;
				}
			}
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
		let res: any;
		try {
			res = await enqueueOfflineMutation({
				entityType: mutation.entityType as any,
				entityId: mutation.entityId,
				action: mutation.action,
				payload: { json: mutation.payloadJson },
				organizationId: mutation.organizationId,
			});
		} catch (err: unknown) {
			const isQuota =
				(err as Error)?.name === "QuotaExceededError" ||
				(err as { code?: number })?.code === 22 ||
				String(err).toLowerCase().includes("quota");
			if (isQuota) {
				try {
					const { purgeSyncedDraftsAndOldCache } = await import("../services/offline/offlineStorage.js");
					await purgeSyncedDraftsAndOldCache();
					res = await enqueueOfflineMutation({
						entityType: mutation.entityType as any,
						entityId: mutation.entityId,
						action: mutation.action,
						payload: { json: mutation.payloadJson },
						organizationId: mutation.organizationId,
					});
				} catch {
					throw err;
				}
			} else {
				throw err;
			}
		}

		return {
			id: res.mutationId,
			organizationId: res.organizationId || mutation.organizationId,
			entityType: res.entityType,
			entityId: res.entityId,
			action: res.action as "create" | "update" | "delete",
			payloadJson: JSON.stringify(res.payload),
			createdAt: res.timestamp,
			synced: res.status === "synced",
			retryAttempts: res.retryCount ?? 0,
			...(res.lastError ? { lastError: res.lastError } : {}),
		};
	}

	async getPendingMutations(): Promise<OfflineMutationQueueRecord[]> {
		try {
			const pending = await getPendingOfflineMutations();
			return pending.map((m) => ({
				id: m.mutationId,
				organizationId: m.organizationId || "",
				entityType: m.entityType,
				entityId: m.entityId,
				action: m.action as "create" | "update" | "delete",
				payloadJson: JSON.stringify(m.payload),
				createdAt: m.timestamp,
				synced: m.status === "synced",
				retryAttempts: m.retryCount ?? 0,
				...(m.lastError ? { lastError: m.lastError } : {}),
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

	async getStorageStatus(): Promise<{
		engine: "indexeddb" | "sqlite" | "localstorage";
		isAvailable: boolean;
		pendingCount: number;
		quotaBytes?: number;
		usageBytes?: number;
		percentUsed?: number;
		freeFormatted?: string;
		isQuotaWarning?: boolean;
	}> {
		const isIdb = isIndexedDbAvailable();
		const pending = await this.getPendingMutations();
		let quotaBytes: number | undefined;
		let usageBytes: number | undefined;
		let percentUsed: number | undefined;
		let freeFormatted: string | undefined;
		let isQuotaWarning: boolean | undefined;

		try {
			const { getStorageEstimate } = await import("../services/offline/offlineStorage.js");
			const est = await getStorageEstimate();
			quotaBytes = est.quotaBytes;
			usageBytes = est.usageBytes;
			percentUsed = est.percentUsed;
			freeFormatted = est.freeFormatted;
			isQuotaWarning = est.isWarning;
		} catch (err: unknown) {
			logger.warn("[OmniPlatformAdapter] Failed to get storage estimate", err);
		}

		return {
			engine: isIdb ? "indexeddb" : "localstorage",
			isAvailable: true,
			pendingCount: pending.length,
			...(quotaBytes !== undefined ? { quotaBytes } : {}),
			...(usageBytes !== undefined ? { usageBytes } : {}),
			...(percentUsed !== undefined ? { percentUsed } : {}),
			...(freeFormatted ? { freeFormatted } : {}),
			...(isQuotaWarning !== undefined ? { isQuotaWarning } : {}),
		};
	}

	async syncPendingMutations() {
		const { offlineSyncService } = await import("../services/offline/offlineSyncService.js");
		return offlineSyncService.drainOutbox();
	}
}

const unifiedStorageInstance = new WebUnifiedStorageEngine();

/**
 * Triggers an immediate drain of pending offline mutations across all platforms.
 */
export async function syncOfflineMutations() {
	return unifiedStorageInstance.syncPendingMutations();
}

// ============================================================================
// WEB PLATFORM WEBSOCKET & PWA AUTO-SYNC ENGINES
// ============================================================================

export interface OmniWebSocketOptions {
	/** Initial reconnect delay in milliseconds (default 1000) */
	readonly reconnectBaseMs?: number;
	/** Maximum reconnect delay in milliseconds (default 30000) */
	readonly reconnectMaxMs?: number;
	/** Heartbeat ping interval in milliseconds (default 25000) */
	readonly pingIntervalMs?: number;
	/** Callback when connection opens */
	readonly onOpen?: () => void;
	/** Callback when message arrives */
	readonly onMessage?: (data: unknown) => void;
	/** Callback on error */
	readonly onError?: (err: Event) => void;
	/** Callback on close */
	readonly onClose?: () => void;
}

export interface OmniWebSocketClient {
	readonly isConnected: boolean;
	readonly send: (data: unknown) => boolean;
	readonly close: () => void;
	readonly reconnect: () => void;
}

/**
 * Creates a resilient WebSocket connection with exponential backoff and jitter (Web Browser & PWA).
 * Automatically handles first-frame token authentication, PING/PONG keepalive, and network online recovery.
 */
export function createOmniWebSocket(
	url: string,
	options: OmniWebSocketOptions = {},
): OmniWebSocketClient {
	const baseMs = options.reconnectBaseMs ?? 1000;
	const maxMs = options.reconnectMaxMs ?? 30000;
	const pingInterval = options.pingIntervalMs ?? 25000;

	let socket: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let pingTimer: ReturnType<typeof setInterval> | null = null;
	let attempts = 0;
	let explicitlyClosed = false;
	let connected = false;

	const connect = () => {
		if (typeof window === "undefined" || typeof WebSocket === "undefined") return;
		if (explicitlyClosed || !url) return;

		if (socket) {
			socket.onopen = null;
			socket.onmessage = null;
			socket.onerror = null;
			socket.onclose = null;
			try {
				socket.close();
			} catch (err: unknown) {
				logger.warn("[OmniPlatformAdapter] Error closing WebSocket on connect", err);
			}
			socket = null;
		}

		try {
			socket = new WebSocket(url);
		} catch (err: unknown) {
			logger.warn("[OmniPlatformAdapter] Failed to construct WebSocket:", err);
			scheduleReconnect();
			return;
		}

		socket.onopen = () => {
			attempts = 0;
			connected = true;

			// Send authentication frame if tokens exist
			const clinicToken = typeof localStorage !== "undefined" ? localStorage.getItem("dente_clinic_token") : null;
			const staffToken = typeof localStorage !== "undefined" ? localStorage.getItem("dente_staff_token") : null;
			if (clinicToken || staffToken) {
				try {
					socket?.send(
						JSON.stringify({
							type: "AUTH",
							payload: { clinicToken, staffToken },
						}),
					);
				} catch (err: unknown) {
					logger.warn("[OmniPlatformAdapter] Error sending AUTH frame over WebSocket", err);
				}
			}

			// Start ping keepalive
			if (pingInterval > 0) {
				pingTimer = setInterval(() => {
					if (socket?.readyState === WebSocket.OPEN) {
						socket.send("PING");
					}
				}, pingInterval);
			}

			options.onOpen?.();
		};

		socket.onmessage = (event) => {
			if (event.data === "PONG") return;
			try {
				const parsed = JSON.parse(event.data);
				if (parsed?.type === "AUTH_OK") return;
				options.onMessage?.(parsed);
			} catch {
				options.onMessage?.(event.data);
			}
		};

		socket.onerror = (e) => {
			options.onError?.(e);
		};

		socket.onclose = () => {
			connected = false;
			if (pingTimer) {
				clearInterval(pingTimer);
				pingTimer = null;
			}
			options.onClose?.();
			if (!explicitlyClosed) {
				scheduleReconnect();
			}
		};
	};

	const scheduleReconnect = () => {
		if (explicitlyClosed) return;
		if (reconnectTimer) clearTimeout(reconnectTimer);

		// Full Jitter Exponential Backoff
		const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempts));
		const factor = 0.5 + (Date.now() % 1000) / 2000;
		const delay = Math.max(100, Math.round(exponential * factor));
		attempts++;

		reconnectTimer = setTimeout(() => {
			connect();
		}, delay);
	};

	// Immediate reconnect when browser signals network online
	const handleOnline = () => {
		if (!connected && !explicitlyClosed) {
			attempts = 0;
			connect();
		}
	};

	if (typeof window !== "undefined") {
		window.addEventListener("online", handleOnline);
	}

	connect();

	return {
		get isConnected() {
			return connected && socket?.readyState === WebSocket.OPEN;
		},
		send(data: unknown): boolean {
			if (socket && socket.readyState === WebSocket.OPEN) {
				const payload = typeof data === "string" ? data : JSON.stringify(data);
				socket.send(payload);
				return true;
			}
			return false;
		},
		close() {
			explicitlyClosed = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			if (pingTimer) clearInterval(pingTimer);
			if (typeof window !== "undefined") {
				window.removeEventListener("online", handleOnline);
			}
			if (socket) {
				try {
					socket.close();
				} catch (err: unknown) {
					logger.warn("[OmniPlatformAdapter] Error closing WebSocket on disconnect", err);
				}
				socket = null;
			}
			connected = false;
		},
		reconnect() {
			explicitlyClosed = false;
			attempts = 0;
			connect();
		},
	};
}

/**
 * Starts automatic offline mutation queue auto-sync on network reconnection (PWA & Web Browser).
 * Drains pending offline drafts and mutations when transitioning to online or LAN mode.
 */
export function startOfflineQueueAutoSync(intervalMs = 30_000): () => void {
	if (typeof window === "undefined") return () => {};

	let timer: ReturnType<typeof setInterval> | null = null;

	const attemptSync = async () => {
		try {
			const { determineNetworkConnectivity } = await import("../utils/networkConnectivity.js");
			const net = await determineNetworkConnectivity();
			if (net.isOnline || net.isLan) {
				const { offlineSyncService } = await import("../services/offline/offlineSyncService.js");
				if (!offlineSyncService.isDrainActive()) {
					await offlineSyncService.drainOutbox();
				}
			}
		} catch {
			// Silent suppression during background sync attempts
		}
	};

	const handleOnline = () => {
		void attemptSync();
	};

	const handleVisibilityChange = () => {
		if (typeof document !== "undefined" && document.visibilityState === "visible") {
			void attemptSync();
		}
	};

	window.addEventListener("online", handleOnline);
	if (typeof document !== "undefined") {
		document.addEventListener("visibilitychange", handleVisibilityChange);
	}

	// Immediate initial drain attempt on startup
	void attemptSync();

	if (intervalMs > 0) {
		timer = setInterval(attemptSync, intervalMs);
	}

	return () => {
		window.removeEventListener("online", handleOnline);
		if (typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		}
		if (timer) clearInterval(timer);
	};
}

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
			const res = await printA4Document(job.html || job.rawText || "", {
				...(job.title ? { title: job.title } : {}),
				...(job.silent !== undefined ? { silent: job.silent } : {}),
				...(job.printerName ? { printerName: job.printerName } : {}),
				...(job.copies !== undefined ? { copies: job.copies } : {}),
			});
			return {
				success: res.success,
				methodUsed: res.method === "desktop_silent" ? "desktop_silent" : "browser_print",
				printedAt: now,
				...(res.error ? { error: res.error } : {}),
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
						protocol: (job.kktConnection.protocol === "shtrih" ? "shtrih" : "atol") as "atol" | "shtrih",
						payload: JSON.parse(job.kktConnection.payloadJson),
					});
					return {
						success: res.success,
						methodUsed: "desktop_silent",
						printedAt: res.printedAt || now,
						...(res.fiscalSign ? { fiscalSign: res.fiscalSign } : {}),
						...(res.fiscalDocNum ? { fiscalDocNum: res.fiscalDocNum } : {}),
						...(res.kktSerialNumber ? { kktSerialNumber: res.kktSerialNumber } : {}),
						...(res.error ? { error: res.error } : {}),
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
				...(job.silent !== undefined ? { silent: job.silent } : {}),
				...(job.printerName ? { printerName: job.printerName } : {}),
				...(job.rawText ? { rawEscPos: job.rawText } : {}),
				...(job.copies !== undefined ? { copies: job.copies } : {}),
			});
			return {
				success: res.success,
				methodUsed: res.method === "desktop_silent" ? "desktop_silent" : "browser_print",
				printedAt: now,
				...(res.fiscalSign ? { fiscalSign: res.fiscalSign } : {}),
				...(res.fiscalDocNum ? { fiscalDocNum: res.fiscalDocNum } : {}),
				...(res.kktSerialNumber ? { kktSerialNumber: res.kktSerialNumber } : {}),
				...(res.error ? { error: res.error } : {}),
			};
		}

		// 3. Thermal Receipt ESC/POS (Non-fiscal orders / lab stubs)
		if (job.type === "thermal_receipt_escpos") {
			// Direct TCP/IP socket connection on Desktop EXE (no Windows print dialog)
			if (isDesktopExecutable()) {
				const { printDesktopEscPosReceipt } = await import("../native/desktopBridge.js");
				try {
					const res = await printDesktopEscPosReceipt({
						host: job.kktConnection?.host || "127.0.0.1",
						port: job.kktConnection?.port || 9100,
						...(job.printerName ? { printerName: job.printerName } : {}),
						...(job.rawBase64 ? { rawEscPosBase64: job.rawBase64 } : {}),
						...(job.rawText ? { text: job.rawText } : {}),
						silent: job.silent !== false,
						widthMm: job.paperWidthMm ?? 80,
						copies: job.copies ?? 1,
					});
					if (res.success) {
						const printerUsed = (res as any).printerName || (res as any).printerUsed || job.kktConnection?.host || "ESC/POS 9100";
						return {
							success: true,
							methodUsed: "desktop_silent",
							printedAt: res.printedAt || now,
							...(printerUsed ? { printerName: printerUsed } : {}),
						};
					}
				} catch {
					// Fall through to OS thermal spooler fallback
				}

				// Instant Fallback on Desktop EXE: standard OS thermal spooler queue (Mandate 8e)
				try {
					const { printDesktopThermalLabel } = await import("../native/desktopBridge.js");
					const html = job.html || `<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;margin:0;padding:8px;">${job.rawText || ""}</pre>`;
					const fallbackRes = await printDesktopThermalLabel({
						html,
						printerName: job.printerName,
						widthMm: job.paperWidthMm ?? 80,
						silent: job.silent !== false,
						copies: job.copies ?? 1,
					});
					if (fallbackRes.success) {
						return {
							success: true,
							methodUsed: "desktop_silent",
							printedAt: fallbackRes.printedAt || now,
							printerName: fallbackRes.printerName || fallbackRes.printerUsed || "OS Thermal Spooler",
						};
					}
				} catch (err: unknown) {
					logger.warn("[OmniPlatformAdapter] Fallback printRawViaSilentExecutable failed", err);
				}
			}

			const { dispatchEscPosReceiptPrint } = await import("../native/hardwareDispatcher.js");
			const res = await dispatchEscPosReceiptPrint({
				...(job.rawBase64 ? { rawEscPosBase64: job.rawBase64 } : {}),
				...(job.rawText ? { text: job.rawText } : {}),
				...(job.html ? { html: job.html } : {}),
				...(job.printerName ? { printerName: job.printerName } : {}),
				silent: job.silent !== false,
				widthMm: job.paperWidthMm ?? 80,
				copies: job.copies ?? 1,
			});
			const printerUsed = res.printerName || res.printerUsed;
			return {
				success: res.success,
				methodUsed: isDesktopExecutable() ? "desktop_silent" : "browser_print",
				printedAt: res.printedAt || now,
				...(printerUsed ? { printerName: printerUsed } : {}),
				...(res.error ? { error: res.error } : {}),
			};
		}

		// 4. SanPiN Sterilization Label
		if (job.type === "sterilization_label_sanpin") {
			const { dispatchThermalLabelPrint } = await import("../native/hardwareDispatcher.js");
			const res = await dispatchThermalLabelPrint({
				...(job.html ? { html: job.html } : {}),
				...(job.rawText ? { text: job.rawText } : {}),
				...(job.printerName ? { printerName: job.printerName } : {}),
				silent: job.silent !== false,
				widthMm: job.paperWidthMm ?? 58,
				copies: job.copies ?? 1,
			});
			const printerUsed = res.printerName || res.printerUsed;
			return {
				success: res.success,
				methodUsed: isDesktopExecutable() ? "desktop_silent" : "browser_print",
				printedAt: res.printedAt || now,
				...(printerUsed ? { printerName: printerUsed } : {}),
				...(res.error ? { error: res.error } : {}),
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
		if (isAndroidNativeApp()) {
			const { captureMobileCameraPhoto } = await import("../native/mobileBridge.js");
			return captureMobileCameraPhoto(options);
		}
		const { captureChairsidePhoto } = await import("../utils/deviceDetection.js");
		return captureChairsidePhoto(options);
	}

	/**
	 * Registers PWA ServiceWorker for offline cache survivability.
	 */
	async registerServiceWorker(swUrl = "/sw.js"): Promise<boolean> {
		return registerPwaServiceWorker(swUrl);
	}

	/**
	 * Checks for pending PWA ServiceWorker update.
	 */
	async checkForPwaUpdate(): Promise<boolean> {
		return checkForPwaUpdate();
	}

	/**
	 * Starts offline mutation queue auto-sync on network recovery (PWA & Web Browser).
	 */
	startOfflineAutoSync(intervalMs = 30_000): () => void {
		return startOfflineQueueAutoSync(intervalMs);
	}

	/**
	 * Registers doctor keyboard hotkeys (F1–F12, Ctrl+S, Esc) with layout normalization.
	 */
	registerDoctorHotkeys(
		handlers: Parameters<typeof registerDoctorHotkeys>[0],
		optionsOrTarget?: { target?: Window | HTMLElement | EventTarget; enabled?: boolean } | Window | HTMLElement,
	): () => void {
		const opts = optionsOrTarget && "addEventListener" in (optionsOrTarget as object)
			? { target: optionsOrTarget as Window | HTMLElement }
			: (optionsOrTarget as { target?: Window | HTMLElement | EventTarget; enabled?: boolean } | undefined);
		return registerDoctorHotkeys(handlers, opts);
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

export {
	useSafeSwipe,
	useQuadrantSwipe,
	useVisitTabSwipe,
	useToothSwipe,
	getNextQuadrantBySwipe,
	getNextVisitTabBySwipe,
	getNextToothBySwipe,
	getOpposingTooth,
	ADULT_UPPER_ARCH,
	ADULT_LOWER_ARCH,
	PEDIATRIC_UPPER_ARCH,
	PEDIATRIC_LOWER_ARCH,
	type UseSafeSwipeOptions,
	type UseQuadrantSwipeOptions,
	type UseVisitTabSwipeOptions,
	type UseToothSwipeOptions,
	type OdontogramQuadrantId,
	type VisitSubViewTab,
} from "../hooks/useSafeSwipe.js";

export {
	registerSafeSwipeGesture,
	triggerHaptic,
	printMobileThermalBinary,
	type SafeSwipeOptions,
} from "../native/mobileBridge.js";

export {
	isTypingInInputElement,
	dispatchDesktopShortcut,
	useDesktopShortcuts,
} from "../hooks/useDesktopShortcuts.js";

export {
	registerDoctorHotkeys,
} from "../utils/deviceDetection.js";

export {
	isWebUsbSupported,
	printWebUsbEscPosReceipt,
	printDesktopA4DocumentSilent,
	printDesktopDocumentSilent,
} from "./hardwarePrinting.js";


