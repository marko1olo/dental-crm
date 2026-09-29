/**
 * DENTE CRM — CBCT Oblique Multi-Planar Reconstruction (Oblique MPR) Mathematical Engine
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Capabilities:
 * 1. 3D Axis Oblique Rotation: Axial Angle (yaw), Coronal Tilt (pitch), Sagittal Tilt (roll).
 * 2. Interactive Mouse W/L (Right-click drag), Cursor-anchored Zoom (0.5x–5.0x), and Pan.
 * 3. Interactive Canvas Rotation Handles & Hit-testing for in-plane crosshair rotation.
 * 4. Canvas Oblique Crosshair, Reticle & Rotation Handles Rendering.
 * 5. Mouse Wheel Slice Navigation & Full Viewport Clinical Reset Math.
 *
 * Decomposed under 800 lines per Mandate 8s / 8l:
 * - Matrix, Vector & Projection math: ./cbctObliqueMatrixMath.ts
 * - Sub-voxel Trilinear Sampling & Slice Extraction: ./cbctObliqueSliceMath.ts
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	Point3D,
} from "./cbctMprMath";
import {
	clampCoordinateToVolume,
	sampleVoxelHU,
} from "./cbctCoordinateMath";
import { createEmptyCbctVolume } from "./cbctVolumeLifecycleMath";
import { ROMEXIS_COLORS } from "./cbctOverlayDecorationMath";
import {
	huToGrayscale,
	generate16BitLut,
	get16BitLut,
	applyLutToHU,
	clearLutCache,
} from "./cbctLutMath";

import {
	type ObliqueRotationAngles,
	type ViewportTransform,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	degToRad,
	radToDeg,
	computeObliquePlaneBasis,
} from "./cbctObliqueMatrixMath";

// ─── TRANSPARENT RE-EXPORTS (ZERO-DOWNTIME CONTRACT) ─────────────────────────
export * from "./cbctObliqueMatrixMath";
export * from "./cbctObliqueSliceMath";
export {
	createEmptyCbctVolume,
	sampleVoxelHU,
	clampCoordinateToVolume,
	generate16BitLut,
	get16BitLut,
	applyLutToHU,
	clearLutCache,
	huToGrayscale,
};

// ─── 1. OBLIQUE ROTATION & CLINICAL LABELS ───────────────────────────────────

/**
 * Returns clinical localized rotation label for the given plane.
 */
export function getObliqueRotationLabel(plane: MprPlane, angleDeg: number): string {
	const safeAngle = Number.isFinite(angleDeg) ? angleDeg : 0;
	const sign = safeAngle > 0 ? "+" : "";
	const formatted = `${sign}${safeAngle.toFixed(1)}°`;
	switch (plane) {
		case "axial":
			return `Поворот: ${formatted}`;
		case "coronal":
			return `Наклон: ${formatted}`;
		case "sagittal":
			return `Наклон: ${formatted}`;
	}
}

/**
 * Resets all 3 oblique rotation angles back to 0.0°.
 */
export function resetObliqueRotationAngles(_angles?: ObliqueRotationAngles): ObliqueRotationAngles {
	return { ...DEFAULT_OBLIQUE_ROTATION };
}

/**
 * Resets the oblique rotation angle for a single plane back to 0.0°.
 */
export function resetPlaneObliqueAngle(
	angles: ObliqueRotationAngles,
	plane: MprPlane,
): ObliqueRotationAngles {
	const current = angles ?? DEFAULT_OBLIQUE_ROTATION;
	switch (plane) {
		case "axial":
			return { ...current, axialAngleDeg: 0 };
		case "coronal":
			return { ...current, coronalTiltDeg: 0 };
		case "sagittal":
			return { ...current, sagittalTiltDeg: 0 };
	}
}

export type RotationHandlePosition = "u_pos" | "u_neg" | "v_pos" | "v_neg";

export interface RotationHandleInfo {
	readonly position: RotationHandlePosition;
	readonly canvasX: number;
	readonly canvasY: number;
	readonly radiusPx: number;
	readonly plane: MprPlane;
	readonly baseAngleDeg: number;
}

