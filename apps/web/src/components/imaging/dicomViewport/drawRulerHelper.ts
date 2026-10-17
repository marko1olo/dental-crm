import type { Point2D } from "../rvgViewerEngine.js";

export function drawRulerOnContext(
	ctx: CanvasRenderingContext2D,
	p1: Point2D,
	p2: Point2D,
	label: string,
	color: string,
): void {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();

	const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
	const perp = angle + Math.PI / 2;
	const tickLen = 6;
	for (const p of [p1, p2]) {
		ctx.beginPath();
		ctx.moveTo(p.x - Math.cos(perp) * tickLen, p.y - Math.sin(perp) * tickLen);
		ctx.lineTo(p.x + Math.cos(perp) * tickLen, p.y + Math.sin(perp) * tickLen);
		ctx.stroke();
	}

	const midX = (p1.x + p2.x) / 2;
	const midY = (p1.y + p2.y) / 2;
	ctx.font = "bold 12px sans-serif";
	ctx.fillText(label, midX + 8, midY - 6);
	ctx.restore();
}
