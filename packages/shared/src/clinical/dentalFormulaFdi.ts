/**
 * packages/shared/src/clinical/dentalFormulaFdi.ts
 *
 * DENTE Dental CRM — Canonical FDI Dental Formula, Quadrants & Tooth Anatomy SSOT.
 *
 * Invariants & Standards:
 * - ISO 3950 / FDI Two-Digit Notation (Permanent 11..48, Deciduous 51..85, Mixed Dentition).
 * - Russian Anatomical & Folk Tooth Nomenclature for Form 043/u and Chairside UI.
 * - Zero cartoon emojis (Mandate 8d Item 7).
 */

// ============================================================================
// 1. FDI DENTAL FORMULA CONSTANTS & QUADRANTS (ISO 3950)
// ============================================================================

/** Постоянные зубы: Квадрант 1 (Верхний правый / 18..11) */
export const PERMANENT_TEETH_QUADRANT_1 = [18, 17, 16, 15, 14, 13, 12, 11] as const;

/** Постоянные зубы: Квадрант 2 (Верхний левый / 21..28) */
export const PERMANENT_TEETH_QUADRANT_2 = [21, 22, 23, 24, 25, 26, 27, 28] as const;

/** Постоянные зубы: Квадрант 3 (Нижний левый / 31..38) */
export const PERMANENT_TEETH_QUADRANT_3 = [31, 32, 33, 34, 35, 36, 37, 38] as const;

/** Постоянные зубы: Квадрант 4 (Нижний правый / 48..41) */
export const PERMANENT_TEETH_QUADRANT_4 = [48, 47, 46, 45, 44, 43, 42, 41] as const;

/** Все 32 постоянных зуба взрослого человека */
export const PERMANENT_TEETH = [
	...PERMANENT_TEETH_QUADRANT_1,
	...PERMANENT_TEETH_QUADRANT_2,
	...PERMANENT_TEETH_QUADRANT_3,
	...PERMANENT_TEETH_QUADRANT_4,
] as const;

/** Молочные (временные) зубы: Квадрант 5 (Верхний правый / 55..51) */
export const DECIDUOUS_TEETH_QUADRANT_5 = [55, 54, 53, 52, 51] as const;

/** Молочные (временные) зубы: Квадрант 6 (Верхний левый / 61..65) */
export const DECIDUOUS_TEETH_QUADRANT_6 = [61, 62, 63, 64, 65] as const;

/** Молочные (временные) зубы: Квадрант 7 (Нижний левый / 71..75) */
export const DECIDUOUS_TEETH_QUADRANT_7 = [71, 72, 73, 74, 75] as const;

/** Молочные (временные) зубы: Квадрант 8 (Нижний правый / 85..81) */
export const DECIDUOUS_TEETH_QUADRANT_8 = [85, 84, 83, 82, 81] as const;

/** Все 20 молочных зубов ребенка */
export const DECIDUOUS_TEETH = [
	...DECIDUOUS_TEETH_QUADRANT_5,
	...DECIDUOUS_TEETH_QUADRANT_6,
	...DECIDUOUS_TEETH_QUADRANT_8,
	...DECIDUOUS_TEETH_QUADRANT_7,
] as const;

/** Все 52 зуба международной классификации FDI (32 постоянных + 20 молочных) */
export const ALL_FDI_TEETH = [...PERMANENT_TEETH, ...DECIDUOUS_TEETH] as const;

/** Верхняя челюсть взрослого: непрерывная последовательность справа налево (18..28) */
export const UPPER_ARCH_SEQUENCE = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

/** Нижняя челюсть взрослого: непрерывная последовательность справа налево (48..38) */
export const LOWER_ARCH_SEQUENCE = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

/** Верхняя челюсть ребенка (55..65) */
export const DECIDUOUS_UPPER_ARCH_SEQUENCE = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;

/** Нижняя челюсть ребенка (85..75) */
export const DECIDUOUS_LOWER_ARCH_SEQUENCE = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;

/** Сменный прикус: верхняя дуга (постоянные моляры 16, 26 + молочные 55..51, 61..65) */
export const MIXED_TOP_TEETH = [
	16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26,
] as const;

