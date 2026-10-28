/**
 * DENTE CRM — Endodontic Root Canal Canvas Overlay Renderer
 * Standards: WCAG AAA Contrast, Mandate 8b (<= 120 lines).
 */

import { CRISP_OVERLAY_PAD_BG, drawMeasurementDeleteButton } from "../cbctCaliperMeasureMath";
import { formatEndoCanalBadgeText } from "./endoCanalFormatting";

export function drawEndoCanalBadge(
	ctx: CanvasRenderingContext2D,
	posPx: { readonly x: number; readonly y: number },
	lengthMm: number,
	angleDeg: number,
	gradeRu?: string,
): void {
	ctx.save();
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = "#14b8a6";
	ctx.lineWidth = 1.0;

	const text = formatEndoCanalBadgeText(lengthMm, angleDeg, gradeRu);
	ctx.font = "bold 12px monospace";
	const tw = ctx.measureText(text).width;
	const padX = 8, padY = 5;
	const badgeW = tw + padX * 2, badgeH = 22;
	const badgeX = posPx.x - badgeW / 2, badgeY = posPx.y - 24;

	ctx.beginPath();
	if (typeof ctx.roundRect === "function") ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	else ctx.rect(badgeX, badgeY, badgeW, badgeH);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#5eead4";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, posPx.x, badgeY + badgeH / 2);
	ctx.restore();
}

export function drawEndoCanalMeasurement(
	ctx: CanvasRenderingContext2D,
	canal: {
		readonly id: string;
		readonly orificePx: { readonly x: number; readonly y: number };
		readonly apexPx: { readonly x: number; readonly y: number };
		readonly inflectionPx?: { readonly x: number; readonly y: number } | undefined;
		readonly lengthMm: number;
		readonly schneiderAngleDeg: number;
		readonly curvatureGradeRu?: string | undefined;
		readonly isSelected?: boolean | undefined;
	},
): void {
	ctx.save();
	const isSelected = Boolean(canal.isSelected);
	const mainColor = isSelected ? "#38bdf8" : "#14b8a6";
	const apicalColor = canal.schneiderAngleDeg > 25 ? "#f43f5e" : canal.schneiderAngleDeg > 5 ? "#f59e0b" : mainColor;

	ctx.beginPath();
	ctx.strokeStyle = mainColor;
	ctx.lineWidth = isSelected ? 2.5 : 1.8;
	ctx.moveTo(canal.orificePx.x, canal.orificePx.y);

	if (canal.inflectionPx) {
		ctx.lineTo(canal.inflectionPx.x, canal.inflectionPx.y);
		ctx.stroke();
		ctx.beginPath();
		ctx.strokeStyle = apicalColor;
		ctx.lineWidth = isSelected ? 2.5 : 1.8;
		ctx.moveTo(canal.inflectionPx.x, canal.inflectionPx.y);
		ctx.lineTo(canal.apexPx.x, canal.apexPx.y);
		ctx.stroke();

		ctx.fillStyle = "#fbbf24";
		ctx.strokeStyle = "#78350f";
		ctx.lineWidth = 1.0;
		ctx.beginPath();
		ctx.arc(canal.inflectionPx.x, canal.inflectionPx.y, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	} else {
		ctx.lineTo(canal.apexPx.x, canal.apexPx.y);
		ctx.stroke();
	}

	ctx.fillStyle = "#2dd4bf";
	ctx.strokeStyle = "#134e4a";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.arc(canal.orificePx.x, canal.orificePx.y, 4.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#f43f5e";
	ctx.strokeStyle = "#881337";
	ctx.lineWidth = 1.0;
	ctx.beginPath();
	ctx.arc(canal.apexPx.x, canal.apexPx.y, 4.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	const badgePos = canal.inflectionPx
		? canal.inflectionPx
		: { x: (canal.orificePx.x + canal.apexPx.x) / 2, y: (canal.orificePx.y + canal.apexPx.y) / 2 };
	drawEndoCanalBadge(ctx, badgePos, canal.lengthMm, canal.schneiderAngleDeg, canal.curvatureGradeRu);

	if (isSelected) {
		const badgeW = 120;
		drawMeasurementDeleteButton(ctx, badgePos.x + badgeW / 2 + 10, badgePos.y - 13, 11);
	}
	ctx.restore();
}
