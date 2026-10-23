import type { SignatureStroke, StrokeWidthOptions } from "./types";
import { computeMidpoint } from "./geometry";

const DEFAULT_MIN_WIDTH = 1.2;
const DEFAULT_MAX_WIDTH = 3.5;

export function drawSmoothStrokeOnContext(
	ctx: CanvasRenderingContext2D,
	stroke: SignatureStroke,
	options: StrokeWidthOptions & { defaultColor?: string | undefined } = {},
): void {
	const points = stroke.points;
	if (!points || points.length === 0) return;
	const first = points[0];
	if (!first) return;

	ctx.strokeStyle = stroke.color || options.defaultColor || "#0f172a";
	ctx.fillStyle = stroke.color || options.defaultColor || "#0f172a";
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	if (points.length === 1 || stroke.isDot) {
		const radius = (options.maxWidth ?? DEFAULT_MAX_WIDTH) / 2;
		ctx.beginPath();
		ctx.arc(first.x, first.y, radius, 0, Math.PI * 2, true);
		ctx.fill();
		return;
	}

	if (points.length === 2) {
		const second = points[1];
		if (!second) return;
		ctx.lineWidth = stroke.width || (options.minWidth ?? DEFAULT_MIN_WIDTH);
		ctx.beginPath();
		ctx.moveTo(first.x, first.y);
		ctx.lineTo(second.x, second.y);
		ctx.stroke();
		return;
	}

	ctx.lineWidth = stroke.width || 2.2;
	ctx.beginPath();
	ctx.moveTo(first.x, first.y);
	for (let i = 1; i < points.length - 1; i++) {
		const current = points[i];
		const next = points[i + 1];
		if (!current || !next) continue;
		const mid = computeMidpoint(current, next);
		ctx.quadraticCurveTo(current.x, current.y, mid.x, mid.y);
	}
	const last = points[points.length - 1];
	if (last) {
		ctx.lineTo(last.x, last.y);
	}
	ctx.stroke();
}
