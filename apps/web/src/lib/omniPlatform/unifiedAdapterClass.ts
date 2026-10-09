/**
 * DENTE CRM — Unified Omni-Platform Runtime Adapter (Layer 3)
 *
 * Implements OmniPlatformContract from @dental/shared, coordinating printing pipelines,
 * network status monitoring, offline storage engine, chairside camera, PWA updates,
 * doctor keyboard shortcuts, and clinical kiosk mode.
 */

import {
	DESKTOP_FINE_ERGONOMICS,
	TABLET_TOUCH_ERGONOMICS,
	PHONE_TOUCH_ERGONOMICS,
	type OmniPlatformContract,
	type OmniEnvironment,
	type PointerType,
	type DeviceFormFactor,
	type UniversalPrintJobPayload,
	type UniversalPrintResultContract,
	type PlatformNetworkStatus,
	type UnifiedStorageEngineContract,
	type ChairsidePhotoOptions,
	type ChairsidePhotoResult,
	type ControlDimensions,
	type PlatformCapabilitiesMatrix,
} from "@dental/shared";
import { getDeviceFormFactor } from "../../native/mobileBridge";
import {
	determineNetworkConnectivity,
	createNetworkMonitor,
	formatHumanStatusText,
} from "../../utils/networkConnectivity";
import { logger } from "../../utils/logger";
import { registerDoctorHotkeys } from "../../utils/deviceDetection.js";
import {
	detectOmniEnvironment,
	detectPointerType,
	getOmniPlatformInfo,
	isDesktopExecutable,
	isAndroidNativeApp,
} from "./environmentDetector";
import {
	registerPwaServiceWorker,
	checkForPwaUpdate,
} from "./pwaServiceWorkerManager";
import {
	unifiedStorageInstance,
	startOfflineQueueAutoSync,
} from "./offlineSyncManager";

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
			const { printA4Document } = await import("../hardwarePrinting.js");
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

		// 2. Fiscal Receipt: Statutory 54-FZ & 804n Zero-Mock execution pipeline
		if (job.type === "fiscal_receipt") {
			const {
				extractAndValidateFiscalJobPayload,
				executeStatutoryFiscalPipeline,
			} = await import("../kktFiscalPipeline.js");

			const validation = extractAndValidateFiscalJobPayload(job);
			if (!validation.isValid || !validation.normalizedPayload) {
				return {
					success: false,
					methodUsed: isDesktopExecutable() ? "desktop_silent" : "browser_print",
					printedAt: now,
					status: "failed",
					error: validation.error || "Отсутствуют фискальные реквизиты чека",
				};
			}

			const res = await executeStatutoryFiscalPipeline(validation.normalizedPayload, {
				paperWidthMm: job.paperWidthMm ?? 58,
				...(job.silent !== undefined ? { silent: job.silent } : {}),
				...(job.printerName ? { printerName: job.printerName } : {}),
				...(job.copies !== undefined ? { copies: job.copies } : {}),
				...(job.rawText ? { rawText: job.rawText } : {}),
				...(job.kktConnection ? { kktConnection: job.kktConnection } : {}),
			});

			return res;
		}

		// 3. Thermal Receipt ESC/POS (Non-fiscal orders / lab stubs)
		if (job.type === "thermal_receipt_escpos") {
			// Direct TCP/IP socket connection on Desktop EXE (no Windows print dialog)
			if (isDesktopExecutable()) {
				const { printDesktopEscPosReceipt } = await import("../../native/desktopBridge.js");
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
					const { printDesktopThermalLabel } = await import("../../native/desktopBridge.js");
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

			const { dispatchEscPosReceiptPrint } = await import("../../native/hardwareDispatcher.js");
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
			const { dispatchThermalLabelPrint } = await import("../../native/hardwareDispatcher.js");
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
			const { captureMobileCameraPhoto } = await import("../../native/mobileBridge.js");
			return captureMobileCameraPhoto(options);
		}
		const { captureChairsidePhoto } = await import("../../utils/deviceDetection.js");
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

	/**
	 * Activates clinical kiosk mode (fullscreen, wake-lock, exit PIN protection).
	 */
	async enableKioskMode(config?: Parameters<typeof import("../../components/desktop/kioskMode.js").enableKioskMode>[0]): Promise<boolean> {
		const { enableKioskMode } = await import("../../components/desktop/kioskMode.js");
		const res = await enableKioskMode(config);
		return res.success;
	}

	/**
	 * Deactivates clinical kiosk mode with PIN verification.
	 */
	async disableKioskMode(pin?: string): Promise<{ success: boolean; error?: string }> {
		const { disableKioskMode } = await import("../../components/desktop/kioskMode.js");
		const res = await disableKioskMode(pin);
		return res.error !== undefined ? { success: res.success, error: res.error } : { success: res.success };
	}

	/**
	 * Checks if clinical kiosk mode is currently active.
	 */
	isKioskModeActive(): boolean {
		if (typeof window !== "undefined" && (window as any).__DENTE_KIOSK_ACTIVE__ !== undefined) {
			return Boolean((window as any).__DENTE_KIOSK_ACTIVE__);
		}
		return false;
	}
}

export const omniPlatformAdapter = new UnifiedOmniPlatformAdapter();
export const omniPlatform = omniPlatformAdapter;
