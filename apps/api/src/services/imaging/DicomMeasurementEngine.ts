/**
 * DicomMeasurementEngine.ts — Математический и калибровочный движок измерений КТ / DICOM.
 *
 * Реализация спецификации: docs/architecture/DICOM_3D_MPR_SPEC.md
 *
 * ФУНКЦИОНАЛ:
 * 1. Калибровка плотности: Преобразование Raw Voxel Value <-> Hounsfield Unit (HU)
 *    (HU = rescaleSlope * rawValue + rescaleIntercept).
 * 2. Клиническая визуализация: Пресеты Window/Level (Bone, Soft Tissue, Enamel, Nerve, Air/Sinus)
 *    и оконное преобразование интенсивности вокселей.
 * 3. Метрология: 2D и 3D евклидовы расстояния, длины ломаных и площади полигонов
 *    с учетом шага вокселя (PixelSpacing [dx, dy] и SliceThickness dz).
 * 4. Клиническая безопасность имплантации: Контроль расстояния до нижнечелюстного канала (N. Alveolaris Inferior)
 *    и детекция коллизий с трехмерной моделью имплантата (Safety Clearance Envelope >= 2.0 мм).
 * 5. Классификация плотности кости по Мишу (Misch Bone Density D1–D5).
 * 6. Криволинейная реконструкция (Catmull-Rom Dental Arch Spline & Tangent/Normal calculation).
 */

// ============================================================================
// 1. ТИПЫ И ИНТЕРФЕЙСЫ
// ============================================================================

export type Point2D = [number, number] | { x: number; y: number };
export type Point3D = [number, number, number] | { x: number; y: number; z: number };

export type VoxelSpacing =
	| [number, number]
	| [number, number, number]
	| { dx: number; dy: number; dz?: number };

export type DicomWindowPresetKey =
	| "bone"
	| "soft_tissue"
	| "enamel"
	| "nerve"
	| "air_sinus";

export interface DicomWindowPreset {
	key: DicomWindowPresetKey;
	label: string;
	windowWidth: number;
	windowLevel: number;
	minHu: number;
	maxHu: number;
	clinicalTarget: string;
}

export type MischBoneClass = "D1" | "D2" | "D3" | "D4" | "D5";

export interface MischBoneDensityResult {
	boneClass: MischBoneClass;
	huValue: number;
	description: string;
	anatomicalLocation: string;
	structuralDescription: string;
	tactileSensation: string;
	implantProtocolAdvice: string;
	expectedPrimaryStability: string;
}

export interface NerveSafetyClearanceResult {
	status: "safe" | "warning" | "collision";
	distanceMm: number;
	minClearanceMm: number;
	isSafe: boolean;
	closestNervePointMm: [number, number, number];
	message: string;
}

export interface ImplantGeometryParams {
	apexWorld: Point3D;
	collarWorld: Point3D;
	radiusApexMm: number;
	radiusCollarMm: number;
}

export interface NerveCollisionCheckResult {
	status: "safe" | "warning" | "collision";
	minDistanceMm: number;
	criticalPointWorld: [number, number, number];
	safetyMarginThresholdMm: number;
}

export interface DentalArchSamplePoint {
	point: [number, number, number];
	tangent: [number, number, number];
	normal: [number, number, number];
	arcLengthMm: number;
}

// ============================================================================
// 2. ПРЕСЕТЫ WINDOW / LEVEL (HU)
// ============================================================================

export const DICOM_WINDOW_PRESETS: Readonly<Record<DicomWindowPresetKey, DicomWindowPreset>> = {
	bone: {
		key: "bone",
		label: "Костная ткань (Bone D1-D4)",
		windowWidth: 1500,
		windowLevel: 300,
		minHu: 300 - 1500 / 2, // -450 HU
		maxHu: 300 + 1500 / 2, // +1050 HU
		clinicalTarget: "Оценка кортикального слоя, альвеолярного гребня и трабекулярной структуры.",
	},
	soft_tissue: {
		key: "soft_tissue",
		label: "Мягкие ткани (Soft Tissue)",
		windowWidth: 400,
		windowLevel: 40,
		minHu: 40 - 400 / 2, // -160 HU
		maxHu: 40 + 400 / 2, // +240 HU
		clinicalTarget: "Слизистая оболочка, десна, сосудисто-нервные пучки, мягкие ткани дна полости рта.",
	},
	enamel: {
		key: "enamel",
		label: "Эмаль и зубы (Enamel / Teeth)",
		windowWidth: 2000,
		windowLevel: 500,
		minHu: 500 - 2000 / 2, // -500 HU
		maxHu: 500 + 2000 / 2, // +1500 HU
		clinicalTarget: "Дентин, эмаль, эндодонтические пломбировочные материалы (гуттаперча, штифты).",
	},
	nerve: {
		key: "nerve",
		label: "Нижнечелюстной канал (Mandibular Nerve)",
		windowWidth: 800,
		windowLevel: 200,
		minHu: 200 - 800 / 2, // -200 HU
		maxHu: 200 + 800 / 2, // +600 HU
		clinicalTarget: "Выделение нижнечелюстного канала (N. Alveolaris Inferior) и ментального отверстия.",
	},
	air_sinus: {
		key: "air_sinus",
		label: "Воздухоносные пути / Синус (Air & Sinus)",
		windowWidth: 600,
		windowLevel: -700,
		minHu: -700 - 600 / 2, // -1000 HU
		maxHu: -700 + 600 / 2, // -400 HU
		clinicalTarget: "Гайморова пазуха (верхнечелюстной синус), носовые ходы, проходимость дыхательных путей.",
	},
};

