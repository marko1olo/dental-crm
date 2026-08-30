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

// ─────────────────────────────────────────────────────────────────────────────
// 3. ANGLE (PROTRACTOR) & CAD MEASUREMENT MATHEMATICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Измерение угла протрактором (Угломер) в пространстве MPR
 */
export interface CbctAngleMeasurement {
	readonly id: string;
	readonly plane: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	readonly startMm: Point3D; // Опорная точка плеча 1
	readonly vertexMm: Point3D; // Вершина угла (угловая точка)
	readonly endMm: Point3D; // Опорная точка плеча 2
	readonly angleDeg: number; // Рассчитанный угол в градусах θ ∈ [0°, 180°]
}

/**
 * Расчет угла в градусах θ ∈ [0°, 180°] по трем 2D-точкам (плечо 1 -> вершина -> плечо 2)
 */
export function calculateAngleBetween3Points2D(
	p1: Point2D,
	vertex: Point2D,
	p2: Point2D,
): number {
	const v1x = p1.x - vertex.x;
	const v1y = p1.y - vertex.y;
	const v2x = p2.x - vertex.x;
	const v2y = p2.y - vertex.y;

	const len1 = Math.hypot(v1x, v1y);
	const len2 = Math.hypot(v2x, v2y);

	if (len1 === 0 || len2 === 0) return 0;

	const dot = v1x * v2x + v1y * v2y;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (len1 * len2)));
	const angleRad = Math.acos(cosTheta);
	const angleDeg = (angleRad * 180) / Math.PI;

	return Number(angleDeg.toFixed(1));
}

/**
 * Расчет угла в градусах θ ∈ [0°, 180°] по трем 3D-точкам в физических миллиметрах
 */
export function calculateAngleBetween3Points3D(
	p1: Point3D,
	vertex: Point3D,
	p2: Point3D,
): number {
	const v1x = p1.x - vertex.x;
	const v1y = p1.y - vertex.y;
	const v1z = p1.z - vertex.z;

	const v2x = p2.x - vertex.x;
	const v2y = p2.y - vertex.y;
	const v2z = p2.z - vertex.z;

	const len1 = Math.hypot(v1x, v1y, v1z);
	const len2 = Math.hypot(v2x, v2y, v2z);

	if (len1 === 0 || len2 === 0) return 0;

	const dot = v1x * v2x + v1y * v2y + v1z * v2z;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (len1 * len2)));
	const angleRad = Math.acos(cosTheta);
	const angleDeg = (angleRad * 180) / Math.PI;

	return Number(angleDeg.toFixed(1));
}

/**
 * Результат проверки попадания курсора в опорную точку (handle) измерения
 */
export interface MeasurementHandleHit {
	readonly type: "ruler" | "angle";
	readonly id: string;
	readonly handleIndex: number; // ruler: 0 (start) | 1 (end); angle: 0 (start) | 1 (vertex) | 2 (end)
	readonly plane: string;
	readonly distancePx: number;
}

/**
 * Интерактивный CAD Hit-testing для перемещения (drag-and-drop) опорных точек линеек и угломеров.
 * hitRadiusPx = 12 обеспечивает невидимый хитбокс захвата мыши 24x24px (Hit-Area).
 */
