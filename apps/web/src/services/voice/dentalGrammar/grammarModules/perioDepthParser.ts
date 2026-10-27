/**
 * perioDepthParser.ts — Парсер числовых значений глубин карманов и подвижности
 */

export const PERIO_DIGIT_WORDS_MAP: Record<string, number> = {
	"один": 1, "единица": 1, "первая": 1, "первый": 1, "1": 1,
	"два": 2, "двойка": 2, "вторая": 2, "второй": 2, "2": 2,
	"три": 3, "тройка": 3, "третья": 3, "третий": 3, "3": 3,
	"четыре": 4, "четверка": 4, "четвертая": 4, "четвертый": 4, "4": 4,
	"пять": 5, "пятерка": 5, "пятая": 5, "пятый": 5, "5": 5,
	"шесть": 6, "шестерка": 6, "шестая": 6, "шестой": 6, "6": 6,
	"семь": 7, "семерка": 7, "седьмая": 7, "седьмой": 7, "7": 7,
	"восемь": 8, "восьмерка": 8, "восьмая": 8, "восьмой": 8, "8": 8,
	"девять": 9, "девятка": 9, "девятая": 9, "девятый": 9, "9": 9,
	"десять": 10, "десятка": 10, "10": 10,
};

export function parsePerioDepthNumber(s: string): number | undefined {
	const trimmed = s.trim().toLowerCase();
	if (/^\d{1,2}$/.test(trimmed)) {
		const n = Number.parseInt(trimmed, 10);
		return n >= 0 && n <= 15 ? n : undefined;
	}
	if (PERIO_DIGIT_WORDS_MAP[trimmed] !== undefined) {
		return PERIO_DIGIT_WORDS_MAP[trimmed];
	}
	return undefined;
}
