/**
 * Mandibular Canal Nerve Tracer (Трассировщик нижнечелюстного канала / N. alveolaris inferior)
 *
 * Clinical domain:
 * - Spline curve interpolation along the anatomical canal path
 * - Safety Margin corridor: exactly 2.0 mm clinical safety buffer
 * - 2D & 3D proximity clearance calculation to the nerve
 * - Distance gating: Z-axis exponential attenuation for cross-sections
 * - Safety classification: Safe (>=2.0 mm), Warning (1.5-2.0 mm), Critical Danger (<1.5 mm)
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 800 строк).
 */

import type { Point2D, Point3D } from './cbctCaliperMeasureMath.js';
import { calculatePhysicalDistanceMm } from './cbctCaliperMeasureMath.js';

export const MANDIBULAR_NERVE_SAFETY_MARGIN_MM = 2.0;
export const MANDIBULAR_NERVE_CRITICAL_THRESHOLD_MM = 1.5;

export interface MandibularNerveSpline {
	id: string;
	side: "left" | "right" | "both";
	label: string;
	controlPoints: Point2D[]; // Опорные точки разметки врача (%)
	interpolatedCurve: Point2D[]; // Сглаженная сплайн-кривая (%)
	safetyCorridorPolygon: Point2D[]; // Полигон коридора безопасности (Safety Margin 2.0 мм)
	lengthMm: number; // Общая анатомическая длина видимого хода канала в мм
	canalDiameterMm: number; // Средний диаметр самого канала (обычно 2.5-3.0 мм)
	safetyMarginMm: number; // Зона безопасности (2.0 мм по умолчанию)
}

/**
 * Результат проверки дистанции имплантата до нижнечелюстного нерва
 */
