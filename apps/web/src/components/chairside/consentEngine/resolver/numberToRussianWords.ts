/**
 * apps/web/src/components/chairside/consentEngine/resolver/numberToRussianWords.ts
 *
 * Изолированная утилита перевода целочисленных денежных сумм (в копейках)
 * в официальную сумму прописью на русском языке по стандартам финансовой и юридической отчетности РФ.
 * Пример: 1250050 -> "Двенадцать тысяч пятьсот рублей 50 копеек"
 */

/**
 * Преобразование целого числа в русские слова (1..999) с учетом рода
 */
function convertThreeDigitsToRussianWords(n: number, isFemale = false): string {
	if (n === 0) return "ноль";

	const unitsMale = [
		"", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
		"десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать",
		"шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
	];

	const unitsFemale = [
		"", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
		"десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать",
		"шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
	];

	const tens = [
		"", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто",
	];

	const hundreds = [
		"", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот",
	];

	const units = isFemale ? unitsFemale : unitsMale;
	const parts: string[] = [];

	let rem = n;
	if (rem >= 100) {
		const h = Math.floor(rem / 100);
		parts.push(hundreds[h] || "");
		rem %= 100;
	}

	if (rem >= 20) {
		const t = Math.floor(rem / 10);
		parts.push(tens[t] || "");
		rem %= 10;
		if (rem > 0) {
			parts.push(units[rem] || "");
		}
	} else if (rem > 0) {
		parts.push(units[rem] || "");
	}

	return parts.filter(Boolean).join(" ");
}

/**
 * Склонение русских существительных по числу (1, 2-4, 5-0)
 */
export function declineRussianWord(count: number, one: string, twoFour: string, fiveMore: string): string {
	const n = Math.abs(Math.floor(count));
	const mod10 = n % 10;
	const mod100 = n % 100;

	if (mod100 >= 11 && mod100 <= 19) {
		return fiveMore;
	}
	if (mod10 === 1) {
		return one;
	}
	if (mod10 >= 2 && mod10 <= 4) {
		return twoFour;
	}
	return fiveMore;
}

interface NumberGroup {
	readonly val: number;
	readonly one: string;
	readonly twoFour: string;
	readonly fiveMore: string;
	readonly isFemale: boolean;
}

/**
 * Преобразование суммы в целочисленных копейках в сумму прописью
 * Формат: "Двенадцать тысяч пятьсот рублей 50 копеек"
 */
export function kopecksToRussianWords(kopecks: number): string {
	const totalKop = Math.max(0, Math.round(kopecks || 0));
	const rubles = Math.floor(totalKop / 100);
	const remainderKop = totalKop % 100;

	if (rubles === 0) {
		const kopWord = declineRussianWord(remainderKop, "копейка", "копейки", "копеек");
		return "Ноль рублей " + String(remainderKop).padStart(2, "0") + " " + kopWord;
	}

	const groups: NumberGroup[] = [];
	let rem = rubles;

	const billions = Math.floor(rem / 1_000_000_000);
	if (billions > 0) {
		groups.push({ val: billions, one: "миллиард", twoFour: "миллиарда", fiveMore: "миллиардов", isFemale: false });
		rem %= 1_000_000_000;
	}

	const millions = Math.floor(rem / 1_000_000);
	if (millions > 0) {
		groups.push({ val: millions, one: "миллион", twoFour: "миллиона", fiveMore: "миллионов", isFemale: false });
		rem %= 1_000_000;
	}

	const thousands = Math.floor(rem / 1_000);
	if (thousands > 0) {
		groups.push({ val: thousands, one: "тысяча", twoFour: "тысячи", fiveMore: "тысяч", isFemale: true });
		rem %= 1_000;
	}

	if (rem > 0 || groups.length === 0) {
		groups.push({ val: rem, one: "рубль", twoFour: "рубля", fiveMore: "рублей", isFemale: false });
	} else {
		groups.push({ val: 0, one: "рубль", twoFour: "рубля", fiveMore: "рублей", isFemale: false });
	}

	const wordsParts: string[] = [];
	for (const g of groups) {
		if (g.val > 0) {
			const w = convertThreeDigitsToRussianWords(g.val, g.isFemale);
			const dec = declineRussianWord(g.val, g.one, g.twoFour, g.fiveMore);
			wordsParts.push(w + " " + dec);
		} else if (g.val === 0 && g.one === "рубль") {
			const lastRubWord = declineRussianWord(rubles, "рубль", "рубля", "рублей");
			wordsParts.push(lastRubWord);
		}
	}

	const rubText = wordsParts.join(" ").trim();
	const capitalized = rubText.charAt(0).toUpperCase() + rubText.slice(1);
	const kopWord = declineRussianWord(remainderKop, "копейка", "копейки", "копеек");

	return capitalized + " " + String(remainderKop).padStart(2, "0") + " " + kopWord;
}
