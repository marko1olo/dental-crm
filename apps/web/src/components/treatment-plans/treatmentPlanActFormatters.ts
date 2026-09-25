/**
 * treatmentPlanActFormatters.ts — Форматирование денежных сумм, склонение и сумма прописью
 * для официальных Актов сдачи-приемки и регламентных документов DENTE CRM.
 */

import { type Kopecks, formatKopecksRu } from "@dental/shared";

/**
 * Преобразует числовую сумму в рубли и копейки с гарантией точности (без плавающей точки).
 */
export function formatMoneyExact(rub: number, kopecks?: Kopecks): string {
	if (kopecks !== undefined && Number.isInteger(kopecks)) {
		return formatKopecksRu(kopecks);
	}
	const safeKopecks = Math.round(rub * 100);
	return formatKopecksRu(safeKopecks as Kopecks);
}

/**
 * Склонение числительных в русском языке.
 */
export function pluralizeRu(count: number, formOne: string, formTwo: string, formFive: string): string {
	const absCount = Math.abs(count) % 100;
	const remainder = absCount % 10;
	if (absCount > 10 && absCount < 20) return formFive;
	if (remainder > 1 && remainder < 5) return formTwo;
	if (remainder === 1) return formOne;
	return formFive;
}

/**
 * Преобразует сумму в рублях в строку прописью (стандарт бухгалтерских актов РФ).
 * Пример: 19600 руб. 00 коп. -> "Девятнадцать тысяч шестьсот рублей 00 копеек"
 */
export function numberToWordsRu(amountRub: number, amountKopecks: number = 0): string {
	const whole = Math.trunc(Math.abs(amountRub));
	const kop = Math.abs(amountKopecks) % 100;

	if (whole === 0) {
		const kopStr = String(kop).padStart(2, "0");
		const kopUnit = pluralizeRu(kop, "копейка", "копейки", "копеек");
		return `Ноль рублей ${kopStr} ${kopUnit}`;
	}

	const units = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const unitsFem = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teens = [
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
	const tens = [
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
	const hundreds = [
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

	function triadToWords(num: number, isFemale = false): string {
		const h = Math.trunc(num / 100);
		const t = Math.trunc((num % 100) / 10);
		const u = num % 10;
		const parts: string[] = [];

		if (h > 0) parts.push(hundreds[h] ?? "");

		if (t === 1) {
			parts.push(teens[u] ?? "");
		} else {
			if (t > 1) parts.push(tens[t] ?? "");
			if (u > 0) {
				parts.push((isFemale ? unitsFem[u] : units[u]) ?? "");
			}
		}

		return parts.filter(Boolean).join(" ");
	}

	const billions = Math.trunc(whole / 1_000_000_000);
	const millions = Math.trunc((whole % 1_000_000_000) / 1_000_000);
	const thousands = Math.trunc((whole % 1_000_000) / 1_000);
	const rest = whole % 1_000;

	const wordParts: string[] = [];

	if (billions > 0) {
		const bStr = triadToWords(billions, false);
		const bUnit = pluralizeRu(billions, "миллиард", "миллиарда", "миллиардов");
		wordParts.push(`${bStr} ${bUnit}`);
	}

	if (millions > 0) {
		const mStr = triadToWords(millions, false);
		const mUnit = pluralizeRu(millions, "миллион", "миллиона", "миллионов");
		wordParts.push(`${mStr} ${mUnit}`);
	}

	if (thousands > 0) {
		const thStr = triadToWords(thousands, true);
		const thUnit = pluralizeRu(thousands, "тысяча", "тысячи", "тысяч");
		wordParts.push(`${thStr} ${thUnit}`);
	}

	if (rest > 0) {
		const rStr = triadToWords(rest, false);
		wordParts.push(rStr);
	}

	const rubUnit = pluralizeRu(whole, "рубль", "рубля", "рублей");
	const rubWords = wordParts.join(" ").trim();
	const capitalized = rubWords.charAt(0).toUpperCase() + rubWords.slice(1);

	const kopStr = String(kop).padStart(2, "0");
	const kopUnit = pluralizeRu(kop, "копейка", "копейки", "копеек");

	return `${capitalized} ${rubUnit} ${kopStr} ${kopUnit}`;
}
