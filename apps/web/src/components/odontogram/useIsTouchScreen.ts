import { useSyncExternalStore } from "react";

let cachedIsTouch: boolean | null = null;
const touchListeners = new Set<() => void>();
let isWindowResizeAttached = false;

function computeIsTouch(): boolean {
	if (typeof window === "undefined") return false;
	return (
		window.innerWidth <= 768 ||
		"ontouchstart" in window ||
		(typeof navigator !== "undefined" &&
			Boolean(navigator.maxTouchPoints) &&
			navigator.maxTouchPoints > 0)
	);
}

function handleResize() {
	const next = computeIsTouch();
	if (next !== cachedIsTouch) {
		cachedIsTouch = next;
		touchListeners.forEach((cb) => cb());
	}
}

function subscribe(callback: () => void): () => void {
	touchListeners.add(callback);
	if (!isWindowResizeAttached && typeof window !== "undefined") {
		window.addEventListener("resize", handleResize, { passive: true });
		isWindowResizeAttached = true;
	}
	return () => {
		touchListeners.delete(callback);
		if (touchListeners.size === 0 && typeof window !== "undefined") {
			window.removeEventListener("resize", handleResize);
			isWindowResizeAttached = false;
		}
	};
}

function getSnapshot(): boolean {
	if (cachedIsTouch === null) {
		cachedIsTouch = computeIsTouch();
	}
	return cachedIsTouch;
}

function getServerSnapshot(): boolean {
	return false;
}

/**
 * High-performance singleton touch screen detector hook.
 * Attaches exactly ONE passive resize listener to window across all 32+ teeth
 * to eliminate event listener spam and jank during scrolling on low-spec hardware.
 */
export function useIsTouchScreen(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