// ============================================================================
// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ НОРМАЛИЗАЦИИ ВЕКТОРОВ И ТОЧЕК
// ============================================================================

export function normalizePoint2D(p: Point2D): [number, number] {
	if (Array.isArray(p)) {
		return [p[0], p[1]];
	}
	return [p.x, p.y];
}

export function normalizePoint3D(p: Point3D): [number, number, number] {
	if (Array.isArray(p)) {
		return [p[0], p[1], p[2] ?? 0];
	}
	return [p.x, p.y, p.z ?? 0];
}

export function normalizeVoxelSpacing(spacing: VoxelSpacing): [number, number, number] {
	if (Array.isArray(spacing)) {
		const dx = spacing[0];
		const dy = spacing[1];
		const dz = spacing[2] ?? 1.0;
		if (dx <= 0 || dy <= 0 || dz <= 0) {
			throw new RangeError(
				`Недопустимый шаг вокселя: dx=${dx}, dy=${dy}, dz=${dz}. Шаг должен быть строго положительным числом.`,
			);
		}
		return [dx, dy, dz];
	}
	const dx = spacing.dx;
	const dy = spacing.dy;
	const dz = spacing.dz ?? 1.0;
	if (dx <= 0 || dy <= 0 || dz <= 0) {
		throw new RangeError(
			`Недопустимый шаг вокселя: dx=${dx}, dy=${dy}, dz=${dz}. Шаг должен быть строго положительным числом.`,
		);
	}
	return [dx, dy, dz];
}

// ============================================================================
// 4. КАЛИБРОВКА VOXEL -> HOUNSFIELD UNIT (HU)
// ============================================================================

/**
 * Преобразует сырое целочисленное значение вокселя в физическую шкалу Хаунсфилда (HU).
 * Формула DICOM Part 3: HU = rescaleSlope * rawValue + rescaleIntercept
 *
 * @param rawValue Сырое 12/16-битное значение вокселя из DICOM PixelData
 * @param rescaleSlope Коэффициент масштабирования (DICOM Tag 0028,1053, по умолчанию 1.0)
 * @param rescaleIntercept Смещение шкалы (DICOM Tag 0028,1052, по умолчанию -1024.0)
 * @returns Значение плотности ткани в единицах Хаунсфилда (HU)
 */
export function rawToHounsfieldUnit(
	rawValue: number,
	rescaleSlope = 1.0,
	rescaleIntercept = -1024.0,
): number {
	if (!Number.isFinite(rawValue)) {
		throw new TypeError(`Значение вокселя должно быть конечным числом, получено: ${rawValue}`);
	}
	return rescaleSlope * rawValue + rescaleIntercept;
}

/**
 * Обратное преобразование HU -> Raw Voxel Value.
 */
export function hounsfieldUnitToRaw(
	hu: number,
	rescaleSlope = 1.0,
	rescaleIntercept = -1024.0,
): number {
	if (!Number.isFinite(hu)) {
		throw new TypeError(`Значение HU должно быть конечным числом, получено: ${hu}`);
	}
	if (rescaleSlope === 0) {
		throw new RangeError("rescaleSlope не может быть равен нулю.");
	}
	return (hu - rescaleIntercept) / rescaleSlope;
}

/**
 * Массовое векторное преобразование массива вокселей в буфер значений Хаунсфилда (HU).
 */