export interface ObliqueCrosshairDrawOptions {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly centerPx: { readonly x: number; readonly y: number };
	readonly plane: MprPlane;
	readonly rotationDeg: number;
	readonly handleDistancePx?: number;
	readonly activeHandle?: RotationHandlePosition | null;
	readonly hoveredHandle?: RotationHandlePosition | null;
	readonly showHandles?: boolean;
	readonly showAngleBadge?: boolean;
	readonly invertColors?: boolean;
	readonly isHovered?: boolean | undefined;
	readonly centerGapPx?: number;
}

// ─── 2. INTERACTIVE WINDOW / LEVEL & ZOOM / PAN MATH ─────────────────────────

/**
 * Calculates updated Window Width and Level from mouse drag deltas (Right Click Drag).
 * DeltaX adjusts Window Width (Contrast), DeltaY adjusts Window Level (Brightness).
 */
export function applyWindowLevelDrag(
	currentWW: number,
	currentWL: number,
	deltaX: number,
	deltaY: number,
	sensitivity = 2.0,
): { windowWidth: number; windowLevel: number } {
	const newWW = Math.max(1, Math.min(6000, Math.round(currentWW + deltaX * sensitivity)));
	const newWL = Math.max(-1500, Math.min(3000, Math.round(currentWL - deltaY * sensitivity)));

	return {
		windowWidth: newWW,
		windowLevel: newWL,
	};
}

/**
 * Calculates smooth zoom toward cursor position while preserving the world point under the mouse.
 */
export function applyCursorZoom(
	currentTransform: ViewportTransform,
	cursorPx: { readonly x: number; readonly y: number },
	zoomDelta: number,
	minZoom = 0.5,
	maxZoom = 5.0,
): ViewportTransform {
	const safeMin = Math.max(0.1, minZoom);
	const safeMax = Math.max(safeMin, maxZoom);
	const currentZoom = Number.isFinite(currentTransform?.zoom) && currentTransform.zoom >= safeMin
		? Math.min(safeMax, currentTransform.zoom)
		: 1.0;
	const panX = Number.isFinite(currentTransform?.panX) ? currentTransform.panX : 0;
	const panY = Number.isFinite(currentTransform?.panY) ? currentTransform.panY : 0;

	if (!Number.isFinite(zoomDelta)) {
		return {
			zoom: Number(currentZoom.toFixed(3)),
			panX: Number(panX.toFixed(1)),
			panY: Number(panY.toFixed(1)),
		};
	}

	const zoomFactor = Math.exp(-zoomDelta * 0.0015);
	const newZoom = Math.max(safeMin, Math.min(safeMax, currentZoom * zoomFactor));

	const curX = Number.isFinite(cursorPx?.x) ? cursorPx.x : 0;
	const curY = Number.isFinite(cursorPx?.y) ? cursorPx.y : 0;

	const worldPointX = (curX - panX) / currentZoom;
	const worldPointY = (curY - panY) / currentZoom;

	const newPanX = curX - worldPointX * newZoom;
	const newPanY = curY - worldPointY * newZoom;

	return {
		zoom: Number(newZoom.toFixed(3)),
		panX: Number(newPanX.toFixed(1)),
		panY: Number(newPanY.toFixed(1)),
	};
}

/**
 * Calculates updated pan offset from mouse drag deltas (Middle Click / Pan).
 */
export function applyPanDrag(
	currentTransform: ViewportTransform,
	deltaX: number,
	deltaY: number,
): ViewportTransform {
	const currentZoom = Number.isFinite(currentTransform?.zoom) && currentTransform.zoom > 0 ? currentTransform.zoom : 1.0;
	const currentPanX = Number.isFinite(currentTransform?.panX) ? currentTransform.panX : 0;
	const currentPanY = Number.isFinite(currentTransform?.panY) ? currentTransform.panY : 0;
	const safeDx = Number.isFinite(deltaX) ? deltaX : 0;
	const safeDy = Number.isFinite(deltaY) ? deltaY : 0;

	return {
		zoom: currentZoom,
		panX: Number((currentPanX + safeDx).toFixed(1)),
		panY: Number((currentPanY + safeDy).toFixed(1)),
	};
}

/**
 * Resets viewport zoom and pan to initial 1.0x centered state.
 */
export function resetViewportTransform(): ViewportTransform {
	return { ...DEFAULT_VIEWPORT_TRANSFORM };
}

// ─── 3. INTERACTIVE CANVAS ROTATION HANDLES & HIT-TESTING ───────────────────

