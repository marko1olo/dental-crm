import type {
	SignaturePoint,
	SignatureStroke,
	SignatureBoundingBox,
	StrokeWidthOptions,
} from "./types";

const DEFAULT_MIN_WIDTH = 1.2;
const DEFAULT_MAX_WIDTH = 3.5;

/**
 * Вычисление евклидова расстояния между двумя точками
 */
export function calculatePointDistance(p1: SignaturePoint, p2: SignaturePoint): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Вычисление скорости движения пера (px/ms)
 */
export function calculatePointVelocity(p1: SignaturePoint, p2: SignaturePoint): number {
	const timeDelta = Math.max(p2.time - p1.time, 1);
	const distance = calculatePointDistance(p1, p2);
	return distance / timeDelta;
}

/**
 * Расчет базовой толщины штриха по скорости движения
 */
export function calculateStrokeWidth(
	velocity: number,
	_pressure?: number | undefined,
	options: StrokeWidthOptions = {},
): number {
	const minWidth = options.minWidth ?? DEFAULT_MIN_WIDTH;
	const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;

	const normalizedVelocity = Math.min(Math.max(velocity, 0), 3.0) / 3.0;
	const width = maxWidth - (maxWidth - minWidth) * Math.pow(normalizedVelocity, 0.6);
	return Math.min(maxWidth, Math.max(minWidth, width));
}

/**
 * Вычисление средней точки между двумя координатами
 */
export function computeMidpoint(p1: SignaturePoint, p2: SignaturePoint): SignaturePoint {
	return {
		x: (p1.x + p2.x) / 2,
		y: (p1.y + p2.y) / 2,
		time: (p1.time + p2.time) / 2,
		pressure: p1.pressure !== undefined && p2.pressure !== undefined ? (p1.pressure + p2.pressure) / 2 : undefined,
		width: p1.width !== undefined && p2.width !== undefined ? (p1.width + p2.width) / 2 : undefined,
	};
}

/**
 * Вычисление ограничивающего прямоугольника подписи
 */
export function calculateBoundingBox(strokes: SignatureStroke[]): SignatureBoundingBox {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	let hasPoints = false;

	for (const stroke of strokes) {
		for (const pt of stroke.points) {
			hasPoints = true;
			if (pt.x < minX) minX = pt.x;
			if (pt.y < minY) minY = pt.y;
			if (pt.x > maxX) maxX = pt.x;
			if (pt.y > maxY) maxY = pt.y;
		}
	}

	if (!hasPoints) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}

	return {
		minX,
		minY,
		maxX,
		maxY,
		width: Math.max(0, maxX - minX),
		height: Math.max(0, maxY - minY),
	};
}

/**
 * Проверка подписи на пустоту (минимум точек)
 */
export function isSignatureEmpty(strokes: SignatureStroke[], minPointsThreshold = 5): boolean {
	let totalPoints = 0;
	for (const s of strokes) {
		totalPoints += s.points.length;
		if (totalPoints >= minPointsThreshold) return false;
	}
	return true;
}
