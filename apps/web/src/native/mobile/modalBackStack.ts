/**
 * DENTE CRM — Android Hardware & Gesture Back Button Modal Stack (Layer 2)
 *
 * LIFO modal back stack intercepting Android Back button, gesture navigation, and Escape key.
 */

import type { ModalBackHandlerEntry } from "./types";
import { triggerHaptic } from "./hapticsAndAudio";

const modalBackStack: ModalBackHandlerEntry[] = [];
let isHardwareBackListenerInitialized = false;

/**
 * Registers a dismiss/close callback on the global LIFO Modal Back Stack.
 * When the user presses the Android hardware/gesture Back button or Escape key,
 * the topmost modal/drawer handler is executed instead of minimizing the app.
 */
export function pushModalBackHandler(
	id: string,
	handler: () => boolean | void,
	priority = 10,
): () => void {
	const existingIdx = modalBackStack.findIndex((entry) => entry.id === id);
	if (existingIdx !== -1) {
		modalBackStack.splice(existingIdx, 1);
	}

	modalBackStack.push({ id, handler, priority });
	// Higher priority at the end (top of stack); equal priority preserves LIFO order
	modalBackStack.sort((a, b) => a.priority - b.priority);

	if (typeof window !== "undefined" && !isHardwareBackListenerInitialized) {
		initHardwareBackButtonListener();
	}

	return () => {
		popModalBackHandler(id);
	};
}

/**
 * Removes a modal back handler by ID or pops the top handler from the stack.
 */
export function popModalBackHandler(id?: string): boolean {
	if (modalBackStack.length === 0) return false;
	if (id) {
		const idx = modalBackStack.findIndex((entry) => entry.id === id);
		if (idx !== -1) {
			modalBackStack.splice(idx, 1);
			return true;
		}
		return false;
	}
	modalBackStack.pop();
	return true;
}

/**
 * Returns current depth of the active modal back stack.
 */
export function getModalBackStackDepth(): number {
	return modalBackStack.length;
}

/**
 * Clears all modal back handlers (e.g. on full navigation reset).
 */
export function clearModalBackStack(): void {
	modalBackStack.length = 0;
}

/**
 * Executes the topmost modal back handler in the stack.
 * Returns true if an active modal/drawer was closed (consuming the back action),
 * or false if no modals were open (allowing default OS app minimization / navigation).
 */
export function handleHardwareBackAction(): boolean {
	if (modalBackStack.length === 0) {
		return false;
	}

	const top = modalBackStack.pop();
	if (!top) return false;

	try {
		const result = top.handler();
		if (result === false) {
			// Handler did not consume the action, continue down the stack
			return handleHardwareBackAction();
		}
		triggerHaptic("light");
		return true;
	} catch (err: unknown) {
		console.error("[HardwareBack] Error in modal back handler:", err);
		return true;
	}
}

/**
 * Initializes global Android hardware back button and Escape key listeners.
 */
export function initHardwareBackButtonListener(): () => void {
	if (typeof window === "undefined" || isHardwareBackListenerInitialized) {
		return () => {};
	}

	isHardwareBackListenerInitialized = true;

	// 1. Capacitor Native App backButton Event (Android .APK)
	const capacitorApp = (window as unknown as { Capacitor?: { Plugins?: { App?: { addListener?: (event: string, callback: (data: { canGoBack: boolean }) => void) => { remove: () => void }; exitApp?: () => void } } } }).Capacitor?.Plugins?.App;
	let capacitorListener: { remove: () => void } | undefined;
	if (capacitorApp?.addListener) {
		try {
			capacitorListener = capacitorApp.addListener("backButton", ({ canGoBack }: { canGoBack: boolean }) => {
				const consumed = handleHardwareBackAction();
				if (!consumed && !canGoBack && capacitorApp.exitApp) {
					capacitorApp.exitApp();
				}
			});
		} catch (err) {
			console.warn("[HardwareBack] Capacitor listener attachment failed:", err);
		}
	}

	// 2. Keyboard Escape / Android keycode 4 (Back)
	const keydownHandler = (e: KeyboardEvent) => {
		if (e.key === "Escape" || e.keyCode === 27 || e.keyCode === 4) {
			const consumed = handleHardwareBackAction();
			if (consumed) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
	};
	window.addEventListener("keydown", keydownHandler, true);

	// 3. Custom events for integration test harnesses
	const customBackHandler = (e: Event) => {
		const consumed = handleHardwareBackAction();
		if (consumed) {
			e.preventDefault();
			e.stopPropagation();
		}
	};
	window.addEventListener("ionBackButton", customBackHandler, true);
	window.addEventListener("dente:hardware-back", customBackHandler, true);

	return () => {
		isHardwareBackListenerInitialized = false;
		if (capacitorListener?.remove) capacitorListener.remove();
		window.removeEventListener("keydown", keydownHandler, true);
		window.removeEventListener("ionBackButton", customBackHandler, true);
		window.removeEventListener("dente:hardware-back", customBackHandler, true);
	};
}