export function transformRawBufferToHU(
	rawBuffer: ArrayLike<number>,
	rescaleSlope = 1.0,
	rescaleIntercept = -1024.0,
	out?: Float32Array | Int16Array,
): Float32Array | Int16Array {
	const len = rawBuffer.length;
	const target = out ?? new Float32Array(len);
	if (target.length < len) {
		throw new RangeError(
			`Целевой буфер (длина ${target.length}) меньше исходного буфера (длина ${len}).`,
		);
	}
	for (let i = 0; i < len; i++) {
		target[i] = rescaleSlope * rawBuffer[i]! + rescaleIntercept;
	}
	return target;
}

// ============================================================================
// 5. ПРИМЕНЕНИЕ ОКОН WINDOW / LEVEL (WW / WL)
// ============================================================================

/**
 * Применяет оконное преобразование (Window Width / Window Level) к значению HU.
 * Отображает диапазон [WL - WW/2, WL + WW/2] в целевой диапазон яркости (по умолчанию [0, 255]).
 *
 * @param hu Значение плотности в HU
 * @param windowWidth Ширина окна (WW)
 * @param windowLevel Центр окна / уровень (WL)
 * @param outputRange Диапазон выходных значений [min, max] (по умолчанию [0, 255])
 * @returns Значение яркости в заданном диапазоне
 */
export function applyWindowLevel(
	hu: number,
	windowWidth: number,
	windowLevel: number,
	outputRange: [number, number] = [0, 255],
): number {
	if (windowWidth <= 0) {
		throw new RangeError(`Ширина окна (windowWidth) должна быть строго > 0, получено: ${windowWidth}`);
	}
	const [outMin, outMax] = outputRange;
	const halfWidth = windowWidth / 2;
	const minHu = windowLevel - halfWidth;
	const maxHu = windowLevel + halfWidth;

	if (hu <= minHu) {
		return outMin;
	}
	if (hu >= maxHu) {
		return outMax;
	}

	const normalized = (hu - minHu) / windowWidth;
	return outMin + normalized * (outMax - outMin);
}

/**
 * Применяет предопределенный клинический пресет Window/Level.
 */
export function applyWindowPreset(
	hu: number,
	presetKey: DicomWindowPresetKey,
	outputRange: [number, number] = [0, 255],
): number {
	const preset = DICOM_WINDOW_PRESETS[presetKey];
	if (!preset) {
		throw new RangeError(`Неизвестный пресет Window/Level: "${presetKey}"`);
	}
	return applyWindowLevel(hu, preset.windowWidth, preset.windowLevel, outputRange);
}

/**
 * Массовое применение функции окна к буферу вокселей HU для генерации 8-битного изображения (градации серого).
 */
export function batchApplyWindowLevel(
	huBuffer: ArrayLike<number>,
	windowWidth: number,
	windowLevel: number,
	output?: Uint8Array | Uint8ClampedArray,
): Uint8Array | Uint8ClampedArray {
	const len = huBuffer.length;
	const target = output ?? new Uint8Array(len);
	if (target.length < len) {
		throw new RangeError(
			`Выходной буфер (длина ${target.length}) меньше размера входных данных (${len}).`,
		);
	}
	const halfWidth = windowWidth / 2;
	const minHu = windowLevel - halfWidth;
	const invWidth = 1.0 / windowWidth;

	for (let i = 0; i < len; i++) {
		const hu = huBuffer[i]!;
		if (hu <= minHu) {
			target[i] = 0;
		} else if (hu >= windowLevel + halfWidth) {
			target[i] = 255;
		} else {
			target[i] = Math.round(((hu - minHu) * invWidth) * 255);
		}
	}
	return target;
}

// ============================================================================
// 6. КАЛИБРОВАННЫЕ ИЗМЕРЕНИЯ РАССТОЯНИЙ (2D & 3D EUCLIDEAN METRICS)
// ============================================================================

/**
 * Вычисляет физическое евклидово расстояние в миллиметрах (мм) между двумя точками
 * в 2D (на срезе) или 3D (в объеме) с учетом шага вокселей (PixelSpacing и SliceThickness).
 *
 * @param p1 Начальная точка (в индексах вокселей или физических мм)
 * @param p2 Конечная точка (в индексах вокселей или физических мм)
 * @param voxelSpacing Шаг вокселей [dx, dy] или [dx, dy, dz] в миллиметрах
 * @returns Физическое расстояние в мм
 */