export interface NerveClearanceCheckResult {
	distanceMm: number;
	safetyStatus: "safe" | "warning" | "danger";
	safetyMarginMm: number;
	isDanger: boolean;
	isWarning: boolean;
	messageRu: string;
	closestNervePoint?: Point2D | Point3D;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CALIPER & ALVEOLAR RIDGE MATHEMATICAL FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Расчет физического расстояния в миллиметрах с учетом калибровки
 */

export function interpolateNerveSpline2D(
	controlPoints: Point2D[],
	subdivisionsPerSegment = 12,
): Point2D[] {
	if (controlPoints.length < 2) return [...controlPoints];
	if (controlPoints.length === 2) {
		const [p0, p1] = controlPoints;
		if (!p0 || !p1) return [];
		const result: Point2D[] = [];
		for (let i = 0; i <= subdivisionsPerSegment; i++) {
			const t = i / subdivisionsPerSegment;
			result.push({
				x: Number((p0.x + (p1.x - p0.x) * t).toFixed(3)),
				y: Number((p0.y + (p1.y - p0.y) * t).toFixed(3)),
			});
		}
		return result;
	}

	const pts = controlPoints;
	const n = pts.length;
	const spline: Point2D[] = [];

	for (let i = 0; i < n - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[i]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i < n - 2 ? pts[i + 2]! : p2;

		for (let step = 0; step < subdivisionsPerSegment; step++) {
			const t = step / subdivisionsPerSegment;
			const t2 = t * t;
			const t3 = t2 * t;

			const x = 0.5 * (
				(2 * p1.x) +
				(-p0.x + p2.x) * t +
				(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
				(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
			);

			const y = 0.5 * (
				(2 * p1.y) +
				(-p0.y + p2.y) * t +
				(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
				(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
			);

			spline.push({
				x: Number(x.toFixed(3)),
				y: Number(y.toFixed(3)),
			});
		}
	}

	const last = pts[n - 1]!;
	spline.push({ x: Number(last.x.toFixed(3)), y: Number(last.y.toFixed(3)) });
	return spline;
}

/**
 * Расчет общей длины кривой в физических миллиметрах
 */
export function calculateSplineLengthMm(
	points: Point2D[],
	imageWidthPx = 1000,
	imageHeightPx = 1000,
	pixelSpacingMm = 0.1,
): number {
	if (points.length < 2) return 0;
	let totalMm = 0;
	for (let i = 0; i < points.length - 1; i++) {
		const p1 = points[i]!;
		const p2 = points[i + 1]!;
		totalMm += calculatePhysicalDistanceMm(p1, p2, imageWidthPx, imageHeightPx, pixelSpacingMm);
	}
	return Number(totalMm.toFixed(2));
}

/**
 * Построение полигона коридора безопасности (Safety Margin 2.0 мм) вокруг хода нерва
 */
export function generateNerveSafetyCorridor2D(
	splinePoints: Point2D[],
	safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	imageWidthPx = 1000,
	imageHeightPx = 1000,
	pixelSpacingMm = 0.1,
): Point2D[] {
	if (splinePoints.length < 2) return [];

	const marginPx = safetyMarginMm / pixelSpacingMm;
	const marginPctX = (marginPx / imageWidthPx) * 100;
	const marginPctY = (marginPx / imageHeightPx) * 100;

	const leftOffset: Point2D[] = [];
	const rightOffset: Point2D[] = [];

	for (let i = 0; i < splinePoints.length; i++) {
		const prev = i === 0 ? splinePoints[i]! : splinePoints[i - 1]!;
		const next = i === splinePoints.length - 1 ? splinePoints[i]! : splinePoints[i + 1]!;
		const curr = splinePoints[i]!;

		const dx = next.x - prev.x;
		const dy = next.y - prev.y;
		const len = Math.hypot(dx, dy) || 1;

		const nx = -dy / len;
		const ny = dx / len;

		leftOffset.push({
			x: Number((curr.x + nx * marginPctX).toFixed(3)),
			y: Number((curr.y + ny * marginPctY).toFixed(3)),
		});

		rightOffset.push({
			x: Number((curr.x - nx * marginPctX).toFixed(3)),
			y: Number((curr.y - ny * marginPctY).toFixed(3)),
		});
	}

	return [...leftOffset, ...rightOffset.reverse()];
}

/**
 * Кратчайшее расстояние от 2D точки до отрезка (в миллиметрах)
 */
export function distancePointToSegment2DMm(
	point: Point2D,
	segStart: Point2D,
	segEnd: Point2D,
	imageWidthPx = 1000,
	imageHeightPx = 1000,
	pixelSpacingMm = 0.1,
): number {
	const px = (point.x / 100) * imageWidthPx;
	const py = (point.y / 100) * imageHeightPx;
	const ax = (segStart.x / 100) * imageWidthPx;
	const ay = (segStart.y / 100) * imageHeightPx;
	const bx = (segEnd.x / 100) * imageWidthPx;
	const by = (segEnd.y / 100) * imageHeightPx;

	const abx = bx - ax;
	const aby = by - ay;
	const l2 = abx * abx + aby * aby;

	if (l2 === 0) {
		return Number((Math.hypot(px - ax, py - ay) * pixelSpacingMm).toFixed(2));
	}

	const apx = px - ax;
	const apy = py - ay;
	let t = (apx * abx + apy * aby) / l2;
	t = Math.max(0, Math.min(1, t));

	const projX = ax + t * abx;
	const projY = ay + t * aby;
	const distPx = Math.hypot(px - projX, py - projY);

	return Number((distPx * pixelSpacingMm).toFixed(2));
}

/**
 * Кратчайшее расстояние от точки до сплайна нижнечелюстного нерва (2D)
 */
export function calculatePointToNerveDistance2D(
	point: Point2D,
	nerveSpline: Point2D[],
	imageWidthPx = 1000,
	imageHeightPx = 1000,
	pixelSpacingMm = 0.1,
): { distanceMm: number; closestPointIndex: number } {
	if (nerveSpline.length === 0) {
		return { distanceMm: Infinity, closestPointIndex: -1 };
	}
	if (nerveSpline.length === 1) {
		const d = calculatePhysicalDistanceMm(
			point,
			nerveSpline[0]!,
			imageWidthPx,
			imageHeightPx,
			pixelSpacingMm,
		);
		return { distanceMm: d, closestPointIndex: 0 };
	}

	let minDistanceMm = Infinity;
	let closestIdx = 0;

	for (let i = 0; i < nerveSpline.length - 1; i++) {
		const d = distancePointToSegment2DMm(
			point,
			nerveSpline[i]!,
			nerveSpline[i + 1]!,
			imageWidthPx,
			imageHeightPx,
			pixelSpacingMm,
		);
		if (d < minDistanceMm) {
			minDistanceMm = d;
			closestIdx = i;
		}
	}

	return { distanceMm: minDistanceMm, closestPointIndex: closestIdx };
}

/**
 * Кратчайшее 3D-расстояние от точки (апекса имплантата) до 3D-сплайна нерва (в мм)
 */
export function calculatePointToNerveDistance3D(
	point: Point3D,
	nerveSpline: Point3D[],
): { distanceMm: number; closestPointIndex: number } {
	if (nerveSpline.length === 0) return { distanceMm: Infinity, closestPointIndex: -1 };
	if (nerveSpline.length === 1) {
		const p0 = nerveSpline[0]!;
		const dx = point.x - p0.x;
		const dy = point.y - p0.y;
		const dz = point.z - p0.z;
		return {
			distanceMm: Number(Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(2)),
			closestPointIndex: 0,
		};
	}

	let minDistance = Infinity;
	let closestIdx = 0;

	for (let i = 0; i < nerveSpline.length - 1; i++) {
		const v = nerveSpline[i]!;
		const w = nerveSpline[i + 1]!;

		const vwx = w.x - v.x;
		const vwy = w.y - v.y;
		const vwz = w.z - v.z;
		const l2 = vwx * vwx + vwy * vwy + vwz * vwz;

		let d = 0;
		if (l2 === 0) {
			d = Math.hypot(point.x - v.x, point.y - v.y, point.z - v.z);
		} else {
			const pvx = point.x - v.x;
			const pvy = point.y - v.y;
			const pvz = point.z - v.z;
			let t = (pvx * vwx + pvy * vwy + pvz * vwz) / l2;
			t = Math.max(0, Math.min(1, t));

			const projX = v.x + t * vwx;
			const projY = v.y + t * vwy;
			const projZ = v.z + t * vwz;

			d = Math.hypot(point.x - projX, point.y - projY, point.z - projZ);
		}

		if (d < minDistance) {
			minDistance = d;
			closestIdx = i;
		}
	}

	return {
		distanceMm: Number(minDistance.toFixed(2)),
		closestPointIndex: closestIdx,
	};
}

/**
 * Оценка безопасности зазора между имплантатом и нижнечелюстным каналом
 */
export function evaluateNerveClearance(
	distanceMm: number,
	safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
): NerveClearanceCheckResult {
	const dist = Number(distanceMm.toFixed(2));
	const isDanger = dist < MANDIBULAR_NERVE_CRITICAL_THRESHOLD_MM;
	const isWarning = dist >= MANDIBULAR_NERVE_CRITICAL_THRESHOLD_MM && dist < safetyMarginMm;

	let safetyStatus: "safe" | "warning" | "danger" = "safe";
	let messageRu = "";

	if (isDanger) {
		safetyStatus = "danger";
		messageRu = `КРИТИЧЕСКАЯ ОПАСНОСТЬ: дистанция до нерва ${dist} мм (< 1.5 мм)! Высокий риск повреждения сосудисто-нервного пучка и парестезии нижней губы!`;
	} else if (isWarning) {
		safetyStatus = "warning";
		messageRu = `ПРЕДУПРЕЖДЕНИЕ: дистанция до нерва ${dist} мм (< 2.0 мм). Рекомендуется укоротить имплантат на 1.5–2.0 мм или применить хирургический навигационный шаблон.`;
	} else {
		safetyStatus = "safe";
		messageRu = `Безопасный коридор соблюден: дистанция до нижнечелюстного канала ${dist} мм (норма >= 2.0 мм).`;
	}

	return {
		distanceMm: dist,
		safetyStatus,
		safetyMarginMm,
		isDanger,
		isWarning,
		messageRu,
	};
}

/**
 * Построение структуры трассировки нижнечелюстного нерва
 */
export function buildMandibularNerveSpline(params: {
	id?: string;
	side?: "left" | "right" | "both";
	label?: string;
	controlPoints: Point2D[];
	imageWidthPx?: number;
	imageHeightPx?: number;
	pixelSpacingMm?: number;
	safetyMarginMm?: number;
	canalDiameterMm?: number;
}): MandibularNerveSpline {
	const imageWidthPx = params.imageWidthPx ?? 1000;
	const imageHeightPx = params.imageHeightPx ?? 1000;
	const pixelSpacingMm = params.pixelSpacingMm ?? 0.1;
	const safetyMarginMm = params.safetyMarginMm ?? MANDIBULAR_NERVE_SAFETY_MARGIN_MM;
	const canalDiameterMm = params.canalDiameterMm ?? 2.8;

	const interpolatedCurve = interpolateNerveSpline2D(params.controlPoints);
	const safetyCorridorPolygon = generateNerveSafetyCorridor2D(
		interpolatedCurve,
		safetyMarginMm,
		imageWidthPx,
		imageHeightPx,
		pixelSpacingMm,
	);
	const lengthMm = calculateSplineLengthMm(
		interpolatedCurve,
		imageWidthPx,
		imageHeightPx,
		pixelSpacingMm,
	);

	const sideLabel = params.side === "left" ? "левый" : params.side === "right" ? "правый" : "двусторонний";
	const label = params.label || `Нижнечелюстной канал (${sideLabel})`;

	return {
		id: params.id || `nerve-spline-${Date.now()}-${params.controlPoints.length}-${Math.abs(Math.round(lengthMm * 10)).toString(36)}`,
		side: params.side || "right",
		label,
		controlPoints: params.controlPoints,
		interpolatedCurve,
		safetyCorridorPolygon,
		lengthMm,
		canalDiameterMm,
		safetyMarginMm,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ANGLE (PROTRACTOR) & CAD MEASUREMENT MATHEMATICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Измерение угла протрактором (Угломер) в пространстве MPR
 */

// ─────────────────────────────────────────────────────────────────────────────
// 4. 3D MANDIBULAR CANAL NERVE TRACER (N. ALVEOLARIS INFERIOR) & DISTANCE GATING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 3D Трассировка нижнечелюстного канала (Nervus alveolaris inferior / IAN) в физических миллиметрах
 */
export interface MandibularNerve3DSpline {
	id: string;
	side: "left" | "right" | "both";
	label: string;
	controlPoints: readonly Point3D[] | Point3D[]; // 3D опорные узлы разметки врача в миллиметрах
	interpolatedCurve: Point3D[]; // 3D сглаженная кривая Catmull-Rom в миллиметрах
	lengthMm: number; // Общая анатомическая 3D-длина хода канала в мм
	canalDiameterMm: number; // Средний диаметр самого канала (2.5-3.0 мм, по умолчанию 2.8 мм)
	safetyMarginMm: number; // Цилиндрический коридор безопасности (ровно 2.0 мм)
}

/**
 * Результат непрерывного Distance Gating для отображения среза нерва
 */
export interface NerveDistanceGatingResult {
	deltaZMm: number; // Физическое расстояние по оси Z от текущего среза до участка нерва (|Z_slice - Z_nerve|)
	alpha: number; // Прозрачность: α = exp(-(Δz / 2.0)²)
	isDashed: boolean; // Пунктирная отрисовка при 3.5 мм < |Δz| <= 6.0 мм
	isVisible: boolean; // Видимость (true если |Δz| <= 6.0 мм, false если > 6.0 мм)
}

/**
 * Сглаживание 3D-траектории нижнечелюстного нерва методом Catmull-Rom сплайн-интерполяции
 * Выполняет расчет гладкой трехмерной кривой по точкам (x_i, y_i, z_i) в физических миллиметрах.
 */
export function interpolateNerveSpline3D(
	controlPoints: readonly Point3D[],
	subdivisionsPerSegment = 12,
): Point3D[] {
	if (controlPoints.length === 0) return [];
	if (controlPoints.length === 1) {
		const p0 = controlPoints[0]!;
		return [{ x: Number(p0.x.toFixed(3)), y: Number(p0.y.toFixed(3)), z: Number(p0.z.toFixed(3)) }];
	}
	if (controlPoints.length === 2) {
		const [p0, p1] = controlPoints;
		if (!p0 || !p1) return [];
		const result: Point3D[] = [];
		for (let i = 0; i <= subdivisionsPerSegment; i++) {
			const t = i / subdivisionsPerSegment;
			result.push({
				x: Number((p0.x + (p1.x - p0.x) * t).toFixed(3)),
				y: Number((p0.y + (p1.y - p0.y) * t).toFixed(3)),
				z: Number((p0.z + (p1.z - p0.z) * t).toFixed(3)),
			});
		}
		return result;
	}

	const pts = controlPoints;
	const n = pts.length;
	const spline: Point3D[] = [];

	for (let i = 0; i < n - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[i]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i < n - 2 ? pts[i + 2]! : p2;

		for (let step = 0; step < subdivisionsPerSegment; step++) {
			const t = step / subdivisionsPerSegment;
			const t2 = t * t;
			const t3 = t2 * t;

			const x = 0.5 * (
				(2 * p1.x) +
				(-p0.x + p2.x) * t +
				(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
				(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
			);

			const y = 0.5 * (
				(2 * p1.y) +
				(-p0.y + p2.y) * t +
				(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
				(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
			);

			const z = 0.5 * (
				(2 * p1.z) +
				(-p0.z + p2.z) * t +
				(2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
				(-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
			);

			spline.push({
				x: Number(x.toFixed(3)),
				y: Number(y.toFixed(3)),
				z: Number(z.toFixed(3)),
			});
		}
	}

	const last = pts[n - 1]!;
	spline.push({
		x: Number(last.x.toFixed(3)),
		y: Number(last.y.toFixed(3)),
		z: Number(last.z.toFixed(3)),
	});

	return spline;
}

/**
 * Расчет общей длины 3D-кривой нерва в физических миллиметрах
 */
export function calculateSplineLength3DMm(points: Point3D[]): number {
	if (points.length < 2) return 0;
	let totalMm = 0;
	for (let i = 0; i < points.length - 1; i++) {
		const p1 = points[i]!;
		const p2 = points[i + 1]!;
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		const dz = p2.z - p1.z;
		totalMm += Math.hypot(dx, dy, dz);
	}
	return Number(totalMm.toFixed(2));
}

/**
 * Непрерывный Distance Gating по оси Z:
 * При удалении текущего среза Z_slice от участка нерва на расстояние Δz:
 * - Прозрачность спадает по экспоненциальной формуле α = exp(-(Δz / 2.0)²)
 * - При |Δz| > 3.5 мм линия рисуется пунктиром с низкой прозрачностью
 * - При |Δz| > 6.0 мм полностью гасится (isVisible = false, alpha = 0)
 */
export function calculateNerveDistanceGating(deltaZMm: number): NerveDistanceGatingResult {
	const absDeltaZ = Math.abs(deltaZMm);
	if (absDeltaZ > 6.0) {
		return {
			deltaZMm: Number(absDeltaZ.toFixed(3)),
			alpha: 0,
			isDashed: false,
			isVisible: false,
		};
	}

	const alpha = Math.exp(-Math.pow(absDeltaZ / 2.0, 2));
	const isDashed = absDeltaZ > 3.5;

	return {
		deltaZMm: Number(absDeltaZ.toFixed(3)),
		alpha: Number(alpha.toFixed(4)),
		isDashed,
		isVisible: true,
	};
}

/**
 * Сегмент 3D-сплайна нерва с рассчитанными параметрами видимости для аксиального среза
 */
export interface GatedNerveSegment3D {
	p1: Point3D;
	p2: Point3D;
	midZ: number;
	deltaZMm: number;
	alpha: number;
	isDashed: boolean;
	isVisible: boolean;
}

/**
 * Разделение 3D-сплайна на сегменты с оценкой Distance Gating относительно аксиального среза Z_slice
 */
export function getGatedNerveSegments(
	spline3D: Point3D[],
	sliceZMm: number,
): GatedNerveSegment3D[] {
	if (spline3D.length < 2) return [];
	const segments: GatedNerveSegment3D[] = [];

	for (let i = 0; i < spline3D.length - 1; i++) {
		const p1 = spline3D[i]!;
		const p2 = spline3D[i + 1]!;
		const midZ = (p1.z + p2.z) / 2.0;
		const gating = calculateNerveDistanceGating(midZ - sliceZMm);

		if (gating.isVisible) {
			segments.push({
				p1,
				p2,
				midZ,
				deltaZMm: gating.deltaZMm,
				alpha: gating.alpha,
				isDashed: gating.isDashed,
				isVisible: true,
			});
		}
	}

	return segments;
}

/**
 * Проверка попадания курсора в 3D-узел нерва в физическом пространстве миллиметров
 */
export function hitTestNerveNode3D(
	pointerMm: Point3D,
	nervePoints: readonly Point3D[],
	toleranceMm = 3.0,
): number {
	if (nervePoints.length === 0) return -1;
	let closestIdx = -1;
	let minDistance = toleranceMm;

	for (let i = 0; i < nervePoints.length; i++) {
		const pt = nervePoints[i]!;
		const dist = Math.hypot(pt.x - pointerMm.x, pt.y - pointerMm.y, pt.z - pointerMm.z);
		if (dist <= minDistance) {
			minDistance = dist;
			closestIdx = i;
		}
	}

	return closestIdx;
}

/**
 * Проверка попадания курсора в узел нерва на аксиальном срезе (с учетом допустимого Z-диапазона)
 */
export function hitTestNerveNodeOnAxialSlice(
	pointerMm: Point3D,
	nervePoints: readonly Point3D[],
	toleranceDistanceMm = 3.5,
	maxDeltaZMm = 6.0,
): number {
	if (nervePoints.length === 0) return -1;
	let closestIdx = -1;
	let minDistance2D = toleranceDistanceMm;

	for (let i = 0; i < nervePoints.length; i++) {
		const pt = nervePoints[i]!;
		const deltaZ = Math.abs(pt.z - pointerMm.z);
		if (deltaZ <= maxDeltaZMm) {
			const dist2D = Math.hypot(pt.x - pointerMm.x, pt.y - pointerMm.y);
			if (dist2D <= minDistance2D) {
				minDistance2D = dist2D;
				closestIdx = i;
			}
		}
	}

	return closestIdx;
}

/**
 * Построение 3D-структуры трассировки нижнечелюстного нерва
 */
export function buildMandibularNerve3DSpline(
	points: readonly Point3D[],
	subdivisions?: number,
): MandibularNerve3DSpline;
export function buildMandibularNerve3DSpline(params: {
	id?: string;
	side?: "left" | "right" | "both";
	label?: string;
	controlPoints: readonly Point3D[];
	subdivisionsPerSegment?: number;
	canalDiameterMm?: number;
	safetyMarginMm?: number;
}): MandibularNerve3DSpline;
export function buildMandibularNerve3DSpline(
	paramsOrPoints:
		| {
				id?: string;
				side?: "left" | "right" | "both";
				label?: string;
				controlPoints: readonly Point3D[];
				subdivisionsPerSegment?: number;
				canalDiameterMm?: number;
				safetyMarginMm?: number;
		  }
		| readonly Point3D[],
	subdivisions?: number,
): MandibularNerve3DSpline {
	if (Array.isArray(paramsOrPoints)) {
		const controlPoints = paramsOrPoints as readonly Point3D[];
		const sideLabel = "правый";
		const label = `Нижнечелюстной канал 3D (${sideLabel})`;
		const interpolatedCurve = interpolateNerveSpline3D(controlPoints, subdivisions);
		const lengthMm = calculateSplineLength3DMm(interpolatedCurve);
		return {
			id: `nerve-spline-3d-${Date.now()}-${controlPoints.length}-${Math.abs(Math.round(lengthMm * 10)).toString(36)}`,
			side: "right",
			label,
			controlPoints,
			interpolatedCurve,
			lengthMm,
			canalDiameterMm: 2.8,
			safetyMarginMm: MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
		};
	}

	const params = paramsOrPoints as {
		id?: string;
		side?: "left" | "right" | "both";
		label?: string;
		controlPoints: readonly Point3D[];
		subdivisionsPerSegment?: number;
		canalDiameterMm?: number;
		safetyMarginMm?: number;
	};

	const canalDiameterMm = params.canalDiameterMm ?? 2.8;
	const safetyMarginMm = params.safetyMarginMm ?? MANDIBULAR_NERVE_SAFETY_MARGIN_MM;
	const interpolatedCurve = interpolateNerveSpline3D(params.controlPoints, params.subdivisionsPerSegment);
	const lengthMm = calculateSplineLength3DMm(interpolatedCurve);
	const sideLabel = params.side === "left" ? "левый" : params.side === "right" ? "правый" : "двусторонний";
	const label = params.label || `Нижнечелюстной канал 3D (${sideLabel})`;

	return {
		id: params.id || `nerve-spline-3d-${Date.now()}-${params.controlPoints.length}-${Math.abs(Math.round(lengthMm * 10)).toString(36)}`,
		side: params.side || "right",
		label,
		controlPoints: params.controlPoints,
		interpolatedCurve,
		lengthMm,
		canalDiameterMm,
		safetyMarginMm,
	};
}

export {
	project3DNerveToPanorama,
	type Projected3DNervePoint,
	type Projected3DNerveResult,
	type Project3DNerveOptions,
} from "./dentalCurveEngine";

/**
 * Данные для рендеринга HTML/CSS оверлея бейджа 3D-нерва
 */
export interface NerveHtmlOverlayData {
	readonly text: string;
	readonly xPx: number;
	readonly yPx: number;
	readonly totalLengthMm: number;
	readonly safetyMarginMm: number;
	readonly visibleNodeCount: number;
}

/**
 * Форматирование текста бейджа хода нижнечелюстного канала (IAN)
 */
export function formatNerveBadgeText(
	totalLengthMm: number,
	safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
): string {
	return `Канал IAN (3D ${totalLengthMm.toFixed(1)} мм · ${safetyMarginMm.toFixed(1)} мм буфер)`;
}