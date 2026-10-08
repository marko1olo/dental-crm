/**
 * DENTE CRM — Desktop Windows (.EXE) Hotkeys & Kiosk Mode Bridge (Layer 2)
 *
 * Fullscreen / Kiosk mode toggles and global clinical keyboard shortcuts:
 * - F5 soft refresh & destructive reload protection.
 * - Ctrl+S / Ctrl+P / Ctrl+K / Escape clinical shortcuts.
 * - F1-F12 comprehensive doctor keyboard suite.
 * - Desktop exit protection (beforeunload / pagehide flush).
 */

import { logger } from "../../utils/logger";
import { triggerHaptic } from "../mobile/hapticsAndAudio";
import { getDesktopNativeApi } from "./platformDetection";
import type { DesktopHotkeyHandlers, DesktopHotkeyOptions, DesktopWindowState } from "./types";

/**
 * Регистрация слушателей закрытия окна или приложения
 * для гарантированного сброса несохраненных данных (черновиков и мутаций).
 */
export function setupDesktopExitProtection(onExitCallback?: () => void): () => void {
	if (typeof window === "undefined") return () => {};

	const handleExit = () => {
		try {
			onExitCallback?.();
		} catch (err) {
			logger.warn("[desktopBridge] Error during exit callback:", err);
		}
	};

	window.addEventListener("beforeunload", handleExit);
	window.addEventListener("pagehide", handleExit);

	return () => {
		window.removeEventListener("beforeunload", handleExit);
		window.removeEventListener("pagehide", handleExit);
	};
}

/**
 * Toggles desktop full screen / kiosk mode for dental operatory displays (F11 / Header action).
 */
export async function toggleDesktopFullScreen(flag?: boolean): Promise<DesktopWindowState> {
	const api = getDesktopNativeApi();
	if (api?.toggleFullScreen) {
		try {
			return await api.toggleFullScreen(flag);
		} catch (err: unknown) {
			logger.warn("[desktopBridge] native toggleFullScreen failed, falling back to Web API:", err);
			// Fall through to standard Web Fullscreen API
		}
	}

	// Browser / PWA Fullscreen API Fallback
	if (typeof document !== "undefined") {
		try {
			if (!document.fullscreenElement) {
				if (typeof document.documentElement?.requestFullscreen === "function") {
					await document.documentElement.requestFullscreen();
					return { isFullScreen: true, isKiosk: false, isMaximized: true };
				}
			} else {
				if (typeof document.exitFullscreen === "function") {
					await document.exitFullscreen();
					return { isFullScreen: false, isKiosk: false, isMaximized: false };
				}
			}
		} catch (err: unknown) {
			logger.warn("[desktopBridge] document fullscreen request/exit failed:", err);
			// Ignore fullscreen restrictions
		}
	}

	return { isFullScreen: false, isKiosk: false, isMaximized: false };
}

/**
 * Toggles dedicated clinical kiosk mode on operatory monoblocks (removes OS window frame & taskbar).
 */
export async function toggleDesktopKioskMode(flag?: boolean): Promise<DesktopWindowState> {
	const api = getDesktopNativeApi();
	if (api?.toggleKioskMode) {
		try {
			return await api.toggleKioskMode(flag);
		} catch (err: unknown) {
			logger.warn("[desktopBridge] native toggleKioskMode failed, falling back:", err);
			// Fall through
		}
	}

	return await toggleDesktopFullScreen(flag);
}

export const toggleKioskMode = toggleDesktopKioskMode;

/**
 * Retrieves current desktop window state (fullscreen, kiosk, maximized).
 */
export async function getDesktopWindowState(): Promise<DesktopWindowState> {
	const api = getDesktopNativeApi();
	if (api?.getWindowState) {
		try {
			return await api.getWindowState();
		} catch (err: unknown) {
			logger.warn("[desktopBridge] native getWindowState failed, falling back:", err);
			// Fall through
		}
	}

	const isFs = typeof document !== "undefined" && Boolean(document.fullscreenElement);
	return { isFullScreen: isFs, isKiosk: false, isMaximized: isFs };
}