export function computePhysicalDistanceMm(
	p1: Point2D | Point3D,
	p2: Point2D | Point3D,
	voxelSpacing: VoxelSpacing = [1.0, 1.0, 1.0],
): number {
	const [dx, dy, dz] = normalizeVoxelSpacing(voxelSpacing);
	const [x1, y1, z1] = normalizePoint3D(p1 as Point3D);
	const [x2, y2, z2] = normalizePoint3D(p2 as Point3D);

	const deltaX = (x2 - x1) * dx;
	const deltaY = (y2 - y1) * dy;
	const deltaZ = (z2 - z1) * dz;

	return Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
}

/**
 * Вычисляет общую физическую длину ломаной линии (трассировки нерва, кривой альвеолярного гребня) в мм.
 */
export function computePolylineLengthMm(
	points: Array<Point2D | Point3D>,
	voxelSpacing: VoxelSpacing = [1.0, 1.0, 1.0],
): number {
	if (points.length < 2) {
		return 0.0;
	}
	let totalLength = 0.0;
	for (let i = 0; i < points.length - 1; i++) {
		totalLength += computePhysicalDistanceMm(points[i]!, points[i + 1]!, voxelSpacing);
	}
	return totalLength;
}

/**
 * Вычисляет ориентированную площадь плоского замкнутого 2D-полигона (контура патологии, среза альвеолярного отростка) в мм².
 * Использует формулу шнурования Гаусса (Shoelace formula) с калибровкой шага вокселей.
 */
export function computePhysicalAreaMm2(
	polygonPoints: Array<Point2D | Point3D>,
	voxelSpacing: VoxelSpacing = [1.0, 1.0, 1.0],
): number {
	if (polygonPoints.length < 3) {
		return 0.0;
	}
	const [dx, dy] = normalizeVoxelSpacing(voxelSpacing);
	let sum = 0.0;
	const n = polygonPoints.length;

	for (let i = 0; i < n; i++) {
		const current = normalizePoint2D(polygonPoints[i]! as Point2D);
		const next = normalizePoint2D(polygonPoints[(i + 1) % n]! as Point2D);

		const x1 = current[0] * dx;
		const y1 = current[1] * dy;
		const x2 = next[0] * dx;
		const y2 = next[1] * dy;

		sum += x1 * y2 - x2 * y1;
	}

	return Math.abs(sum) * 0.5;
}

// ============================================================================
// 7. БЕЗОПАСНОСТЬ ИМПЛАНТАЦИИ И ДЕТЕКЦИЯ КОЛЛИЗИЙ С НЕРВОМ
// ============================================================================

/**
 * Проверяет клиническую безопасность расположения верхушки (Apex) имплантата относительно нижнечелюстного нерва.
 * Согласно международным стандартам имплантологии, минимальное расстояние безопасности (Safety Clearance) составляет >= 2.0 мм.
 *
 * @param implantApexMm Координаты апекса имплантата в физическом пространстве [X, Y, Z] (в мм)
 * @param nerveCanalPointMm Точка или массив точек трассировки нижнечелюстного канала [X, Y, Z] (в мм)
 * @param minClearanceMm Минимальный буфер безопасности (по умолчанию 2.0 мм)
 * @returns Результат проверки с категорией безопасности (safe | warning | collision)
 */
export function checkNerveSafetyClearance(
	implantApexMm: Point3D,
	nerveCanalPointMm: Point3D | Point3D[],
	minClearanceMm = 2.0,
): NerveSafetyClearanceResult {
	if (minClearanceMm <= 0) {
		throw new RangeError(
			`Минимальный зазор безопасности должен быть строго > 0, получено: ${minClearanceMm}`,
		);
	}

	const apex = normalizePoint3D(implantApexMm);
	const nervePoints: Array<[number, number, number]> = Array.isArray(nerveCanalPointMm) &&
		nerveCanalPointMm.length > 0 &&
		(Array.isArray(nerveCanalPointMm[0]) || typeof (nerveCanalPointMm[0] as { x?: number })?.x === "number")
		? (nerveCanalPointMm as Point3D[]).map(normalizePoint3D)
		: [normalizePoint3D(nerveCanalPointMm as Point3D)];

	let minDistance = Number.POSITIVE_INFINITY;
	let closestPoint: [number, number, number] = [0, 0, 0];

	for (const pt of nervePoints) {
		const dx = pt[0] - apex[0];
		const dy = pt[1] - apex[1];
		const dz = pt[2] - apex[2];
		const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

		if (dist < minDistance) {
			minDistance = dist;
			closestPoint = pt;
		}
	}

	let status: "safe" | "warning" | "collision" = "safe";
	let message = "";

	if (minDistance <= 0.0001) {
		status = "collision";
		message = "КРИТИЧЕСКАЯ КОЛЛИЗИЯ: Верхушка имплантата перфорирует нижнечелюстной канал!";
	} else if (minDistance < minClearanceMm) {
		status = "warning";
		message = `ОПАСНАЯ ЗОНА: Расстояние до канала нерва (${minDistance.toFixed(2)} мм) меньше безопасного порога (${minClearanceMm.toFixed(2)} мм). Риск парестезии!`;
	} else {
		status = "safe";
		message = `Безопасное позиционирование: Зазор до канала нерва составляет ${minDistance.toFixed(2)} мм (буфер безопасности >= ${minClearanceMm.toFixed(2)} мм соблюден).`;
	}

	return {
		status,
		distanceMm: Number(minDistance.toFixed(4)),
		minClearanceMm,
		isSafe: status === "safe",
		closestNervePointMm: closestPoint,
		message,
	};
}

