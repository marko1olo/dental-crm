import type { LandmarkPin, MeasurementRuler, RadiologyStudy } from "./types";

export * from "./cbctCaliperNerveMath";

/**
 * Расчет физического расстояния в миллиметрах между двумя точками на снимке.
 * @param startX - координата X начальной точки в % (0..100)
 * @param startY - координата Y начальной точки в % (0..100)
 * @param endX - координата X конечной точки в % (0..100)
 * @param endY - координата Y конечной точки в % (0..100)
 * @param imageWidthPx - фактическая ширина изображения в пикселях (по умолчанию 1000)
 * @param imageHeightPx - фактическая высота изображения в пикселях (по умолчанию 1000)
 * @param pixelSpacingMm - калибровка сенсора (мм на пиксель, по умолчанию 0.1 мм/пикс)
 */
export function calculateDistanceMm(
	startX: number,
	startY: number,
	endX: number,
	endY: number,
	imageWidthPx = 1000,
	imageHeightPx = 1000,
	pixelSpacingMm = 0.1,
): number {
	const dxPx = ((endX - startX) / 100) * imageWidthPx;
	const dyPx = ((endY - startY) / 100) * imageHeightPx;
	const pixelDistance = Math.hypot(dxPx, dyPx);
	const distanceMm = pixelDistance * pixelSpacingMm;
	return Number(distanceMm.toFixed(2));
}

/**
 * Безопасное форматирование эффективной дозы излучения
 */
export function formatRadiationDose(doseMicrosv: number): {
	microsvText: string;
	msvText: string;
	fullText: string;
	safetyZone: "green" | "yellow" | "red";
	badgeClass: string;
} {
	const microsv = Number(doseMicrosv.toFixed(1));
	const msv = Number((doseMicrosv / 1000).toFixed(4));

	let safetyZone: "green" | "yellow" | "red" = "green";
	let badgeClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";

	if (msv >= 0.5) {
		safetyZone = "red";
		badgeClass = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
	} else if (msv >= 0.05) {
		safetyZone = "yellow";
		badgeClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
	}

	return {
		microsvText: `${microsv} мкЗв`,
		msvText: `${msv} мЗв`,
		fullText: `${microsv} мкЗв (${msv} мЗв)`,
		safetyZone,
		badgeClass,
	};
}

/**
 * Название и анатомическое описание зуба по формуле FDI (11–48)
 */
export const FDI_TOOTH_NAMES: Record<string, string> = {
	"18": "Верхний правый 3-й моляр (зуб мудрости)",
	"17": "Верхний правый 2-й моляр",
	"16": "Верхний правый 1-й моляр",
	"15": "Верхний правый 2-й премоляр",
	"14": "Верхний правый 1-й премоляр",
	"13": "Верхний правый клык",
	"12": "Верхний правый боковой резец",
	"11": "Верхний правый центральный резец",
	"21": "Верхний левый центральный резец",
	"22": "Верхний левый боковой резец",
	"23": "Верхний левый клык",
	"24": "Верхний левый 1-й премоляр",
	"25": "Верхний левый 2-й премоляр",
	"26": "Верхний левый 1-й моляр",
	"27": "Верхний левый 2-й моляр",
	"28": "Верхний левый 3-й моляр (зуб мудрости)",
	"48": "Нижний правый 3-й моляр (зуб мудрости)",
	"47": "Нижний правый 2-й моляр",
	"46": "Нижний правый 1-й моляр",
	"45": "Нижний правый 2-й премоляр",
	"44": "Нижний правый 1-й премоляр",
	"43": "Нижний правый клык",
	"42": "Нижний правый боковой резец",
	"41": "Нижний правый центральный резец",
	"31": "Нижний левый центральный резец",
	"32": "Нижний левый боковой резец",
	"33": "Нижний левый клык",
	"34": "Нижний левый 1-й премоляр",
	"35": "Нижний левый 2-й премоляр",
	"36": "Нижний левый 1-й моляр",
	"37": "Нижний левый 2-й моляр",
	"38": "Нижний левый 3-й моляр (зуб мудрости)",
};

/**
 * Все номера зубов взрослого прикуса по квадрантам
 */
export const ADULT_FDI_TEETH = {
	quadrant1: ["18", "17", "16", "15", "14", "13", "12", "11"],
	quadrant2: ["21", "22", "23", "24", "25", "26", "27", "28"],
	quadrant4: ["48", "47", "46", "45", "44", "43", "42", "41"],
	quadrant3: ["31", "32", "33", "34", "35", "36", "37", "38"],
};

/**
 * Описание анатомической метки
 */
export const LANDMARK_TYPE_LABELS: Record<LandmarkPin["type"], string> = {
	tooth: "Коронка / Тело зуба",
	apex: "Апекс корня / Верхушка",
	canal: "Корневой канал (устье / ход)",
	sinus: "Дно гайморовой пазухи",
	nerve: "Нижнечелюстной канал (N. Alveolaris Inferior)",
	implant_site: "Ложе имплантата / Зона адентии",
	caries: "Кариозный дефект / Полость",
	custom: "Клинический ориентир",
};
