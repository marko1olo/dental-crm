/**
 * spotlightGeometry.ts
 *
 * DENTE CRM — Pure Mathematical Engine for Spotlight Cutout & Coach Mark Geometry
 *
 * Authorities:
 * - Mandate 8d: 7 Deadly Sins of UI (Zero pixel overlap, no clipping outside viewport, mobile safety).
 * - Mandate 8e: Doctor Autonomy (Non-blocking, ergonomically centered viewports).
 * - Mandate 8s: Friction-Killer (100% deterministic geometry calculation, defensive math).
 */

export interface SimpleRect {
	readonly top: number;
	readonly left: number;
	readonly width: number;
	readonly height: number;
	readonly bottom?: number;
	readonly right?: number;
}

export interface ViewportDimensions {
	readonly width: number;
	readonly height: number;
}

export interface CutoutRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly rx: number;
}

export type TooltipSide = "bottom" | "top" | "left" | "right" | "center";

export interface TooltipPlacement {
	readonly top: number;
	readonly left: number;
	readonly width: number;
	readonly maxHeight: number;
	readonly side: TooltipSide;
	readonly arrowOffsetPx: number;
}

/**
 * Calculates smooth spotlight cutout dimensions with protective padding and safe clamping.
 * Defensively handles partially clipped, negative, and oversized elements.
 */
export function calculateSpotlightCutout(
	targetRect: SimpleRect | null | undefined,
	padding = 8,
	borderRadius = 8,
	viewport: ViewportDimensions = { width: 1920, height: 1080 },
): CutoutRect | null {
	if (!targetRect || targetRect.width <= 0 || targetRect.height <= 0) {
		return null;
	}

	const safeViewportW = Math.max(320, viewport.width);
	const safeViewportH = Math.max(320, viewport.height);

	// Compute target boundaries
	const targetRight = targetRect.right ?? (targetRect.left + targetRect.width);
	const targetBottom = targetRect.bottom ?? (targetRect.top + targetRect.height);

	// Check if element is completely outside the viewport
	if (
		targetRight <= 0 ||
		targetRect.left >= safeViewportW ||
		targetBottom <= 0 ||
		targetRect.top >= safeViewportH
	) {
		return null;
	}

	// Compute padded cutout coordinates
	const rawX = targetRect.left - padding;
	const rawY = targetRect.top - padding;
	const rawRight = targetRight + padding;
	const rawBottom = targetBottom + padding;

	// Clamp to viewport boundaries
	const x = Math.max(0, Math.round(rawX));
	const y = Math.max(0, Math.round(rawY));
	const clampedRight = Math.min(safeViewportW, Math.round(rawRight));
	const clampedBottom = Math.min(safeViewportH, Math.round(rawBottom));

	const width = Math.max(0, clampedRight - x);
	const height = Math.max(0, clampedBottom - y);

	if (width <= 0 || height <= 0) {
		return null;
	}

	// rx cannot exceed half of width or height to prevent visual distortion
	const maxPossibleRx = Math.min(Math.floor(width / 2), Math.floor(height / 2));
	const rx = Math.max(0, Math.min(borderRadius, maxPossibleRx));

	return { x, y, width, height, rx };
}

/**
 * Calculates adaptive placement for coach mark floating cards so they NEVER obscure the highlighted control.
 * Defensively adapts to mobile screens (320px..430px) and compact browser heights.
 *
 * Hierarchy of Placement Preference:
 * 1. Bottom (if space permits)
 * 2. Top (if space permits)
 * 3. Right (side placement)
 * 4. Left (side placement)
 * 5. Screen center dock fallback
 */
