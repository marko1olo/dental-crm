/**
 * VisiographMeasurementMath.ts — Единый канонический математический модуль радиовизиографии (Мандаты 8b, 8e).
 *
 * Объединяет:
 * 1. 2D Евклидова геометрия: линейка, угломер, полигон площади (Shoelace).
 * 2. Калибровка сенсоров: эталонные шарики (5 мм), шаг резьбы имплантата (0.8 / 1.0 мм), аппаратные пресеты Vatech/KaVo/Sirona.
 * 3. Расчет и классификация очагов периапикальной костной деструкции (гранулемы, кисты).
 * 4. Динамический пересчет масштаба и рабочих длин корневых каналов (WL/Апекс).
 *
 * Sweet Spot: 300–350 строк.
 */

export interface Point2D {
	x: number;
	y: number;
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

export type AngleMeasurementKind = "tooth_axis" | "implant_shaft" | "general_angle";

export interface AngleMeasurement {
	id: string;
	vertex: Point2D;
	arm1: Point2D;
	arm2: Point2D;
	angleDeg: number;
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

export interface DentalSensorPreset {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly pixelSizeMm: number;
	readonly pixelPitchMicrons: number;
	readonly description: string;
}

export const DEFAULT_PIXEL_SCALE_MM = 0.035;

export const CALIBRATION_PRESETS: Record<
	CalibrationReferenceType,
	{ label: string; defaultMm: number; description: string }
> = {
	sphere_5mm: {
		label: "Калибровочный шарик (5.0 мм)",
		defaultMm: 5.0,
		description: "Рентгеноконтрастная калибровочная сфера диаметром ровно 5.0 мм",
	},
	implant_pitch_0_8: {
		label: "Шаг резьбы имплантата (0.8 мм)",
		defaultMm: 0.8,
		description: "Расстояние между соседними витками резьбы микрорезьбы имплантата",
	},
	implant_pitch_1_0: {
		label: "Шаг резьбы имплантата (1.0 мм)",
		defaultMm: 1.0,
		description: "Стандартный шаг макрорезьбы тела дентального имплантата",
	},
	custom_mm: {
		label: "Пользовательский эталон (мм)",
		defaultMm: 10.0,
		description: "Заданный врачом размер известного ориентира",
	},
};

export const DENTAL_SENSOR_PRESETS: readonly DentalSensorPreset[] = [
	{ id: "vatech_ezsensor_1_5", label: "Vatech EzSensor 1.5 (35.0 мкм / 0.0350 мм/пикс)", shortLabel: "EzSensor 1.5 (35 мкм)", pixelSizeMm: 0.035, pixelPitchMicrons: 35.0, description: "Стандартный визиограф Vatech EzSensor 1.5 / 2.0" },
	{ id: "vatech_ezsensor_soft_hr", label: "Vatech EzSensor Soft HR (14.8 мкм / 0.0148 мм/пикс)", shortLabel: "EzSensor Soft HR (14.8 мкм)", pixelSizeMm: 0.0148, pixelPitchMicrons: 14.8, description: "Высокое разрешение Vatech EzSensor Soft" },
	{ id: "vatech_ezsensor_classic", label: "Vatech EzSensor Classic / Soft (29.6 мкм / 0.0296 мм/пикс)", shortLabel: "EzSensor Classic (29.6 мкм)", pixelSizeMm: 0.0296, pixelPitchMicrons: 29.6, description: "Базовое разрешение (биннинг 2x2)" },
	{ id: "vatech_ezsensor_p", label: "Vatech EzSensor P / HDI2000 (20.0 мкм / 0.0200 мм/пикс)", shortLabel: "EzSensor P (20 мкм)", pixelSizeMm: 0.02, pixelPitchMicrons: 20.0, description: "Субпиксельный датчик EzSensor P" },
	{ id: "vatech_anysensor_1_0", label: "Vatech AnySensor 1.0 (23.8 мкм / 0.0238 мм/пикс)", shortLabel: "AnySensor 1.0 (23.8 мкм)", pixelSizeMm: 0.02381, pixelPitchMicrons: 23.8, description: "Vatech AnySensor 1.0" },
	{ id: "vatech_anysensor_1_5", label: "Vatech AnySensor 1.5 (33.3 мкм / 0.0333 мм/пикс)", shortLabel: "AnySensor 1.5 (33.3 мкм)", pixelSizeMm: 0.033333, pixelPitchMicrons: 33.3, description: "Vatech AnySensor 1.5" },
	{ id: "rvg_size_1", label: "Датчик RVG Размер 1 (20 мкм / 0.020 мм/пикс)", shortLabel: "RVG Р1 (20 мкм)", pixelSizeMm: 0.02, pixelPitchMicrons: 20, description: "Стандартный прицельный радиовизиограф 0.020 мм/пикс" },
	{ id: "rvg_size_2", label: "Датчик RVG Размер 2 (25 мкм / 0.025 мм/пикс)", shortLabel: "RVG Р2 (25 мкм)", pixelSizeMm: 0.025, pixelPitchMicrons: 25, description: "Универсальный молярный радиовизиограф 0.025 мм/пикс" },
	{ id: "opg_standard", label: "ОПТГ стандарт (50 мкм / 0.050 мм/пикс)", shortLabel: "ОПТГ стандарт (50 мкм)", pixelSizeMm: 0.05, pixelPitchMicrons: 50, description: "Панорамная ортопантомография стандарт 0.050 мм/пикс" },
	{ id: "opg_vatech_pax_i", label: "Vatech PaX-i ОПТГ (76.1 мкм / 0.0761 мм/пикс)", shortLabel: "PaX-i ОПТГ (76.1 мкм)", pixelSizeMm: 0.0761, pixelPitchMicrons: 76.1, description: "Панорамный датчик Vatech PaX-i" },
	{ id: "opg_vatech_pax_i_uhd", label: "Vatech PaX-i UHD ОПТГ (38.0 мкм / 0.0380 мм/пикс)", shortLabel: "PaX-i UHD (38.0 мкм)", pixelSizeMm: 0.038, pixelPitchMicrons: 38.0, description: "Сверхвысокое разрешение UHD Vatech PaX-i" },
];

export function distance2D(p1: Point2D, p2: Point2D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

export function calculateRuler(
	p1: Point2D,
	p2: Point2D,
	scaleMmPerPixel = DEFAULT_PIXEL_SCALE_MM,
	label?: string,
	id?: string,
): RulerMeasurement {
	const lengthPx = distance2D(p1, p2);
	return {
		id: id ?? `ruler-${Date.now()}-${Math.abs(Math.round(p1.x + p2.x + p1.y + p2.y)).toString(36)}`,
		p1: { x: p1.x, y: p1.y },
		p2: { x: p2.x, y: p2.y },
		lengthPx,
		lengthMm: lengthPx * scaleMmPerPixel,
		label,
		color: "#00e5ff",
	};
}

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
		angleDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180.0) / Math.PI;
	}