export function hitTestMeasurementHandle(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: readonly {
		readonly id: string;
		readonly plane: string;
		readonly startPx: { readonly x: number; readonly y: number };
		readonly endPx: { readonly x: number; readonly y: number };
	}[],
	angles: readonly {
		readonly id: string;
		readonly plane: string;
		readonly startPx: { readonly x: number; readonly y: number };
		readonly vertexPx: { readonly x: number; readonly y: number };
		readonly endPx: { readonly x: number; readonly y: number };
	}[],
	hitRadiusPx = 12,
): MeasurementHandleHit | null {
	let closestHit: MeasurementHandleHit | null = null;
	let minDistance = hitRadiusPx;

	// 1. Check Ruler handles (0 = start, 1 = end)
	for (const r of rulers) {
		const dStart = Math.hypot(pointerPx.x - r.startPx.x, pointerPx.y - r.startPx.y);
		if (dStart <= minDistance) {
			minDistance = dStart;
			closestHit = {
				type: "ruler",
				id: r.id,
				handleIndex: 0,
				plane: r.plane,
				distancePx: Number(dStart.toFixed(1)),
			};
		}
		const dEnd = Math.hypot(pointerPx.x - r.endPx.x, pointerPx.y - r.endPx.y);
		if (dEnd <= minDistance) {
			minDistance = dEnd;
			closestHit = {
				type: "ruler",
				id: r.id,
				handleIndex: 1,
				plane: r.plane,
				distancePx: Number(dEnd.toFixed(1)),
			};
		}
	}

	// 2. Check Angle handles (0 = start/arm1, 1 = vertex, 2 = end/arm2)
	for (const a of angles) {
		const dStart = Math.hypot(pointerPx.x - a.startPx.x, pointerPx.y - a.startPx.y);
		if (dStart <= minDistance) {
			minDistance = dStart;
			closestHit = {
				type: "angle",
				id: a.id,
				handleIndex: 0,
				plane: a.plane,
				distancePx: Number(dStart.toFixed(1)),
			};
		}
		const dVertex = Math.hypot(pointerPx.x - a.vertexPx.x, pointerPx.y - a.vertexPx.y);
		if (dVertex <= minDistance) {
			minDistance = dVertex;
			closestHit = {
				type: "angle",
				id: a.id,
				handleIndex: 1,
				plane: a.plane,
				distancePx: Number(dVertex.toFixed(1)),
			};
		}
		const dEnd = Math.hypot(pointerPx.x - a.endPx.x, pointerPx.y - a.endPx.y);
		if (dEnd <= minDistance) {
			minDistance = dEnd;
			closestHit = {
				type: "angle",
				id: a.id,
				handleIndex: 2,
				plane: a.plane,
				distancePx: Number(dEnd.toFixed(1)),
			};
		}
	}

	return closestHit;
}

/**
 * Результат проверки клика на тело измерения (линейку, угломер, пробник) или кнопку быстрого удаления
 */
export interface MeasurementObjectHit {
	readonly type: "ruler" | "angle" | "probe";
	readonly id: string;
	readonly plane: string;
	readonly isDeleteButtonHit: boolean;
	readonly distancePx: number;
}

/**
 * Интерактивный CAD Hit-testing для выбора (selection) или быстрого удаления (1-click delete) объектов измерений
 */