/**
 * Трехмерный геометрический расчет коллизии тела имплантата (усеченного конуса) с траекторией нервного ствола
 * по разделу 8.2 спецификации docs/architecture/DICOM_3D_MPR_SPEC.md.
 *
 * @param implant Параметры геометрии имплантата (Apex, Collar, радиусы верхушки и шейки)
 * @param nervePointsWorld Массив трехмерных опорных точек нерва
 * @param nerveRadiusMm Анатомический радиус канала нерва (по умолчанию 1.5 мм)
 * @param safetyMarginMm Порог безопасности в мм (по умолчанию 2.0 мм)
 */
export function evaluateImplantNerveProximity(
	implant: ImplantGeometryParams,
	nervePointsWorld: Point3D[],
	nerveRadiusMm = 1.5,
	safetyMarginMm = 2.0,
): NerveCollisionCheckResult {
	if (nervePointsWorld.length === 0) {
		throw new Error("Массив точек нерва не может быть пустым.");
	}

	const apex = normalizePoint3D(implant.apexWorld);
	const collar = normalizePoint3D(implant.collarWorld);

	// Вектор оси имплантата от Apex к Collar
	const axisX = collar[0] - apex[0];
	const axisY = collar[1] - apex[1];
	const axisZ = collar[2] - apex[2];
	const axisLengthSq = axisX * axisX + axisY * axisY + axisZ * axisZ;

	if (axisLengthSq <= 0.000001) {
		throw new Error("Недопустимая геометрия имплантата: точки Apex и Collar совпадают.");
	}

	let minSurfaceDistance = Number.POSITIVE_INFINITY;
	let criticalPoint: [number, number, number] = [0, 0, 0];

	for (const rawQ of nervePointsWorld) {
		const q = normalizePoint3D(rawQ);

		// Вектор от Apex до точки нерва Q
		const aqX = q[0] - apex[0];
		const aqY = q[1] - apex[1];
		const aqZ = q[2] - apex[2];

		// Проекция на отрезок оси [0, 1]
		const dot = aqX * axisX + aqY * axisY + aqZ * axisZ;
		const t = Math.max(0, Math.min(1, dot / axisLengthSq));

		// Ближайшая точка на оси имплантата
		const closestOnAxisX = apex[0] + t * axisX;
		const closestOnAxisY = apex[1] + t * axisY;
		const closestOnAxisZ = apex[2] + t * axisZ;

		// Радиус имплантата в сечении t
		const currentImplantRadius =
			implant.radiusApexMm + t * (implant.radiusCollarMm - implant.radiusApexMm);

		// Расстояние от центра оси до точки нерва
		const distAxisX = q[0] - closestOnAxisX;
		const distAxisY = q[1] - closestOnAxisY;
		const distAxisZ = q[2] - closestOnAxisZ;
		const centerDistance = Math.sqrt(
			distAxisX * distAxisX + distAxisY * distAxisY + distAxisZ * distAxisZ,
		);

		// Расстояние между поверхностью имплантата и границей канала нерва
		const surfaceDistance = centerDistance - currentImplantRadius - nerveRadiusMm;

		if (surfaceDistance < minSurfaceDistance) {
			minSurfaceDistance = surfaceDistance;
			criticalPoint = q;
		}
	}

	let status: "safe" | "warning" | "collision" = "safe";
	if (minSurfaceDistance <= 0.0) {
		status = "collision";
	} else if (minSurfaceDistance < safetyMarginMm) {
		status = "warning";
	}

	return {
		status,
		minDistanceMm: Number(minSurfaceDistance.toFixed(4)),
		criticalPointWorld: criticalPoint,
		safetyMarginThresholdMm: safetyMarginMm,
	};
}

