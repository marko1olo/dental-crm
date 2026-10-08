/**
 * DENTE CRM — Clinical Ergonomics & Gestures (Layer 1)
 *
 * Enforces touch targets (SanPiN / Apple HIG 44x44px, 48px gloved) and safe momentum swipe gestures.
 */

import {
	CLINICAL_TOUCH_TARGETS,
	type SafeSwipeOptions,
	DENTAL_ARCH_ADULT_UPPER,
	DENTAL_ARCH_ADULT_LOWER,
	DENTAL_ARCH_PEDIATRIC_UPPER,
	DENTAL_ARCH_PEDIATRIC_LOWER,
} from "./types";
import { triggerHaptic } from "./hapticsAndAudio";

/**
 * Validates whether an action button layout conforms to clinical ergonomics:
 * - pointerType: "fine" (Desktop mouse): enforces dense 28-36px grid without mobile bloat (Mandate 8c).
 * - pointerType: "coarse" (Touch / Tablet): enforces >= 48px gloved touch targets.
 */
export function validateClinicalActionButtonErgonomics(params: {
	heightPx: number;
	fontSizePx: number;
	hasVisibleRussianLabel: boolean;
	pointerType?: "coarse" | "fine" | undefined;
}): { isValid: boolean; issues: string[] } {
	const issues: string[] = [];
	const isFine = params.pointerType === "fine";

	if (isFine) {
		if (params.heightPx < CLINICAL_TOUCH_TARGETS.DESKTOP_DENSE_ACTION_MIN_HEIGHT_PX) {
			issues.push(
				`Высота кнопки (${params.heightPx}px) меньше десктопного норматива ${CLINICAL_TOUCH_TARGETS.DESKTOP_DENSE_ACTION_MIN_HEIGHT_PX}px`,
			);
		}
		if (params.fontSizePx < CLINICAL_TOUCH_TARGETS.DESKTOP_DENSE_FONT_SIZE_PX) {
			issues.push(
				`Размер шрифта (${params.fontSizePx}px) меньше десктопного норматива ${CLINICAL_TOUCH_TARGETS.DESKTOP_DENSE_FONT_SIZE_PX}px`,
			);
		}
	} else {
		if (params.heightPx < CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_MIN_HEIGHT_PX) {
			issues.push(
				`Высота кнопки (${params.heightPx}px) меньше клинического тач-норматива ${CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_MIN_HEIGHT_PX}px`,
			);
		}
		if (params.fontSizePx < CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_FONT_SIZE_PX) {
			issues.push(
				`Размер шрифта (${params.fontSizePx}px) меньше норматива ${CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_FONT_SIZE_PX}px`,
			);
		}
	}

	if (!params.hasVisibleRussianLabel) {
		issues.push("Запрет на изолированные иконки без поясняющего русского текста в главных клинических действиях");
	}
	return {
		isValid: issues.length === 0,
		issues,
	};
}

/**
 * Attaches a touch gesture handler that distinguishes intentional horizontal/vertical swipes
 * from natural list inertia momentum scrolling, preventing accidental screen dismissal or page bounce.
 */
