/**
 * toothGrammarParser.ts — Парсер номеров зубов по классификации FDI из русской речи.
 * Layer 1: Распознавание словесных числительных, анатомических положений и цифровых маркеров.
 */

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

const TEEN_NUMBER_WORDS: Record<string, number> = {
	"одиннадцать": 11,
	"одиннадцатый": 11,
	"одиннадцатого": 11,
	"одиннадцатом": 11,
	"двенадцать": 12,
	"двенадцатый": 12,
	"двенадцатого": 12,
	"двенадцатом": 12,
	"тринадцать": 13,
	"тринадцатый": 13,
	"тринадцатого": 13,
	"тринадцатом": 13,
	"четырнадцать": 14,
	"четырнадцатый": 14,
	"четырнадцатого": 14,
	"четырнадцатом": 14,
	"пятнадцать": 15,
	"пятнадцатый": 15,
	"пятнадцатого": 15,
	"пятнадцатом": 15,
	"шестнадцать": 16,
	"шестнадцатый": 16,
	"шестнадцатого": 16,
	"шестнадцатом": 16,
	"семнадцать": 17,
	"семнадцатый": 17,
	"семнадцатого": 17,
	"семнадцатом": 17,
	"восемнадцать": 18,
	"восемнадцатый": 18,
	"восемнадцатого": 18,
	"восемнадцатом": 18,
	"девятнадцать": 19,
	"девятнадцатый": 19,
	"девятнадцатого": 19,
	"девятнадцатом": 19,
};

const TENS_WORDS: Record<string, number> = {
	"десять": 10,
	"двадцать": 20,
	"двадцатый": 20,
	"двадцатого": 20,
	"двадцатом": 20,
	"тридцать": 30,
	"тридцатый": 30,
	"тридцатого": 30,
	"тридцатом": 30,
	"сорок": 40,
	"сороковой": 40,
	"сорокового": 40,
	"сороковом": 40,
	"пятьдесят": 50,
	"пятидесятый": 50,
	"пятидесятого": 50,
	"пятидесятом": 50,
	"шестьдесят": 60,
	"шестидесятый": 60,
	"шестидесятого": 60,
	"шестидесятом": 60,
	"семьдесят": 70,
	"семидесятый": 70,
	"семидесятого": 70,
	"семидесятом": 70,
	"восемьдесят": 80,
	"восьмидесятый": 80,
	"восьмидесятого": 80,
	"восьмидесятом": 80,
};

const ONES_WORDS: Record<string, number> = {
	"один": 1,
	"одна": 1,
	"первый": 1,
	"первого": 1,
	"первом": 1,
	"первая": 1,
	"два": 2,
	"две": 2,
	"второй": 2,
	"второго": 2,
	"втором": 2,
	"вторая": 2,
	"три": 3,
	"третий": 3,
	"третьего": 3,
	"третьем": 3,
	"третья": 3,
	"четыре": 4,
	"четвертый": 4,
	"четвёртый": 4,
	"четвертого": 4,
	"четвёртого": 4,
	"четвертом": 4,
	"четвёртом": 4,
	"четвертая": 4,
	"пять": 5,
	"пятый": 5,
	"пятого": 5,
	"пятом": 5,
	"пятая": 5,
	"шесть": 6,
	"шестой": 6,
	"шестого": 6,
	"шестом": 6,
	"шестая": 6,
	"семь": 7,
	"седьмой": 7,
	"седьмого": 7,
	"седьмом": 7,
	"седьмая": 7,
	"восемь": 8,
	"восьмой": 8,
	"восьмого": 8,
	"восьмом": 8,
	"восьмая": 8,
	"девять": 9,
	"девятый": 9,
	"девятого": 9,
	"девятом": 9,
	"девятая": 9,
};

// Анатомические описания зубов:
// Квадранты:
// 1 = Верхний правый (11..18)
// 2 = Верхний левый (21..28)
// 3 = Нижний левый (31..38)
// 4 = Нижний правый (41..48)
// Молочные: 5 = ВП, 6 = ВЛ, 7 = НЛ, 8 = НП