/** Сменный прикус: нижняя дуга (постоянные моляры 46, 36 + молочные 85..81, 71..75) */
export const MIXED_BOTTOM_TEETH = [
	46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36,
] as const;

/** Все зубы сменного прикуса */
export const ALL_MIXED_TEETH = [...MIXED_TOP_TEETH, ...MIXED_BOTTOM_TEETH] as const;

/** Сменный прикус (с прорезавшимися резцами): верхняя дуга */
export const MIXED_INCISORS_TOP_TEETH = [
	16, 55, 54, 53, 12, 11, 21, 22, 63, 64, 65, 26,
] as const;

/** Сменный прикус (с прорезавшимися резцами): нижняя дуга */
export const MIXED_INCISORS_BOTTOM_TEETH = [
	46, 85, 84, 83, 42, 41, 31, 32, 73, 74, 75, 36,
] as const;

/** Все зубы сменного прикуса с резцами */
export const ALL_MIXED_INCISORS_TEETH = [
	...MIXED_INCISORS_TOP_TEETH,
	...MIXED_INCISORS_BOTTOM_TEETH,
] as const;

/**
 * Динамическое замещение молочных зубов постоянными в дуге сменного прикуса
 * при их прорезывании (резцы 1..2, клыки 3, молочные моляры 4..5 -> премоляры).
 */
export function resolveMixedDentitionArch(
	baseArch: readonly number[],
	eruptedOrActiveTeeth: Iterable<number>,
): number[] {
	const activeSet = new Set(eruptedOrActiveTeeth);
	const replacementMap: Record<number, number> = {
		51: 11, 52: 12, 53: 13, 54: 14, 55: 15,
		61: 21, 62: 22, 63: 23, 64: 24, 65: 25,
		71: 31, 72: 32, 73: 33, 74: 34, 75: 35,
		81: 41, 82: 42, 83: 43, 84: 44, 85: 45,
	};
	return baseArch.map((t) => {
		const permanentCandidate = replacementMap[t];
		if (permanentCandidate && activeSet.has(permanentCandidate)) {
			return permanentCandidate;
		}
		return t;
	});
}

// Канонические синонимы для полной обратной совместимости с ToothChart и ClassicGost
export const TOP_TEETH = UPPER_ARCH_SEQUENCE;
export const BOTTOM_TEETH = LOWER_ARCH_SEQUENCE;
export const UPPER_TEETH_ADULT = UPPER_ARCH_SEQUENCE;
export const LOWER_TEETH_ADULT = LOWER_ARCH_SEQUENCE;
export const ALL_ADULT_TEETH = PERMANENT_TEETH;

export const PEDIATRIC_TOP_TEETH = DECIDUOUS_UPPER_ARCH_SEQUENCE;
export const PEDIATRIC_BOTTOM_TEETH = DECIDUOUS_LOWER_ARCH_SEQUENCE;
export const UPPER_TEETH_PEDIATRIC = DECIDUOUS_UPPER_ARCH_SEQUENCE;
export const LOWER_TEETH_PEDIATRIC = DECIDUOUS_LOWER_ARCH_SEQUENCE;
export const ALL_PEDIATRIC_TEETH = DECIDUOUS_TEETH;

export const TOP_TEETH_MIXED = MIXED_TOP_TEETH;
export const BOTTOM_TEETH_MIXED = MIXED_BOTTOM_TEETH;

// ============================================================================
// 2. АНАТОМИЧЕСКИЕ ПРОВЕРКИ И ХЕЛПЕРЫ FDI
// ============================================================================

export function isValidFdiToothNumber(toothNumber: unknown): toothNumber is number {
	if (typeof toothNumber !== "number" || !Number.isInteger(toothNumber)) return false;
	return (ALL_FDI_TEETH as readonly number[]).includes(toothNumber);
}

export const isValidFdiTooth = isValidFdiToothNumber;

export function assertValidFdiToothNumber(toothNumber: unknown): asserts toothNumber is number {
	if (!isValidFdiToothNumber(toothNumber)) {
		throw new Error(
			`Некорректный номер зуба по стандарту FDI (ISO 3950): ${toothNumber}. Допустимы постоянные 11..48 и молочные 51..85.`,
		);
	}
}

