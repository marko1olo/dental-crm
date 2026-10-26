/**
 * rvgCanvasDrawer.ts — Отрисовка калиброванной линейки на холсте визиографа (Мандат 8b <= 120 строк).
 */

import type { Point2D } from "@dental/shared";

export function drawRulerOnContext(
	ctx: CanvasRenderingContext2D,
	p1: Point2D,
	p2: Point2D,
	label: string,
	color = "#38bdf8",
): void {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();

	const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
	const perp = angle + Math.PI / 2;
	const tickLen = 7;

	ctx.beginPath();
	ctx.moveTo(p1.x - Math.cos(perp) * tickLen, p1.y - Math.sin(perp) * tickLen);
	ctx.lineTo(p1.x + Math.cos(perp) * tickLen, p1.y + Math.sin(perp) * tickLen);
	ctx.moveTo(p2.x - Math.cos(perp) * tickLen, p2.y - Math.sin(perp) * tickLen);
	ctx.lineTo(p2.x + Math.cos(perp) * tickLen, p2.y + Math.sin(perp) * tickLen);
	ctx.stroke();

	const midX = (p1.x + p2.x) / 2;
	const midY = (p1.y + p2.y) / 2;
	ctx.font = "bold 12px sans-serif";
	ctx.fillStyle = color;
	ctx.fillText(label, midX + 8, midY - 8);
	ctx.restore();
}
