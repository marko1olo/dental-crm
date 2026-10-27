/**
 * numberToWordsRu.ts — Russian grammatical number-to-words currency converter.
 * Mandate 8b: <= 120 lines. Zero external dependencies.
 */
import { rubToKopecks } from "@dental/shared";

function declensionRu(count: number, forms: [string, string, string]): string {
	const n = Math.abs(count) % 100;
	const n1 = n % 10;
	if (n > 10 && n < 20) return forms[2];
	if (n1 > 1 && n1 < 5) return forms[1];
	if (n1 === 1) return forms[0];
	return forms[2];
}

const onesMasculine = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const onesFeminine = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const teens = [
	"десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
	"пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
];
const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

function triadToWords(n: number, isFeminine: boolean): string {
	const h = Math.floor(n / 100);
	const t = Math.floor((n % 100) / 10);
	const u = n % 10;
	const parts: string[] = [];

	if (h > 0) parts.push(hundreds[h]!);
	if (t === 1) {
		parts.push(teens[u]!);
	} else {
		if (t > 1) parts.push(tens[t]!);
		if (u > 0) parts.push(isFeminine ? onesFeminine[u]! : onesMasculine[u]!);
	}
	return parts.join(" ");
}

export function convertRubToWordsRu(amountRub: number): string {
	const kopecksTotal = Math.max(0, rubToKopecks(amountRub));
	const rubles = Math.floor(kopecksTotal / 100);
	const kopecks = kopecksTotal % 100;

	if (rubles === 0) {
		const kopStr = `${String(kopecks).padStart(2, "0")} ${declensionRu(kopecks, ["копейка", "копейки", "копеек"])}`;
		return `Ноль рублей ${kopStr}`;
	}

	const billions = Math.floor(rubles / 1_000_000_000) % 1000;
	const millions = Math.floor(rubles / 1_000_000) % 1000;
	const thousands = Math.floor(rubles / 1000) % 1000;
	const units = rubles % 1000;
	const wordsParts: string[] = [];

	if (billions > 0) {
		wordsParts.push(triadToWords(billions, false));
		wordsParts.push(declensionRu(billions, ["миллиард", "миллиарда", "миллиардов"]));
	}
	if (millions > 0) {
		wordsParts.push(triadToWords(millions, false));
		wordsParts.push(declensionRu(millions, ["миллион", "миллиона", "миллионов"]));
	}
	if (thousands > 0) {
		wordsParts.push(triadToWords(thousands, true));
		wordsParts.push(declensionRu(thousands, ["тысяча", "тысячи", "тысяч"]));
	}
	if (units > 0 || wordsParts.length === 0) {
		wordsParts.push(triadToWords(units, false));
	}

	wordsParts.push(declensionRu(rubles, ["рубль", "рубля", "рублей"]));
	const kopecksStr = `${String(kopecks).padStart(2, "0")} ${declensionRu(kopecks, ["копейка", "копейки", "копеек"])}`;
	const result = `${wordsParts.filter(Boolean).join(" ").trim()} ${kopecksStr}`;
	return result.charAt(0).toUpperCase() + result.slice(1);
}
