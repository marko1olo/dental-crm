/**
 * caliperRenderMath.ts — Токены контрастности и отрисовка кнопок управления измерениями (Мандат 8b).
 */

export const CRISP_OVERLAY_PAD_BG = "rgba(15, 23, 42, 0.92)";
export const CRISP_OVERLAY_BORDER_GOLD = "#f59e0b";
export const CRISP_OVERLAY_BORDER_CYAN = "#06b6d4";
export const CRISP_OVERLAY_BORDER_BLUE = "#0284c7";

export function drawMeasurementDeleteButton(
	ctx: CanvasRenderingContext2D,
	centerX: number,
	centerY: number,
	radius = 11,
): void {
	ctx.save();
	ctx.shadowBlur = 0;
	ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
	ctx.strokeStyle = "#ef4444";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 12px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("×", centerX, centerY);
	ctx.restore();
}

export const drawCaliperDeleteButton = drawMeasurementDeleteButton;
