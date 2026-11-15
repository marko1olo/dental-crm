import type { Point2D } from "../rvgViewerEngine.js";

export function drawMeasurementBadge(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	label: string,
	accentColor: string,
): void {
	ctx.save();
	ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
	const textWidth = ctx.measureText(label).width;
	const padX = 6;
	const badgeH = 18;
	const badgeW = textWidth + padX * 2;
	const badgeX = x;
	const badgeY = y - badgeH / 2;

	ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
	ctx.strokeStyle = accentColor;
	ctx.lineWidth = 1;
	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX, badgeY, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#f8fafc";
	ctx.textBaseline = "middle";
	ctx.fillText(label, badgeX + padX, badgeY + badgeH / 2);
	ctx.restore();
}

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
	drawMeasurementBadge(ctx, midX + 8, midY - 6, label, color);
	ctx.restore();
}

export function drawAngleOnContext(
	ctx: CanvasRenderingContext2D,
	p1: Point2D,
	vertex: Point2D,
	p2: Point2D,
	label: string,
	color: string,
): void {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 2;

	// Ray 1: vertex to p1
	ctx.beginPath();
	ctx.moveTo(vertex.x, vertex.y);
	ctx.lineTo(p1.x, p1.y);
	ctx.stroke();

	// Ray 2: vertex to p2
	ctx.beginPath();
	ctx.moveTo(vertex.x, vertex.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();

	// Vertex marker dot
	ctx.beginPath();
	ctx.arc(vertex.x, vertex.y, 4, 0, Math.PI * 2);
	ctx.fill();

	// Arc at vertex
	const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
	const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
	ctx.beginPath();
	ctx.arc(vertex.x, vertex.y, 16, Math.min(angle1, angle2), Math.max(angle1, angle2));
	ctx.stroke();

	drawMeasurementBadge(ctx, vertex.x + 12, vertex.y - 12, label, color);
	ctx.restore();
}