// ============================================================================
// 8. КЛАССИФИКАЦИЯ ПЛОТНОСТИ КОСТИ ПО МИШУ (MISCH CLASSIFICATION D1-D5)
// ============================================================================

/**
 * Классифицирует плотность костной ткани по шкале Карла Миша (Carl E. Misch) на основе значений HU КЛКТ.
 *
 * @param hu Плотность ткани в единицах Хаунсфилда (HU)
 * @returns Полное клиническое описание структуры кости и хирургического протокола
 */
export function classifyMischBoneDensity(hu: number): MischBoneDensityResult {
	if (hu > 1250) {
		return {
			boneClass: "D1",
			huValue: hu,
			description: "Кость D1: Плотная кортикальная кость (> 1250 HU)",
			anatomicalLocation: "Симфиз и передний отдел нижней челюсти (атрофированная беззубая челюсть).",
			structuralDescription: "Однородная плотная компактная кость высокой минерализации без выраженных трабекул.",
			tactileSensation: "Ощущение сверления дубовой древесины или слоновой кости.",
			implantProtocolAdvice: "Обязательное нарезание резьбы (метчик), обильное охлаждение, предотвращение термического некроза.",
			expectedPrimaryStability: "Максимальная первичная стабильность (> 45-50 Нсм). Отличный прогноз для немедленной нагрузки.",
		};
	}

	if (hu >= 850) {
		return {
			boneClass: "D2",
			huValue: hu,
			description: "Кость D2: Толстая кортикальная пластинка и плотная трабекулярная губчатая кость (850 - 1250 HU)",
			anatomicalLocation: "Дистальный отдел нижней челюсти, передний отдел верхней челюсти.",
			structuralDescription: "Плотный кортикальный слой с выраженными крупными костными трабекулами.",
			tactileSensation: "Ощущение сверления белого дерева (сосна/ель).",
			implantProtocolAdvice: "Стандартный ступенчатый протокол сверления. Оптимальная кость для остеоинтеграции.",
			expectedPrimaryStability: "Высокая первичная стабильность (35-45 Нсм). Идеальные условия для имплантации.",
		};
	}

	if (hu >= 350) {
		return {
			boneClass: "D3",
			huValue: hu,
			description: "Кость D3: Тонкая кортикальная пластинка и мелкотрабекулярная губчатая кость (350 - 850 HU)",
			anatomicalLocation: "Передний и боковой отделы верхней челюсти, боковой отдел нижней челюсти.",
			structuralDescription: "Пористая тонкая кортикальная оболочка с тонкими, частыми трабекулами.",
			tactileSensation: "Ощущение сверления плотного прессованного дерева (фанера/бальза).",
			implantProtocolAdvice: "Рекомендуется недопрепарирование ложа (under-drilling) на 0.5 мм или использование остеотомов/компрессионных фрез.",
			expectedPrimaryStability: "Умеренная первичная стабильность (25-35 Нсм).",
		};
	}

	if (hu >= 150) {
		return {
			boneClass: "D4",
			huValue: hu,
			description: "Кость D4: Мягкая, тонкая губчатая кость с отсутствием кортикального слоя (150 - 350 HU)",
			anatomicalLocation: "Бугор верхней челюсти (Tuber maxillae), область дна гайморовой пазухи.",
			structuralDescription: "Крайне разреженная губчатая трабекулярная сеть низкой плотности.",
			tactileSensation: "Ощущение сверления пенопласта или застывшей монтажной пены.",
			implantProtocolAdvice: "Остеоконденсация, костные экспандеры, бикортикальная фиксация или отсроченная нагрузка (4-6 месяцев).",
			expectedPrimaryStability: "Низкая первичная стабильность (< 20-25 Нсм). Высокий риск нестабильности.",
		};
	}

	return {
		boneClass: "D5",
		huValue: hu,
		description: "Кость D5: Низкоминерализованная / незрелая костная ткань или мягкотканный дефект (< 150 HU)",
		anatomicalLocation: "Зоны костных дефектов, кисты, незрелые костные регенераты после аугментации.",
		structuralDescription: "Мягкотканный компонент, незрелый остеоид или полость дефекта.",
		tactileSensation: "Отсутствие костного сопротивления.",
		implantProtocolAdvice: "Требуется предварительная направленная костная регенерация (НКР / синус-лифтинг). Установка имплантата не показана.",
		expectedPrimaryStability: "Первичная стабильность отсутствует.",
	};
}