/**
 * Computes the 4 rotation handle positions in canvas pixel space relative to the crosshair center.
 */
export function getRotationHandles(
	plane: MprPlane,
	canvasWidth: number,
	canvasHeight: number,
	crosshairCenterPx: { readonly x: number; readonly y: number },
	handleDistancePx = 60,
	rotationDeg = 0,
): RotationHandleInfo[] {
	const rotRad = degToRad(rotationDeg);
	const cosA = Math.cos(rotRad);
	const sinA = Math.sin(rotRad);

	const d = handleDistancePx;
	const rPx = 6.0;

	const positions: { pos: RotationHandlePosition; dx: number; dy: number; baseAngle: number }[] = [
		{ pos: "u_pos", dx: d * cosA, dy: d * sinA, baseAngle: 0 },
		{ pos: "u_neg", dx: -d * cosA, dy: -d * sinA, baseAngle: 180 },
		{ pos: "v_pos", dx: -d * sinA, dy: d * cosA, baseAngle: 90 },
		{ pos: "v_neg", dx: d * sinA, dy: -d * cosA, baseAngle: 270 },
	];

	return positions.map((p) => ({
		position: p.pos,
		canvasX: Math.round(crosshairCenterPx.x + p.dx),
		canvasY: Math.round(crosshairCenterPx.y + p.dy),
		radiusPx: rPx,
		plane,
		baseAngleDeg: p.baseAngle,
	}));
}

/**
 * Hit tests pointer coordinates against rotation handles.
 * Default hitTolerancePx = 20 ensures a total capture radius >= 24px (h.radiusPx 6px + 20px = 26px).
 */
export function hitTestRotationHandle(
	pointerPx: { readonly x: number; readonly y: number },
	handles: readonly RotationHandleInfo[],
	hitTolerancePx = 20,
): RotationHandleInfo | null {
	for (const h of handles) {
		const dist = Math.hypot(pointerPx.x - h.canvasX, pointerPx.y - h.canvasY);
		if (dist <= h.radiusPx + hitTolerancePx) {
			return h;
		}
	}
	return null;
}

/**
 * Normalizes an angle in degrees strictly into the range [-180.0, 180.0].
 * Prevents negative zero (-0.0) artifacts and wraps multiple full 360° revolutions.
 */
