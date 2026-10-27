const LATIN_TO_CYRILLIC_MULTI: readonly [string, string][] = [
	["shch", "щ"], ["sh", "ш"], ["ch", "ч"], ["zh", "ж"],
	["ts", "ц"], ["tc", "ц"], ["kh", "х"], ["yu", "ю"],
	["ju", "ю"], ["ya", "я"], ["ja", "я"], ["yo", "ё"],
	["jo", "ё"], ["oy", "ой"], ["ay", "ай"], ["ey", "ей"],
	["uy", "уй"], ["iy", "ий"], ["yy", "ый"],
];

const LATIN_TO_CYRILLIC_SINGLE: Record<string, string> = {
	a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "й",
	k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "к", r: "р", s: "с", t: "т",
	u: "у", v: "в", w: "в", x: "кс", y: "ы", z: "з",
};

export function transliterateLatinToCyrillic(text: string): string {
	if (!text) return "";
	let lower = text.toLowerCase();
	for (const [latin, cyr] of LATIN_TO_CYRILLIC_MULTI) {
		lower = lower.replaceAll(latin, cyr);
	}
	let result = "";
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i];
		result += (char && LATIN_TO_CYRILLIC_SINGLE[char]) ? LATIN_TO_CYRILLIC_SINGLE[char] : char;
	}
	return result;
}

const QWERTY_TO_JCUKEN: Record<string, string> = {
	q: "й", w: "ц", e: "у", r: "к", t: "е", y: "н", u: "г", i: "ш", o: "щ", p: "з",
	"[": "х", "]": "ъ", a: "ф", s: "ы", d: "в", f: "а", g: "п", h: "р", j: "о",
	k: "л", l: "д", ";": "ж", "'": "э", z: "я", x: "ч", c: "с", v: "м", b: "и",
	n: "т", m: "ь", ",": "б", ".": "ю",
};

export function convertKeyboardMistype(text: string): string {
	if (!text) return "";
	const lower = text.toLowerCase();
	let result = "";
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i];
		result += (char && QWERTY_TO_JCUKEN[char]) ? QWERTY_TO_JCUKEN[char] : char;
	}
	return result;
}

export function normalizeCyrillicText(value: string | null | undefined): string {
	return (value ?? "")
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е")
		.replace(/[^a-zа-я0-9\s]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}
