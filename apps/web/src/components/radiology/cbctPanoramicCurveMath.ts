/**
 * cbctPanoramicCurveMath.ts
 *
 * CBCT Dental Arch Panoramic Curve & Cross-Section Geometric Engine:
 * 1. Adaptive Parabolic / Catmull-Rom Spline Curve generation along the Dental Arch
 * 2. Uniform Arc-Length Parameterization with 1.0–2.0 mm sampling step
 * 3. Normal & Tangent Orthogonal Frenet Vectors calculation (N · T = 0, |N| = 1)
 * 4. Formation of 32–40 Cross-Sectional / Pararadicular Slicing Planes
 * 5. Focal Trough Thickness corridors (5mm, 10mm, 20mm) and Arch Presets
 *
 * Pure geometric and trigonometric mathematics: zero DOM dependencies.
 */

export interface Point2D {
	x: number; // Coordinate in percentage (0..100) or physical mm/pixels
	y: number;
}

export type DentalArchPreset =
	| "standard_mandible"
	| "standard_maxilla"
	| "narrow_v_shape"
	| "wide_u_shape"
	| "asymmetric_left"
	| "asymmetric_right";

export interface ArchControlPoint {
	id: string;
	x: number; // 0..100 (%)
	y: number; // 0..100 (%)
	label: string;
	region: "molar_right" | "premolar_right" | "canine_right" | "incisor" | "canine_left" | "premolar_left" | "molar_left";
	isLocked?: boolean;
}

export interface PanoramicCurveSample {
	index: number;
	point: Point2D;
	tangent: Point2D; // Normalized unit tangent vector
	normal: Point2D; // Normalized unit normal vector (pointing buccal / outward)
	arcDistanceMm: number; // Cumulative arc length from start in mm
	normalizedT: number; // 0.0 at start, 1.0 at end
}