export function normalizeAngleDeg(deg: number): number {
	if (!Number.isFinite(deg)) return 0;
	let normalized = deg % 360;
	if (normalized > 180) normalized -= 360;
	else if (normalized < -180) normalized += 360;
	const rounded = Number(normalized.toFixed(1));
	return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Calculates new in-plane rotation angle (in degrees) when dragging a rotation handle around the center.
 */
export function calculateAngleFromHandleDrag(
	centerPx: { readonly x: number; readonly y: number },
	currentPointerPx: { readonly x: number; readonly y: number },
	handlePosition: RotationHandlePosition,
): number {
	const dx = currentPointerPx.x - centerPx.x;
	const dy = currentPointerPx.y - centerPx.y;
	if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return 0;
	let angleRad = Math.atan2(dy, dx);

	switch (handlePosition) {
		case "u_pos":
			break;
		case "u_neg":
			angleRad -= Math.PI;
			break;
		case "v_pos":
			angleRad -= Math.PI / 2.0;
			break;
		case "v_neg":
			angleRad += Math.PI / 2.0;
			break;
	}

	const deg = radToDeg(angleRad);
	return normalizeAngleDeg(deg);
}

/**
 * Calculates in-plane rotation angle (in degrees) when dragging anywhere on canvas with Shift key held.
 */
export function calculateAngleFromShiftDrag(
	centerPx: { readonly x: number; readonly y: number },
	currentPointerPx: { readonly x: number; readonly y: number },
	startPointerPx: { readonly x: number; readonly y: number },
	initialAngleDeg: number,
): number {
	const dx0 = startPointerPx.x - centerPx.x;
	const dy0 = startPointerPx.y - centerPx.y;
	const dx1 = currentPointerPx.x - centerPx.x;
	const dy1 = currentPointerPx.y - centerPx.y;

	if (Math.hypot(dx0, dy0) < 1e-3 || Math.hypot(dx1, dy1) < 1e-3) {
		return normalizeAngleDeg(initialAngleDeg);
	}

	const angle0 = Math.atan2(dy0, dx0);
	const angle1 = Math.atan2(dy1, dx1);
	const deltaDeg = radToDeg(angle1 - angle0);

	return normalizeAngleDeg(initialAngleDeg + deltaDeg);
}

/**
 * Hit tests pointer coordinates against the central reticle ring (for 1-click or double-click reset).
 */
export function hitTestCrosshairCenter(
	pointerPx: { readonly x: number; readonly y: number },
	centerPx: { readonly x: number; readonly y: number },
	hitTolerancePx = 14,
): boolean {
	const dist = Math.hypot(pointerPx.x - centerPx.x, pointerPx.y - centerPx.y);
	return dist <= hitTolerancePx;
}

// ─── 4. CANVAS OBLIQUE CROSSHAIR & ROTATION HANDLES RENDERER ────────────────

/**
 * Draws rotated crosshair reticles, tick marks, circular sector arc, rotation handles, and angle badges onto the canvas.
 */
export function drawObliqueCrosshairWithRotationHandles(
	ctx: CanvasRenderingContext2D,
	options: ObliqueCrosshairDrawOptions,
): void {
	const {
		widthPx,
		heightPx,
		centerPx,
		plane,
		rotationDeg,
		handleDistancePx = 65,
		activeHandle = null,
		hoveredHandle = null,
		showHandles = true,
		showAngleBadge = true,
		invertColors = false,
	} = options;

	const safeRotationDeg = Number.isFinite(rotationDeg) ? rotationDeg : 0;
	const rotRad = degToRad(safeRotationDeg);
	const cosA = Math.cos(rotRad);
	const sinA = Math.sin(rotRad);

	let axisColor1: string;
	let axisColor2: string;
	let planeAccentColor: string;

	if (invertColors) {
		// WCAG AAA high-contrast palette for negative LUT (contrast >= 4.5:1 on pure white air & cortical bone, DEF-B03)
		switch (plane) {
			case "axial":
				axisColor1 = "#059669"; // Deep Emerald/Green (Coronal / Y)
				axisColor2 = "#e11d48"; // Deep Rose/Red (Sagittal / X)
				planeAccentColor = "#0284c7"; // Deep Cyan/Sky (Axial / Z)
				break;
			case "coronal":
				axisColor1 = "#0284c7"; // Deep Cyan/Sky (Axial / Z)
				axisColor2 = "#e11d48"; // Deep Rose/Red (Sagittal / X)
				planeAccentColor = "#059669"; // Deep Emerald/Green (Coronal / Y)
				break;
			case "sagittal":
				axisColor1 = "#0284c7"; // Deep Cyan/Sky (Axial / Z)
				axisColor2 = "#059669"; // Deep Emerald/Green (Coronal / Y)
				planeAccentColor = "#e11d48"; // Deep Rose/Red (Sagittal / X)
				break;
		}
	} else {
		// International Medical Standard RGB = XYZ: Red = Sagittal (X), Green = Coronal (Y), Blue = Axial (Z)
		switch (plane) {
			case "axial":
				axisColor1 = ROMEXIS_COLORS.coronal; // Green/Emerald (#10b981) - horizontal axis (Coronal plane)
				axisColor2 = ROMEXIS_COLORS.sagittal; // Red/Rose (#f43f5e) - vertical axis (Sagittal plane)
				planeAccentColor = ROMEXIS_COLORS.axial; // Cyan/Blue (#06b6d4)
				break;
			case "coronal":
				axisColor1 = ROMEXIS_COLORS.axial; // Cyan/Blue (#06b6d4) - horizontal axis (Axial plane)
				axisColor2 = ROMEXIS_COLORS.sagittal; // Red/Rose (#f43f5e) - vertical axis (Sagittal plane)
				planeAccentColor = ROMEXIS_COLORS.coronal; // Green/Emerald (#10b981)
				break;
			case "sagittal":
				axisColor1 = ROMEXIS_COLORS.axial; // Cyan/Blue (#06b6d4) - horizontal axis (Axial plane)
				axisColor2 = ROMEXIS_COLORS.coronal; // Green/Emerald (#10b981) - vertical axis (Coronal plane)
				planeAccentColor = ROMEXIS_COLORS.sagittal; // Red/Rose (#f43f5e)
				break;
		}
	}

	const isHovered = options.isHovered ?? false;
	const isInteracting = activeHandle !== null || hoveredHandle !== null || isHovered;
	// Translucency in rest state (30% opacity) to keep anatomy and micro-cracks visible; full 95% opacity on hover/drag
	const restAlpha = isInteracting ? 0.95 : 0.30;

	ctx.save();
	ctx.globalAlpha = restAlpha;

	const gap = options.centerGapPx ?? 11.0;
	const diag = Math.hypot(widthPx, heightPx);

	// 1. Axis 1 (Primary horizontal axis when rotation = 0) with dark halo underlay and center gap
	ctx.save();
	ctx.shadowColor = invertColors ? "rgba(0, 0, 0, 0.95)" : "rgba(0, 0, 0, 0.85)";
	ctx.shadowBlur = invertColors ? 4 : 3;
	ctx.strokeStyle = axisColor1;
	ctx.lineWidth = invertColors ? 1.4 : 1.2;
	ctx.beginPath();
	// Segment 1A (negative side)
	ctx.moveTo(centerPx.x - diag * cosA, centerPx.y - diag * sinA);
	ctx.lineTo(centerPx.x - gap * cosA, centerPx.y - gap * sinA);
	// Segment 1B (positive side)
	ctx.moveTo(centerPx.x + gap * cosA, centerPx.y + gap * sinA);
	ctx.lineTo(centerPx.x + diag * cosA, centerPx.y + diag * sinA);
	ctx.stroke();

	// 2. Axis 2 (Secondary vertical axis when rotation = 0) with dark halo underlay and center gap
	ctx.strokeStyle = axisColor2;
	ctx.lineWidth = invertColors ? 1.4 : 1.2;
	ctx.beginPath();
	// Segment 2A (positive side)
	ctx.moveTo(centerPx.x + diag * sinA, centerPx.y - diag * cosA);
	ctx.lineTo(centerPx.x + gap * sinA, centerPx.y - gap * cosA);
	// Segment 2B (negative side)
	ctx.moveTo(centerPx.x - gap * sinA, centerPx.y + gap * cosA);
	ctx.lineTo(centerPx.x - diag * sinA, centerPx.y + diag * cosA);
	ctx.stroke();
	ctx.restore();

	// 3. Central Reticle Micro-Plus (Span 7px, delicate targeting reticle with concentric empty gap radius 11px)
	// Zero circle obstruction: micro-plus targeting at center + 11px clear gap + outer guide lines
	const microArm = 3.5;
	ctx.save();
	// Pass 1: Dark outer halo for central micro-plus
	ctx.shadowColor = invertColors ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.95)";
	ctx.shadowBlur = 2;
	ctx.strokeStyle = invertColors ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.9)";
	ctx.lineWidth = 2.0;
	ctx.beginPath();
	// Arm 1 halo
	ctx.moveTo(centerPx.x - microArm * cosA, centerPx.y - microArm * sinA);
	ctx.lineTo(centerPx.x + microArm * cosA, centerPx.y + microArm * sinA);
	// Arm 2 halo
	ctx.moveTo(centerPx.x - microArm * sinA, centerPx.y + microArm * cosA);
	ctx.lineTo(centerPx.x + microArm * sinA, centerPx.y - microArm * cosA);
	ctx.stroke();

	// Pass 2: Sharp colored inner micro-plus arms
	ctx.shadowBlur = 0;
	ctx.lineWidth = 1.0;
	// Arm 1 (Axis 1 color)
	ctx.strokeStyle = axisColor1;
	ctx.beginPath();
	ctx.moveTo(centerPx.x - microArm * cosA, centerPx.y - microArm * sinA);
	ctx.lineTo(centerPx.x + microArm * cosA, centerPx.y + microArm * sinA);
	ctx.stroke();

	// Arm 2 (Axis 2 color)
	ctx.strokeStyle = axisColor2;
	ctx.beginPath();
	ctx.moveTo(centerPx.x - microArm * sinA, centerPx.y + microArm * cosA);
	ctx.lineTo(centerPx.x + microArm * sinA, centerPx.y - microArm * cosA);
	ctx.stroke();
	ctx.restore();

	// 4. Rotation Handles & Circular Arc Indicator
	if (showHandles) {
		const handles = getRotationHandles(plane, widthPx, heightPx, centerPx, handleDistancePx, safeRotationDeg);

		// Rotational Arc Sector (Visualizes angle swept from 0 deg to current rotation when tilted)
		if (Math.abs(safeRotationDeg) > 0.1) {
			ctx.save();
			ctx.strokeStyle = planeAccentColor;
			ctx.lineWidth = 1.4;
			ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
			ctx.shadowBlur = 4;
			ctx.beginPath();
			if (safeRotationDeg > 0) {
				ctx.arc(centerPx.x, centerPx.y, handleDistancePx, 0, rotRad, false);
			} else {
				ctx.arc(centerPx.x, centerPx.y, handleDistancePx, rotRad, 0, false);
			}
			ctx.stroke();
			ctx.restore();
		}

		// 4 Elegant Medical Reticle Rotation Handles (Delicate tick marks with micro-pips)
		for (const h of handles) {
			const isActive = activeHandle === h.position;
			const isHovered = hoveredHandle === h.position;
			const color = h.position.startsWith("u") ? axisColor1 : axisColor2;

			// Axis direction and perpendicular normal unit vectors
			const dx = (h.canvasX - centerPx.x) / (handleDistancePx || 1);
			const dy = (h.canvasY - centerPx.y) / (handleDistancePx || 1);
			const perpX = -dy;
			const perpY = dx;
			const tickHalf = isActive ? 7.0 : isHovered ? 6.0 : 4.5;
			const pipRadius = isActive ? 3.0 : isHovered ? 2.4 : 1.8;

			ctx.save();
			// Pass 1: Dark outer halo for cross-tick on bright cortical bone or implants
			ctx.strokeStyle = "rgba(9, 9, 11, 0.95)";
			ctx.lineWidth = isActive ? 3.6 : isHovered ? 3.0 : 2.4;
			ctx.beginPath();
			ctx.moveTo(h.canvasX - perpX * tickHalf, h.canvasY - perpY * tickHalf);
			ctx.lineTo(h.canvasX + perpX * tickHalf, h.canvasY + perpY * tickHalf);
			ctx.stroke();

			// Pass 2: High-contrast inner colored cross-tick
			ctx.strokeStyle = isActive ? "#ffffff" : color;
			ctx.lineWidth = isActive ? 1.8 : isHovered ? 1.5 : 1.2;
			ctx.beginPath();
			ctx.moveTo(h.canvasX - perpX * tickHalf, h.canvasY - perpY * tickHalf);
			ctx.lineTo(h.canvasX + perpX * tickHalf, h.canvasY + perpY * tickHalf);
			ctx.stroke();

			// Pass 3A: Outer dark contour halo for pip marker (Anti-washout over bright cortical bone or implants)
			ctx.beginPath();
			ctx.arc(h.canvasX, h.canvasY, pipRadius + 0.8, 0, Math.PI * 2);
			ctx.fillStyle = "rgba(9, 9, 11, 0.95)";
			ctx.fill();

			// Pass 3B: Inner calibrated pip marker
			ctx.beginPath();
			ctx.arc(h.canvasX, h.canvasY, pipRadius, 0, Math.PI * 2);
			if (isActive) {
				ctx.fillStyle = "#ffffff";
				ctx.shadowColor = color;
				ctx.shadowBlur = 8;
			} else if (isHovered) {
				ctx.fillStyle = color;
				ctx.shadowColor = color;
				ctx.shadowBlur = 6;
			} else {
				ctx.fillStyle = color;
				ctx.shadowColor = invertColors ? "rgba(0, 0, 0, 0.95)" : "rgba(0, 0, 0, 0.85)";
				ctx.shadowBlur = 3;
			}
			ctx.fill();
			ctx.strokeStyle = invertColors ? "rgba(9, 9, 11, 0.95)" : "#ffffff";
			ctx.lineWidth = 0.8;
			ctx.stroke();
			ctx.restore();
		}
	}

	// 5. Rotation Angle HUD Badge: Delegated strictly to the interactive HTML HUD button in CbctViewportHud.tsx (DEF-04).
	ctx.restore();
}

