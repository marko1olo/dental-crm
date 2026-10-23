import type {
	SignaturePoint,
	BezierCurveSegment,
	StrokeWidthOptions,
} from "./types";
import {
	calculatePointDistance,
	calculatePointVelocity,
	calculateStrokeWidth,
	computeMidpoint,
} from "./geometry";

const DEFAULT_MIN_WIDTH = 1.2;
const DEFAULT_MAX_WIDTH = 3.5;
const DEFAULT_VELOCITY_WEIGHT = 0.7;

export function smoothStrokeToBezierCurves(
	points: SignaturePoint[],
	options: StrokeWidthOptions = {},
): BezierCurveSegment[] {
	if (points.length < 2) return [];

	const minWidth = options.minWidth ?? DEFAULT_MIN_WIDTH;
	const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
	const curves: BezierCurveSegment[] = [];

	const first = points[0];
	const second = points[1];
	if (!first || !second) return [];

	if (points.length === 2) {
		const v = calculatePointVelocity(first, second);
		const w = calculateStrokeWidth(v, undefined, options);
		curves.push({
			startPoint: first,
			control1: first,
			control2: second,
			endPoint: second,
			startWidth: first.width ?? (minWidth + maxWidth) / 2,
			endWidth: w,
		});
		return curves;
	}

	let currentWidth = first.width ?? (minWidth + maxWidth) / 2;

	for (let i = 1; i < points.length - 1; i++) {
		const p0 = points[i - 1];
		const p1 = points[i];
		const p2 = points[i + 1];
		if (!p0 || !p1 || !p2) continue;

		const mid1 = computeMidpoint(p0, p1);
		const mid2 = computeMidpoint(p1, p2);

		const v = calculatePointVelocity(p0, p1);
		const targetWidth = calculateStrokeWidth(v, undefined, options);
		const weight = options.velocityFilterWeight ?? DEFAULT_VELOCITY_WEIGHT;
		const nextWidth = currentWidth * (1 - weight) + targetWidth * weight;

		curves.push({
			startPoint: mid1,
			control1: p1,
			control2: p1,
			endPoint: mid2,
			startWidth: currentWidth,
			endWidth: nextWidth,
		});

		currentWidth = nextWidth;
	}

	return curves;
}

/**
 * Упрощение точек штриха методом Рамера — Дугласа — Пекера
 */
export function simplifyStrokePoints(points: SignaturePoint[], tolerance = 1.0): SignaturePoint[] {
	if (points.length <= 2) return points;

	const pStart = points[0];
	const pEnd = points[points.length - 1];
	if (!pStart || !pEnd) return points;

	let maxDistance = 0;
	let maxIndex = 0;

	const lineLength = calculatePointDistance(pStart, pEnd);

	for (let i = 1; i < points.length - 1; i++) {
		const p = points[i];
		if (!p) continue;
		let distance = 0;

		if (lineLength === 0) {
			distance = calculatePointDistance(p, pStart);
		} else {
			const numerator = Math.abs(
				(pEnd.y - pStart.y) * p.x - (pEnd.x - pStart.x) * p.y + pEnd.x * pStart.y - pEnd.y * pStart.x,
			);
			distance = numerator / lineLength;
		}

		if (distance > maxDistance) {
			maxDistance = distance;
			maxIndex = i;
		}
	}

	if (maxDistance > tolerance) {
		const left = simplifyStrokePoints(points.slice(0, maxIndex + 1), tolerance);
		const right = simplifyStrokePoints(points.slice(maxIndex), tolerance);
		return [...left.slice(0, -1), ...right];
	}

	return [pStart, pEnd];
}