// ============================================================================
// 9. СПЛАЙНЫ ЗУБНОЙ ДУГИ (CATMULL-ROM ARCH SPLINE & PANORAMIC RECONSTRUCTION)
// ============================================================================

/**
 * Интерполяция Катмулла-Рома (Catmull-Rom Spline) между 4 опорными точками.
 *
 * @param p0 Точка P(k-1)
 * @param p1 Точка P(k)
 * @param p2 Точка P(k+1)
 * @param p3 Точка P(k+2)
 * @param t Параметр интерполяции [0..1]
 */
export function interpolateCatmullRom3D(
	p0: Point3D,
	p1: Point3D,
	p2: Point3D,
	p3: Point3D,
	t: number,
): [number, number, number] {
	const [x0, y0, z0] = normalizePoint3D(p0);
	const [x1, y1, z1] = normalizePoint3D(p1);
	const [x2, y2, z2] = normalizePoint3D(p2);
	const [x3, y3, z3] = normalizePoint3D(p3);

	const t2 = t * t;
	const t3 = t2 * t;

	const calcComponent = (c0: number, c1: number, c2: number, c3: number): number => {
		return 0.5 * (
			2 * c1 +
			(-c0 + c2) * t +
			(2 * c0 - 5 * c1 + 4 * c2 - c3) * t2 +
			(-c0 + 3 * c1 - 3 * c2 + c3) * t3
		);
	};

	return [
		calcComponent(x0, x1, x2, x3),
		calcComponent(y0, y1, y2, y3),
		calcComponent(z0, z1, z2, z3),
	];
}

/**
 * Дискретизирует зубную дугу на регулярные сэмплы с расчетом касательных (T) и нормалей (N)
 * для панорамного рендеринга (ОПТГ) и построения серий кросс-секций.
 *
 * @param controlPoints Опорные точки зубной дуги, нанесенные врачом (минимум 3 точки)
 * @param stepSizeMm Шаг дискретизации по длине дуги в мм (по умолчанию 0.5 мм)
 */
export function sampleDentalArchSpline(
	controlPoints: Point3D[],
	stepSizeMm = 0.5,
): DentalArchSamplePoint[] {
	if (controlPoints.length < 3) {
		throw new Error(
			`Для построения зубной дуги необходимо минимум 3 опорные точки, получено: ${controlPoints.length}`,
		);
	}
	if (stepSizeMm <= 0) {
		throw new RangeError(`Шаг дискретизации должен быть строго > 0, получено: ${stepSizeMm}`);
	}

	const pts = controlPoints.map(normalizePoint3D);
	// Добавляем виртуальные крайние точки для замыкания сплайна
	const extendedPts: Array<[number, number, number]> = [
		[
			2 * pts[0]![0] - pts[1]![0],
			2 * pts[0]![1] - pts[1]![1],
			2 * pts[0]![2] - pts[1]![2],
		],
		...pts,
		[
			2 * pts[pts.length - 1]![0] - pts[pts.length - 2]![0],
			2 * pts[pts.length - 1]![1] - pts[pts.length - 2]![1],
			2 * pts[pts.length - 1]![2] - pts[pts.length - 2]![2],
		],
	];

	// Первичный плотный расчет для параметризации по длине дуги
	const highResPoints: Array<[number, number, number]> = [];
	const numSegments = pts.length - 1;
	const substeps = 50;

	for (let seg = 0; seg < numSegments; seg++) {
		const p0 = extendedPts[seg]!;
		const p1 = extendedPts[seg + 1]!;
		const p2 = extendedPts[seg + 2]!;
		const p3 = extendedPts[seg + 3]!;

		for (let s = 0; s < substeps; s++) {
			const t = s / substeps;
			highResPoints.push(interpolateCatmullRom3D(p0, p1, p2, p3, t));
		}
	}
	highResPoints.push(pts[pts.length - 1]!);

	// Регулярная репараметризация по физическому шагу stepSizeMm
	const result: DentalArchSamplePoint[] = [];
	let currentArcLen = 0.0;
	let accumulatedDist = 0.0;

	let lastPt = highResPoints[0]!;
	result.push({
		point: lastPt,
		tangent: [1, 0, 0], // Будет скорректировано ниже
		normal: [0, 1, 0],
		arcLengthMm: 0.0,
	});

	for (let i = 1; i < highResPoints.length; i++) {
		const curr = highResPoints[i]!;
		const segDist = Math.hypot(
			curr[0] - lastPt[0],
			curr[1] - lastPt[1],
			curr[2] - lastPt[2],
		);

		currentArcLen += segDist;
		accumulatedDist += segDist;

		if (accumulatedDist >= stepSizeMm || i === highResPoints.length - 1) {
			accumulatedDist = 0.0;
			lastPt = curr;
			result.push({
				point: curr,
				tangent: [0, 0, 0],
				normal: [0, 0, 0],
				arcLengthMm: Number(currentArcLen.toFixed(4)),
			});
		}
	}

	// Расчет ортонормированных касательных T и нормалей N (в плоскости XY)
	for (let k = 0; k < result.length; k++) {
		const prev = result[Math.max(0, k - 1)]!.point;
		const next = result[Math.min(result.length - 1, k + 1)]!.point;

		let tx = next[0] - prev[0];
		let ty = next[1] - prev[1];
		let tz = next[2] - prev[2];
		const len = Math.hypot(tx, ty, tz) || 1.0;
		tx /= len;
		ty /= len;
		tz /= len;

		// 2D ортогональная нормаль в плоскости XY: N = (-Ty, Tx, 0)
		const nx = -ty;
		const ny = tx;
		const nz = 0;
		const nLen = Math.hypot(nx, ny, nz) || 1.0;

		result[k]!.tangent = [tx, ty, tz];
		result[k]!.normal = [nx / nLen, ny / nLen, nz / nLen];
	}

	return result;
}