// ─── 5. MOUSE WHEEL SLICE NAVIGATION & FULL VIEWPORT RESET MATH ──────────────

export type CbctWheelAction = "slice_scroll" | "zoom";

export interface WheelActionOptions {
	readonly deltaY: number;
	readonly ctrlKey?: boolean;
	readonly metaKey?: boolean;
	readonly shiftKey?: boolean;
}

/**
 * Determines whether a mouse wheel event triggers slice scrolling or cursor zoom.
 * Default (no Ctrl): Slice scrolling through volume slices.
 * With Ctrl (or Meta/Cmd on Mac): Cursor-anchored Zoom.
 */
export function determineWheelAction(options: WheelActionOptions): CbctWheelAction {
	if (options.ctrlKey || options.metaKey) {
		return "zoom";
	}
	return "slice_scroll";
}

/**
 * Calculates slice index displacement from mouse wheel deltaY.
 * Standard PACS convention: Wheel Down (deltaY > 0) scrolls forward/down (+1),
 * Wheel Up (deltaY < 0) scrolls backward/up (-1).
 */
export function calculateWheelSliceDelta(deltaY: number, step = 1): number {
	if (!Number.isFinite(deltaY) || deltaY === 0) return 0;
	const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
	return deltaY > 0 ? safeStep : -safeStep;
}

