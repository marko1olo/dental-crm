import { degToRad } from "../cbctObliqueMatrixMath";
import type { ObliqueCrosshairDrawOptions } from "./types";
import { getPlaneCrosshairColors, drawCrosshairAxesAndReticle } from "./crosshairAxesRenderer";
import { drawRotationArcAndHandles } from "./crosshairHandlesRenderer";
import { getRotationHandles } from "./rotationHandlesMath";

export function drawObliqueCrosshairWithRotationHandles(
	ctx: CanvasRenderingContext2D,
	options: ObliqueCrosshairDrawOptions,
): void {
	const {
		widthPx, heightPx, centerPx, plane, rotationDeg,
		handleDistancePx = 65, activeHandle = null, hoveredHandle = null,
		showHandles = true, invertColors = false,
	} = options;

	const safeRotationDeg = Number.isFinite(rotationDeg) ? rotationDeg : 0;
	const rotRad = degToRad(safeRotationDeg);
	const cosA = Math.cos(rotRad);
	const sinA = Math.sin(rotRad);

	const colors = getPlaneCrosshairColors(plane, invertColors);
	const isInteracting = activeHandle !== null || hoveredHandle !== null || (options.isHovered ?? false);
	const restAlpha = isInteracting ? 0.95 : 0.30;

	ctx.save();
	ctx.globalAlpha = restAlpha;

	const gap = options.centerGapPx ?? 31.0;
	const diag = Math.hypot(widthPx, heightPx);

	drawCrosshairAxesAndReticle(ctx, centerPx, diag, gap, cosA, sinA, colors, invertColors);

	if (showHandles) {
		const handles = getRotationHandles(plane, widthPx, heightPx, centerPx, handleDistancePx, safeRotationDeg);
		drawRotationArcAndHandles(
			ctx, centerPx, handleDistancePx, safeRotationDeg, rotRad,
			colors.planeAccentColor, handles, activeHandle, hoveredHandle, colors, invertColors,
		);
	}

	ctx.restore();
}
