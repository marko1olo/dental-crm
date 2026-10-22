import { formatCurrencyRu, formatKopecksRu, kopecksToRubles, rublesToKopecks } from "@dental/shared";
export { kopecksToRubles, rublesToKopecks };

export function formatRubCurrency(rublesOrKopecks: number, isKopecks = false): string {
	return isKopecks ? formatKopecksRu(Math.round(rublesOrKopecks)) : formatCurrencyRu(rublesOrKopecks);
}

export function formatKopecksToRublesPlain(kopecks: number): string {
	return (Math.round(kopecks) / 100).toFixed(2);
}

export function numberToRussianWordsKopecks(kopecks: number): string {
	const absKopecks = Math.abs(Math.round(kopecks));
	const rubles = Math.floor(absKopecks / 100);
	const kop = absKopecks % 100;

	if (rubles === 0) {
		return `Ноль рублей ${kop.toString().padStart(2, "0")} копеек`;
	}

	const onesMap = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const onesFemMap = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teensMap = [
		"десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
		"пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
	];
	const tensMap = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
	const hundredsMap = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

	function tripletToWords(num: number, isFemale: boolean): string {
		const h = Math.floor(num / 100);
		const t = Math.floor((num % 100) / 10);
		const o = num % 10;
		const parts: string[] = [];
		if (h > 0) parts.push(hundredsMap[h] || "");
		if (t === 1) parts.push(teensMap[o] || "");
		else {
			if (t > 1) parts.push(tensMap[t] || "");
			if (o > 0) parts.push((isFemale ? onesFemMap : onesMap)[o] || "");
		}
		return parts.filter(Boolean).join(" ");
	}

	function pluralize(n: number, forms: [string, string, string]): string {
		const rem100 = n % 100;
		const rem10 = n % 10;
		if (rem100 >= 11 && rem100 <= 19) return forms[2];
		if (rem10 === 1) return forms[0];
		if (rem10 >= 2 && rem10 <= 4) return forms[1];
		return forms[2];
	}

	const billions = Math.floor(rubles / 1_000_000_000);
	const millions = Math.floor((rubles % 1_000_000_000) / 1_000_000);
	const thousands = Math.floor((rubles % 1_000_000) / 1_000);
	const remainder = rubles % 1_000;

	const wordChunks: string[] = [];
	if (billions > 0) {
		wordChunks.push(tripletToWords(billions, false));
		wordChunks.push(pluralize(billions, ["миллиард", "миллиарда", "миллиардов"]));
	}
	if (millions > 0) {
		wordChunks.push(tripletToWords(millions, false));
		wordChunks.push(pluralize(millions, ["миллион", "миллиона", "миллионов"]));
	}
	if (thousands > 0) {
		wordChunks.push(tripletToWords(thousands, true));
		wordChunks.push(pluralize(thousands, ["тысяча", "тысячи", "тысяч"]));
	}
	if (remainder > 0) {
		wordChunks.push(tripletToWords(remainder, false));
	}

	const rubText = pluralize(rubles, ["рубль", "рубля", "рублей"]);
	const kopText = pluralize(kop, ["копейка", "копейки", "копеек"]);
	const combinedWords = wordChunks.filter(Boolean).join(" ");
	const capitalized = combinedWords ? combinedWords.charAt(0).toUpperCase() + combinedWords.slice(1) : "Ноль";

	return `${capitalized} ${rubText} ${kop.toString().padStart(2, "0")} ${kopText}`;
}