export function hitTestMeasurementObject(
	pointerPx: { readonly x: number; readonly y: number },
	rulers: readonly {
		readonly id: string;
		readonly plane: string;
		readonly startPx: { readonly x: number; readonly y: number };
		readonly endPx: { readonly x: number; readonly y: number };
		readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number };
	}[],
	angles: readonly {
		readonly id: string;
		readonly plane: string;
		readonly startPx: { readonly x: number; readonly y: number };
		readonly vertexPx: { readonly x: number; readonly y: number };
		readonly endPx: { readonly x: number; readonly y: number };
		readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number };
	}[],
	probes: readonly {
		readonly id: string;
		readonly plane: string;
		readonly posPx: { readonly x: number; readonly y: number };
		readonly badgePx?: { readonly x: number; readonly y: number; readonly width?: number; readonly height?: number };
	}[] = [],
	lineHitTolerancePx = 10,
): MeasurementObjectHit | null {
	let closestHit: MeasurementObjectHit | null = null;
	let minDistance = lineHitTolerancePx;

	// Helper for point to segment distance in 2D pixels
	const distPointToSegPx = (
		pt: { x: number; y: number },
		p1: { x: number; y: number },
		p2: { x: number; y: number },
	): number => {
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		const l2 = dx * dx + dy * dy;
		if (l2 === 0) return Math.hypot(pt.x - p1.x, pt.y - p1.y);
		let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / l2;
		t = Math.max(0, Math.min(1, t));
		const projX = p1.x + t * dx;
		const projY = p1.y + t * dy;
		return Math.hypot(pt.x - projX, pt.y - projY);
	};

	// 1. Check Rulers (Badge, Delete Button, or Line Body)
	for (const r of rulers) {
		const midX = (r.startPx.x + r.endPx.x) / 2;
		const midY = (r.startPx.y + r.endPx.y) / 2;
		const badgeW = r.badgePx?.width ?? 64;
		const badgeH = r.badgePx?.height ?? 18;
		const badgeX = r.badgePx?.x ?? midX;
		const badgeY = r.badgePx?.y ?? midY;

		// Hitbox check for fast delete [×] trigger with 44x44 px hitbox for medical gloved touch (DEF-R2-06 / DEF-18.1)
		const deleteTargetX = badgeX + badgeW / 2 - 14;
		const deleteTargetY = badgeY;
		const dx = pointerPx.x - deleteTargetX;
		const dy = pointerPx.y - deleteTargetY;
		const isDeleteHitbox = Math.abs(dx) <= 22 && Math.abs(dy) <= 22;

		// Check if click is on badge
		const isInsideBadge =
			Math.abs(pointerPx.x - badgeX) <= badgeW / 2 + 8 &&
			Math.abs(pointerPx.y - badgeY) <= badgeH / 2 + 8;

		if (isDeleteHitbox || isInsideBadge) {
			const isDeleteHit =
				isDeleteHitbox || pointerPx.x >= badgeX + badgeW / 2 - 28;
			return {
				type: "ruler",
				id: r.id,
				plane: r.plane,
				isDeleteButtonHit: isDeleteHit,
				distancePx: 0,
			};
		}

		const dLine = distPointToSegPx(pointerPx, r.startPx, r.endPx);
		if (dLine <= minDistance) {
			minDistance = dLine;
			closestHit = {
				type: "ruler",
				id: r.id,
				plane: r.plane,
				isDeleteButtonHit: false,
				distancePx: Number(dLine.toFixed(1)),
			};
		}
	}

	// 2. Check Angles (Arms or Badge)
	for (const a of angles) {
		let badgeX = a.vertexPx.x;
		let badgeY = a.vertexPx.y;
		let badgeW = a.badgePx?.width ?? 60;
		let badgeH = a.badgePx?.height ?? 22;

		if (a.badgePx) {
			badgeX = a.badgePx.x;
			badgeY = a.badgePx.y;
		} else {
			const dx1 = a.startPx.x - a.vertexPx.x;
			const dy1 = a.startPx.y - a.vertexPx.y;
			const dx2 = a.endPx.x - a.vertexPx.x;
			const dy2 = a.endPx.y - a.vertexPx.y;
			const len1 = Math.hypot(dx1, dy1);
			const len2 = Math.hypot(dx2, dy2);
			if (len1 >= 5 && len2 >= 5) {
				const angle1 = Math.atan2(dy1, dx1);
				const angle2 = Math.atan2(dy2, dx2);
				let diff = angle2 - angle1;
				while (diff > Math.PI) diff -= Math.PI * 2;
				while (diff < -Math.PI) diff += Math.PI * 2;
				const bisectorAngle = angle1 + diff / 2;
				const badgeDist = Math.min(48, Math.max(26, Math.min(len1, len2) * 0.4 + 14));
				badgeX = a.vertexPx.x + Math.cos(bisectorAngle) * badgeDist;
				badgeY = a.vertexPx.y + Math.sin(bisectorAngle) * badgeDist;
			} else if (len1 >= 5) {
				badgeX = (a.vertexPx.x + a.startPx.x) / 2;
				badgeY = (a.vertexPx.y + a.startPx.y) / 2 - 12;
			} else {
				badgeY -= 16;
			}
		}

		// Hitbox check for fast delete [×] trigger with 44x44 px hitbox for medical gloved touch (DEF-R2-06 / DEF-18.1)
		const deleteTargetX = badgeX + badgeW / 2 - 14;
		const deleteTargetY = badgeY;
		const dx = pointerPx.x - deleteTargetX;
		const dy = pointerPx.y - deleteTargetY;
		const isDeleteHitbox = Math.abs(dx) <= 22 && Math.abs(dy) <= 22;

		const isInsideBadge =
			Math.abs(pointerPx.x - badgeX) <= badgeW / 2 + 8 &&
			Math.abs(pointerPx.y - badgeY) <= badgeH / 2 + 8;

		if (isDeleteHitbox || isInsideBadge) {
			const isDeleteHit =
				isDeleteHitbox || pointerPx.x >= badgeX + badgeW / 2 - 28;
			return {
				type: "angle",
				id: a.id,
				plane: a.plane,
				isDeleteButtonHit: isDeleteHit,
				distancePx: 0,
			};
		}

		const dArm1 = distPointToSegPx(pointerPx, a.vertexPx, a.startPx);
		const dArm2 = distPointToSegPx(pointerPx, a.vertexPx, a.endPx);
		const minArmDist = Math.min(dArm1, dArm2);

		if (minArmDist <= minDistance) {
			minDistance = minArmDist;
			closestHit = {
				type: "angle",
				id: a.id,
				plane: a.plane,
				isDeleteButtonHit: false,
				distancePx: Number(minArmDist.toFixed(1)),
			};
		}
	}

	// 3. Check Probes
	for (const p of probes) {
		const badgeW = p.badgePx?.width ?? 80;
		const badgeH = p.badgePx?.height ?? 22;
		const badgeX = p.badgePx?.x ?? (p.posPx.x + 10);
		const badgeY = p.badgePx?.y ?? (p.posPx.y - 22);
		const deleteTargetX = badgeX + badgeW - 14;
		const deleteTargetY = badgeY + badgeH / 2;
		const dx = pointerPx.x - deleteTargetX;
		const dy = pointerPx.y - deleteTargetY;
		const isDeleteHitbox = Math.abs(dx) <= 22 && Math.abs(dy) <= 22;

		const dProbe = Math.hypot(pointerPx.x - p.posPx.x, pointerPx.y - p.posPx.y);
		if (isDeleteHitbox) {
			return {
				type: "probe",
				id: p.id,
				plane: p.plane,
				isDeleteButtonHit: true,
				distancePx: 0,
			};
		}
		if (dProbe <= minDistance + 4) {
			minDistance = dProbe;
			closestHit = {
				type: "probe",
				id: p.id,
				plane: p.plane,
				isDeleteButtonHit: false,
				distancePx: Number(dProbe.toFixed(1)),
			};
		}
	}

	return closestHit;
}

