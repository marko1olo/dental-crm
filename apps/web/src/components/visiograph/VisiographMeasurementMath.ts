/**
 * VisiographMeasurementMath.ts
 *
 * Clinical radiographic measurement and calibration mathematics engine:
 * 1. Millimeter ruler with reference-object calibration (5.0 mm calibration sphere, implant thread pitch).
 * 2. Protractor & angle measurement tool for tooth axis angulation and implant insertion trajectory.
 * 3. Periapical bone destruction area delineation (granuloma, radicular cyst) with Shoelace contour integration,
 *    perimeter, equivalent diameter, and clinical classification.
 */

export interface Point2D {
	x: number;
	y: number;
}

export type CalibrationReferenceType =
	| "sphere_5mm"
	| "implant_pitch_0_8"
	| "implant_pitch_1_0"
	| "custom_mm";

export interface CalibrationReference {
	type: CalibrationReferenceType;
	p1: Point2D;
	p2: Point2D;
	knownLengthMm: number;
	scaleMmPerPixel: number;
	pixelDistance: number;
}

export interface RulerMeasurement {
	id: string;
	p1: Point2D;
	p2: Point2D;
	lengthPx: number;
	lengthMm: number;
	label?: string | undefined;
	color?: string | undefined;
}

export type AngleMeasurementKind =
	| "tooth_axis"
	| "implant_shaft"
	| "general_angle";

export interface AngleMeasurement {
	id: string;
	vertex: Point2D;
	arm1: Point2D;
	arm2: Point2D;
	angleDeg: number;
	/** Deviation of primary arm/shaft from true vertical (90 deg plane), in degrees */
	deviationFromVerticalDeg: number;
	kind: AngleMeasurementKind;
	label?: string | undefined;
	color?: string | undefined;
}

export type PeriapicalLesionClassification =
	| "granuloma"
	| "cyst"
	| "extensive_cyst"
	| "rarefying_osteitis";

export interface PeriapicalLesion {
	id: string;
	points: Point2D[];
	areaPx: number;
	areaMm2: number;
	perimeterPx: number;
	perimeterMm: number;
	equivalentDiameterMm: number;
	classification: PeriapicalLesionClassification;
	classificationLabel: string;
	clinicalDescription: string;
	treatmentRecommendation: string;
	fdiToothCode?: string | undefined;
	color?: string | undefined;
}

/** Standard calibration presets used in dental radiology */
export const CALIBRATION_PRESETS: Record<
	CalibrationReferenceType,
	{ label: string; defaultMm: number; description: string }
> = {
	sphere_5mm: {
		label: "Калибровочный шарик (5.0 мм)",
		defaultMm: 5.0,
		description:
			"Рентгеноконтрастная калибровочная сфера диаметром ровно 5.0 мм",
	},
	implant_pitch_0_8: {
		label: "Шаг резьбы имплантата (0.8 мм)",
		defaultMm: 0.8,
		description:
			"Расстояние между соседними витками резьбы микрорезьбы имплантата",
	},
	implant_pitch_1_0: {
		label: "Шаг резьбы имплантата (1.0 мм)",
		defaultMm: 1.0,
		description: "Стандартный шаг макрорезьбы тела дентального имплантата",
	},
	custom_mm: {
		label: "Пользовательский эталон (мм)",
		defaultMm: 10.0,
		description: "Заданный врачом размер известного анатомического или металлического ориентира",
	},
};