// ============================================================================
// 10. КЛАСС СЕРВИСА DICOM MEASUREMENT ENGINE
// ============================================================================

export class DicomMeasurementEngine {
	/**
	 * Преобразование Raw Voxel Value -> Hounsfield Unit (HU).
	 */
	public static rawToHU(rawValue: number, rescaleSlope = 1.0, rescaleIntercept = -1024.0): number {
		return rawToHounsfieldUnit(rawValue, rescaleSlope, rescaleIntercept);
	}

	/**
	 * Преобразование Hounsfield Unit (HU) -> Raw Voxel Value.
	 */
	public static huToRaw(hu: number, rescaleSlope = 1.0, rescaleIntercept = -1024.0): number {
		return hounsfieldUnitToRaw(hu, rescaleSlope, rescaleIntercept);
	}

	/**
	 * Применение функции окна Window / Level.
	 */
	public static applyWL(
		hu: number,
		windowWidth: number,
		windowLevel: number,
		outputRange: [number, number] = [0, 255],
	): number {
		return applyWindowLevel(hu, windowWidth, windowLevel, outputRange);
	}

	/**
	 * Применение клинического пресета Window/Level.
	 */
	public static applyPreset(
		hu: number,
		presetKey: DicomWindowPresetKey,
		outputRange: [number, number] = [0, 255],
	): number {
		return applyWindowPreset(hu, presetKey, outputRange);
	}

	/**
	 * Вычисление физического 2D / 3D расстояния в мм с учетом калибровки вокселей.
	 */
	public static computeDistanceMm(
		p1: Point2D | Point3D,
		p2: Point2D | Point3D,
		voxelSpacing: VoxelSpacing = [1.0, 1.0, 1.0],
	): number {
		return computePhysicalDistanceMm(p1, p2, voxelSpacing);
	}

	/**
	 * Проверка зазора безопасности имплантата относительно нижнечелюстного нерва.
	 */
	public static checkNerveClearance(
		implantApexMm: Point3D,
		nerveCanalPointMm: Point3D | Point3D[],
		minClearanceMm = 2.0,
	): NerveSafetyClearanceResult {
		return checkNerveSafetyClearance(implantApexMm, nerveCanalPointMm, minClearanceMm);
	}

	/**
	 * Полный 3D анализ сближения тела имплантата с нижнечелюстным каналом.
	 */
	public static evaluateNerveProximity(
		implant: ImplantGeometryParams,
		nervePointsWorld: Point3D[],
		nerveRadiusMm = 1.5,
		safetyMarginMm = 2.0,
	): NerveCollisionCheckResult {
		return evaluateImplantNerveProximity(implant, nervePointsWorld, nerveRadiusMm, safetyMarginMm);
	}

	/**
	 * Классификация плотности кости по Мишу (D1–D5).
	 */
	public static classifyBone(hu: number): MischBoneDensityResult {
		return classifyMischBoneDensity(hu);
	}

	/**
	 * Дискретизация зубной дуги Катмулла-Рома.
	 */
	public static sampleArch(controlPoints: Point3D[], stepSizeMm = 0.5): DentalArchSamplePoint[] {
		return sampleDentalArchSpline(controlPoints, stepSizeMm);
	}
}
