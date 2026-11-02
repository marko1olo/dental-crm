/**
 * apps/web/src/components/consents/signaturePadMath.ts
 *
 * Математика сенсорной подписи (Touch/Stylus), сглаживание кривыми Безье,
 * упрощение штрихов (Ramer-Douglas-Peucker) и экспорт в чистый векторный SVG (Apple HIG).
 * Мандаты 8b (Sweet Spot 180–220 строк), 8e (Автономия врача), 8zk (Zero mocks).
 */

import {
	generateSha256,
	generateConsentIntegrityHash,
	generatePaperSignatureSvg,
	generateSmsPepSignatureSvg,
	PAPER_SIGNATURE_FALLBACK_PNG,
	type ConsentIntegrityPayload,
} from "./consentIntegrityHash";

export {
	generateSha256,
	generateConsentIntegrityHash,
	generatePaperSignatureSvg,
	generateSmsPepSignatureSvg,
	PAPER_SIGNATURE_FALLBACK_PNG,
	type ConsentIntegrityPayload,
};

export interface SignaturePoint {
	x: number;
	y: number;
	time: number;
	pressure?: number | undefined;
	width?: number | undefined;
}

export interface SignatureStroke {
	points: SignaturePoint[];
	color?: string | undefined;
	width?: number | undefined;
	isDot?: boolean | undefined;
}

export interface SignatureBoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	width: number;
	height: number;
}

export interface BezierCurveSegment {
	startPoint: SignaturePoint;
	control1: SignaturePoint;
	control2?: SignaturePoint;
	endPoint: SignaturePoint;
	startWidth?: number;
	endWidth?: number;
}

export interface StrokeWidthOptions {
	minWidth?: number | undefined;
	maxWidth?: number | undefined;
}

/** Евклидово расстояние между двумя точками */
export function calculatePointDistance(p1: SignaturePoint, p2: SignaturePoint): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/** Скорость движения стилуса/пальца (px/ms) */
export function calculatePointVelocity(p1: SignaturePoint, p2: SignaturePoint): number {
	const timeDelta = Math.max(p2.time - p1.time, 1);
	return calculatePointDistance(p1, p2) / timeDelta;
}

/** Расчет толщины штриха по скорости движения (быстрее -> тоньше) */
export function calculateStrokeWidth(
	velocity: number,
	_pressure?: number | undefined,
	options: StrokeWidthOptions = {},
): number {
	const minWidth = options.minWidth ?? 1.2;
	const maxWidth = options.maxWidth ?? 3.5;
	const v = Math.min(Math.max(velocity, 0), 3.0) / 3.0;
	const width = maxWidth - (maxWidth - minWidth) * Math.pow(v, 0.6);
	return Math.min(maxWidth, Math.max(minWidth, width));
}

/** Средняя точка между двумя координатами */
export function computeMidpoint(p1: SignaturePoint, p2: SignaturePoint): SignaturePoint {
	return {
		x: (p1.x + p2.x) / 2,
		y: (p1.y + p2.y) / 2,
		time: (p1.time + p2.time) / 2,
	};
}

/** Сглаживание точек штриха квадратичными кривыми Безье */
export function smoothStrokeToBezierCurves(
	points: SignaturePoint[],
	options: StrokeWidthOptions = {},
): BezierCurveSegment[] {
	if (points.length < 2) return [];

	const curves: BezierCurveSegment[] = [];
	if (points.length === 2) {
		const p0 = points[0]!;
		const p1 = points[1]!;
		curves.push({
			startPoint: p0,
			control1: p0,
			endPoint: p1,
		});
		return curves;
	}

	for (let i = 1; i < points.length - 1; i++) {
		const p0 = points[i - 1]!;
		const p1 = points[i]!;
		const p2 = points[i + 1]!;
		const mid1 = computeMidpoint(p0, p1);
		const mid2 = computeMidpoint(p1, p2);

		curves.push({
			startPoint: mid1,
			control1: p1,
			endPoint: mid2,
		});
	}

	return curves;
}

/** Алгоритм Рамера-Дугласа-Пекера для упрощения точек штриха */
export function simplifyStrokePoints(points: SignaturePoint[], epsilon = 1.0): SignaturePoint[] {
	if (points.length <= 2) return points;

	let dmax = 0;
	let index = 0;
	const first = points[0]!;
	const last = points[points.length - 1]!;

	for (let i = 1; i < points.length - 1; i++) {
		const p = points[i]!;
		// Расстояние от точки p до отрезка (first -> last)
		const d = Math.abs((last.y - first.y) * p.x - (last.x - first.x) * p.y + last.x * first.y - last.y * first.x) /
			Math.sqrt(Math.pow(last.y - first.y, 2) + Math.pow(last.x - first.x, 2));
		if (d > dmax) {
			index = i;
			dmax = d;
		}
	}

	if (dmax > epsilon) {
		const rec1 = simplifyStrokePoints(points.slice(0, index + 1), epsilon);
		const rec2 = simplifyStrokePoints(points.slice(index), epsilon);
		return [...rec1.slice(0, -1), ...rec2];
	}

	return [first, last];
}

/** Габариты (Bounding Box) набора штрихов */
export function calculateBoundingBox(strokes: SignatureStroke[]): SignatureBoundingBox {
	if (strokes.length === 0) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const stroke of strokes) {
		for (const p of stroke.points) {
			if (p.x < minX) minX = p.x;
			if (p.y < minY) minY = p.y;
			if (p.x > maxX) maxX = p.x;
			if (p.y > maxY) maxY = p.y;
		}
	}

	if (minX === Number.POSITIVE_INFINITY) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}

	return {
		minX,
		minY,
		maxX,
		maxY,
		width: maxX - minX,
		height: maxY - minY,
	};
}

/** Проверка, пуста ли подпись */
export function isSignatureEmpty(strokes: SignatureStroke[], minPoints = 4): boolean {
	if (!strokes || strokes.length === 0) return true;
	let totalPoints = 0;
	for (const stroke of strokes) {
		totalPoints += stroke.points.length;
		if (totalPoints >= minPoints) return false;
	}
	return totalPoints < minPoints;
}

/** Экспорт массива штрихов в чистый векторный SVG со сглаживанием кривыми Безье */
export function exportSignatureToSvg(
	strokes: SignatureStroke[],
	width = 360,
	height = 120,
	options: { backgroundColor?: string } = {},
): string {
	const bg = options.backgroundColor ? `<rect width="100%" height="100%" fill="${options.backgroundColor}"/>` : "";
	let paths = "";

	for (const stroke of strokes) {
		if (stroke.points.length < 2) continue;
		let d = `M ${stroke.points[0]!.x.toFixed(1)} ${stroke.points[0]!.y.toFixed(1)}`;
		for (let i = 1; i < stroke.points.length - 1; i++) {
			const current = stroke.points[i]!;
			const next = stroke.points[i + 1]!;
			const mid = computeMidpoint(current, next);
			d += ` Q ${current.x.toFixed(1)} ${current.y.toFixed(1)}, ${mid.x.toFixed(1)} ${mid.y.toFixed(1)}`;
		}
		const last = stroke.points[stroke.points.length - 1]!;
		d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

		const strokeColor = stroke.color || "#0f172a";
		const strokeWidth = stroke.width || 2.5;
		paths += `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${bg}${paths}</svg>`;
}