/** Default uncalibrated scale (assumes standard 0.05 mm per pixel visiograph sensor) */
export const DEFAULT_PIXEL_SCALE_MM = 0.05;

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function distance2D(p1: Point2D, p2: Point2D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calibrates scale factor (mm per pixel) given two reference points and known physical length in mm.
 */
export function computeCalibration(
	p1: Point2D,
	p2: Point2D,
	knownLengthMm: number,
	type: CalibrationReferenceType = "sphere_5mm",
): CalibrationReference {
	const pixelDistance = distance2D(p1, p2);
	const safePx = Math.max(0.001, pixelDistance);
	const safeMm = Math.max(0.001, knownLengthMm);
	const scaleMmPerPixel = safeMm / safePx;

	return {
		type,
		p1: { x: p1.x, y: p1.y },
		p2: { x: p2.x, y: p2.y },
		knownLengthMm: safeMm,
		pixelDistance,
		scaleMmPerPixel,
	};
}

/**
 * Computes linear distance measurement in pixels and millimeters.
 */
export function calculateRuler(
	p1: Point2D,
	p2: Point2D,
	scaleMmPerPixel = DEFAULT_PIXEL_SCALE_MM,
	label?: string,
	id?: string,
): RulerMeasurement {
	const lengthPx = distance2D(p1, p2);
	const lengthMm = lengthPx * scaleMmPerPixel;

	return {
		id: id ?? `ruler-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		p1: { x: p1.x, y: p1.y },
		p2: { x: p2.x, y: p2.y },
		lengthPx,
		lengthMm,
		label,
		color: "#00e5ff", // High-visibility cyan
	};
}

/**
 * Calculates interior angle formed by 3 points (vertex, arm1, arm2) and shaft deviation from vertical.
 */
export function calculateAngle3Points(
	vertex: Point2D,
	arm1: Point2D,
	arm2: Point2D,
	kind: AngleMeasurementKind = "general_angle",
	label?: string,
	id?: string,
): AngleMeasurement {
	const v1x = arm1.x - vertex.x;
	const v1y = arm1.y - vertex.y;
	const v2x = arm2.x - vertex.x;
	const v2y = arm2.y - vertex.y;

	const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
	const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

	let angleDeg = 0;
	if (len1 > 0.0001 && len2 > 0.0001) {
		const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
		const clampedDot = Math.max(-1.0, Math.min(1.0, dot));
		angleDeg = (Math.acos(clampedDot) * 180.0) / Math.PI;
	}

	// Calculate inclination / tilt angle of arm1 relative to vertical axis (pointing up: (0, -1))
	let deviationFromVerticalDeg = 0;
	if (len1 > 0.0001) {
		// Vector pointing from vertex to arm1
		// Vertical axis pointing upwards in screen coordinates has vector (0, -1)
		const dotVert = (v1x * 0 + v1y * -1) / len1;
		const clampedVert = Math.max(-1.0, Math.min(1.0, dotVert));
		deviationFromVerticalDeg = (Math.acos(clampedVert) * 180.0) / Math.PI;
	}

	return {
		id: id ?? `angle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		vertex: { x: vertex.x, y: vertex.y },
		arm1: { x: arm1.x, y: arm1.y },
		arm2: { x: arm2.x, y: arm2.y },
		angleDeg,
		deviationFromVerticalDeg,
		kind,
		label,
		color: "#ffab00", // High-visibility amber
	};
}

/**
 * Calculates 2D polygon area using Shoelace formula (Gauss's area formula).
 */
export function calculatePolygonArea(points: Point2D[]): number {
	const n = points.length;
	if (n < 3) return 0;

	let area = 0;
	for (let i = 0; i < n; i++) {
		const curr = points[i];
		const next = points[(i + 1) % n];
		if (curr && next) {
			area += curr.x * next.y - next.x * curr.y;
		}
	}

	return Math.abs(area) * 0.5;
}

/**
 * Calculates perimeter of a closed polygon in pixels.
 */
export function calculatePolygonPerimeter(points: Point2D[]): number {
	const n = points.length;
	if (n < 2) return 0;

	let perimeter = 0;
	for (let i = 0; i < n; i++) {
		const curr = points[i];
		const next = points[(i + 1) % n];
		if (curr && next) {
			perimeter += distance2D(curr, next);
		}
	}

	return perimeter;
}

/**
 * Classifies periapical bone lesion based on equivalent diameter and area according to WHO/Endodontic criteria.
 */
export function classifyPeriapicalLesionData(
	areaMm2: number,
	equivalentDiameterMm: number,
): {
	classification: PeriapicalLesionClassification;
	label: string;
	description: string;
	treatment: string;
} {
	if (equivalentDiameterMm < 5.0) {
		return {
			classification: "granuloma",
			label: "Периапикальная гранулема (Ø < 5.0 мм)",
			description: `Ограниченный очаг деструкции костной ткани округлой формы у верхушки корня (площадь: ${areaMm2.toFixed(1)} мм², экв. диаметр: ${equivalentDiameterMm.toFixed(1)} мм).`,
			treatment:
				"Консервативное эндодонтическое лечение: хемомеханическая обработка, временная обтурация гидроксидом кальция Ca(OH)2 на 14–21 день, постоянная обтурация гуттаперчей с силером.",
		};
	}

	if (equivalentDiameterMm < 10.0) {
		return {
			classification: "cyst",
			label: "Радикулярная кистогранулема / Киста корня (Ø 5.0–10.0 мм)",
			description: `Четко очерченный очаг разрежения костной ткани с ободком склероза у апекса корня (площадь: ${areaMm2.toFixed(1)} мм², экв. диаметр: ${equivalentDiameterMm.toFixed(1)} мм).`,
			treatment:
				"Первичная консервативная эндодонтическая терапия с динамическим рентген-контролем через 3–6 месяцев. При отсутствии регенерации — цистэктомия с резекцией верхушки корня (РВК) и ретроградным пломбированием МТА/Биодентин.",
		};
	}

	return {
		classification: "extensive_cyst",
		label: "Обширная радикулярная киста челюсти (Ø ≥ 10.0 мм)",
		description: `Крупное одонтогенное кистозное образование с выраженной резорбцией кортикальной пластинки (площадь: ${areaMm2.toFixed(1)} мм², экв. диаметр: ${equivalentDiameterMm.toFixed(1)} мм).`,
		treatment:
			"Хирургическое вмешательство: цистотомия или цистэктомия с остеопластическим замещением дефекта костным матриксом (ксенографт/аллографт) и барьерной мембраной под контролем гистологического исследования.",
	};
}

/**
 * Creates and analyzes a periapical lesion contour polygon.
 */
export function calculatePeriapicalLesion(
	points: Point2D[],
	scaleMmPerPixel = DEFAULT_PIXEL_SCALE_MM,
	fdiToothCode?: string,
	id?: string,
): PeriapicalLesion {
	const areaPx = calculatePolygonArea(points);
	const perimeterPx = calculatePolygonPerimeter(points);

	// Area in mm2 = Area in px2 * (scaleMmPerPx)^2
	const areaMm2 = areaPx * (scaleMmPerPixel * scaleMmPerPixel);
	const perimeterMm = perimeterPx * scaleMmPerPixel;

	// Equivalent diameter of a circle with the same area: D = 2 * sqrt(Area / pi)
	const equivalentDiameterMm =
		areaMm2 > 0 ? 2.0 * Math.sqrt(areaMm2 / Math.PI) : 0;

	const clinical = classifyPeriapicalLesionData(areaMm2, equivalentDiameterMm);

	return {
		id: id ?? `lesion-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		points: points.map((p) => ({ x: p.x, y: p.y })),
		areaPx,
		areaMm2,
		perimeterPx,
		perimeterMm,
		equivalentDiameterMm,
		classification: clinical.classification,
		classificationLabel: clinical.label,
		clinicalDescription: clinical.description,
		treatmentRecommendation: clinical.treatment,
		fdiToothCode,
		color: "#ff1744", // High-visibility red
	};
}