let activeDesktopHotkeyCleanup: (() => void) | null = null;

/**
 * Registers global desktop keyboard shortcuts with clinical input protection:
 * - F5: prevents page reload that destroys doctor notes, executes soft refresh callback or dispatches "dente:soft-refresh".
 * - Ctrl+S / Cmd+S (KeyS / "s" / "ы"): prevents "Save HTML", triggers quick card save or dispatches "dente:save-card".
 * - Ctrl+P / Cmd+P (KeyP / "p" / "з"): prevents browser print, triggers Form 043/u / receipt print or dispatches "dente:print-active-document".
 * - Esc: closes top modal or drawer.
 * - F11: toggles desktop kiosk / fullscreen mode.
 */
export function registerDesktopHotkeys(
	handlers: DesktopHotkeyHandlers = {},
	options: DesktopHotkeyOptions = {},
): () => void {
	const target = options.target ?? (typeof window !== "undefined" ? window : undefined);
	if (!target || typeof (target as { addEventListener?: unknown }).addEventListener !== "function") {
		return () => {};
	}

	const isEnabled = options.enabled !== false;
	if (!isEnabled) return () => {};

	const preventF5 = options.preventF5Reload !== false;

	const nativeApi = getDesktopNativeApi();
	const unsubs: Array<() => void> = [];

	if (nativeApi?.onDesktopSoftRefresh) {
		unsubs.push(
			nativeApi.onDesktopSoftRefresh(() => {
				if (handlers.onF5Refresh) {
					handlers.onF5Refresh();
				} else if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente:soft-refresh", { bubbles: true }));
				}
			}),
		);
	}
	if (nativeApi?.onDesktopPrintRequest) {
		unsubs.push(
			nativeApi.onDesktopPrintRequest(() => {
				triggerHaptic("selection");
				if (handlers.onPrint) {
					void handlers.onPrint();
				} else if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente:print-active-document", { bubbles: true }));
				}
			}),
		);
	}
	if (nativeApi?.onDesktopSaveRequest) {
		unsubs.push(
			nativeApi.onDesktopSaveRequest(() => {
				triggerHaptic("selection");
				if (handlers.onSave) {
					void handlers.onSave();
				} else if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente:save-card", { bubbles: true }));
				}
			}),
		);
	}
	if (nativeApi?.onDesktopSearchRequest) {
		unsubs.push(
			nativeApi.onDesktopSearchRequest(() => {
				triggerHaptic("selection");
				if (handlers.onSearch) {
					handlers.onSearch();
				} else if (handlers.onF2SearchPatient) {
					handlers.onF2SearchPatient();
				} else if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente:search-patient", { bubbles: true }));
				}
			}),
		);
	}
	if (nativeApi?.onDesktopEscapeRequest) {
		unsubs.push(
			nativeApi.onDesktopEscapeRequest(() => {
				if (handlers.onEscape) {
					handlers.onEscape();
				} else if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente:escape-pressed", { bubbles: true }));
				}
			}),
		);
	}

	if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
		const onSoftRefreshEvent = () => {
			if (handlers.onF5Refresh) {
				handlers.onF5Refresh();
			} else {
				window.dispatchEvent(new CustomEvent("dente:soft-refresh", { bubbles: true }));
			}
		};
		const onPrintRequestEvent = () => {
			triggerHaptic("selection");
			if (handlers.onPrint) {
				void handlers.onPrint();
			} else {
				window.dispatchEvent(new CustomEvent("dente:print-active-document", { bubbles: true }));
			}
		};
		const onSaveRequestEvent = () => {
			triggerHaptic("selection");
			if (handlers.onSave) {
				void handlers.onSave();
			} else {
				window.dispatchEvent(new CustomEvent("dente:save-card", { bubbles: true }));
			}
		};
		const onSearchRequestEvent = () => {
			triggerHaptic("selection");
			if (handlers.onSearch) {
				handlers.onSearch();
			} else if (handlers.onF2SearchPatient) {
				handlers.onF2SearchPatient();
			} else {
				window.dispatchEvent(new CustomEvent("dente:search-patient", { bubbles: true }));
			}
		};
		const onEscapeRequestEvent = () => {
			if (handlers.onEscape) {
				handlers.onEscape();
			} else {
				window.dispatchEvent(new CustomEvent("dente:escape-pressed", { bubbles: true }));
			}
		};

		window.addEventListener("dente:desktop-soft-refresh", onSoftRefreshEvent);
		window.addEventListener("dente:desktop-print-request", onPrintRequestEvent);
		window.addEventListener("dente:desktop-save-request", onSaveRequestEvent);
		window.addEventListener("dente:desktop-search-request", onSearchRequestEvent);
		window.addEventListener("dente:desktop-escape-request", onEscapeRequestEvent);

		unsubs.push(() => {
			window.removeEventListener("dente:desktop-soft-refresh", onSoftRefreshEvent);
			window.removeEventListener("dente:desktop-print-request", onPrintRequestEvent);
			window.removeEventListener("dente:desktop-save-request", onSaveRequestEvent);
			window.removeEventListener("dente:desktop-search-request", onSearchRequestEvent);
			window.removeEventListener("dente:desktop-escape-request", onEscapeRequestEvent);
		});
	}

	const handleKeyDown = (event: KeyboardEvent) => {
		const key = event.key ? event.key.toLowerCase() : "";
		const code = event.code || "";
		const isCtrlOrMeta = event.ctrlKey || event.metaKey;

		// 1. F5: Prevent accidental destructive reload during clinical data entry
		if (event.key === "F5" || code === "F5") {
			if (preventF5) {
				event.preventDefault();
				event.stopPropagation();
			}
			if (handlers.onF5Refresh) {
				handlers.onF5Refresh();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:soft-refresh", { bubbles: true }));
			}
			return;
		}

		// 2. Ctrl+S / Cmd+S / Ctrl+Ы: Quick save of Form 043/u & clinical card (Mandate 8e)
		if (isCtrlOrMeta && (key === "s" || key === "ы" || code === "KeyS") && !event.altKey && !event.shiftKey) {
			event.preventDefault();
			event.stopPropagation();
			triggerHaptic("selection");
			if (handlers.onSave) {
				void handlers.onSave();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:save-card", { bubbles: true }));
			}
			return;
		}

		// 3. Ctrl+P / Cmd+P / Ctrl+З: Print Form 043/u / official medical document / receipt
		if (isCtrlOrMeta && (key === "p" || key === "з" || code === "KeyP") && !event.altKey && !event.shiftKey) {
			event.preventDefault();
			event.stopPropagation();
			triggerHaptic("selection");
			if (handlers.onPrint) {
				void handlers.onPrint();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:print-active-document", { bubbles: true }));
			}
			return;
		}

		// 3A. Ctrl+K / Cmd+K / Ctrl+Л: Quick patient search in Omnibar (Mandates 8c, 8e)
		const isCtrlK =
			isCtrlOrMeta &&
			(key === "k" || key === "л" || code === "KeyK") &&
			!event.altKey &&
			!event.shiftKey;
		if (isCtrlK) {
			event.preventDefault();
			event.stopPropagation();
			triggerHaptic("selection");
			if (handlers.onSearch) {
				handlers.onSearch();
			} else if (handlers.onF2SearchPatient) {
				handlers.onF2SearchPatient();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:search-patient", { bubbles: true }));
			}
			return;
		}

		// 4. Escape: Close topmost modal or side drawer
		if ((event.key === "Escape" || code === "Escape") && handlers.onEscape) {
			event.preventDefault();
			event.stopPropagation();
			handlers.onEscape();
			return;
		}

		// 5. F11: Kiosk / Fullscreen toggle
		if (event.key === "F11" || code === "F11") {
			if (handlers.onToggleFullScreen) {
				event.preventDefault();
				event.stopPropagation();
				handlers.onToggleFullScreen();
			} else {
				event.preventDefault();
				event.stopPropagation();
				void toggleDesktopFullScreen();
			}
			return;
		}

		// 6. Complete F1-F12 Doctor Hotkeys Suite (Mandates 8c, 8e, 8n)
		if (event.key === "F1" || code === "F1") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF1Help) {
				handlers.onF1Help();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:open-help", { bubbles: true }));
			}
			return;
		}
		if (event.key === "F2" || code === "F2") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF2SearchPatient) {
				handlers.onF2SearchPatient();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:search-patient", { bubbles: true }));
			}
			return;
		}
		if (event.key === "F3" || code === "F3") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF3NewAppointment) {
				handlers.onF3NewAppointment();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:new-appointment", { bubbles: true }));
			}
			return;
		}
		if (event.key === "F4" || code === "F4") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF4Odontogram) {
				handlers.onF4Odontogram();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:open-odontogram", { bubbles: true }));
			}
			return;
		}
		if (event.key === "F6" || code === "F6") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF6ClinicalRules) {
				handlers.onF6ClinicalRules();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:clinical-rules", { bubbles: true }));
			}
			return;
		}
		if (event.key === "F7" || code === "F7") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF7Visiograph) {
				handlers.onF7Visiograph();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:open-visiograph", { bubbles: true }));
			}
			return;
		}
		if (event.key === "F8" || code === "F8") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF8TreatmentPlan) {
				handlers.onF8TreatmentPlan();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:open-treatment-plan", { bubbles: true }));
			}
			return;
		}
		if (event.key === "F9" || code === "F9") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF9Checkout) {
				handlers.onF9Checkout();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:open-checkout", { bubbles: true }));
			}
			return;
		}
		if (event.key === "F10" || code === "F10") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF10Documents) {
				handlers.onF10Documents();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:open-documents", { bubbles: true }));
			}
			return;
		}
		if (event.key === "F12" || code === "F12") {
			event.preventDefault();
			event.stopPropagation();
			if (handlers.onF12PrintDiary) {
				handlers.onF12PrintDiary();
			} else if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:print-active-diary", { bubbles: true }));
			}
			return;
		}
	};

	(target as { addEventListener: (type: string, listener: EventListener, options?: boolean) => void })
		.addEventListener("keydown", handleKeyDown as EventListener, true);

	return () => {
		for (const unsub of unsubs) {
			try {
				unsub();
			} catch {}
		}
		(target as { removeEventListener: (type: string, listener: EventListener, options?: boolean) => void })
			.removeEventListener("keydown", handleKeyDown as EventListener, true);
	};
}

/**
 * Initializes global desktop hotkeys listener (F5 reload protection, Ctrl+S, Ctrl+P).
 * Safe to call repeatedly; cleans up existing listener before re-registering.
 */
export function initDesktopHotkeys(
	handlers: DesktopHotkeyHandlers = {},
	options: DesktopHotkeyOptions = {},
): () => void {
	if (activeDesktopHotkeyCleanup) {
		activeDesktopHotkeyCleanup();
		activeDesktopHotkeyCleanup = null;
	}
	activeDesktopHotkeyCleanup = registerDesktopHotkeys(handlers, options);
	return activeDesktopHotkeyCleanup;
}

export function onDesktopSearchRequest(callback: () => void): () => void {
	const api = getDesktopNativeApi();
	if (api?.onDesktopSearchRequest) {
		return api.onDesktopSearchRequest(callback);
	}
	return () => {};
}

export function onDesktopEscapeRequest(callback: () => void): () => void {
	const api = getDesktopNativeApi();
	if (api?.onDesktopEscapeRequest) {
		return api.onDesktopEscapeRequest(callback);
	}
	return () => {};
}
