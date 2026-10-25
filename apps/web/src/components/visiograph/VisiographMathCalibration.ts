/**
 * VisiographMathCalibration.ts
 * Clinical reference-object calibration and dental sensor hardware presets.
 */

import { type Point2D, distance2D } from "./VisiographMathGeometry";

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

export const DEFAULT_PIXEL_SCALE_MM = 0.035;

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

export interface DentalSensorPreset {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly pixelSizeMm: number;
	readonly pixelPitchMicrons: number;
	readonly description: string;
}

export const DENTAL_SENSOR_PRESETS: readonly DentalSensorPreset[] = [
	{ id: "vatech_ezsensor_1_5", label: "Vatech EzSensor 1.5 (35.0 мкм / 0.0350 мм/пикс)", shortLabel: "EzSensor 1.5 (35 мкм)", pixelSizeMm: 0.0350, pixelPitchMicrons: 35.0, description: "Стандартный визиограф Vatech EzSensor 1.5 / 2.0" },
	{ id: "vatech_ezsensor_soft_hr", label: "Vatech EzSensor Soft HR (14.8 мкм / 0.0148 мм/пикс)", shortLabel: "EzSensor Soft HR (14.8 мкм)", pixelSizeMm: 0.0148, pixelPitchMicrons: 14.8, description: "Высокое разрешение Vatech EzSensor Soft" },
	{ id: "vatech_ezsensor_classic", label: "Vatech EzSensor Classic / Soft (29.6 мкм / 0.0296 мм/пикс)", shortLabel: "EzSensor Classic (29.6 мкм)", pixelSizeMm: 0.0296, pixelPitchMicrons: 29.6, description: "Базовое разрешение (биннинг 2x2)" },
	{ id: "vatech_ezsensor_p", label: "Vatech EzSensor P / HDI2000 (20.0 мкм / 0.0200 мм/пикс)", shortLabel: "EzSensor P (20 мкм)", pixelSizeMm: 0.0200, pixelPitchMicrons: 20.0, description: "Субпиксельный датчик EzSensor P" },
	{ id: "vatech_anysensor_1_0", label: "Vatech AnySensor 1.0 (23.8 мкм / 0.0238 мм/пикс)", shortLabel: "AnySensor 1.0 (23.8 мкм)", pixelSizeMm: 0.02381, pixelPitchMicrons: 23.8, description: "Vatech AnySensor 1.0" },
	{ id: "vatech_anysensor_1_5", label: "Vatech AnySensor 1.5 (33.3 мкм / 0.0333 мм/пикс)", shortLabel: "AnySensor 1.5 (33.3 мкм)", pixelSizeMm: 0.033333, pixelPitchMicrons: 33.3, description: "Vatech AnySensor 1.5" },
	{ id: "rvg_size_1", label: "Датчик RVG Размер 1 (20 мкм / 0.020 мм/пикс)", shortLabel: "RVG Р1 (20 мкм)", pixelSizeMm: 0.020, pixelPitchMicrons: 20, description: "Стандартный прицельный радиовизиограф 0.020 мм/пикс" },
	{ id: "rvg_size_2", label: "Датчик RVG Размер 2 (25 мкм / 0.025 мм/пикс)", shortLabel: "RVG Р2 (25 мкм)", pixelSizeMm: 0.025, pixelPitchMicrons: 25, description: "Универсальный молярный радиовизиограф 0.025 мм/пикс" },
	{ id: "opg_standard", label: "ОПТГ стандарт (50 мкм / 0.050 мм/пикс)", shortLabel: "ОПТГ стандарт (50 мкм)", pixelSizeMm: 0.050, pixelPitchMicrons: 50, description: "Панорамная ортопантомография стандарт 0.050 мм/пикс" },
	{ id: "opg_vatech_pax_i", label: "Vatech PaX-i ОПТГ (76.1 мкм / 0.0761 мм/пикс)", shortLabel: "PaX-i ОПТГ (76.1 мкм)", pixelSizeMm: 0.0761, pixelPitchMicrons: 76.1, description: "Панорамный датчик Vatech PaX-i" },
	{ id: "opg_vatech_pax_i_uhd", label: "Vatech PaX-i UHD ОПТГ (38.0 мкм / 0.0380 мм/пикс)", shortLabel: "PaX-i UHD (38.0 мкм)", pixelSizeMm: 0.0380, pixelPitchMicrons: 38.0, description: "Сверхвысокое разрешение UHD Vatech PaX-i" },
];

export function resolveVisiographPixelScaleMm(deviceOrPresetId?: string | null): number {
	if (!deviceOrPresetId) return DEFAULT_PIXEL_SCALE_MM;
	const norm = deviceOrPresetId.toLowerCase().trim();
	const found = DENTAL_SENSOR_PRESETS.find(
		(p) => p.id === norm || norm.includes(p.id) || p.label.toLowerCase().includes(norm),
	);
	if (found) return found.pixelSizeMm;
	if (norm.includes("6200") || norm.includes("0.019")) return 0.019;
	if (norm.includes("soft") && (norm.includes("hr") || norm.includes("high") || norm.includes("14.8"))) return 0.0148;
	if (norm.includes("soft") || norm.includes("classic") || norm.includes("hdi-s") || norm.includes("29.6")) return 0.0296;
	if (norm.includes("sensor p") || norm.includes("hdi2000") || norm.includes("20.0") || norm.includes("0.02")) return 0.0200;
	if (norm.includes("anysensor") && norm.includes("1.0")) return 0.02381;
	if (norm.includes("anysensor") && norm.includes("1.5")) return 0.033333;
	if (norm.includes("ezsensor") || norm.includes("35.0") || norm.includes("0.035")) return 0.0350;
	if (norm.includes("pano") || norm.includes("opg") || norm.includes("optg")) return norm.includes("uhd") ? 0.0380 : 0.0761;
	return DEFAULT_PIXEL_SCALE_MM;
}
