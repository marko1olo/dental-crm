import type {
	SignaturePoint,
	SignatureStroke,
	SignatureStrokeTracker,
} from "./types";

/**
 * Менеджер сбора штрихов подписи без утечек памяти (Zero Memory Leaks).
 */
export function createStrokeTracker(options: { maxPointsPerStroke?: number; defaultColor?: string } = {}): SignatureStrokeTracker {
	const maxPoints = options.maxPointsPerStroke ?? 2000;
	let strokes: SignatureStroke[] = [];
	let currentPoints: SignaturePoint[] = [];

	return {
		startStroke(point: SignaturePoint) {
			currentPoints = [point];
		},
		addPoint(point: SignaturePoint): SignaturePoint {
			if (currentPoints.length < maxPoints) {
				currentPoints.push(point);
			}
			return point;
		},
		endStroke(): SignatureStroke | null {
			if (currentPoints.length === 0) return null;
			const newStroke: SignatureStroke = {
				points: currentPoints,
				color: options.defaultColor || "#0f172a",
				isDot: currentPoints.length === 1,
			};
			strokes.push(newStroke);
			currentPoints = [];
			return newStroke;
		},
		getStrokes() {
			return [...strokes];
		},
		getCurrentPoints() {
			return [...currentPoints];
		},
		clear() {
			strokes = [];
			currentPoints = [];
		},
		dispose() {
			strokes.length = 0;
			currentPoints.length = 0;
			strokes = [];
			currentPoints = [];
		},
	};
}
