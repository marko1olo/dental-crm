/**
 * toothGrammarSsot.ts — Единый источник истины (SSOT) грамматического парсера зубов FDI и поверхностей.
 *
 * Объединяет правила распознавания из русской речи:
 * - Словарные числительные (десятки, единицы, тинейджеры, поцифровое произношение)
 * - Анатомические описания (челюсти, стороны, квадранты, группы зубов, народные названия)
 * - Постоянный (11..48) и временный/молочный (51..85) прикус по классификации FDI / ISO 3950
 * - Анатомические поверхности зубов (MOD, MO, OD, M, O, D, V, L, P, Cervical / V класс)
 *
 * Соответствие:
 * - Мандат 8c (Zero Mocks / Honest Parsing)
 * - Мандат 8e (Doctor Autonomy)
 * - Мандат 8s (Anti-Semantic-Duplicate / Single Source of Truth)
 */

// ============================================================================
// 1. КОНСТАНТЫ ЗУБОВ FDI / ISO 3950
// ============================================================================

export const VALID_FDI_PERMANENT_TEETH: readonly number[] = [
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
];

export const VALID_FDI_PRIMARY_TEETH: readonly number[] = [
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
];

export const ALL_VALID_FDI_TEETH: readonly number[] = [
	...VALID_FDI_PERMANENT_TEETH,
	...VALID_FDI_PRIMARY_TEETH,
];

/**
 * Проверяет, является ли значение валидным номером зуба по классификации FDI (11..85).
 */
export function isValidFdiToothNumber(num: unknown): boolean {
	if (typeof num === "string") {
		const parsed = parseInt(num, 10);
		if (Number.isNaN(parsed)) return false;
		return (ALL_VALID_FDI_TEETH as readonly number[]).includes(parsed);
	}
	if (typeof num !== "number" || !Number.isInteger(num)) return false;
	return (ALL_VALID_FDI_TEETH as readonly number[]).includes(num);
}

// ============================================================================
// 2. СЛОВАРИ СЛОВЕСНЫХ ЧИСЛИТЕЛЬНЫХ (РУССКИЙ ЯЗЫК)
// ============================================================================

export const TEEN_NUMBER_WORDS: Readonly<Record<string, number>> = Object.freeze({
	одиннадцать: 11,
	одиннадцатый: 11,
	одиннадцатого: 11,
	одиннадцатом: 11,
	двенадцать: 12,
	двенадцатый: 12,
	двенадцатого: 12,
	двенадцатом: 12,
	тринадцать: 13,
	тринадцатый: 13,
	тринадцатого: 13,
	тринадцатом: 13,
	четырнадцать: 14,
	четырнадцатый: 14,
	четырнадцатого: 14,
	четырнадцатом: 14,
	пятнадцать: 15,
	пятнадцатый: 15,
	пятнадцатого: 15,
	пятнадцатом: 15,
	шестнадцать: 16,
	шестнадцатый: 16,
	шестнадцатого: 16,
	шестнадцатом: 16,
	семнадцать: 17,
	семнадцатый: 17,
	семнадцатого: 17,
	семнадцатом: 17,
	восемнадцать: 18,
	восемнадцатый: 18,
	восемнадцатого: 18,
	восемнадцатом: 18,
	девятнадцать: 19,
	девятнадцатый: 19,
	девятнадцатого: 19,
	девятнадцатом: 19,
});

export const TENS_WORDS: Readonly<Record<string, number>> = Object.freeze({
	десять: 10,
	двадцать: 20,
	двадцатый: 20,
	двадцатого: 20,
	двадцатом: 20,
	тридцать: 30,
	тридцатый: 30,
	тридцатого: 30,
	тридцатом: 30,
	сорок: 40,
	сороковой: 40,
	сорокового: 40,
	сороковом: 40,
	пятьдесят: 50,
	пятидесятый: 50,
	пятидесятого: 50,
	пятидесятом: 50,
	шестьдесят: 60,
	шестидесятый: 60,
	шестидесятого: 60,
	шестидесятом: 60,
	семьдесят: 70,
	семидесятый: 70,
	семидесятого: 70,
	семидесятом: 70,
	восемьдесят: 80,
	восьмидесятый: 80,
	восьмидесятого: 80,
	восьмидесятом: 80,
});