export function isPermanentTooth(toothNumber: number): boolean {
	return (PERMANENT_TEETH as readonly number[]).includes(toothNumber);
}

export function isDeciduousTooth(toothNumber: number): boolean {
	return (DECIDUOUS_TEETH as readonly number[]).includes(toothNumber);
}

export const isPrimaryTooth = isDeciduousTooth;

/** Относится ли зуб к верхней челюсти (квадранты 1, 2, 5, 6) */
export function isMaxillaryTooth(toothNumber: number): boolean {
	if (!isValidFdiToothNumber(toothNumber)) return false;
	const quad = Math.floor(toothNumber / 10);
	return quad === 1 || quad === 2 || quad === 5 || quad === 6;
}

export const isMaxillaryArch = isMaxillaryTooth;

/** Относится ли зуб к нижней челюсти (квадранты 3, 4, 7, 8) */
export function isMandibularTooth(toothNumber: number): boolean {
	if (!isValidFdiToothNumber(toothNumber)) return false;
	const quad = Math.floor(toothNumber / 10);
	return quad === 3 || quad === 4 || quad === 7 || quad === 8;
}

export const isMandibularArch = isMandibularTooth;

/** Относится ли зуб к левой анатомической стороне пациента (квадранты 2, 3, 6, 7) */
export function isPatientLeftSide(toothNumber: number): boolean {
	if (!isValidFdiToothNumber(toothNumber)) return false;
	const quad = Math.floor(toothNumber / 10);
	return quad === 2 || quad === 3 || quad === 6 || quad === 7;
}

/** Получить номер квадранта (1..8). Бросает Error для невалидного номера FDI */
export function getQuadrantForTooth(toothNumber: number): number {
	assertValidFdiToothNumber(toothNumber);
	return Math.floor(toothNumber / 10);
}

export type WheelerToothClass = "incisor" | "canine" | "premolar" | "molar";

/**
 * Анатомическая классификация классов зубов по атласу Wheeler.
 * Применяется для 2.5D одонтограммы, рентгенографии и расчета ширин ячеек (Мандат 8ar).
 */
export function getWheelerToothClass(toothNumber: number): WheelerToothClass {
	assertValidFdiToothNumber(toothNumber);
	const pos = toothNumber % 10;
	const isPrimary = Math.floor(toothNumber / 10) >= 5;

	if (isPrimary) {
		if (pos === 1 || pos === 2) return "incisor";
		if (pos === 3) return "canine";
		return "molar"; // У детей 4 и 5 — молочные моляры (премоляров нет)
	}

	if (pos === 1 || pos === 2) return "incisor";
	if (pos === 3) return "canine";
	if (pos === 4 || pos === 5) return "premolar";
	return "molar"; // 6, 7, 8
}

/**
 * Канонические ширины ячеек одонтограммы по шкале Wheeler (Мандат 8ar / ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md):
 * - Резцы (41, 42, 31, 32, 11, 12, 21, 22): compact 44px / standard 48px (5.0–5.5 мм)
 * - Клыки (43, 33, 13, 23): compact 50px / standard 54px (7.0–7.5 мм)
 * - Премоляры (44, 45, 34, 35, 14, 15, 24, 25): compact 56px / standard 60px (7.0–8.0 мм)
 * - Моляры (46, 47, 48, 36, 37, 38, 16..18, 26..28): compact 64px / standard 68px (10.0–11.0 мм)
 */
export const WHEELER_CELL_WIDTHS_PX = Object.freeze({
	incisor: { compact: 44, standard: 48 },
	canine: { compact: 50, standard: 54 },
	premolar: { compact: 56, standard: 60 },
	molar: { compact: 64, standard: 68 },
});

/**
 * Анатомические диапазоны мезиодистальной ширины зубов в миллиметрах (атлас Wheeler Dental Anatomy).
 */
export const WHEELER_TOOTH_WIDTHS_MM = Object.freeze({
	incisor: { min: 5.0, max: 8.5 }, // Нижние резцы от 5.0 мм, верхние центральные до 8.5 мм
	canine: { min: 7.0, max: 7.5 },
	premolar: { min: 7.0, max: 8.0 },
	molar: { min: 9.5, max: 11.0 },
});

