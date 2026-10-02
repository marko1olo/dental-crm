/**
 * toothSpeechParser.ts — Распознавание номеров зубов (FDI/ISO) и поверхностей зуба из русской речи
 */

import { isValidFdiToothNumber } from "@dental/shared";

// ----------------------------------------------------------------------------
// DICTIONARIES FOR FDI TOOTH NUMBER RECOGNITION
// ----------------------------------------------------------------------------

const TENS_WORDS: Record<string, number> = {
	двадцать: 20,
	двадцатый: 20,
	двадцатого: 20,
	тридцать: 30,
	тридцатый: 30,
	тридцатого: 30,
	сорок: 40,
	сороковой: 40,
	сорокового: 40,
	пятьдесят: 50,
	пятидесятый: 50,
	пятидесятого: 50,
	шестьдесят: 60,
	шестидесятый: 60,
	шестидесятого: 60,
	семьдесят: 70,
	семидесятый: 70,
	семидесятого: 70,
	восемьдесят: 80,
	восьмидесятый: 80,
	восьмидесятого: 80,
};

const ONES_WORDS: Record<string, number> = {
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
	четвертого: 4,
	четвертом: 4,
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
};

const TEEN_NUMBER_WORDS: Record<string, number> = {
	одиннадцать: 11,
	одиннадцатый: 11,
	одиннадцатого: 11,
	двенадцать: 12,
	двенадцатый: 12,
	двенадцатого: 12,
	тринадцать: 13,
	тринадцатый: 13,
	тринадцатого: 13,
	четырнадцать: 14,
	четырнадцатый: 14,
	четырнадцатого: 14,
	пятнадцать: 15,
	пятнадцатый: 15,
	пятнадцатого: 15,
	шестнадцать: 16,
	шестнадцатый: 16,
	шестнадцатого: 16,
	семнадцать: 17,
	семнадцатый: 17,
	семнадцатого: 17,
	восемнадцать: 18,
	восемнадцатый: 18,
	восемнадцатого: 18,
};

const TOOTH_ANATOMICAL_POSITIONS: Record<string, number> = {
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
	клык: 3,
	клыка: 3,
	клыке: 3,
	"третий зуб": 3,
	тройка: 3,
	троечка: 3,
	"первый премоляр": 4,
	"первого премоляра": 4,
	"четвертый зуб": 4,
	четверка: 4,
	четвёрка: 4,
	"второй премоляр": 5,
	"второго премоляра": 5,
	"пятый зуб": 5,
	пятерка: 5,
	пятёрка: 5,
	"первый моляр": 6,
	"первого моляра": 6,
	"первом моляре": 6,
	"шестой зуб": 6,
	шестерка: 6,
	шестёрка: 6,
	"второй моляр": 7,
	"второго моляра": 7,
	"втором моляре": 7,
	"седьмой зуб": 7,
	семерка: 7,
	семёрка: 7,
	"третий моляр": 8,
	"третьего моляра": 8,
	"восьмой зуб": 8,
	"зуб мудрости": 8,
	"зуба мудрости": 8,
	восьмерка: 8,
	восьмёрка: 8,
};

export function extractFdiTeethNumbers(text: string): number[] {
	if (!text || typeof text !== "string") return [];
	const found = new Set<number>();
	const normalized = text.toLowerCase().trim().replace(/ё/g, "е");

	// 1. Челюсти и квадранты («шестерка снизу справа» -> 46, «клык сверху слева» -> 23)
	const isUpper =
		normalized.includes("верхн") ||
		normalized.includes("максиллярн") ||
		normalized.includes("вч") ||
		normalized.includes("сверху");
	const isLower =
		normalized.includes("нижн") ||
		normalized.includes("мандибулярн") ||
		normalized.includes("нч") ||
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
			const entries = Object.entries(TOOTH_ANATOMICAL_POSITIONS).sort(
				(a, b) => b[0].length - a[0].length,
			);
			for (const [phrase, pos] of entries) {
				const normPhrase = phrase.replace(/ё/g, "е");
				if (normalized.includes(normPhrase)) {
					const tooth = quadrant * 10 + pos;
					if (isValidFdiToothNumber(tooth)) {
						found.add(tooth);
					}
				}
			}
		}
	}

	// 2. Словесные комбинации и поцифровое произношение («четыре семь» -> 47, «три шесть» -> 36)
	const words = normalized.split(/[\s,.;:!?\-/]+/).filter(Boolean);

	for (let i = 0; i < words.length; i++) {
		const current = words[i];
		const next = words[i + 1];

		// Десятки + единицы: «сорок шесть» -> 46
		if (current && TENS_WORDS[current] !== undefined) {
			const tens = TENS_WORDS[current];
			if (tens !== undefined && next && ONES_WORDS[next] !== undefined) {
				const ones = ONES_WORDS[next];
				if (ones !== undefined) {
					const tooth = tens + ones;
					if (isValidFdiToothNumber(tooth)) {
						found.add(tooth);
					}
				}
			} else if (tens !== undefined && isValidFdiToothNumber(tens)) {
				found.add(tens);
			}
		}

		// Числа 11..18: «шестнадцать» -> 16, «одиннадцать» -> 11
		if (current && TEEN_NUMBER_WORDS[current] !== undefined) {
			const tooth = TEEN_NUMBER_WORDS[current];
			if (tooth && isValidFdiToothNumber(tooth)) {
				found.add(tooth);
			}
		}

		// Поцифровое произнесение: «четыре семь» -> 47, «три шесть» -> 36, «один один» -> 11
		if (current && ONES_WORDS[current] !== undefined && next && ONES_WORDS[next] !== undefined) {
			const d1 = ONES_WORDS[current];
			const d2 = ONES_WORDS[next];
			if (d1 !== undefined && d2 !== undefined && d1 >= 1 && d1 <= 8 && d2 >= 1 && d2 <= 8) {
				const tooth = d1 * 10 + d2;
				if (isValidFdiToothNumber(tooth)) {
					found.add(tooth);
				}
			}
		}
	}

	// 3. Прямые цифровые маркеры («зуб 46», «d36», «#21», «зуба 14»)
	const matches = normalized.matchAll(/(?:зуб[аеы]?|номер|#|d|д|№)?\s*([1-8][1-8])\b/g);
	for (const match of matches) {
		if (match[1]) {
			const tooth = parseInt(match[1], 10);
			if (isValidFdiToothNumber(tooth)) {
				found.add(tooth);
			}
		}
	}

	return Array.from(found);
}

export function extractToothSurfaces(text: string): string[] {
	if (!text) return [];
	const norm = text.toLowerCase().replace(/ё/g, "е");
	const surfaces = new Set<string>();

	if (norm.includes("mod") || norm.includes("м од") || norm.includes("мод")) {
		return ["M", "O", "D"];
	}
	if (norm.includes("mo") || norm.includes("мо") || norm.includes("медиально-окклюзи") || norm.includes("мезиально-окклюзи")) {
		surfaces.add("M");
		surfaces.add("O");
	}
	if (norm.includes("od") || norm.includes("од") || norm.includes("окклюзионно-дистальн")) {
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
