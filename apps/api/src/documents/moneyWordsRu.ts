/**
 * moneyWordsRu.ts — Преобразование денежных сумм в рубли и копейки прописью на русском языке.
 * Разработано в соответствии с правилами русского языка и требованиями делопроизводства (ГОСТ Р 7.0.97-2016).
 */

import { parseKopecks, formatKopecksRu } from "@dental/shared";

const HUNDREDS = [
	"",
	"сто",
	"двести",
	"триста",
	"четыреста",
	"пятьсот",
	"шестьсот",
	"семьсот",
	"восемьсот",
	"девятьсот",
];

const TENS = [
	"",
	"",
	"двадцать",
	"тридцать",
	"сорок",
	"пятьдесят",
	"шестьдесят",
	"семьдесят",
	"восемьдесят",
	"девяносто",
];

const TEENS = [
	"десять",
	"одиннадцать",
	"двенадцать",
	"тринадцать",
	"четырнадцать",
	"пятнадцать",
	"шестнадцать",
	"семнадцать",
	"восемнадцать",
	"девятнадцать",
];

const ONES_MASCULINE = [
	"",
	"один",
	"два",
	"три",
	"четыре",
	"пять",
	"шесть",
	"семь",
	"восемь",
	"девять",
];

const ONES_FEMININE = [
	"",
	"одна",
	"две",
	"три",
	"четыре",
	"пять",
	"шесть",
	"семь",
	"восемь",
	"девять",
];

export type WordDeclension = [one: string, twoToFour: string, fiveAndMore: string];

export const RUBLE_FORMS: WordDeclension = ["рубль", "рубля", "рублей"];
export const KOPECK_FORMS: WordDeclension = ["копейка", "копейки", "копеек"];
export const THOUSAND_FORMS: WordDeclension = ["тысяча", "тысячи", "тысяч"];
export const MILLION_FORMS: WordDeclension = ["миллион", "миллиона", "миллионов"];
export const BILLION_FORMS: WordDeclension = ["миллиард", "миллиарда", "миллиардов"];

export function getDeclension(n: number, forms: WordDeclension): string {
	const abs = Math.abs(Math.trunc(n)) % 100;
	const rem = abs % 10;
	if (abs > 10 && abs < 20) return forms[2];
	if (rem > 1 && rem < 5) return forms[1];
	if (rem === 1) return forms[0];
	return forms[2];
}

function tripletToWords(num: number, isFeminine: boolean): string[] {
	if (num === 0) return [];
	const words: string[] = [];
	const h = Math.floor(num / 100);
	const rem = num % 100;
	const t = Math.floor(rem / 10);
	const o = rem % 10;

	if (h > 0 && h < 10) {
		const hundredWord = HUNDREDS[h];
		if (hundredWord) words.push(hundredWord);
	}

	if (rem >= 10 && rem < 20) {
		const teenWord = TEENS[rem - 10];
		if (teenWord) words.push(teenWord);
	} else {
		if (t >= 2) {
			const tenWord = TENS[t];
			if (tenWord) words.push(tenWord);
		}
		if (o > 0) {
			const oneWord = isFeminine ? ONES_FEMININE[o] : ONES_MASCULINE[o];
			if (oneWord) words.push(oneWord);
		}
	}
	return words;
}

export function integerToWordsRu(num: number, forms?: WordDeclension, isFeminine = false): string {
	if (num === 0) {
		const unit = forms ? ` ${getDeclension(0, forms)}` : "";
		return `ноль${unit}`;
	}

	const parts: string[] = [];
	let n = Math.abs(Math.trunc(num));

	// Миллиарды (10^9)
	const billions = Math.floor(n / 1_000_000_000);
	if (billions > 0) {
		parts.push(...tripletToWords(billions, false));
		parts.push(getDeclension(billions, BILLION_FORMS));
		n %= 1_000_000_000;
	}

	// Миллионы (10^6)
	const millions = Math.floor(n / 1_000_000);
	if (millions > 0) {
		parts.push(...tripletToWords(millions, false));
		parts.push(getDeclension(millions, MILLION_FORMS));
		n %= 1_000_000;
	}

	// Тысячи (10^3) - женский род (одна тысяча, две тысячи...)
	const thousands = Math.floor(n / 1_000);
	if (thousands > 0) {
		parts.push(...tripletToWords(thousands, true));
		parts.push(getDeclension(thousands, THOUSAND_FORMS));
		n %= 1_000;
	}

	// Единицы
	if (n > 0) {
		parts.push(...tripletToWords(n, isFeminine));
	}

	if (forms) {
		parts.push(getDeclension(Math.abs(Math.trunc(num)), forms));
	}

	return parts.join(" ");
}

/**
 * Преобразует сумму в целых копейках в строку прописью с заглавной буквы.
 * Пример: 1545050 -> "Пятнадцать тысяч четыреста пятьдесят рублей 50 копеек"
 */
export function kopecksToWordsRu(kopecks: number): string {
	const negative = kopecks < 0;
	const abs = Math.abs(Math.round(kopecks));
	const rubles = Math.floor(abs / 100);
	const kop = abs % 100;

	const rublesText = integerToWordsRu(rubles, RUBLE_FORMS, false);
	const kopStr = String(kop).padStart(2, "0");
	const kopDeclension = getDeclension(kop, KOPECK_FORMS);

	const capitalized = rublesText.charAt(0).toUpperCase() + rublesText.slice(1);
	const sign = negative ? "минус " : "";
	return `${sign}${capitalized} ${kopStr} ${kopDeclension}`;
}

/**
 * Полная официальная формулировка суммы прописью для договоров, смет и актов.
 * Пример: 15450.50 -> "15 450,50 (Пятнадцать тысяч четыреста пятьдесят) рублей 50 копеек"
 */
export function legalMoneyInWordsRu(kopecksOrRubles: number | null | undefined): string {
	if (kopecksOrRubles === null || kopecksOrRubles === undefined || !Number.isFinite(kopecksOrRubles)) {
		return "не указана";
	}
	const kopecks = parseKopecks(kopecksOrRubles);
	const abs = Math.abs(kopecks);
	const rubles = Math.floor(abs / 100);
	const kop = abs % 100;
	const formattedNumeric = formatKopecksRu(kopecks);
	const rublesWords = integerToWordsRu(rubles, undefined, false);
	const capitalizedRublesWords = rublesWords.charAt(0).toUpperCase() + rublesWords.slice(1);
	const rubDeclension = getDeclension(rubles, RUBLE_FORMS);
	const kopStr = String(kop).padStart(2, "0");
	const kopDeclension = getDeclension(kop, KOPECK_FORMS);

	return `${formattedNumeric} (${capitalizedRublesWords}) ${rubDeclension} ${kopStr} ${kopDeclension}`;
}
