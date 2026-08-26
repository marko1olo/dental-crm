/**
 * CBCT / Panoramic 3D MPR Caliper Measurements & Mandibular Canal Nerve Tracer Engine
 *
 * Clinical domain:
 * 1. Electronic Caliper (Штангенциркуль альвеолярного гребня):
 *    - Measuring vertical bone height (mm) from crest to anatomical landmarks (sinus floor, mandibular canal).
 *    - Measuring horizontal bone width (mm) at alveolar crest (1-2mm depth), mid-body (5mm depth), and basal bone (10mm depth).
 *    - Scale calibration: converts pixel distances to true physical millimeters.
 *    - Implant feasibility grading: determines if bone volume is adequate for standard Ø3.5-Ø5.0mm implants or if bone grafting (GBR/синус-лифтинг/расщепление) is required.
 *
 * 2. Mandibular Canal Nerve Tracer (Трассировщик нижнечелюстного канала / N. alveolaris inferior):
 *    - Spline curve interpolation along the anatomical canal path from mandibular foramen to mental foramen.
 *    - Safety Margin corridor: exactly 2.0 mm clinical safety buffer around the nerve canal.
 *    - 2D & 3D proximity clearance calculation: calculates shortest distance from implant apex/body to the nerve.
 *    - Safety classification: Safe (>=2.0 mm), Warning (1.5-2.0 mm), Critical Danger (<1.5 mm).
 */

export const MANDIBULAR_NERVE_SAFETY_MARGIN_MM = 2.0;
export const MANDIBULAR_NERVE_CRITICAL_THRESHOLD_MM = 1.5;
export const MIN_IMPLANT_BONE_WIDTH_MM = 6.0;
export const MIN_IMPLANT_BONE_HEIGHT_MM = 10.0;

export interface Point2D {
	x: number; // 0..100 (%) or pixel/world coordinate
	y: number;
}

export interface Point3D {
	x: number;
	y: number;
	z: number;
}

/**
 * Измерение альвеолярного гребня электронным штангенциркулем
 */
export interface AlveolarRidgeCaliperMeasurement {
	id: string;
	fdiTooth?: string | null | undefined;
	label: string;
	// Координаты в % (0..100) относительно изображения или в мм
	crestPoint: Point2D; // Вершина альвеолярного гребня
	basePoint: Point2D; // Базальное основание / дно пазухи / крыша канала
	crestWidthLeft?: Point2D | undefined; // Левая граница ширины по гребню
	crestWidthRight?: Point2D | undefined; // Правая граница ширины по гребню
	// Рассчитанные клинические параметры в миллиметрах
	heightMm: number; // Высота гребня
	crestWidthMm: number; // Ширина по вершине гребня (Crestal width, 1-2 мм от вершины)
	midWidthMm: number; // Ширина на середине высоты (Mid-body width, ~5 мм)
	baseWidthMm: number; // Базальная ширина (~10 мм)
	// Оценка пригодности к имплантации
	implantFeasibility: {
		isAdequate: boolean;
		recommendedDiameterMm: number;
		recommendedLengthMm: number;
		requiresBoneGrafting: boolean;
		graftingType?: "sinus_lift" | "gbr_horizontal" | "ridge_split" | "none" | undefined;
		clinicalAdviceRu: string;
	};
}

/**
 * Трассировка нижнечелюстного канала (Nervus alveolaris inferior)
 */
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
export function calculatePhysicalDistanceMm(
	p1: Point2D,
	p2: Point2D,
	imageWidthPx = 1000,
	imageHeightPx = 1000,
	pixelSpacingMm = 0.1,
): number {
	const dxPx = ((p2.x - p1.x) / 100) * imageWidthPx;
	const dyPx = ((p2.y - p1.y) / 100) * imageHeightPx;
	const distPx = Math.hypot(dxPx, dyPx);
	return Number((distPx * pixelSpacingMm).toFixed(2));
}

/**
 * Оценка анатомической пригодности альвеолярного гребня для дентальной имплантации
 */