const TOOTH_ANATOMICAL_POSITIONS: Record<string, number> = {
	// Резцы (1, 2)
	"центральный резец": 1,
	"центрального резца": 1,
	"медиальный резец": 1,
	"первый резец": 1,
	"боковой резец": 2,
	"бокового резца": 2,
	"латеральный резец": 2,
	"второй резец": 2,
	// Клыки (3)
	"клык": 3,
	"клыка": 3,
	"клыке": 3,
	"третий зуб": 3,
	// Премоляры (4, 5)
	"первый премоляр": 4,
	"первого премоляра": 4,
	"четвертый зуб": 4,
	"четвёртый зуб": 4,
	"первый малый коренной": 4,
	"второй премоляр": 5,
	"второго премоляра": 5,
	"пятый зуб": 5,
	"второй малый коренной": 5,
	// Моляры (6, 7, 8)
	"первый моляр": 6,
	"первого моляра": 6,
	"первом моляре": 6,
	"шестой зуб": 6,
	"первый большой коренной": 6,
	"шестерка": 6,
	"шестёрка": 6,
	"второй моляр": 7,
	"второго моляра": 7,
	"втором моляре": 7,
	"седьмой зуб": 7,
	"второй большой коренной": 7,
	"семерка": 7,
	"семёрка": 7,
	"третий моляр": 8,
	"третьего моляра": 8,
	"восьмой зуб": 8,
	"зуб мудрости": 8,
	"зуба мудрости": 8,
	"восьмерка": 8,
	"восьмёрка": 8,
};

/**
 * Проверяет, является ли число допустимым номером зуба по классификации FDI.
 */
export function isValidFdiToothNumber(num: number): boolean {
	return ALL_VALID_FDI_TEETH.includes(num);
}

/**
 * Распознаёт номер зуба из словесного текста на русском языке.
 * Возвращает найденный номер зуба (FDI) или null.
 */
export function parseRussianSpokenToothNumber(text: string): number | null {
	if (!text || typeof text !== "string") return null;

	const normalized = text.toLowerCase().trim().replace(/ё/g, "е");

	// 1. Анатомические описания (например: «нижний левый первый моляр», «верхний правый клык»)
	const isUpper =
		normalized.includes("верхн") ||
		normalized.includes("максиллярн") ||
		normalized.includes("сверху");
	const isLower =
		normalized.includes("нижн") ||
		normalized.includes("мандибулярн") ||
		normalized.includes("снизу");
	const isRight = normalized.includes("прав") || normalized.includes("справа");
	const isLeft = normalized.includes("лев") || normalized.includes("слева");
	const isPrimary =
		normalized.includes("молочн") || normalized.includes("временн");

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
			// Ищем позицию зуба (от длинных фраз к коротким)
			const entries = Object.entries(TOOTH_ANATOMICAL_POSITIONS).sort(
				(a, b) => b[0].length - a[0].length,
			);
			for (const [phrase, pos] of entries) {
				const normPhrase = phrase.replace(/ё/g, "е");
				if (normalized.includes(normPhrase)) {
					const tooth = quadrant * 10 + pos;
					if (isValidFdiToothNumber(tooth)) {
						return tooth;
					}
				}
			}
		}
	}

	// 2. Словесные числительные:
	// Обработка составных чисел типа «сорок шесть», «двадцать один», «тридцать восемь», «шестнадцатый зуб»
	const words = normalized.split(/[\s,.-]+/).filter(Boolean);

	for (let i = 0; i < words.length; i++) {
		const current = words[i];
		const next = words[i + 1];

		// Проверка десятков + единиц («сорок шесть»)
		if (current && TENS_WORDS[current] !== undefined) {
			const tens = TENS_WORDS[current];
			if (tens !== undefined && next && ONES_WORDS[next] !== undefined) {
				const ones = ONES_WORDS[next];
				if (ones !== undefined) {
					const tooth = tens + ones;
					if (isValidFdiToothNumber(tooth)) {
						return tooth;
					}
				}
			} else if (tens !== undefined && isValidFdiToothNumber(tens)) {
				return tens;
			}
		}

		// Проверка тинейджеров («шестнадцать», «шестнадцатый»)
		if (current && TEEN_NUMBER_WORDS[current] !== undefined) {
			const tooth = TEEN_NUMBER_WORDS[current];
			if (tooth && isValidFdiToothNumber(tooth)) {
				return tooth;
			}
		}
	}

	// 3. Поиск цифровых шаблонов: "зуб 46", "зуба 16", "зубе 21", "#46", "d36", "46"
	const directMatch = normalized.match(
		/(?:зуб[аеы]?|номер|#|d|№)?\s*([1-8][1-8])\b/,
	);
	if (directMatch && directMatch[1]) {
		const parsed = parseInt(directMatch[1], 10);
		if (isValidFdiToothNumber(parsed)) {
			return parsed;
		}
	}

	return null;
}