export const ONES_WORDS: Readonly<Record<string, number>> = Object.freeze({
	один: 1,
	одна: 1,
	первый: 1,
	первого: 1,
	первом: 1,
	первая: 1,
	единица: 1,
	единичка: 1,
	два: 2,
	две: 2,
	второй: 2,
	второго: 2,
	втором: 2,
	вторая: 2,
	двойка: 2,
	двоечка: 2,
	три: 3,
	третий: 3,
	третьего: 3,
	третьем: 3,
	третья: 3,
	тройка: 3,
	троечка: 3,
	четыре: 4,
	четвертый: 4,
	четвёртый: 4,
	четвертого: 4,
	четвёртого: 4,
	четвертом: 4,
	четвёртом: 4,
	четвертая: 4,
	четверка: 4,
	четвёрка: 4,
	пять: 5,
	пятый: 5,
	пятого: 5,
	пятом: 5,
	пятая: 5,
	пятерка: 5,
	пятёрка: 5,
	шесть: 6,
	шестой: 6,
	шестого: 6,
	шестом: 6,
	шестая: 6,
	шестерка: 6,
	шестёрка: 6,
	семь: 7,
	седьмой: 7,
	седьмого: 7,
	седьмом: 7,
	седьмая: 7,
	семерка: 7,
	семёрка: 7,
	восемь: 8,
	восьмой: 8,
	восьмого: 8,
	восьмом: 8,
	восьмая: 8,
	восьмерка: 8,
	восьмёрка: 8,
	девять: 9,
	девятый: 9,
	девятого: 9,
	девятом: 9,
	девятая: 9,
	девятка: 9,
});

// ============================================================================
// 3. АНАТОМИЧЕСКИЕ НАИМЕНОВАНИЯ И ПОЗИЦИИ ЗУБОВ
// ============================================================================

export const TOOTH_ANATOMICAL_POSITIONS: Readonly<Record<string, number>> = Object.freeze({
	// Резцы (1, 2)
	"центральный резец": 1,
	"центрального резца": 1,
	"медиальный резец": 1,
	"первый резец": 1,
	единица: 1,
	единичка: 1,
	"боковой резец": 2,
	"бокового резца": 2,
	"латеральный резец": 2,
	"второй резец": 2,
	двойка: 2,
	двоечка: 2,

	// Клыки (3)
	клык: 3,
	клыка: 3,
	клыке: 3,
	"третий зуб": 3,
	тройка: 3,
	троечка: 3,

	// Премоляры (4, 5)
	"первый премоляр": 4,
	"первого премоляра": 4,
	"четвертый зуб": 4,
	"четвёртый зуб": 4,
	"первый малый коренной": 4,
	четверка: 4,
	четвёрка: 4,
	"второй премоляр": 5,
	"второго премоляра": 5,
	"пятый зуб": 5,
	"второй малый коренной": 5,
	пятерка: 5,
	пятёрка: 5,

	// Моляры (6, 7, 8)
	"первый моляр": 6,
	"первого моляра": 6,
	"первом моляре": 6,
	"шестой зуб": 6,
	"первый большой коренной": 6,
	шестерка: 6,
	шестёрка: 6,
	"второй моляр": 7,
	"второго моляра": 7,
	"втором моляре": 7,
	"седьмой зуб": 7,
	"второй большой коренной": 7,
	семерка: 7,
	семёрка: 7,
	"третий моляр": 8,
	"третьего моляра": 8,
	"восьмой зуб": 8,
	"зуб мудрости": 8,
	"зуба мудрости": 8,
	восьмерка: 8,
	восьмёрка: 8,
});

// ============================================================================
// 4. ИЗВЛЕЧЕНИЕ НОМЕРОВ ЗУБОВ FDI
// ============================================================================

interface MatchWithIndex {
	readonly tooth: number;
	readonly index: number;
}