/**
 * Computes updated slice index after mouse wheel scroll, clamped to [0, maxSliceIndex].
 */
export function calculateSliceIndexFromWheel(
	currentSliceIndex: number,
	maxSliceIndex: number,
	deltaY: number,
	step = 1,
): number {
	const safeCurrent = Number.isFinite(currentSliceIndex) ? currentSliceIndex : 0;
	const safeMax = Number.isFinite(maxSliceIndex) && maxSliceIndex >= 0 ? maxSliceIndex : 0;
	const delta = calculateWheelSliceDelta(deltaY, step);
	return Math.max(0, Math.min(safeMax, Math.round(safeCurrent + delta)));
}

/**
 * Updates crosshair world position when scrolling slices along a plane's normal axis.
 * - Axial: scrolls along Z axis (inferior/superior)
 * - Coronal: scrolls along Y axis (anterior/posterior)
 * - Sagittal: scrolls along X axis (left/right)
 */
export function calculateCrosshairSliceScroll(
	currentCrosshairMm: Point3D,
	plane: MprPlane,
	deltaY: number,
	volume: CbctVoxelVolume,
	stepVoxels = 1,
): Point3D {
	if (!volume || volume.isDisposed || !volume.spacingMm) {
		return currentCrosshairMm;
	}

	const delta = calculateWheelSliceDelta(deltaY, stepVoxels);
	if (delta === 0) return currentCrosshairMm;

	const newMm: Point3D = { ...currentCrosshairMm };

	switch (plane) {
		case "axial":
			newMm.z += delta * volume.spacingMm.z;
			break;
		case "coronal":
			newMm.y += delta * volume.spacingMm.y;
			break;
		case "sagittal":
			newMm.x += delta * volume.spacingMm.x;
			break;
	}

	return clampCoordinateToVolume(newMm, volume);
}