	let deviationFromVerticalDeg = 0;
	if (len1 > 0.0001) {
		const dotVert = -v1y / len1;
		deviationFromVerticalDeg = (Math.acos(Math.max(-1, Math.min(1, dotVert))) * 180.0) / Math.PI;
	}

	return {
		id: id ?? `angle-${Date.now()}-${Math.abs(Math.round(vertex.x + arm1.x + arm2.x)).toString(36)}`,
		vertex: { x: vertex.x, y: vertex.y },
		arm1: { x: arm1.x, y: arm1.y },
		arm2: { x: arm2.x, y: arm2.y },
		angleDeg,
		deviationFromVerticalDeg,
		kind,
		label,
		color: "#ffab00",
	};
}

export function calculatePolygonArea(points: Point2D[]): number {
	if (points.length < 3) return 0;
	let area = 0;
	for (let i = 0; i < points.length; i++) {
		const j = (i + 1) % points.length;
		const pi = points[i];
		const pj = points[j];
		if (pi && pj) {
			area += pi.x * pj.y;
			area -= pj.x * pi.y;
		}
	}
	return Math.abs(area) / 2.0;
}

export function calculatePolygonPerimeter(points: Point2D[]): number {
	if (points.length < 2) return 0;
	let perimeter = 0;
	for (let i = 0; i < points.length; i++) {
		const j = (i + 1) % points.length;
		const pi = points[i];
		const pj = points[j];
		if (pi && pj) {
			perimeter += distance2D(pi, pj);
		}
	}
	return perimeter;
}