export function registerSafeSwipeGesture(
	element: HTMLElement | Window | Document,
	options: SafeSwipeOptions,
): () => void {
	if (!element || typeof element.addEventListener !== "function") {
		return () => {};
	}

	let startX = 0;
	let startY = 0;
	let startTime = 0;
	const minDistance = options.minDistancePx ?? 48;
	const maxAngle = options.maxAngleDeg ?? 35;

	const handleTouchStart = (e: TouchEvent | Event) => {
		const touchEvent = e as TouchEvent;
		if (touchEvent.touches && touchEvent.touches.length === 1) {
			const touch = touchEvent.touches[0];
			if (touch) {
				startX = touch.clientX;
				startY = touch.clientY;
				startTime = Date.now();
			}
		}
	};

	const handleTouchEnd = (e: TouchEvent | Event) => {
		const touchEvent = e as TouchEvent;
		if (touchEvent.changedTouches && touchEvent.changedTouches.length === 1) {
			const touch = touchEvent.changedTouches[0];
			if (!touch) return;
			const deltaX = touch.clientX - startX;
			const deltaY = touch.clientY - startY;
			const elapsedMs = Date.now() - startTime;

			// Ignore if gesture took too long (> 600ms is slow drag, not swipe)
			if (elapsedMs > 600) return;

			const absX = Math.abs(deltaX);
			const absY = Math.abs(deltaY);

			// Check horizontal swipe
			if (absX >= minDistance && absX > absY) {
				const angleDeg = Math.atan2(absY, absX) * (180 / Math.PI);
				if (angleDeg <= maxAngle) {
					if (deltaX > 0 && options.onSwipeRight) {
						if (options.preventDefault && e.cancelable) e.preventDefault();
						options.onSwipeRight();
					} else if (deltaX < 0 && options.onSwipeLeft) {
						if (options.preventDefault && e.cancelable) e.preventDefault();
						options.onSwipeLeft();
					}
				}
			} else if (absY >= minDistance && absY > absX) {
				const angleDeg = Math.atan2(absX, absY) * (180 / Math.PI);
				if (angleDeg <= maxAngle) {
					if (deltaY > 0 && options.onSwipeDown) {
						if (options.preventDefault && e.cancelable) e.preventDefault();
						options.onSwipeDown();
					} else if (deltaY < 0 && options.onSwipeUp) {
						if (options.preventDefault && e.cancelable) e.preventDefault();
						options.onSwipeUp();
					}
				}
			}
		}
	};

	element.addEventListener("touchstart", handleTouchStart, { passive: true });
	element.addEventListener("touchend", handleTouchEnd, { passive: !options.preventDefault });

	return () => {
		element.removeEventListener("touchstart", handleTouchStart);
		element.removeEventListener("touchend", handleTouchEnd);
	};
}

/**
 * Returns opposing jaw tooth according to dental anatomy (e.g. 16 <-> 46, 21 <-> 31).
 */
export function getOpposingToothCode(toothNumber: number): number {
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
 * - Swipe Up / Down: flips between upper and lower jaw of opposing tooth (16 <-> 46)
 */
export function resolveNextToothBySwipe(
	currentTooth: number,
	direction: "left" | "right" | "up" | "down",
	pediatricMode = false,
): number {
	if (direction === "up" || direction === "down") {
		return getOpposingToothCode(currentTooth);
	}

	const isPediatric = pediatricMode || (currentTooth >= 51 && currentTooth <= 85);
	const upperArch = isPediatric ? DENTAL_ARCH_PEDIATRIC_UPPER : DENTAL_ARCH_ADULT_UPPER;
	const lowerArch = isPediatric ? DENTAL_ARCH_PEDIATRIC_LOWER : DENTAL_ARCH_ADULT_LOWER;

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

/**
 * Attaches a tooth swipe gesture handler to a container (e.g. tablet chairside odontogram).
 * Enables doctors to swipe left/right along the dental arch, or up/down between opposing upper/lower teeth.
 */
export function registerToothSwipeGesture(
	element: HTMLElement | Window | Document,
	activeTooth: number,
	onToothChange: (nextTooth: number) => void,
	options: {
		pediatricMode?: boolean;
		minDistancePx?: number;
		maxAngleDeg?: number;
		hapticFeedback?: boolean;
	} = {},
): () => void {
	const {
		pediatricMode = false,
		minDistancePx = 44,
		maxAngleDeg = 35,
		hapticFeedback = true,
	} = options;

	return registerSafeSwipeGesture(element, {
		minDistancePx,
		maxAngleDeg,
		onSwipeLeft: () => {
			const next = resolveNextToothBySwipe(activeTooth, "left", pediatricMode);
			if (next !== activeTooth) {
				if (hapticFeedback) triggerHaptic("selection");
				onToothChange(next);
			}
		},
		onSwipeRight: () => {
			const next = resolveNextToothBySwipe(activeTooth, "right", pediatricMode);
			if (next !== activeTooth) {
				if (hapticFeedback) triggerHaptic("selection");
				onToothChange(next);
			}
		},
		onSwipeDown: () => {
			const next = resolveNextToothBySwipe(activeTooth, "down", pediatricMode);
			if (next !== activeTooth) {
				if (hapticFeedback) triggerHaptic("selection");
				onToothChange(next);
			}
		},
		onSwipeUp: () => {
			const next = resolveNextToothBySwipe(activeTooth, "up", pediatricMode);
			if (next !== activeTooth) {
				if (hapticFeedback) triggerHaptic("selection");
				onToothChange(next);
			}
		},
	});
}