/**
 * Calculates physical world coordinate for the exact geometric center of the CBCT volume.
 */
export function getVolumeCenterMm(volume: CbctVoxelVolume): Point3D {
	if (!volume || !volume.dimensions || !volume.spacingMm || !volume.originMm) {
		return { x: 0, y: 0, z: 0 };
	}
	const { dimensions: dim, spacingMm: sp, originMm: origin } = volume;
	return {
		x: Number((origin.x + (dim.width * sp.x) / 2.0).toFixed(2)),
		y: Number((origin.y + (dim.height * sp.y) / 2.0).toFixed(2)),
		z: Number((origin.z + (dim.depth * sp.z) / 2.0).toFixed(2)),
	};
}

export interface FullViewResetState {
	readonly angles: ObliqueRotationAngles;
	readonly transform: ViewportTransform;
	readonly crosshairMm: Point3D;
}

/**
 * Performs a complete clinical reset of orientation angles (0.0°), viewport transform (1.0x, pan 0,0),
 * and centers the 3D crosshair to the volume geometric center.
 */
export function resetFullViewAndOrientation(volume?: CbctVoxelVolume): FullViewResetState {
	return {
		angles: resetObliqueRotationAngles(),
		transform: resetViewportTransform(),
		crosshairMm: volume ? getVolumeCenterMm(volume) : { x: 0, y: 0, z: 0 },
	};
}