export interface CrossSectionPlane {
	sliceIndex: number; // 0..N-1 (e.g. 0..35)
	center: Point2D; // Center of slice on axial curve (%)
	tangent: Point2D; // Unit tangent vector
	normal: Point2D; // Unit normal vector (bucco-lingual orientation)
	arcLengthMm: number; // Position along dental arch in physical mm
	sliceThicknessMm: number; // Focal trough thickness (e.g. 5, 10, 20 mm)
	crossSectionWidthMm: number; // Buccolingual width extent in mm (e.g. 30 mm)
	crossSectionHeightMm: number; // Apico-coronal vertical height in mm (e.g. 35 mm)
	startPoint: Point2D; // Buccal end coordinate (%)
	endPoint: Point2D; // Lingual/palatal end coordinate (%)
	focalTroughBuccalPoint: Point2D; // Outer focal trough boundary point (%)
	focalTroughLingualPoint: Point2D; // Inner focal trough boundary point (%)
	fdiTooth: string | null; // e.g. "46", "36", "11", "21"
	toothRegion: "molar" | "premolar" | "canine" | "incisor";
	jawType: "maxilla" | "mandible";
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STANDARD DENTAL ARCH CONTROL POINT PRESETS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Возвращает анатомически выверенные опорные точки зубной дуги для аксиального среза КЛКТ (0..100%)
 */
export function getStandardDentalArchControlPoints(
	preset: DentalArchPreset = "standard_mandible",
	jaw: "maxilla" | "mandible" = "mandible",
): ArchControlPoint[] {
	switch (preset) {
		case "standard_maxilla":
			// Верхняя челюсть: чуть более широкая и пологая передняя дуга
			return [
				{ id: "p-18", x: 20.0, y: 72.0, label: "18-17 (Моляры R)", region: "molar_right" },
				{ id: "p-15", x: 26.0, y: 52.0, label: "16-15 (Премоляры R)", region: "premolar_right" },
				{ id: "p-13", x: 35.0, y: 35.0, label: "14-13 (Клык R)", region: "canine_right" },
				{ id: "p-11", x: 50.0, y: 22.0, label: "11-21 (Резцы центр)", region: "incisor" },
				{ id: "p-23", x: 65.0, y: 35.0, label: "23-24 (Клык L)", region: "canine_left" },
				{ id: "p-25", x: 74.0, y: 52.0, label: "25-26 (Премоляры L)", region: "premolar_left" },
				{ id: "p-28", x: 80.0, y: 72.0, label: "27-28 (Моляры L)", region: "molar_left" },
			];

		case "narrow_v_shape":
			// V-образная (узкая готическая дуга): сужение премоляров и острый фронтальный угол
			return [
				{ id: "pv-r-mol", x: 25.0, y: 78.0, label: "Моляры R (V)", region: "molar_right" },
				{ id: "pv-r-pm", x: 32.0, y: 54.0, label: "Премоляры R", region: "premolar_right" },
				{ id: "pv-r-can", x: 40.0, y: 34.0, label: "Клык R", region: "canine_right" },
				{ id: "pv-inc", x: 50.0, y: 16.0, label: "Фронт V-апекс", region: "incisor" },
				{ id: "pv-l-can", x: 60.0, y: 34.0, label: "Клык L", region: "canine_left" },
				{ id: "pv-l-pm", x: 68.0, y: 54.0, label: "Премоляры L", region: "premolar_left" },
				{ id: "pv-l-mol", x: 75.0, y: 78.0, label: "Моляры L (V)", region: "molar_left" },
			];

		case "wide_u_shape":
			// U-образная (широкая квадратная дуга): уплощенный фронтальный сегмент и широкие ветви
			return [
				{ id: "pu-r-mol", x: 16.0, y: 70.0, label: "Моляры R (U)", region: "molar_right" },
				{ id: "pu-r-pm", x: 20.0, y: 46.0, label: "Премоляры R", region: "premolar_right" },
				{ id: "pu-r-can", x: 30.0, y: 26.0, label: "Клык R", region: "canine_right" },
				{ id: "pu-inc-r", x: 42.0, y: 22.0, label: "Резцы R", region: "incisor" },
				{ id: "pu-inc-l", x: 58.0, y: 22.0, label: "Резцы L", region: "incisor" },
				{ id: "pu-l-can", x: 70.0, y: 26.0, label: "Клык L", region: "canine_left" },
				{ id: "pu-l-pm", x: 80.0, y: 46.0, label: "Премоляры L", region: "premolar_left" },
				{ id: "pu-l-mol", x: 84.0, y: 70.0, label: "Моляры L (U)", region: "molar_left" },
			];

		case "asymmetric_left":
			return [
				{ id: "pa-r-mol", x: 22.0, y: 74.0, label: "Моляры R", region: "molar_right" },
				{ id: "pa-r-pm", x: 28.0, y: 54.0, label: "Премоляры R", region: "premolar_right" },
				{ id: "pa-r-can", x: 36.0, y: 36.0, label: "Клык R", region: "canine_right" },
				{ id: "pa-inc", x: 47.0, y: 24.0, label: "Резцы центр (Сдвиг)", region: "incisor" },
				{ id: "pa-l-can", x: 62.0, y: 32.0, label: "Клык L (Широкий)", region: "canine_left" },
				{ id: "pa-l-pm", x: 75.0, y: 48.0, label: "Премоляры L", region: "premolar_left" },
				{ id: "pa-l-mol", x: 84.0, y: 68.0, label: "Моляры L", region: "molar_left" },
			];

		case "asymmetric_right":
			return [
				{ id: "par-r-mol", x: 16.0, y: 68.0, label: "Моляры R", region: "molar_right" },
				{ id: "par-r-pm", x: 25.0, y: 48.0, label: "Премоляры R", region: "premolar_right" },
				{ id: "par-r-can", x: 38.0, y: 32.0, label: "Клык R", region: "canine_right" },
				{ id: "par-inc", x: 53.0, y: 24.0, label: "Резцы центр", region: "incisor" },
				{ id: "par-l-can", x: 64.0, y: 36.0, label: "Клык L", region: "canine_left" },
				{ id: "par-l-pm", x: 72.0, y: 54.0, label: "Премоляры L", region: "premolar_left" },
				{ id: "par-l-mol", x: 78.0, y: 74.0, label: "Моляры L", region: "molar_left" },
			];

		case "standard_mandible":
		default:
			// Нижняя челюсть: классическая парабола
			return [
				{ id: "p-48", x: 22.0, y: 76.0, label: "48-47 (Моляры R)", region: "molar_right" },
				{ id: "p-46", x: 28.0, y: 56.0, label: "46-45 (Премоляры R)", region: "premolar_right" },
				{ id: "p-43", x: 37.0, y: 38.0, label: "44-43 (Клык R)", region: "canine_right" },
				{ id: "p-41", x: 50.0, y: 25.0, label: "41-31 (Резцы центр)", region: "incisor" },
				{ id: "p-33", x: 63.0, y: 38.0, label: "33-34 (Клык L)", region: "canine_left" },
				{ id: "p-36", x: 72.0, y: 56.0, label: "35-36 (Премоляры L)", region: "premolar_left" },
				{ id: "p-38", x: 78.0, y: 76.0, label: "37-38 (Моляры L)", region: "molar_left" },
			];
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CATMULL-ROM SPLINE MATHEMATICS & DERIVATIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Вычисляет точку на сплайне Catmull-Rom для сегмента p1 -> p2 при параметре t in [0, 1]
 */
export function catmullRom2D(
	p0: Point2D,
	p1: Point2D,
	p2: Point2D,
	p3: Point2D,
	t: number,
	tension = 0.5,
): Point2D {
	const t2 = t * t;
	const t3 = t2 * t;

	// Matrix form: 0.5 * [1 t t2 t3] * [ 0 2 0 0; -1 0 1 0; 2 -5 4 -1; -1 3 -3 1 ] * P
	const f1 = -tension * t3 + 2 * tension * t2 - tension * t;
	const f2 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
	const f3 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
	const f4 = tension * t3 - tension * t2;

	return {
		x: p0.x * f1 + p1.x * f2 + p2.x * f3 + p3.x * f4,
		y: p0.y * f1 + p1.y * f2 + p2.y * f3 + p3.y * f4,
	};
}

/**
 * Вычисляет аналитическую первую производную (вектор скорости dP/dt) для сплайна Catmull-Rom
 */
export function catmullRomDerivative2D(
	p0: Point2D,
	p1: Point2D,
	p2: Point2D,
	p3: Point2D,
	t: number,
	tension = 0.5,
): Point2D {
	const t2 = t * t;

	const df1 = -3 * tension * t2 + 4 * tension * t - tension;
	const df2 = 3 * (2 - tension) * t2 + 2 * (tension - 3) * t;
	const df3 = 3 * (tension - 2) * t2 + 2 * (3 - 2 * tension) * t + tension;
	const df4 = 3 * tension * t2 - 2 * tension * t;

	return {
		x: p0.x * df1 + p1.x * df2 + p2.x * df3 + p3.x * df4,
		y: p0.y * df1 + p1.y * df2 + p2.y * df3 + p3.y * df4,
	};
}

/**
 * Интерполирует массив контрольных точек в непрерывную сглаженную кривую
 */
export function interpolateArchSpline(
	controlPoints: Point2D[],
	samplesPerSegment = 40,
): Point2D[] {
	if (!controlPoints || controlPoints.length === 0) return [];
	if (controlPoints.length === 1) return [{ ...controlPoints[0]! }];
	if (controlPoints.length === 2) {
		const res: Point2D[] = [];
		const p0 = controlPoints[0]!;
		const p1 = controlPoints[1]!;
		for (let i = 0; i <= samplesPerSegment; i++) {
			const t = i / samplesPerSegment;
			res.push({
				x: p0.x + (p1.x - p0.x) * t,
				y: p0.y + (p1.y - p0.y) * t,
			});
		}
		return res;
	}

	const pts = controlPoints;
	const n = pts.length;
	const result: Point2D[] = [];

	for (let i = 0; i < n - 1; i++) {
		const p0 = i === 0 ? { x: 2 * pts[0]!.x - pts[1]!.x, y: 2 * pts[0]!.y - pts[1]!.y } : pts[i - 1]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i + 2 < n ? pts[i + 2]! : { x: 2 * pts[n - 1]!.x - pts[n - 2]!.x, y: 2 * pts[n - 1]!.y - pts[n - 2]!.y };

		const steps = i === n - 2 ? samplesPerSegment : samplesPerSegment - 1;
		for (let s = 0; s <= steps; s++) {
			const t = s / samplesPerSegment;
			result.push(catmullRom2D(p0, p1, p2, p3, t));
		}
	}

	return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ARC-LENGTH PARAMETERIZATION & NORMAL VECTORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Вычисляет евклидово расстояние в миллиметрах между точками с учетом калибровки
 */
export function pointDistanceMm(
	p1: Point2D,
	p2: Point2D,
	imageWidthMm = 120.0,
	imageHeightMm = 120.0,
): number {
	const dxMm = ((p2.x - p1.x) / 100) * imageWidthMm;
	const dyMm = ((p2.y - p1.y) / 100) * imageHeightMm;
	return Math.hypot(dxMm, dyMm);
}

/**
 * Строит параметризованную по длине дуги кривую с равномерным физическим шагом (1.0–2.0 мм)
 */
export function buildArcLengthParameterizedCurve(
	controlPoints: Point2D[],
	stepMm = 1.0,
	imageWidthMm = 120.0,
	imageHeightMm = 120.0,
): PanoramicCurveSample[] {
	if (!controlPoints || controlPoints.length < 2) {
		return [];
	}

	const safeStepMm = Math.max(0.2, stepMm);
	// 1. Создаем высокоплотную сетку интерполяции
	const densePoints = interpolateArchSpline(controlPoints, 60);
	if (densePoints.length < 2) return [];

	// 2. Рассчитываем накопительные длины дуги
	const cumulativeLengths: number[] = [0];
	let totalLengthMm = 0;

	for (let i = 1; i < densePoints.length; i++) {
		const segDist = pointDistanceMm(
			densePoints[i - 1]!,
			densePoints[i]!,
			imageWidthMm,
			imageHeightMm,
		);
		totalLengthMm += segDist;
		cumulativeLengths.push(totalLengthMm);
	}

	if (totalLengthMm <= 0.0001) return [];

	// 3. Выполняем равномерную дискретизацию по длине дуги с заданным шагом
	const numSamples = Math.max(2, Math.floor(totalLengthMm / safeStepMm) + 1);
	const samples: PanoramicCurveSample[] = [];

	let denseCursor = 0;

	for (let i = 0; i < numSamples; i++) {
		const targetDistance = Math.min(totalLengthMm, i * safeStepMm);

		// Находим соответствующий отрезок в плотной сетке
		while (
			denseCursor < cumulativeLengths.length - 2 &&
			(cumulativeLengths[denseCursor + 1] ?? 0) < targetDistance
		) {
			denseCursor++;
		}

		const l0 = cumulativeLengths[denseCursor] ?? 0;
		const l1 = cumulativeLengths[denseCursor + 1] ?? totalLengthMm;
		const segmentSpan = l1 - l0;
		const fraction = segmentSpan > 0 ? (targetDistance - l0) / segmentSpan : 0;

		const pt0 = densePoints[denseCursor]!;
		const pt1 = densePoints[denseCursor + 1] ?? pt0;

		const point: Point2D = {
			x: Number((pt0.x + (pt1.x - pt0.x) * fraction).toFixed(3)),
			y: Number((pt0.y + (pt1.y - pt0.y) * fraction).toFixed(3)),
		};

		// 4. Вычисление вектора касательной (Tangent)
		let dxPx = 0;
		let dyPx = 0;

		if (denseCursor < densePoints.length - 1) {
			dxPx = (pt1.x - pt0.x);
			dyPx = (pt1.y - pt0.y);
		} else if (denseCursor > 0) {
			const prevPt = densePoints[denseCursor - 1]!;
			dxPx = (pt0.x - prevPt.x);
			dyPx = (pt0.y - prevPt.y);
		}

		// Переводим касательную в метрические единицы для изотропной нормы
		const dxMetric = (dxPx / 100) * imageWidthMm;
		const dyMetric = (dyPx / 100) * imageHeightMm;
		const metricLen = Math.hypot(dxMetric, dyMetric) || 1.0;

		const tangent: Point2D = {
			x: Number((dxMetric / metricLen).toFixed(5)),
			y: Number((dyMetric / metricLen).toFixed(5)),
		};

		// 5. Вычисление вектора нормали (Normal)
		// Ортогональный поворот на 90 градусов: N = (-Ty, Tx)
		let nx = -tangent.y;
		let ny = tangent.x;

		const normLen = Math.hypot(nx, ny) || 1.0;
		nx = nx / normLen;
		ny = ny / normLen;

		// Центр оральной полости (язычная сторона) приблизительно (x: 50, y: 60)
		const oralCenterX = 50.0;
		const oralCenterY = 60.0;
		const outwardX = point.x - oralCenterX;
		const outwardY = point.y - oralCenterY;
		const dotProduct = nx * outwardX + ny * outwardY;

		if (dotProduct < 0) {
			nx = -nx;
			ny = -ny;
		}

		const normal: Point2D = {
			x: Number(nx.toFixed(5)),
			y: Number(ny.toFixed(5)),
		};

		samples.push({
			index: i,
			point,
			tangent,
			normal,
			arcDistanceMm: Number(targetDistance.toFixed(2)),
			normalizedT: Number((targetDistance / totalLengthMm).toFixed(4)),
		});
	}

	return samples;
}

/**
 * Проверка взаимной ортогональности касательной и нормали (N · T == 0)
 */
export function verifyNormalTangentOrthogonality(normal: Point2D, tangent: Point2D): number {
	return Number((normal.x * tangent.x + normal.y * tangent.y).toFixed(6));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CROSS-SECTIONAL SLICE PLANE GENERATOR (32–40 PLACES)
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateCrossSectionsParams {
	controlPoints: Point2D[];
	planeCount?: number; // По умолчанию 36 срезов
	stepMm?: number; // Желаемый шаг (1.0–2.0 мм)
	focalTroughThicknessMm?: number; // 5, 10, 20 мм
	crossSectionWidthMm?: number; // Ширина среза в щечно-язычном направлении (30 мм)
	crossSectionHeightMm?: number; // Высота среза в апико-корональном направлении (35 мм)
	jawType?: "maxilla" | "mandible";
	imageWidthMm?: number;
	imageHeightMm?: number;
}

/**
 * Формирует 32–40 кросс-секционных плоскостей (Cross-Sections / Pararadicular Slices)
 * перпендикулярно зубной дуге с разметкой границ фокального слоя и зон зубов
 */
export function generateCrossSectionPlanes(
	params: GenerateCrossSectionsParams,
): CrossSectionPlane[] {
	const planeCount = Math.min(48, Math.max(16, params.planeCount ?? 36));
	const focalTroughMm = params.focalTroughThicknessMm ?? 10.0;
	const widthMm = params.crossSectionWidthMm ?? 30.0;
	const heightMm = params.crossSectionHeightMm ?? 35.0;
	const jawType = params.jawType ?? "mandible";
	const imgWMm = params.imageWidthMm ?? 120.0;
	const imgHMm = params.imageHeightMm ?? 120.0;

	// Строим высокоточную базовую кривую
	const curveSamples = buildArcLengthParameterizedCurve(
		params.controlPoints,
		0.5,
		imgWMm,
		imgHMm,
	);

	if (curveSamples.length === 0) return [];

	const totalLengthMm = curveSamples[curveSamples.length - 1]!.arcDistanceMm;
	if (totalLengthMm <= 0.001) return [];

	const planeStepMm = totalLengthMm / (planeCount - 1);
	const planes: CrossSectionPlane[] = [];

	for (let i = 0; i < planeCount; i++) {
		const targetArcMm = i * planeStepMm;

		// Находим ближайший сэмпл по расстоянию
		let closestIdx = 0;
		let minDiff = Number.POSITIVE_INFINITY;
		for (let j = 0; j < curveSamples.length; j++) {
			const diff = Math.abs(curveSamples[j]!.arcDistanceMm - targetArcMm);
			if (diff < minDiff) {
				minDiff = diff;
				closestIdx = j;
			}
		}

		const sample = curveSamples[closestIdx]!;
		const center = sample.point;
		const normal = sample.normal;
		const tangent = sample.tangent;

		// Переводим метрические смещения в % изображения
		const halfWidthMm = widthMm / 2.0;
		const halfTroughMm = focalTroughMm / 2.0;

		const halfWidthPctX = (halfWidthMm / imgWMm) * 100;
		const halfWidthPctY = (halfWidthMm / imgHMm) * 100;

		const halfTroughPctX = (halfTroughMm / imgWMm) * 100;
		const halfTroughPctY = (halfTroughMm / imgHMm) * 100;

		// Вектор нормали: (+nx, +ny) направлен в щечную сторону, (-nx, -ny) в язычную
		const startPoint: Point2D = {
			x: Number((center.x + normal.x * halfWidthPctX).toFixed(2)),
			y: Number((center.y + normal.y * halfWidthPctY).toFixed(2)),
		};

		const endPoint: Point2D = {
			x: Number((center.x - normal.x * halfWidthPctX).toFixed(2)),
			y: Number((center.y - normal.y * halfWidthPctY).toFixed(2)),
		};

		// Точки границы фокального слоя
		const focalTroughBuccalPoint: Point2D = {
			x: Number((center.x + normal.x * halfTroughPctX).toFixed(2)),
			y: Number((center.y + normal.y * halfTroughPctY).toFixed(2)),
		};

		const focalTroughLingualPoint: Point2D = {
			x: Number((center.x - normal.x * halfTroughPctX).toFixed(2)),
			y: Number((center.y - normal.y * halfTroughPctY).toFixed(2)),
		};

		// Анатомическое определение региона зуба по доле дуги t in [0..1]
		const normT = i / (planeCount - 1);
		const toothRegion = classifyArchRegion(normT);
		const fdiTooth = estimateFdiToothAtParam(normT, jawType);

		planes.push({
			sliceIndex: i,
			center,
			tangent,
			normal,
			arcLengthMm: Number(targetArcMm.toFixed(2)),
			sliceThicknessMm: focalTroughMm,
			crossSectionWidthMm: widthMm,
			crossSectionHeightMm: heightMm,
			startPoint,
			endPoint,
			focalTroughBuccalPoint,
			focalTroughLingualPoint,
			fdiTooth,
			toothRegion,
			jawType,
		});
	}

	return planes;
}

/**
 * Классифицирует регион зубного ряда по нормализованному положению на дуге [0..1]
 */
export function classifyArchRegion(normalizedT: number): "molar" | "premolar" | "canine" | "incisor" {
	if (normalizedT < 0.20 || normalizedT > 0.80) {
		return "molar";
	}
	if (normalizedT < 0.36 || normalizedT > 0.64) {
		return "premolar";
	}
	if (normalizedT < 0.44 || normalizedT > 0.56) {
		return "canine";
	}
	return "incisor";
}

/**
 * Определяет номер зуба по FDI вдоль дуги [0..1]
 */
export function estimateFdiToothAtParam(
	normalizedT: number,
	jaw: "maxilla" | "mandible",
): string {
	const isRightSide = normalizedT <= 0.5;

	if (jaw === "maxilla") {
		if (isRightSide) {
			// Квадрант 1: от 18 (на t=0) до 11 (на t=0.5)
			const frac = normalizedT / 0.5;
			const index = Math.min(7, Math.floor(frac * 8));
			const quad1 = ["18", "17", "16", "15", "14", "13", "12", "11"];
			return quad1[index] ?? "11";
		} else {
			// Квадрант 2: от 21 (на t=0.5) до 28 (на t=1.0)
			const frac = (normalizedT - 0.5) / 0.5;
			const index = Math.min(7, Math.floor(frac * 8));
			const quad2 = ["21", "22", "23", "24", "25", "26", "27", "28"];
			return quad2[index] ?? "28";
		}
	} else {
		if (isRightSide) {
			// Квадрант 4: от 48 (на t=0) до 41 (на t=0.5)
			const frac = normalizedT / 0.5;
			const index = Math.min(7, Math.floor(frac * 8));
			const quad4 = ["48", "47", "46", "45", "44", "43", "42", "41"];
			return quad4[index] ?? "41";
		} else {
			// Квадрант 3: от 31 (на t=0.5) до 38 (на t=1.0)
			const frac = (normalizedT - 0.5) / 0.5;
			const index = Math.min(7, Math.floor(frac * 8));
			const quad3 = ["31", "32", "33", "34", "35", "36", "37", "38"];
			return quad3[index] ?? "38";
		}
	}
}

/**
 * Проекция произвольной точки аксиального среза (px, py) на кривую зубной дуги:
 * возвращает параметр s (дистанция в мм) и ортогональное смещение d (в мм, + щечно, - язычно)
 */
export function projectPointToArchCurve(
	pt: Point2D,
	curveSamples: PanoramicCurveSample[],
	imageWidthMm = 120.0,
	imageHeightMm = 120.0,
): {
	closestSample: PanoramicCurveSample;
	arcDistanceMm: number;
	orthogonalOffsetMm: number; // >0 щечно, <0 язычно
	directDistanceMm: number;
} | null {
	if (!curveSamples || curveSamples.length === 0) return null;

	let closestIdx = 0;
	let minEuclidMm = Number.POSITIVE_INFINITY;

	for (let i = 0; i < curveSamples.length; i++) {
		const s = curveSamples[i]!;
		const distMm = pointDistanceMm(pt, s.point, imageWidthMm, imageHeightMm);
		if (distMm < minEuclidMm) {
			minEuclidMm = distMm;
			closestIdx = i;
		}
	}

	const closest = curveSamples[closestIdx]!;

	const vX = ((pt.x - closest.point.x) / 100) * imageWidthMm;
	const vY = ((pt.y - closest.point.y) / 100) * imageHeightMm;

	const offsetMm = vX * closest.normal.x + vY * closest.normal.y;

	return {
		closestSample: closest,
		arcDistanceMm: closest.arcDistanceMm,
		orthogonalOffsetMm: Number(offsetMm.toFixed(2)),
		directDistanceMm: Number(minEuclidMm.toFixed(2)),
	};
}
