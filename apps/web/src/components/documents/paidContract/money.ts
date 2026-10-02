/**
 * paidContract/money.ts
 *
 * Расчеты сумм, целочисленные копейки и сумма прописью
 * в строгом соответствии с финансовыми стандартами РФ (Мандаты 8b, 8n).
 */

import type { PaidContractServiceItem } from "./types";

export function pluralizeRu(num: number, one: string, two: string, five: string): string {
	const n = Math.abs(num) % 100;
	const n1 = n % 10;
	if (n > 10 && n < 20) return five;
	if (n1 > 1 && n1 < 5) return two;
	if (n1 === 1) return one;
	return five;
}

/**
 * Преобразует числовое значение денег в копейках в русские слова с копейками.
 * Обрабатывает единицы, десятки, сотни, тысячи, миллионы, миллиарды.
 * Соблюдает грамматический род (рубли — мужской, тысячи — женский, копейки — женский).
 */
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

	const onesM = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const onesF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
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

	function tripletToWords(num: number, isFeminine: boolean): string {
		const h = Math.trunc(num / 100);
		const remainder = num % 100;
		const t = Math.trunc(remainder / 10);
		const o = remainder % 10;

		const parts: string[] = [];

		if (h > 0 && h < 10) {
			const hWord = hundreds[h];
			if (hWord) parts.push(hWord);
		}

		if (t === 1) {
			const teenWord = teens[o];
			if (teenWord) parts.push(teenWord);
		} else {
			if (t > 1) {
				const tensWord = tens[t];
				if (tensWord) parts.push(tensWord);
			}
			if (o > 0) {
				const onesArr = isFeminine ? onesF : onesM;
				const onesWord = onesArr[o];
				if (onesWord) parts.push(onesWord);
			}
		}

		return parts.join(" ");
	}

	const billions = Math.trunc(wholeRubles / 1_000_000_000) % 1000;
	const millions = Math.trunc(wholeRubles / 1_000_000) % 1000;
	const thousands = Math.trunc(wholeRubles / 1_000) % 1000;
	const units = wholeRubles % 1000;

	const wordsParts: string[] = [];

	if (billions > 0) {
		const bWords = tripletToWords(billions, false);
		const bSuffix = pluralizeRu(billions, "миллиард", "миллиарда", "миллиардов");
		wordsParts.push(`${bWords} ${bSuffix}`);
	}

	if (millions > 0) {
		const mWords = tripletToWords(millions, false);
		const mSuffix = pluralizeRu(millions, "миллион", "миллиона", "миллионов");
		wordsParts.push(`${mWords} ${mSuffix}`);
	}

	if (thousands > 0) {
		const tWords = tripletToWords(thousands, true);
		const tSuffix = pluralizeRu(thousands, "тысяча", "тысячи", "тысяч");
		wordsParts.push(`${tWords} ${tSuffix}`);
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

export function formatKopecksToRubAndKop(kopecks: number): {
	wholeRub: number;
	kop: number;
	formatted: string;
	formattedWithKopecks: string;
	inWords: string;
} {
	const safeKopecks = Number.isFinite(kopecks) ? Math.round(kopecks) : 0;
	const wholeRub = Math.trunc(Math.abs(safeKopecks) / 100);
	const kop = Math.abs(safeKopecks) % 100;
	const groupedRub = String(wholeRub).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
	const kopPadded = String(kop).padStart(2, "0");

	return {
		wholeRub: safeKopecks < 0 ? -wholeRub : wholeRub,
		kop,
		formatted: `${safeKopecks < 0 ? "-" : ""}${groupedRub},${kopPadded}\u00A0₽`,
		formattedWithKopecks: `${safeKopecks < 0 ? "-" : ""}${groupedRub} руб. ${kopPadded} коп.`,
		inWords: numberToWordsRu(safeKopecks),
	};
}

/**
 * Преобразует строковое или числовое значение рублей в целые копейки (Mandate 8b).
 * Гарантирует отсутствие погрешностей с плавающей запятой, NaN и округления копеек.
 */
export function parseRublesToKopecks(rublesOrText: number | string | null | undefined): number {
	if (rublesOrText === null || rublesOrText === undefined) return 0;
	if (typeof rublesOrText === "number") {
		if (!Number.isFinite(rublesOrText) || rublesOrText < 0) return 0;
		return Math.round(rublesOrText * 100);
	}
	const cleaned = rublesOrText
		.trim()
		.replace(/\s+/g, "")
		.replace(/₽/g, "")
		.replace(/,/g, ".");
	const val = parseFloat(cleaned);
	if (!Number.isFinite(val) || val < 0) return 0;
	return Math.round(val * 100);
}

/**
 * Расчет стоимости позиции услуги в целых копейках: (кол-во × цена) - скидка.
 */
export function calculatePaidContractServiceTotalKopecks(
	quantity: number,
	unitPriceKopecks: number,
	discountKopecks: number = 0,
): number {
	const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
	const unitPrice = Number.isFinite(unitPriceKopecks) && unitPriceKopecks >= 0 ? Math.round(unitPriceKopecks) : 0;
	const discount = Number.isFinite(discountKopecks) && discountKopecks >= 0 ? Math.round(discountKopecks) : 0;
	return Math.max(0, Math.round(qty * unitPrice - discount));
}

/**
 * Итоговая сумма по массиву услуг договора в целых копейках.
 */
export function calculatePaidContractGrandTotalKopecks(
	services: PaidContractServiceItem[] | undefined,
): number {
	if (!services || services.length === 0) return 0;
	return services.reduce((acc, s) => {
		const total = Number.isFinite(s.totalKopecks)
			? Math.round(s.totalKopecks)
			: calculatePaidContractServiceTotalKopecks(s.quantity, s.unitPriceKopecks, s.discountKopecks);
		return acc + total;
	}, 0);
}
