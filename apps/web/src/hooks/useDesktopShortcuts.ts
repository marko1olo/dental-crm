/**
 * DENTE CRM — React Hook for Desktop Keyboard Shortcuts (A11y & Fast Operations)
 *
 * Essential Clinical Invariants (Mandates 8c, 8e, 8n):
 * 1. Ctrl+S / Cmd+S: Quick-save active document/visit/patient.
 *    STRICTLY calls preventDefault() to block the browser's disruptive "Save HTML As" dialog!
 * 2. Escape: Dismiss active modal, drawer, radial menu, or reset selection.
 * 3. Enter / Ctrl+Enter: Quick-submit or confirm active form.
 * 4. Ctrl+P / Cmd+P: Quick-print active document without saving whole page.
 */

import { useEffect, useRef } from "react";

export interface UseDesktopShortcutsOptions {
	/** Callback for Ctrl+S / Cmd+S (Save active diary / document / record) */
	onSave?: () => void | Promise<void>;
	/** Callback for Escape (Cancel / Close active modal or drawer) */
	onEscape?: () => void;
	/** Alias callback for Escape (Close modal) */
	onCloseModal?: () => void;
	/** Callback for Ctrl+Enter or Enter (Submit) */
	onSubmit?: () => void;
	/** Callback for Ctrl+P / Cmd+P (Print) */
	onPrint?: () => void;
	/** Callback for F1: Nomenclature 804n / clinical help */
	onF1Help?: () => void;
	/** Callback for F2: Global quick patient search modal */
	onSearchPatient?: () => void;
	/** Callback for F3: Create new appointment / quick booking */
	onNewAppointment?: () => void;
	/** Callback for F4: Odontogram FDI tooth formula */
	onF4Odontogram?: () => void;
	/** Callback for F5: Refresh clinical schedule data without reloading entire browser tab */
	onRefreshSchedule?: () => void;
	/** Callback for F6: Clinical rules / warnings panel */
	onF6ClinicalRules?: () => void;
	/** Callback for F7: Visiograph / X-Ray image capture */
	onF7Visiograph?: () => void;
	/** Callback for F8: Treatment plan / stages overview */
	onF8TreatmentPlan?: () => void;
	/** Callback for F9: Fast fiscal payment tender (54-FZ) */
	onF9Checkout?: () => void;
	/** Callback for F10: Outpatient documents / Form 043/u */
	onF10Documents?: () => void;
	/** Callback for F11: Kiosk / Fullscreen operatory mode */
	onF11ToggleKiosk?: () => void;
	/** Callback for F12: Quick print Form 043/u diary */
	onF12PrintDiary?: () => void;
	/** Callback for Ctrl+F / Cmd+F: Global clinic search (patient / record search) */
	onCtrlFSearch?: () => void;
	/** Callback for Alt+1..Alt+5: Quick tab / view navigation (Desktop operatory) */
	onSwitchTab?: (tabIndex: number) => void;
	/**
	 * When true, allows intercepting F5 for schedule refresh without page reload.
	 * When false or in web browser, standard F5 and Ctrl+F5 browser reload is preserved.
	 * (default: false in web browser, true in Desktop EXE)
	 */
	interceptBrowserF5?: boolean;
	/**
	 * When true, allows intercepting F11 for app kiosk mode.
	 * When false, preserves native browser/OS fullscreen toggle.
	 * (default: false in web browser, true in Desktop EXE)
	 */
	interceptBrowserF11?: boolean;
	/**
	 * When true, allows overriding F12 for custom action (e.g. print diary).
	 * By default false, ensuring Developer Tools console (F12) is NEVER blocked without explicit intention.
	 * (default: false)
	 */
	interceptBrowserF12?: boolean;
	/** Whether shortcuts are active (default: true) */
	enabled?: boolean;
	/**
	 * When true, single-key shortcuts (like Escape or Enter without Ctrl)
	 * are ignored when typing inside text inputs, textareas, or contenteditables.
	 * Modifier shortcuts like Ctrl+S and function keys (F2, F3, F5) fire regardless of input focus.
	 * (default: true)
	 */
	ignoreInputsForSingleKeys?: boolean;
}

/**
 * Safely detects desktop execution environment (Electron, Tauri, or Native Desktop bridge).
 */
function isDesktopEnv(): boolean {
	if (typeof window === "undefined") return false;
	const win = window as unknown as {
		denteDesktopNative?: { isDesktop?: boolean };
		electron?: unknown;
		process?: { versions?: { electron?: string } };
		__TAURI__?: unknown;
	};
	return Boolean(
		win.denteDesktopNative?.isDesktop ||
		win.electron !== undefined ||
		win.process?.versions?.electron !== undefined ||
		win.__TAURI__ !== undefined,
	);
}

/**
 * Checks whether the currently focused element is a text input, textarea, or contenteditable.
 */
