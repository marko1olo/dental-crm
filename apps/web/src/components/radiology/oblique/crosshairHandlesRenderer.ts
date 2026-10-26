import type { RotationHandleInfo, RotationHandlePosition } from "./types";
import type { PlaneColors } from "./crosshairAxesRenderer";

export function drawRotationArcAndHandles(
	ctx: CanvasRenderingContext2D,
	centerPx: { readonly x: number; readonly y: number },
	handleDistancePx: number,
	safeRotationDeg: number,
	rotRad: number,
	planeAccentColor: string,
	handles: readonly RotationHandleInfo[],
	activeHandle: RotationHandlePosition | null,
	hoveredHandle: RotationHandlePosition | null,
	colors: PlaneColors,
	invertColors: boolean,
): void {
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

	for (const h of handles) {
		const isActive = activeHandle === h.position;
		const isHovered = hoveredHandle === h.position;
		const color = h.position.startsWith("u") ? colors.axisColor1 : colors.axisColor2;
		const dx = (h.canvasX - centerPx.x) / (handleDistancePx || 1);
		const dy = (h.canvasY - centerPx.y) / (handleDistancePx || 1);
		const perpX = -dy;
		const perpY = dx;
		const tickHalf = isActive ? 7.0 : isHovered ? 6.0 : 4.5;
		const pipRadius = isActive ? 3.0 : isHovered ? 2.4 : 1.8;

		ctx.save();
		ctx.strokeStyle = "rgba(9, 9, 11, 0.95)";
		ctx.lineWidth = isActive ? 3.6 : isHovered ? 3.0 : 2.4;
		ctx.beginPath();
		ctx.moveTo(h.canvasX - perpX * tickHalf, h.canvasY - perpY * tickHalf);
		ctx.lineTo(h.canvasX + perpX * tickHalf, h.canvasY + perpY * tickHalf);
		ctx.stroke();

		ctx.strokeStyle = isActive ? "#ffffff" : color;
		ctx.lineWidth = isActive ? 1.8 : isHovered ? 1.5 : 1.2;
		ctx.beginPath();
		ctx.moveTo(h.canvasX - perpX * tickHalf, h.canvasY - perpY * tickHalf);
		ctx.lineTo(h.canvasX + perpX * tickHalf, h.canvasY + perpY * tickHalf);
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(h.canvasX, h.canvasY, pipRadius + 0.8, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(9, 9, 11, 0.95)";
		ctx.fill();

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