/**
 * Извлекает все валидные номера зубов FDI из русской речи.
 * Поддерживает:
 * - Квадрантные анатомические описания («нижняя челюсть слева единица», «верхний правый клык»)
 * - Составные числительные («сорок шесть», «двадцать один»)
 * - Числа 11..18 («шестнадцать», «одиннадцатый зуб»)
 * - Поцифровое произношение («четыре семь» -> 47, «три шесть» -> 36)
 * - Прямые цифровые маркеры («зуб 46», «#21», «d36», «№14»)
 */
export function extractFdiTeethNumbers(text: string): number[] {
	if (!text || typeof text !== "string") return [];

	const rawNorm = text.toLowerCase().trim().replace(/ё/g, "е");
	const matches: MatchWithIndex[] = [];

	// 1. Квадрантные анатомические описания
	const isUpper =
		rawNorm.includes("верхн") ||
		rawNorm.includes("максиллярн") ||
		rawNorm.includes("вч") ||
		rawNorm.includes("сверху");
	const isLower =
		rawNorm.includes("нижн") ||
		rawNorm.includes("мандибулярн") ||
		rawNorm.includes("нч") ||
		rawNorm.includes("снизу");
	const isRight = rawNorm.includes("прав") || rawNorm.includes("справа");
	const isLeft = rawNorm.includes("лев") || rawNorm.includes("слева");
	const isPrimary =
		rawNorm.includes("молочн") || rawNorm.includes("временн");

	if ((isUpper || isLower) && (isRight || isLeft)) {
		let quadrant = 0;
		if (!isPrimary) {
			if (isUpper && isRight) quadrant = 1;
			else if (isUpper && isLeft) quadrant = 2;
			else if (isLower && isLeft) quadrant = 3;
			else if (isLower && isRight) quadrant = 4;
		} else {
			if (isUpper && isRight) quadrant = 5;
			else if (isUpper && isLeft) quadrant = 6;
			else if (isLower && isLeft) quadrant = 7;
			else if (isLower && isRight) quadrant = 8;
		}

		if (quadrant > 0) {
			const entries = Object.entries(TOOTH_ANATOMICAL_POSITIONS).sort(
				(a, b) => b[0].length - a[0].length,
			);
			for (const [phrase, pos] of entries) {
				const normPhrase = phrase.replace(/ё/g, "е");
				const idx = rawNorm.indexOf(normPhrase);
				if (idx !== -1) {
					const tooth = quadrant * 10 + pos;
					if (isValidFdiToothNumber(tooth)) {
						matches.push({ tooth, index: idx });
					}
				}
			}
		}
	}

	// 2. Словесные числительные
	const words = rawNorm.split(/[\s,.;:!?\-/]+/).filter(Boolean);

	for (let i = 0; i < words.length; i++) {
		const current = words[i];
		const next = words[i + 1];
		const wordIndex = rawNorm.indexOf(current || "");

		// Десятки + единицы: «сорок шесть» -> 46
		if (current && TENS_WORDS[current] !== undefined) {
			const tens = TENS_WORDS[current];
			if (tens !== undefined && next && ONES_WORDS[next] !== undefined) {
				const ones = ONES_WORDS[next];
				if (ones !== undefined) {
					const tooth = tens + ones;
					if (isValidFdiToothNumber(tooth)) {
						matches.push({ tooth, index: wordIndex });
						i++;
						continue;
					}
				}
			} else if (tens !== undefined && isValidFdiToothNumber(tens)) {
				matches.push({ tooth: tens, index: wordIndex });
			}
		}

		// Числа 11..18: «шестнадцать» -> 16, «одиннадцатый» -> 11
		if (current && TEEN_NUMBER_WORDS[current] !== undefined) {
			const tooth = TEEN_NUMBER_WORDS[current];
			if (tooth && isValidFdiToothNumber(tooth)) {
				matches.push({ tooth, index: wordIndex });
				continue;
			}
		}

		// Поцифровое произношение: «четыре семь» -> 47, «три шесть» -> 36, «один один» -> 11
		if (current && ONES_WORDS[current] !== undefined && next && ONES_WORDS[next] !== undefined) {
			const d1 = ONES_WORDS[current];
			const d2 = ONES_WORDS[next];
			if (d1 !== undefined && d2 !== undefined && d1 >= 1 && d1 <= 8 && d2 >= 1 && d2 <= 8) {
				const tooth = d1 * 10 + d2;
				if (isValidFdiToothNumber(tooth)) {
					matches.push({ tooth, index: wordIndex });
					i++;
					continue;
				}
			}
		}
	}

	// 3. Прямые цифровые маркеры («зуб 46», «d36», «#21», «зуба 14», «№14»)
	const regexMatches = rawNorm.matchAll(/(?:зуб[аеы]?|номер|#|d|д|№)?\s*([1-8][1-8])\b/g);
	for (const match of regexMatches) {
		if (match[1]) {
			const tooth = parseInt(match[1], 10);
			if (isValidFdiToothNumber(tooth)) {
				matches.push({ tooth, index: match.index ?? 0 });
			}
		}
	}

	// Сортировка по порядку появления в тексте и дедупликация с сохранением порядка
	matches.sort((a, b) => a.index - b.index);

	const seen = new Set<number>();
	const result: number[] = [];
	for (const item of matches) {
		if (!seen.has(item.tooth)) {
			seen.add(item.tooth);
			result.push(item.tooth);
		}
	}

	return result;
}

/**
 * Распознаёт один номер зуба из словесного текста на русском языке (возвращает первый найденный зуб).
 */
export function parseRussianSpokenToothNumber(text: string): number | null {
	if (!text || typeof text !== "string") return null;
	const teeth = extractFdiTeethNumbers(text);
	return teeth.length > 0 ? (teeth[0] ?? null) : null;
}

// ============================================================================
// 5. ИЗВЛЕЧЕНИЕ АНАТОМИЧЕСКИХ ПОВЕРХНОСТЕЙ ЗУБОВ
// ============================================================================

/**
 * Распознаёт анатомические поверхности зубов (Black / FDI) из русской речи и аббревиатур:
 * - MOD, MO, OD
 * - O: Окклюзионная / жевательная / режущий край
 * - V: Вестибулярная / щечная / губная / пришеечная / V класс
 * - M: Медиальная / мезиальная
 * - D: Дистальная
 * - L: Язычная
 * - P: Небная / нёбная
 */
export function extractToothSurfaces(text: string): string[] {
	if (!text || typeof text !== "string") return [];
	const norm = text.toLowerCase().replace(/ё/g, "е");
	const surfaces = new Set<string>();

	if (norm.includes("mod") || norm.includes("м од") || norm.includes("мод")) {
		return ["M", "O", "D"];
	}
	if (
		norm.includes("mo") ||
		norm.includes("мо") ||
		norm.includes("медиально-окклюзи") ||
		norm.includes("мезиально-окклюзи")
	) {
		surfaces.add("M");
		surfaces.add("O");
	}
	if (
		norm.includes("od") ||
		norm.includes("од") ||
		norm.includes("окклюзионно-дистальн")
	) {
		surfaces.add("O");
		surfaces.add("D");
	}
	if (norm.includes("окклюзион") || norm.includes("жевательн") || norm.includes("режущ")) {
		surfaces.add("O");
	}
	if (norm.includes("вестибулярн") || norm.includes("щечн") || norm.includes("губн")) {
		surfaces.add("V");
	}
	if (norm.includes("медиальн") || norm.includes("мезиальн")) {
		surfaces.add("M");
	}
	if (norm.includes("дистальн")) {
		surfaces.add("D");
	}
	if (norm.includes("язычн")) {
		surfaces.add("L");
	}
	if (norm.includes("небн") || norm.includes("нёбн")) {
		surfaces.add("P");
	}
	if (norm.includes("пришеечн") || norm.includes("v класс") || norm.includes("5 класс")) {
		surfaces.add("V");
	}

	return Array.from(surfaces);
}