/**
 * Получить ширину ячейки зуба в пикселях по шкале Wheeler для одонтограммы.
 */
export function getWheelerCellWidthPx(
	toothNumber: number,
	mode: "compact" | "standard" = "standard",
): number {
	const toothClass = getWheelerToothClass(toothNumber);
	return WHEELER_CELL_WIDTHS_PX[toothClass][mode];
}

/**
 * Расчет суммарной ширины фронтальной группы зубов (43..33) в пикселях.
 * Гарантирует посадку фронта в мобильный экран iPhone 390px без горизонтального скролла.
 */
export function calculateFrontalGroupWidthPx(
	teeth: readonly number[] = [43, 42, 41, 31, 32, 33],
	mode: "compact" | "standard" = "standard",
): number {
	return teeth.reduce((sum, t) => sum + getWheelerCellWidthPx(t, mode), 0);
}

export function getToothDentitionType(toothNumber: number): "permanent" | "deciduous" {
	if (isPermanentTooth(toothNumber)) return "permanent";
	if (isDeciduousTooth(toothNumber)) return "deciduous";
	throw new Error(`Invalid FDI tooth number: ${toothNumber}`);
}

export function getToothArch(toothNumber: number): "upper" | "lower" {
	if (isValidFdiToothNumber(toothNumber)) {
		return isMaxillaryTooth(toothNumber) ? "upper" : "lower";
	}
	throw new Error(`Invalid FDI tooth number: ${toothNumber}`);
}

export function getArchSequenceForTooth(toothNumber: number): readonly number[] {
	if (isPermanentTooth(toothNumber)) {
		return getToothArch(toothNumber) === "upper" ? UPPER_ARCH_SEQUENCE : LOWER_ARCH_SEQUENCE;
	}
	return getToothArch(toothNumber) === "upper"
		? DECIDUOUS_UPPER_ARCH_SEQUENCE
		: DECIDUOUS_LOWER_ARCH_SEQUENCE;
}

/** Разделение дуги на правую и левую половины относительно средней линии */
export function splitArchAtMidline(teeth: number[] | readonly number[] | null | undefined): {
	left: number[];
	right: number[];
} {
	if (!teeth || !Array.isArray(teeth) || teeth.length <= 1) {
		return { left: Array.isArray(teeth) ? [...teeth] : [], right: [] };
	}
	let splitIndex = teeth.findIndex((num, i) => {
		if (i === 0) return false;
		const prev = teeth[i - 1];
		if (!prev) return false;
		const prevQ = Math.floor(prev / 10);
		const currQ = Math.floor(num / 10);
		return prevQ !== currQ;
	});
	if (splitIndex <= 0) {
		splitIndex = Math.ceil(teeth.length / 2);
	}
	return {
		left: teeth.slice(0, splitIndex),
		right: teeth.slice(splitIndex),
	};
}

// ============================================================================
// 3. НАЗВАНИЯ ЗУБОВ (АНАТОМИЧЕСКИЕ И НАРОДНЫЕ) И СОРТИРОВКА FDI
// ============================================================================

export const QUADRANT_NAMES_RU: Readonly<Record<number, string>> = Object.freeze({
	1: "верхний правый",
	2: "верхний левый",
	3: "нижний левый",
	4: "нижний правый",
	5: "верхний правый временный",
	6: "верхний левый временный",
	7: "нижний левый временный",
	8: "нижний правый временный",
});

export const PERMANENT_TOOTH_NAMES_RU: Readonly<Record<number, string>> = Object.freeze({
	1: "центральный резец",
	2: "латеральный резец",
	3: "клык",
	4: "первый премоляр",
	5: "второй премоляр",
	6: "первый моляр",
	7: "второй моляр",
	8: "третий моляр (зуб мудрости)",
});

export const PRIMARY_TOOTH_NAMES_RU: Readonly<Record<number, string>> = Object.freeze({
	1: "центральный резец",
	2: "латеральный резец",
	3: "клык",
	4: "первый моляр",
	5: "второй моляр",
});