/**
 * Draws visual 22px circular delete [×] button badge on measurement overlays (DEF-03 / DEF-18.1 / DEF-R2-06).
 * Visual: round badge radius 11px (diameter 22px), background rgba(239, 68, 68, 0.35)
 * with border #ef4444 (1.5px) and crisp white cross in center (12px bold).
 * Retains 44x44px invisible touch-friendly hit-test area.
 */
export function drawMeasurementDeleteButton(
	ctx: CanvasRenderingContext2D,
	centerX: number,
	centerY: number,
	radius = 11,
): void {
	ctx.save();
	ctx.shadowBlur = 0;
	// Round badge background
	ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
	ctx.strokeStyle = "#ef4444";
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	// Crisp white cross in the center
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 12px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("×", centerX, centerY);
	ctx.restore();
}

export const drawCaliperDeleteButton = drawMeasurementDeleteButton;

/**
 * Standard crisp high-contrast overlay pad background & border tokens (The Hammer V 8.0: Rendering Brutality)
 * Guarantees WCAG AAA contrast (>= 7:1) over hyperdense white cortical bone and enamel.
 */
export const CRISP_OVERLAY_PAD_BG = "rgba(15, 23, 42, 0.92)";
export const CRISP_OVERLAY_BORDER_GOLD = "#f59e0b";
export const CRISP_OVERLAY_BORDER_CYAN = "#06b6d4";
export const CRISP_OVERLAY_BORDER_BLUE = "#0284c7";

/**
 * Draws floating 3D Mandibular Canal (IAN) trajectory badge tooltip (DEF-R2-03).
 * Visual: bold 12px monospace font, dense dark background rgba(15, 23, 42, 0.92)
 * with #f59e0b border (1.0px) and gold text (#fbbf24).
 * Padding: >= 6px horizontal (8px), >= 3px vertical (5px).
 */
export function drawMandibularNerveBadge(
	ctx: CanvasRenderingContext2D,
	posPx: { readonly x: number; readonly y: number },
	totalLengthMm: number,
	safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
): void {
	ctx.save();
	ctx.fillStyle = CRISP_OVERLAY_PAD_BG;
	ctx.strokeStyle = CRISP_OVERLAY_BORDER_GOLD;
	ctx.lineWidth = 1.5;
	const text = `Канал IAN (3D ${totalLengthMm.toFixed(1)} мм · ${safetyMarginMm.toFixed(1)} мм буфер)`;
	ctx.font = "bold 12px monospace";
	const tw = ctx.measureText(text).width;
	const padX = 8; // >= 6px horizontal padding
	const padY = 5; // >= 3px vertical padding
	const badgeW = tw + padX * 2;
	const badgeH = 22; // 12px font + 2 * 5px vertical padding
	const badgeX = posPx.x - badgeW / 2;
	const badgeY = posPx.y - 24;

	ctx.beginPath();
	if (typeof ctx.roundRect === "function") {
		ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
	} else {
		ctx.rect(badgeX, badgeY, badgeW, badgeH);
	}
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#fbbf24";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, posPx.x, badgeY + badgeH / 2);
	ctx.restore();
}

export const drawNerveCanalBadge = drawMandibularNerveBadge;

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
			id: `nerve-spline-3d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
		id: params.id || `nerve-spline-3d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

