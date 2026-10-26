/**
 * paidContract/numberToWordsRu.ts
 * Number to Russian words converter for contracts & billing (Mandate 8b <= 120 lines)
 */

import { pluralizeRu } from "../../../lib/russianPlural";

const ONES_M = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const ONES_F = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const TEENS = [
	"десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
	"пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

function tripletToWords(num: number, isFeminine: boolean): string {
	const h = Math.trunc(num / 100);
	const remainder = num % 100;
	const t = Math.trunc(remainder / 10);
	const o = remainder % 10;
	const parts: string[] = [];

	if (h > 0 && h < 10) parts.push(HUNDREDS[h] ?? "");
	if (t === 1) {
		parts.push(TEENS[o] ?? "");
	} else {
		if (t > 1) parts.push(TENS[t] ?? "");
		if (o > 0) parts.push((isFeminine ? ONES_F : ONES_M)[o] ?? "");
	}
	return parts.filter(Boolean).join(" ");
}

export function numberToWordsRu(totalKopecks: number): string {
	if (!Number.isFinite(totalKopecks) || totalKopecks < 0) {
		return "ноль рублей 00 копеек";
	}

	const wholeRubles = Math.trunc(totalKopecks / 100);
	const kopecks = Math.trunc(totalKopecks % 100);

	if (wholeRubles === 0) {
		const kopStr = String(kopecks).padStart(2, "0");
		const kopWord = pluralizeRu(kopecks, "копейка", "копейки", "копеек");
		return `ноль рублей ${kopStr} ${kopWord}`;
	}

	const billions = Math.trunc(wholeRubles / 1_000_000_000) % 1000;
	const millions = Math.trunc(wholeRubles / 1_000_000) % 1000;
	const thousands = Math.trunc(wholeRubles / 1_000) % 1000;
	const units = wholeRubles % 1000;
	const wordsParts: string[] = [];

	if (billions > 0) {
		wordsParts.push(`${tripletToWords(billions, false)} ${pluralizeRu(billions, "миллиард", "миллиарда", "миллиардов")}`);
	}
	if (millions > 0) {
		wordsParts.push(`${tripletToWords(millions, false)} ${pluralizeRu(millions, "миллион", "миллиона", "миллионов")}`);
	}
	if (thousands > 0) {
		wordsParts.push(`${tripletToWords(thousands, true)} ${pluralizeRu(thousands, "тысяча", "тысячи", "тысяч")}`);
	}
	if (units > 0 || wordsParts.length === 0) {
		const uWords = tripletToWords(units, false);
		if (uWords) wordsParts.push(uWords);
	}

	const rubWord = pluralizeRu(wholeRubles, "рубль", "рубля", "рублей");
	const rubResult = wordsParts.join(" ").trim();
	const capitalizedRub = rubResult.charAt(0).toUpperCase() + rubResult.slice(1);
	const kopStr = String(kopecks).padStart(2, "0");
	const kopWord = pluralizeRu(kopecks, "копейка", "копейки", "копеек");

	return `${capitalizedRub} ${rubWord} ${kopStr} ${kopWord}`;
}
