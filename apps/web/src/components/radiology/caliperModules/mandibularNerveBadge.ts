/**
 * DENTE CRM — CBCT Mandibular Canal Nerve Badge Renderer
 * Standards: DICOM Part 3, Mandate 8b (<= 120 lines).
 */

import {
	CRISP_OVERLAY_PAD_BG,
	CRISP_OVERLAY_BORDER_GOLD,
} from "../cbctCaliperMeasureMath";
import { MANDIBULAR_NERVE_SAFETY_MARGIN_MM } from "../cbctNerveCanalMath";

/**
 * Draws floating 3D Mandibular Canal (IAN) trajectory badge tooltip (DEF-R2-03).
 * Visual: bold 12px monospace font, dark background rgba(15, 23, 42, 0.92)
 * with #f59e0b border (1.0px) and gold text (#fbbf24).
 */
export function drawMandibularNerveBadge(
	ctx: CanvasRenderingContext2D,
	posPx: { readonly x: number; readonly y: number },
	totalLengthMm: number,
	safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
): void {
	ctx.save();
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = CRISP_OVERLAY_BORDER_GOLD;
	ctx.lineWidth = 1.0;
	const text = `Канал IAN (3D ${totalLengthMm.toFixed(1)} мм · ${safetyMarginMm.toFixed(1)} мм буфер)`;
	ctx.font = "bold 12px monospace";
	const tw = ctx.measureText(text).width;
	const padX = 8;
	const padY = 5;
	const badgeW = tw + padX * 2;
	const badgeH = 22;
	const canvasW = ctx.canvas?.width || 800;
	const safeCenterX = Math.max(badgeW / 2 + 10, Math.min(posPx.x, canvasW - badgeW / 2 - 10));
	const badgeX = safeCenterX - badgeW / 2;
	const badgeY = posPx.y < 56 ? posPx.y + 16 : Math.max(10, posPx.y - 26);

	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX, badgeY, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#fbbf24";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, safeCenterX, badgeY + badgeH / 2);
	ctx.restore();
}

export const drawNerveCanalBadge = drawMandibularNerveBadge;