export function isTypingInInputElement(target: EventTarget | null): boolean {
	if (!target) return false;
	const el = target as { tagName?: string; isContentEditable?: boolean; type?: string };
	if (!el.tagName) return false;

	const tagName = el.tagName.toUpperCase();
	if (tagName === "TEXTAREA") return true;
	if (el.isContentEditable) return true;

	if (tagName === "INPUT") {
		const inputType = (el.type || "").toLowerCase();
		const nonTextTypes = ["checkbox", "radio", "button", "submit", "reset", "file", "range", "color"];
		return !nonTextTypes.includes(inputType);
	}

	return false;
}

/**
 * Helper to dispatch decoupled custom events for shortcuts across components.
 */
export function dispatchDesktopShortcut(
	shortcut: "f1" | "f2" | "f3" | "f4" | "f5" | "f6" | "f7" | "f8" | "f9" | "f10" | "f11" | "f12" | "escape" | "save" | "print" | "ctrl_f" | "tab_1" | "tab_2" | "tab_3" | "tab_4" | "tab_5",
): void {
	if (typeof window === "undefined" || !window.dispatchEvent) return;
	try {
		window.dispatchEvent(new CustomEvent(`dente:shortcut:${shortcut}`, { bubbles: true }));
	} catch {}
}

export function useDesktopShortcuts(options: UseDesktopShortcutsOptions = {}): void {
	const {
		onSave,
		onEscape,
		onCloseModal,
		onSubmit,
		onPrint,
		onF1Help,
		onSearchPatient,
		onNewAppointment,
		onF4Odontogram,
		onRefreshSchedule,
		onF9Checkout,
		onF11ToggleKiosk,
		onF12PrintDiary,
		enabled = true,
		ignoreInputsForSingleKeys = true,
	} = options;

	const optionsRef = useRef(options);
	optionsRef.current = options;

	useEffect(() => {
		if (!enabled) return;
		if (typeof window === "undefined") return;

		const handleKeyDown = (e: KeyboardEvent) => {
			const isCtrlOrMeta = e.ctrlKey || e.metaKey;
			const key = e.key ? e.key.toLowerCase() : "";
			const code = e.code || "";
			const isInputFocused = isTypingInInputElement(e.target);

			// 0. F1: Nomenclature 804n / clinical help
			if (e.key === "F1" || code === "F1") {
				if (optionsRef.current.onF1Help) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onF1Help();
					dispatchDesktopShortcut("f1");
					return;
				}
			}

			// 1. F2: Quick patient search
			if (e.key === "F2" || code === "F2") {
				if (optionsRef.current.onSearchPatient) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onSearchPatient();
					dispatchDesktopShortcut("f2");
					return;
				}
			}

			// 2. F3: New appointment / visit creation
			if (e.key === "F3" || code === "F3") {
				if (optionsRef.current.onNewAppointment) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onNewAppointment();
					dispatchDesktopShortcut("f3");
					return;
				}
			}

			// 2B. F4: Odontogram FDI tooth formula
			if (e.key === "F4" || code === "F4") {
				if (optionsRef.current.onF4Odontogram) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onF4Odontogram();
					dispatchDesktopShortcut("f4");
					return;
				}
			}

			// 3. F5: Refresh clinical schedule without destroying dirty form drafts
			if (e.key === "F5" || code === "F5") {
				// NEVER intercept if user holds Ctrl, Shift, Alt, or Meta (preserves Ctrl+F5 / Shift+F5 hard reload)
				if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) {
					return;
				}
				const shouldIntercept = optionsRef.current.interceptBrowserF5 ?? isDesktopEnv();
				if (optionsRef.current.onRefreshSchedule) {
					if (shouldIntercept) {
						e.preventDefault();
						e.stopPropagation();
					}
					optionsRef.current.onRefreshSchedule();
					dispatchDesktopShortcut("f5");
					if (shouldIntercept) return;
				}
			}

			// 3A-1. F6: Clinical rules / warnings panel
			if (e.key === "F6" || code === "F6") {
				if (optionsRef.current.onF6ClinicalRules) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onF6ClinicalRules();
					dispatchDesktopShortcut("f6");
					return;
				}
			}

			// 3A-2. F7: Visiograph / X-Ray image capture
			if (e.key === "F7" || code === "F7") {
				if (optionsRef.current.onF7Visiograph) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onF7Visiograph();
					dispatchDesktopShortcut("f7");
					return;
				}
			}

			// 3A-3. F8: Treatment plan / stages overview
			if (e.key === "F8" || code === "F8") {
				if (optionsRef.current.onF8TreatmentPlan) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onF8TreatmentPlan();
					dispatchDesktopShortcut("f8");
					return;
				}
			}

			// 3B. F9: Fast fiscal payment tender (54-FZ)
			if (e.key === "F9" || code === "F9") {
				if (optionsRef.current.onF9Checkout) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onF9Checkout();
					dispatchDesktopShortcut("f9");
					return;
				}
			}

			// 3B-2. F10: Outpatient documents / Form 043/u
			if (e.key === "F10" || code === "F10") {
				if (optionsRef.current.onF10Documents) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onF10Documents();
					dispatchDesktopShortcut("f10");
					return;
				}
			}

			// 3C. F11: Kiosk / Fullscreen operatory mode
			if (e.key === "F11" || code === "F11") {
				// In web browser, preserve standard F11 OS/browser fullscreen toggle unless explicitly overridden
				const shouldIntercept = optionsRef.current.interceptBrowserF11 ?? isDesktopEnv();
				if (optionsRef.current.onF11ToggleKiosk) {
					if (shouldIntercept) {
						e.preventDefault();
						e.stopPropagation();
					}
					optionsRef.current.onF11ToggleKiosk();
					dispatchDesktopShortcut("f11");
					if (shouldIntercept) return;
				}
			}

			// 3D. F12: Developer Tools console (F12) preserved by default!
			if (e.key === "F12" || code === "F12") {
				// NEVER hijack F12 (DevTools console) unless explicitly enabled with interceptBrowserF12: true
				if (!optionsRef.current.interceptBrowserF12) {
					return;
				}
				if (optionsRef.current.onF12PrintDiary) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onF12PrintDiary();
					dispatchDesktopShortcut("f12");
					return;
				}
			}

			// 4. Ctrl+S / Cmd+S: Quick Save active visit diary / form
			// Note: Cyrillic keyboard layout maps "s" to "ы" (KeyS)
			if (isCtrlOrMeta && (key === "s" || key === "ы" || code === "KeyS") && !e.altKey && !e.shiftKey) {
				if (optionsRef.current.onSave) {
					e.preventDefault();
					e.stopPropagation();
					void optionsRef.current.onSave();
					dispatchDesktopShortcut("save");
					return;
				}
			}

			// 4B. Ctrl+F / Cmd+F: Global clinic search (patient / record search)
			// Note: Cyrillic keyboard layout maps "f" to "а" (KeyF)
			if (isCtrlOrMeta && (key === "f" || key === "а" || code === "KeyF") && !e.altKey && !e.shiftKey) {
				if (optionsRef.current.onCtrlFSearch || optionsRef.current.onSearchPatient) {
					e.preventDefault();
					e.stopPropagation();
					if (optionsRef.current.onCtrlFSearch) {
						optionsRef.current.onCtrlFSearch();
					} else if (optionsRef.current.onSearchPatient) {
						optionsRef.current.onSearchPatient();
					}
					dispatchDesktopShortcut("ctrl_f");
					return;
				}
			}

			// 4C. Alt+1..Alt+5: Quick View Switching (Desktop Operatory Hotkeys)
			if (e.altKey && !isCtrlOrMeta && !e.shiftKey && optionsRef.current.onSwitchTab) {
				const num = parseInt(e.key, 10);
				if (!isNaN(num) && num >= 1 && num <= 5) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onSwitchTab(num);
					const tabShortcut = `tab_${num}` as "tab_1" | "tab_2" | "tab_3" | "tab_4" | "tab_5";
					dispatchDesktopShortcut(tabShortcut);
					return;
				}
			}

			// 5. Ctrl+P / Cmd+P: Quick Print
			// Note: Cyrillic keyboard layout maps "p" to "з" (KeyP)
			if (isCtrlOrMeta && (key === "p" || key === "з" || code === "KeyP") && !e.altKey && !e.shiftKey) {
				if (optionsRef.current.onPrint) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onPrint();
					dispatchDesktopShortcut("print");
					return;
				}
			}

			// 6. Ctrl+Enter: Form / Action submission from inside textareas
			if (isCtrlOrMeta && (e.key === "Enter" || code === "Enter")) {
				if (optionsRef.current.onSubmit) {
					e.preventDefault();
					e.stopPropagation();
					optionsRef.current.onSubmit();
					return;
				}
			}

			// 7. Escape: Cancel / Close modal or drawer
			if (e.key === "Escape" || code === "Escape") {
				const closeHandler = optionsRef.current.onCloseModal || optionsRef.current.onEscape;
				if (closeHandler) {
					// Allow Escape to dismiss even if typing in input
					e.preventDefault();
					e.stopPropagation();
					closeHandler();
					dispatchDesktopShortcut("escape");
					return;
				}
			}

			// 8. Plain Enter: Submit when NOT typing in textarea or multiline input
			if (e.key === "Enter" && !isCtrlOrMeta && !e.shiftKey) {
				if (isInputFocused && ignoreInputsForSingleKeys) {
					// Don't intercept Enter in multiline textarea
					const target = e.target as HTMLElement;
					if (target.tagName.toUpperCase() === "TEXTAREA" || target.isContentEditable) {
						return;
					}
				}

				if (optionsRef.current.onSubmit && !isInputFocused) {
					e.preventDefault();
					optionsRef.current.onSubmit();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [enabled, ignoreInputsForSingleKeys]);
}