export function calculateTooltipPlacement(
	targetRect: SimpleRect | null | undefined,
	preferredWidth = 380,
	preferredHeight = 260,
	viewport: ViewportDimensions = { width: 1920, height: 1080 },
	margin = 14,
): TooltipPlacement {
	const minMarginFromScreen = 16;
	const safeViewportW = Math.max(320, viewport.width);
	const safeViewportH = Math.max(320, viewport.height);

	// Adapt width for mobile viewports (e.g. 375px screen -> 375 - 32 = 343px max)
	const effectiveWidth = Math.min(preferredWidth, safeViewportW - minMarginFromScreen * 2);
	const maxHeight = Math.max(180, safeViewportH - minMarginFromScreen * 2);
	const effectiveHeight = Math.min(preferredHeight, maxHeight);

	// Case 1: No target element — place gracefully at bottom-right or center dock
	if (!targetRect || targetRect.width <= 0 || targetRect.height <= 0) {
		const top = Math.max(
			minMarginFromScreen,
			Math.min(safeViewportH - effectiveHeight - minMarginFromScreen, safeViewportH - effectiveHeight - 24),
		);
		const left = Math.max(
			minMarginFromScreen,
			Math.min(safeViewportW - effectiveWidth - minMarginFromScreen, safeViewportW - effectiveWidth - 24),
		);

		return {
			top: Math.round(top),
			left: Math.round(left),
			width: Math.round(effectiveWidth),
			maxHeight: Math.round(maxHeight),
			side: "center",
			arrowOffsetPx: Math.round(effectiveWidth / 2),
		};
	}

	const targetBottom = targetRect.bottom ?? (targetRect.top + targetRect.height);
	const targetRight = targetRect.right ?? (targetRect.left + targetRect.width);
	const targetCenterX = targetRect.left + targetRect.width / 2;
	const targetCenterY = targetRect.top + targetRect.height / 2;

	let side: TooltipSide;
	let top: number;
	let left: number;

	const spaceBelow = safeViewportH - (targetBottom + margin);
	const spaceAbove = targetRect.top - margin;
	const spaceRight = safeViewportW - (targetRight + margin);
	const spaceLeft = targetRect.left - margin;

	if (spaceBelow >= effectiveHeight) {
		// Prefer below target
		side = "bottom";
		top = targetBottom + margin;
		const idealLeft = targetCenterX - effectiveWidth / 2;
		left = Math.max(
			minMarginFromScreen,
			Math.min(safeViewportW - effectiveWidth - minMarginFromScreen, idealLeft),
		);
	} else if (spaceAbove >= effectiveHeight) {
		// Place above target
		side = "top";
		top = targetRect.top - margin - effectiveHeight;
		const idealLeft = targetCenterX - effectiveWidth / 2;
		left = Math.max(
			minMarginFromScreen,
			Math.min(safeViewportW - effectiveWidth - minMarginFromScreen, idealLeft),
		);
	} else if (spaceRight >= effectiveWidth && safeViewportW >= 640) {
		// Place to the right of target (desktop / wide screens only)
		side = "right";
		left = targetRight + margin;
		const idealTop = targetCenterY - effectiveHeight / 2;
		top = Math.max(
			minMarginFromScreen,
			Math.min(safeViewportH - effectiveHeight - minMarginFromScreen, idealTop),
		);
	} else if (spaceLeft >= effectiveWidth && safeViewportW >= 640) {
		// Place to the left of target (desktop / wide screens only)
		side = "left";
		left = targetRect.left - margin - effectiveWidth;
		const idealTop = targetCenterY - effectiveHeight / 2;
		top = Math.max(
			minMarginFromScreen,
			Math.min(safeViewportH - effectiveHeight - minMarginFromScreen, idealTop),
		);
	} else {
		// Compact viewport fallback (e.g. mobile or squeezed height):
		// Place wherever there is more vertical room (above or below)
		if (spaceBelow >= spaceAbove) {
			side = "bottom";
			top = Math.min(safeViewportH - effectiveHeight - minMarginFromScreen, targetBottom + 8);
		} else {
			side = "top";
			top = Math.max(minMarginFromScreen, targetRect.top - effectiveHeight - 8);
		}
		left = Math.max(minMarginFromScreen, safeViewportW - effectiveWidth - minMarginFromScreen);
	}

	// Final clamp to guarantee 0 overflow
	top = Math.max(minMarginFromScreen, Math.min(safeViewportH - effectiveHeight - minMarginFromScreen, top));
	left = Math.max(minMarginFromScreen, Math.min(safeViewportW - effectiveWidth - minMarginFromScreen, left));

	// Calculate horizontal arrow offset clamped within card padding
	const arrowOffsetPx = Math.max(
		18,
		Math.min(effectiveWidth - 18, Math.round(targetCenterX - left)),
	);

	return {
		top: Math.round(top),
		left: Math.round(left),
		width: Math.round(effectiveWidth),
		maxHeight: Math.round(maxHeight),
		side,
		arrowOffsetPx,
	};
}

/**
 * Checks whether an element rect is fully visible in the viewport.
 */
export function isElementFullyInViewport(
	rect: SimpleRect | null | undefined,
	viewport: ViewportDimensions = { width: 1920, height: 1080 },
	safetyMargin = 20,
): boolean {
	if (!rect || rect.width <= 0 || rect.height <= 0) return false;
	const bottom = rect.bottom ?? (rect.top + rect.height);
	const right = rect.right ?? (rect.left + rect.width);

	return (
		rect.top >= safetyMargin &&
		rect.left >= safetyMargin &&
		bottom <= viewport.height - safetyMargin &&
		right <= viewport.width - safetyMargin
	);
}
