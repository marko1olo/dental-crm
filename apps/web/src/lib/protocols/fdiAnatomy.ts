import { isValidFdiToothNumber } from "@dental/shared";

/** Названия квадрантов зубов по FDI */
const QUADRANT_NAMES: Record<number, string> = {
	1: "верхний правый",
	2: "верхний левый",
	3: "нижний левый",
	4: "нижний правый",
	5: "верхний правый временный",
	6: "верхний левый временный",
	7: "нижний левый временный",
	8: "нижний правый временный",
};

/** Названия постоянных зубов по позиции в квадранте (1–8) */
const PERMANENT_TOOTH_NAMES: Record<number, string> = {
	1: "центральный резец",
	2: "латеральный резец",
	3: "клык",
	4: "первый премоляр",
	5: "второй премоляр",
	6: "первый моляр",
	7: "второй моляр",
	8: "третий моляр (зуб мудрости)",
};

/** Названия молочных (временных) зубов по позиции в квадранте (1–5) */
const PRIMARY_TOOTH_NAMES: Record<number, string> = {
	1: "центральный резец",
	2: "латеральный резец",
	3: "клык",
	4: "первый моляр",
	5: "второй моляр",
};

/** Поверхности зуба на русском языке */
const SURFACE_NAMES_RU: Record<string, string> = {
	O: "окклюзионная (жевательная)",
	M: "мезиальная (медиальная)",
	D: "дистальная",
	B: "вестибулярная (щечная)",
	V: "вестибулярная (щечная/губная)",
	L: "язычная",
	P: "нёбная",
};

/**
 * Получить полное анатомическое название зуба по номеру FDI.
 * Пример: 16 -> "16 (верхний правый первый моляр)"
 */
export function getToothAnatomicalNameRu(toothNumber: number): string {
	if (!isValidFdiToothNumber(toothNumber)) {
		return `Зуб ${toothNumber}`;
	}
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const quadName = QUADRANT_NAMES[quadrant] ?? "";
	const isPrimary = quadrant >= 5 && quadrant <= 8;
	const toothType = isPrimary
		? (PRIMARY_TOOTH_NAMES[pos] ?? "зуб")
		: (PERMANENT_TOOTH_NAMES[pos] ?? "зуб");

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
		? (PRIMARY_TOOTH_NAMES[pos] ?? "зуб")
		: (PERMANENT_TOOTH_NAMES[pos] ?? "зуб");

	return `${toothNumber}: ${locationPrefix} ${folkName} (${anatomicalType})`;
}

/**
 * Форматирование списка поверхностей зуба в читаемую строку.
 */
export function formatSurfacesRu(surfaces?: readonly string[]): string {
	const valid = (surfaces ?? [])
		.map((s) => (s ?? "").trim())
		.filter((s) => s.length > 0 && s.toLowerCase() !== "undefined" && s.toLowerCase() !== "null");
	if (valid.length === 0) return "коронковой части";
	const mapped = valid
		.map((s) => s.toUpperCase())
		.map((s) => SURFACE_NAMES_RU[s] || s);
	return mapped.join(", ");
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

	// Клинический порядок обхода:
	// Q1: 18 -> 11, Q2: 21 -> 28, Q3: 38 -> 31, Q4: 41 -> 48
	// Q5: 55 -> 51, Q6: 61 -> 65, Q7: 75 -> 71, Q8: 81 -> 85
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