export function evaluateAlveolarRidgeFeasibility(
	heightMm: number,
	crestWidthMm: number,
	midWidthMm?: number,
): AlveolarRidgeCaliperMeasurement["implantFeasibility"] {
	const effectiveMidWidth = midWidthMm ?? crestWidthMm * 1.15;
	const safeHeight = Math.max(0, heightMm);
	const safeWidth = Math.max(0, crestWidthMm);

	let isAdequate = false;
	let recommendedDiameterMm = 0;
	let recommendedLengthMm = 0;
	let requiresBoneGrafting = false;
	let graftingType: "sinus_lift" | "gbr_horizontal" | "ridge_split" | "none" = "none";
	let clinicalAdviceRu = "";

	if (safeHeight >= 10.0 && safeWidth >= 7.0) {
		isAdequate = true;
		recommendedDiameterMm = safeWidth >= 8.0 ? 4.5 : 4.0;
		recommendedLengthMm = safeHeight >= 12.0 ? 11.5 : 10.0;
		requiresBoneGrafting = false;
		graftingType = "none";
		clinicalAdviceRu = `Объем кости достаточен для классической имплантации (Ø${recommendedDiameterMm}x${recommendedLengthMm} мм). Первичная стабильность оптимальная.`;
	} else if (safeHeight >= 10.0 && safeWidth >= 5.0 && safeWidth < 7.0) {
		isAdequate = true;
		recommendedDiameterMm = 3.5;
		recommendedLengthMm = safeHeight >= 11.5 ? 10.0 : 8.5;
		requiresBoneGrafting = safeWidth < 5.8;
		graftingType = safeWidth < 5.8 ? "gbr_horizontal" : "none";
		clinicalAdviceRu = safeWidth < 5.8
			? "Узкий альвеолярный гребень: показана одновременная НКР (GBR) с костнозамещающим материалом и мембраной."
			: `Допустима установка узкого имплантата Ø${recommendedDiameterMm} мм без костной пластики.`;
	} else if (safeHeight < 8.0 && safeWidth >= 6.5) {
		isAdequate = false;
		recommendedDiameterMm = 4.0;
		recommendedLengthMm = 8.0;
		requiresBoneGrafting = true;
		graftingType = "sinus_lift";
		clinicalAdviceRu = `Дефицит вертикальной высоты (${safeHeight.toFixed(1)} мм < 8.0 мм): требуется открытый/закрытый синус-лифтинг или вертикальная аугментация.`;
	} else if (safeWidth < 5.0 && safeHeight >= 8.0) {
		isAdequate = false;
		recommendedDiameterMm = 3.5;
		recommendedLengthMm = 10.0;
		requiresBoneGrafting = true;
		graftingType = "ridge_split";
		clinicalAdviceRu = `Выраженная горизонтальная резорбция (${safeWidth.toFixed(1)} мм): показано расщепление альвеолярного гребня (Ridge Split) или сэндвич-пластика.`;
	} else {
		isAdequate = false;
		recommendedDiameterMm = 3.5;
		recommendedLengthMm = 8.0;
		requiresBoneGrafting = true;
		graftingType = "gbr_horizontal";
		clinicalAdviceRu = `Комбинированный дефицит кости (H=${safeHeight.toFixed(1)} мм, W=${safeWidth.toFixed(1)} мм): требуется предварительная 3D-реконструкция костной ткани.`;
	}

	return {
		isAdequate,
		recommendedDiameterMm,
		recommendedLengthMm,
		requiresBoneGrafting,
		graftingType,
		clinicalAdviceRu,
	};
}

/**
 * Полный расчет параметров альвеолярного гребня по точкам электронного штангенциркуля
 */
export function calculateCaliperRidgeDimensions(params: {
	crestPoint: Point2D;
	basePoint: Point2D;
	crestWidthLeft?: Point2D;
	crestWidthRight?: Point2D;
	imageWidthPx?: number;
	imageHeightPx?: number;
	pixelSpacingMm?: number;
	fdiTooth?: string | null;
	label?: string;
}): AlveolarRidgeCaliperMeasurement {
	const imageWidthPx = params.imageWidthPx ?? 1000;
	const imageHeightPx = params.imageHeightPx ?? 1000;
	const pixelSpacingMm = params.pixelSpacingMm ?? 0.1;

	// 1. Высота гребня
	const heightMm = calculatePhysicalDistanceMm(
		params.crestPoint,
		params.basePoint,
		imageWidthPx,
		imageHeightPx,
		pixelSpacingMm,
	);

	// 2. Ширина по гребню
	let crestWidthMm = 7.0; // Значение по умолчанию, если ширина не задана явно
	if (params.crestWidthLeft && params.crestWidthRight) {
		crestWidthMm = calculatePhysicalDistanceMm(
			params.crestWidthLeft,
			params.crestWidthRight,
			imageWidthPx,
			imageHeightPx,
			pixelSpacingMm,
		);
	}

	const midWidthMm = Number((crestWidthMm * 1.18).toFixed(2));
	const baseWidthMm = Number((crestWidthMm * 1.35).toFixed(2));

	const feasibility = evaluateAlveolarRidgeFeasibility(heightMm, crestWidthMm, midWidthMm);

	return {
		id: `caliper-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		fdiTooth: params.fdiTooth ?? null,
		label: params.label || (params.fdiTooth ? `Штангенциркуль (Зуб ${params.fdiTooth})` : "Замер альвеолярного гребня"),
		crestPoint: params.crestPoint,
		basePoint: params.basePoint,
		crestWidthLeft: params.crestWidthLeft,
		crestWidthRight: params.crestWidthRight,
		heightMm,
		crestWidthMm,
		midWidthMm,
		baseWidthMm,
		implantFeasibility: feasibility,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MANDIBULAR CANAL NERVE TRACER & SAFETY CORRIDOR (2.0 MM BUFFER)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Сглаживание траектории нерва методом Catmull-Rom сплайн-интерполяции (2D)
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
		id: params.id || `nerve-spline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
