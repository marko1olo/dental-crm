/**
 * DENTE CRM — React Hook for Mobile Touch Gestures & Safe Swipes
 *
 * Integrates momentum-scroll isolation:
 * - Distinguishes intentional left/right/up/down swipes from natural inertia scrolling
 * - Ignores slow drags (> 600ms)
 * - Minimum swipe distance 48px (touch-first ergonomics for medical gloves)
 * - Maximum diagonal deviation angle 35 degrees
 */

import { useEffect, useRef, type RefObject } from "react";
import {
	registerSafeSwipeGesture,
	triggerHaptic,
	type SafeSwipeOptions,
} from "../native/mobileBridge";

export interface UseSafeSwipeOptions extends SafeSwipeOptions {
	/** Whether gesture detection is active (default: true) */
	enabled?: boolean;
}

/**
 * Attaches a safe swipe gesture listener to a container ref or document/window.
 */
export function useSafeSwipe<T extends HTMLElement = HTMLDivElement>(
	targetRef?: RefObject<T | null> | null,
	options: UseSafeSwipeOptions = {},
): void {
	const {
		onSwipeLeft,
		onSwipeRight,
		onSwipeUp,
		onSwipeDown,
		minDistancePx = 48,
		maxAngleDeg = 35,
		preventDefault = false,
		enabled = true,
	} = options;

	const optionsRef = useRef(options);
	optionsRef.current = options;

	useEffect(() => {
		if (!enabled) return;
		if (typeof window === "undefined") return;

		const targetElement = targetRef ? targetRef.current : window;
		if (!targetElement) return;

		const cleanup = registerSafeSwipeGesture(targetElement, {
			minDistancePx,
			maxAngleDeg,
			preventDefault,
			onSwipeLeft: () => optionsRef.current.onSwipeLeft?.(),
			onSwipeRight: () => optionsRef.current.onSwipeRight?.(),
			onSwipeUp: () => optionsRef.current.onSwipeUp?.(),
			onSwipeDown: () => optionsRef.current.onSwipeDown?.(),
		});

		return () => {
			cleanup();
		};
	}, [targetRef, minDistancePx, maxAngleDeg, preventDefault, enabled]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Odontogram Quadrant Swipe Navigation (Touch Tablets & Mobile APK)
// ─────────────────────────────────────────────────────────────────────────────

export type OdontogramQuadrantId =
	| "Q1"
	| "Q2"
	| "Q3"
	| "Q4"
	| "Q5"
	| "Q6"
	| "Q7"
	| "Q8"
	| "all";

export const ADULT_QUADRANT_ORDER: OdontogramQuadrantId[] = ["Q1", "Q2", "Q3", "Q4"];
export const PEDIATRIC_QUADRANT_ORDER: OdontogramQuadrantId[] = ["Q5", "Q6", "Q7", "Q8"];

/**
 * Resolves adjacent dental quadrant upon directional swipe.
 * - Swipe Left: advances to next clockwise quadrant (Q1 -> Q2 -> Q3 -> Q4 -> Q1)
 * - Swipe Right: returns to previous quadrant (Q2 -> Q1 -> Q4 -> Q3 -> Q2)
 * - Swipe Down / Up: toggles between upper and lower jaw of the same side (Q1 <-> Q4, Q2 <-> Q3)
 */
export function getNextQuadrantBySwipe(
	current: OdontogramQuadrantId,
	direction: "left" | "right" | "up" | "down",
	pediatricMode = false,
): OdontogramQuadrantId {
	const order = pediatricMode ? PEDIATRIC_QUADRANT_ORDER : ADULT_QUADRANT_ORDER;

	if (direction === "left") {
		const idx = order.indexOf(current);
		if (idx === -1) return order[0]!;
		return order[(idx + 1) % order.length]!;
	}
	if (direction === "right") {
		const idx = order.indexOf(current);
		if (idx === -1) return order[0]!;
		return order[(idx - 1 + order.length) % order.length]!;
	}
	if (direction === "down" || direction === "up") {
		const verticalMap: Record<string, OdontogramQuadrantId> = {
			Q1: "Q4",
			Q4: "Q1",
			Q2: "Q3",
			Q3: "Q2",
			Q5: "Q8",
			Q8: "Q5",
			Q6: "Q7",
			Q7: "Q6",
		};
		return verticalMap[current] ?? current;
	}
	return current;
}

export interface UseQuadrantSwipeOptions {
	activeQuadrant: OdontogramQuadrantId;
	onQuadrantChange: (nextQuad: OdontogramQuadrantId) => void;
	pediatricMode?: boolean;
	enabled?: boolean;
	hapticFeedback?: boolean;
}

/**
 * Hook for touch gesture navigation between dental formula quadrants.
 * Provides tactile haptic feedback (Mandate 8c, 8e) when switching quadrants at chairside.
 */
export function useQuadrantSwipe<T extends HTMLElement = HTMLDivElement>(
	targetRef: RefObject<T | null> | null | undefined,
	options: UseQuadrantSwipeOptions,
): void {
	const {
		activeQuadrant,
		onQuadrantChange,
		pediatricMode = false,
		enabled = true,
		hapticFeedback = true,
	} = options;

	useSafeSwipe(targetRef, {
		enabled,
		minDistancePx: 48,
		maxAngleDeg: 35,
		onSwipeLeft: () => {
			const next = getNextQuadrantBySwipe(activeQuadrant, "left", pediatricMode);
			if (next !== activeQuadrant) {
				if (hapticFeedback) triggerHaptic("selection");
				onQuadrantChange(next);
			}
		},
		onSwipeRight: () => {
			const next = getNextQuadrantBySwipe(activeQuadrant, "right", pediatricMode);
			if (next !== activeQuadrant) {
				if (hapticFeedback) triggerHaptic("selection");
				onQuadrantChange(next);
			}
		},
		onSwipeDown: () => {
			const next = getNextQuadrantBySwipe(activeQuadrant, "down", pediatricMode);
			if (next !== activeQuadrant) {
				if (hapticFeedback) triggerHaptic("selection");
				onQuadrantChange(next);
			}
		},
		onSwipeUp: () => {
			const next = getNextQuadrantBySwipe(activeQuadrant, "up", pediatricMode);
			if (next !== activeQuadrant) {
				if (hapticFeedback) triggerHaptic("selection");
				onQuadrantChange(next);
			}
		},
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Visit SubView Tabs Swipe Navigation (Odontogram <-> EMK <-> Anamnesis...)
// ─────────────────────────────────────────────────────────────────────────────

export type VisitSubViewTab =
	| "odontogram"
	| "emk"
	| "anamnesis"
	| "diagnostics"
	| "consents";

export const VISIT_TAB_SEQUENCE: VisitSubViewTab[] = [
	"odontogram",
	"emk",
	"anamnesis",
	"diagnostics",
	"consents",
];

/**
 * Resolves adjacent visit tab upon horizontal swipe.
 * - Swipe Left: advances to next tab (e.g. Odontogram -> EMK 043/u)
 * - Swipe Right: returns to previous tab (e.g. EMK 043/u -> Odontogram)
 */
export function getNextVisitTabBySwipe(
	current: VisitSubViewTab,
	direction: "left" | "right",
): VisitSubViewTab {
	const idx = VISIT_TAB_SEQUENCE.indexOf(current);
	if (idx === -1) return VISIT_TAB_SEQUENCE[0]!;
	if (direction === "left") {
		return VISIT_TAB_SEQUENCE[Math.min(idx + 1, VISIT_TAB_SEQUENCE.length - 1)]!;
	}
	return VISIT_TAB_SEQUENCE[Math.max(idx - 1, 0)]!;
}

export interface UseVisitTabSwipeOptions {
	activeTab: VisitSubViewTab;
	onTabChange: (nextTab: VisitSubViewTab) => void;
	enabled?: boolean;
	hapticFeedback?: boolean;
}

/**
 * Hook for touch gesture navigation across clinical visit sections.
 * Enables 1-swipe movement between tooth formula, Form 043/u diary, anamnesis, X-ray, and consents.
 */
export function useVisitTabSwipe<T extends HTMLElement = HTMLDivElement>(
	targetRef: RefObject<T | null> | null | undefined,
	options: UseVisitTabSwipeOptions,
): void {
	const {
		activeTab,
		onTabChange,
		enabled = true,
		hapticFeedback = true,
	} = options;

	useSafeSwipe(targetRef, {
		enabled,
		minDistancePx: 52,
		maxAngleDeg: 30,
		onSwipeLeft: () => {
			const next = getNextVisitTabBySwipe(activeTab, "left");
			if (next !== activeTab) {
				if (hapticFeedback) triggerHaptic("selection");
				onTabChange(next);
			}
		},
		onSwipeRight: () => {
			const next = getNextVisitTabBySwipe(activeTab, "right");
			if (next !== activeTab) {
				if (hapticFeedback) triggerHaptic("selection");
				onTabChange(next);
			}
		},
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Odontogram Tooth-by-Tooth Swipe Navigation (FDI 11..48 / 51..85)
// ─────────────────────────────────────────────────────────────────────────────

export const ADULT_UPPER_ARCH: readonly number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const ADULT_LOWER_ARCH: readonly number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const PEDIATRIC_UPPER_ARCH: readonly number[] = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const PEDIATRIC_LOWER_ARCH: readonly number[] = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

/**
 * Returns opposing jaw tooth according to dental anatomy (e.g. 16 <-> 46, 21 <-> 31).
 */
export function getOpposingTooth(toothNumber: number): number {
	const quadrant = Math.floor(toothNumber / 10);
	const position = toothNumber % 10;
	if (quadrant === 1) return 40 + position; // 1x -> 4x
	if (quadrant === 4) return 10 + position; // 4x -> 1x
	if (quadrant === 2) return 30 + position; // 2x -> 3x
	if (quadrant === 3) return 20 + position; // 3x -> 2x
	if (quadrant === 5) return 80 + position; // 5x -> 8x
	if (quadrant === 8) return 50 + position; // 8x -> 5x
	if (quadrant === 6) return 70 + position; // 6x -> 7x
	if (quadrant === 7) return 60 + position; // 7x -> 6x
	return toothNumber;
}

/**
 * Resolves adjacent dental tooth upon directional swipe.
 * - Swipe Left: advances along dental arch towards opposite quadrant
 * - Swipe Right: returns along dental arch towards molar end
 * - Swipe Up / Down: flips between upper and lower jaw of the same tooth (e.g. 16 <-> 46)
 */
export function getNextToothBySwipe(
	currentTooth: number,
	direction: "left" | "right" | "up" | "down",
	pediatricMode = false,
): number {
	if (direction === "up" || direction === "down") {
		return getOpposingTooth(currentTooth);
	}

	const isPediatric = pediatricMode || (currentTooth >= 51 && currentTooth <= 85);
	const upperArch = isPediatric ? PEDIATRIC_UPPER_ARCH : ADULT_UPPER_ARCH;
	const lowerArch = isPediatric ? PEDIATRIC_LOWER_ARCH : ADULT_LOWER_ARCH;

	const arch = upperArch.includes(currentTooth) ? upperArch : lowerArch.includes(currentTooth) ? lowerArch : upperArch;
	const idx = arch.indexOf(currentTooth);
	if (idx === -1) return arch[0] ?? currentTooth;

	if (direction === "left") {
		return arch[Math.min(idx + 1, arch.length - 1)] ?? currentTooth;
	}
	if (direction === "right") {
		return arch[Math.max(idx - 1, 0)] ?? currentTooth;
	}

	return currentTooth;
}

export interface UseToothSwipeOptions {
	activeTooth: number;
	onToothChange: (nextTooth: number) => void;
	pediatricMode?: boolean;
	enabled?: boolean;
	hapticFeedback?: boolean;
}

/**
 * Hook for touch gesture navigation between individual teeth on chairside tablet/mobile.
 * Left/Right swipes move along dental arch; Up/Down flips between upper and lower jaw.
 */
export function useToothSwipe<T extends HTMLElement = HTMLDivElement>(
	targetRef: RefObject<T | null> | null | undefined,
	options: UseToothSwipeOptions,
): void {
	const {
		activeTooth,
		onToothChange,
		pediatricMode = false,
		enabled = true,
		hapticFeedback = true,
	} = options;

	useSafeSwipe(targetRef, {
		enabled,
		minDistancePx: 44,
		maxAngleDeg: 35,
		onSwipeLeft: () => {
			const next = getNextToothBySwipe(activeTooth, "left", pediatricMode);
			if (next !== activeTooth) {
				if (hapticFeedback) triggerHaptic("selection");
				onToothChange(next);
			}
		},
		onSwipeRight: () => {
			const next = getNextToothBySwipe(activeTooth, "right", pediatricMode);
			if (next !== activeTooth) {
				if (hapticFeedback) triggerHaptic("selection");
				onToothChange(next);
			}
		},
		onSwipeDown: () => {
			const next = getNextToothBySwipe(activeTooth, "down", pediatricMode);
			if (next !== activeTooth) {
				if (hapticFeedback) triggerHaptic("selection");
				onToothChange(next);
			}
		},
		onSwipeUp: () => {
			const next = getNextToothBySwipe(activeTooth, "up", pediatricMode);
			if (next !== activeTooth) {
				if (hapticFeedback) triggerHaptic("selection");
				onToothChange(next);
			}
		},
	});
}