export function computeCalibration(
	p1: Point2D,
	p2: Point2D,
	knownLengthMm: number,
	type: CalibrationReferenceType = "sphere_5mm",
): CalibrationReference {
	const pixelDistance = distance2D(p1, p2);
	const safePx = Math.max(0.001, pixelDistance);
	const safeMm = Math.max(0.001, knownLengthMm);
	return {
		type,
		p1: { x: p1.x, y: p1.y },
		p2: { x: p2.x, y: p2.y },
		knownLengthMm: safeMm,
		pixelDistance,
		scaleMmPerPixel: safeMm / safePx,
	};
}

export function resolveVisiographPixelScaleMm(deviceOrPresetId?: string | null): number {
	if (!deviceOrPresetId) return DEFAULT_PIXEL_SCALE_MM;
	const norm = deviceOrPresetId.toLowerCase().trim();
	const found = DENTAL_SENSOR_PRESETS.find(
		(p) => p.id === norm || norm.includes(p.id) || p.label.toLowerCase().includes(norm),
	);
	if (found) return found.pixelSizeMm;
	if (norm.includes("6200") || norm.includes("0.019")) return 0.019;
	return DEFAULT_PIXEL_SCALE_MM;
}

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

export const classifyPeriapicalLesion = classifyPeriapicalLesionData;

export function calculatePeriapicalLesion(
	points: Point2D[],
	scaleMmPerPixel = DEFAULT_PIXEL_SCALE_MM,
	fdiToothCode?: string,
	id?: string,
): PeriapicalLesion {
	const areaPx = calculatePolygonArea(points);
	const perimeterPx = calculatePolygonPerimeter(points);
	const areaMm2 = areaPx * (scaleMmPerPixel * scaleMmPerPixel);
	const perimeterMm = perimeterPx * scaleMmPerPixel;
	const equivalentDiameterMm = areaMm2 > 0 ? 2.0 * Math.sqrt(areaMm2 / Math.PI) : 0;
	const clinical = classifyPeriapicalLesionData(areaMm2, equivalentDiameterMm);

	return {
		id: id ?? `lesion-${Date.now()}-${Math.abs(Math.round(areaPx)).toString(36)}`,
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
		color: "#ff1744",
	};
}

export function recalculateRulersWithScale(
	rulers: readonly RulerMeasurement[],
	scaleMmPerPixel: number,
): RulerMeasurement[] {
	return rulers.map((r) => {
		const lengthMm = r.lengthPx * scaleMmPerPixel;
		let label = r.label;
		if (label && (label.startsWith("Канал:") || label.includes("(WL/Апекс)"))) {
			label = `Канал: ${lengthMm.toFixed(1)} мм (WL/Апекс)`;
		}
		return { ...r, lengthMm, label };
	});
}

export function recalculateLesionsWithScale(
	lesions: readonly PeriapicalLesion[],
	scaleMmPerPixel: number,
): PeriapicalLesion[] {
	return lesions.map((les) =>
		calculatePeriapicalLesion(les.points, scaleMmPerPixel, les.fdiToothCode, les.id),
	);
}