/**
 * Получить полное анатомическое название зуба по номеру FDI на русском языке.
 * Пример: 16 -> "16 (верхний правый первый моляр)"
 */
export function getToothAnatomicalNameRu(toothNumber: number): string {
	if (!isValidFdiToothNumber(toothNumber)) {
		return `Зуб ${toothNumber}`;
	}
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const quadName = QUADRANT_NAMES_RU[quadrant] ?? "";
	const isPrimary = quadrant >= 5 && quadrant <= 8;
	const toothType = isPrimary
		? (PRIMARY_TOOTH_NAMES_RU[pos] ?? "зуб")
		: (PERMANENT_TOOTH_NAMES_RU[pos] ?? "зуб");

	return `${toothNumber} (${quadName} ${toothType})`;
}

/**
 * Расшифровка номеров зубов простым русским языком (народное + анатомическое).
 * Пример:
 * - 16 -> "16: Верхняя правая шестерка (первый моляр)"
 * - 11 -> "11: Верхняя правая единица (центральный резец)"
 * - 38 -> "38: Нижний левый зуб мудрости (восьмерка)"
 * - 55 -> "55: Верхняя правая молочная пятерка (второй моляр)"
 */
export function getToothFolkAndAnatomicalNameRu(toothNumber: number): string {
	if (!isValidFdiToothNumber(toothNumber)) {
		return `Зуб ${toothNumber}`;
	}
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const isPrimary = quadrant >= 5 && quadrant <= 8;

	let locationPrefix = "";
	switch (quadrant) {
		case 1: locationPrefix = "Верхняя правая"; break;
		case 2: locationPrefix = "Верхняя левая"; break;
		case 3: locationPrefix = "Нижняя левая"; break;
		case 4: locationPrefix = "Нижняя правая"; break;
		case 5: locationPrefix = "Верхняя правая молочная"; break;
		case 6: locationPrefix = "Верхняя левая молочная"; break;
		case 7: locationPrefix = "Нижняя левая молочная"; break;
		case 8: locationPrefix = "Нижняя правая молочная"; break;
		default: locationPrefix = "Зуб"; break;
	}

	if (toothNumber === 18 || toothNumber === 28) {
		return `${toothNumber}: ${quadrant === 1 ? "Верхний правый" : "Верхний левый"} зуб мудрости (восьмерка)`;
	}
	if (toothNumber === 38 || toothNumber === 48) {
		return `${toothNumber}: ${quadrant === 4 ? "Нижний правый" : "Нижний левый"} зуб мудрости (восьмерка)`;
	}

	const folkNumbers: Record<number, string> = {
		1: "единица",
		2: "двойка",
		3: "тройка",
		4: "четверка",
		5: "пятерка",
		6: "шестерка",
		7: "семерка",
		8: "восьмерка",
	};

	const folkName = folkNumbers[pos] ?? "зуб";
	const anatomicalType = isPrimary
		? (PRIMARY_TOOTH_NAMES_RU[pos] ?? "зуб")
		: (PERMANENT_TOOTH_NAMES_RU[pos] ?? "зуб");

	return `${toothNumber}: ${locationPrefix} ${folkName} (${anatomicalType})`;
}

/**
 * Сортировка и дедупликация списка зубов по клиническому порядку FDI.
 */
export function normalizeFdiToothList(
	toothInput: string | readonly (number | string)[],
): string {
	const rawTokens = Array.isArray(toothInput)
		? toothInput.map(String)
		: String(toothInput).split(/[,;\s]+/);

	const validNumbers = Array.from(
		new Set(
			rawTokens
				.map((t) => Number.parseInt(t.trim(), 10))
				.filter((n) => !Number.isNaN(n) && isValidFdiToothNumber(n)),
		),
	);

	validNumbers.sort((a, b) => {
		const quadA = Math.floor(a / 10);
		const quadB = Math.floor(b / 10);
		if (quadA !== quadB) return quadA - quadB;
		if (quadA === 1 || quadA === 5) return b - a; // 18 -> 11
		if (quadA === 3 || quadA === 7) return b - a; // 38 -> 31
		return a - b; // 21 -> 28, 41 -> 48
	});

	return validNumbers.join(", ");
}
