/**
 * @file translitUtils.ts
 * @description Transliteration and string canonicalization utilities adhering to GOST 7.79-2000 / BSI / ICAO
 * for matching Latin DICOM exports (Planmeca, Sirona, Vatech, KaVo) with Cyrillic clinic database entries.
 */

const RU_TO_EN_MAP: Record<string, string> = {
	а: "a",
	б: "b",
	в: "v",
	г: "g",
	д: "d",
	е: "e",
	ё: "yo",
	ж: "zh",
	з: "z",
	и: "i",
	й: "y",
	к: "k",
	л: "l",
	м: "m",
	н: "n",
	о: "o",
	п: "p",
	р: "r",
	с: "s",
	т: "t",
	у: "u",
	ф: "f",
	х: "kh",
	ц: "ts",
	ч: "ch",
	ш: "sh",
	щ: "shch",
	ъ: "",
	ы: "y",
	ь: "",
	э: "e",
	ю: "yu",
	я: "ya",
};

const EN_MULTI_TO_RU: Array<[RegExp, string]> = [
	[/shch/gi, "щ"],
	[/sch/gi, "щ"],
	[/shh/gi, "щ"],
	[/yo/gi, "ё"],
	[/jo/gi, "ё"],
	[/zh/gi, "ж"],
	[/kh/gi, "х"],
	[/ts/gi, "ц"],
	[/tz/gi, "ц"],
	[/tc/gi, "ц"],
	[/ch/gi, "ч"],
	[/tch/gi, "ч"],
	[/sh/gi, "ш"],
	[/yu/gi, "ю"],
	[/iu/gi, "ю"],
	[/ju/gi, "ю"],
	[/ya/gi, "я"],
	[/ia/gi, "я"],
	[/ja/gi, "я"],
	[/ye/gi, "е"],
	[/je/gi, "е"],
	[/ks/gi, "кс"],
	[/iy\b/gi, "ий"],
	[/ij\b/gi, "ий"],
	[/yy\b/gi, "ый"],
	[/y\b/gi, "ий"],
];

const EN_SINGLE_TO_RU: Record<string, string> = {
	a: "а",
	b: "б",
	v: "в",
	w: "в",
	g: "г",
	d: "д",
	e: "е",
	z: "з",
	i: "и",
	j: "й",
	k: "к",
	l: "л",
	m: "м",
	n: "н",
	o: "о",
	p: "п",
	r: "р",
	s: "с",
	t: "т",
	u: "у",
	f: "ф",
	h: "х",
	c: "к",
	x: "кс",
	y: "и",
};

/**
 * Каноническая фонетическая нормализация латиницы для устранения вариаций транслита (ГОСТ 7.79 / ISO 9 / ICAO)
 */
export function canonicalizeTranslit(word: string): string {
	let s = word.toLowerCase().trim();
	s = s.replace(/shch|sch|shh/g, "shch");
	s = s.replace(/kh/g, "h");
	s = s.replace(/ts|tz|tc/g, "c");
	s = s.replace(/ch|tch/g, "ch");
	s = s.replace(/ya|ia|ja/g, "ya");
	s = s.replace(/yu|iu|ju/g, "yu");
	s = s.replace(/ye|je/g, "e");
	s = s.replace(/yo|jo/g, "yo");
	s = s.replace(/w/g, "v");
	s = s.replace(/ph/g, "f");
	s = s.replace(/x/g, "ks");
	s = s.replace(/y|j/g, "i");
	// Схлопываем сдвоенные согласные (ff -> f, ll -> l, mm -> m, nn -> n, ss -> s)
	s = s.replace(/([a-z])\1+/g, "$1");
	return s;
}

/**
 * Транслитерация русского текста в латиницу (ГОСТ 7.79 / ICAO)
 */
export function transliterateRuToEn(input: string): string {
	let result = "";
	const lower = input.toLowerCase();
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i]!;
		result += RU_TO_EN_MAP[char] !== undefined ? RU_TO_EN_MAP[char] : char;
	}
	return result;
}

/**
 * Транслитерация латиницы в кириллицу
 */
export function transliterateEnToRu(input: string): string {
	let lower = input.toLowerCase();
	for (const [regex, replacement] of EN_MULTI_TO_RU) {
		lower = lower.replace(regex, replacement);
	}
	let result = "";
	for (let i = 0; i < lower.length; i++) {
		const char = lower[i]!;
		result +=
			EN_SINGLE_TO_RU[char] !== undefined ? EN_SINGLE_TO_RU[char] : char;
	}
	return result;
}

/**
 * Очистка и нормализация имени из DICOM тега (0010,0010) PatientName
 * Поддерживает нормализацию разделителей DICOM (^, ,, /, \, _, ;, |) и точек в инициалах
 */
export function cleanDicomName(raw: string | null | undefined): string {
	if (!raw || typeof raw !== "string") return "";

	let name = raw
		.replace(/\0+$/u, "")
		.replace(/[\^,/\_\\;|]+/g, " ")
		.replace(/\./g, " ")
		.replace(/\s+/g, " ")
		.trim();

	// Удаляем префиксы званий/обращений (MR, MRS, MS, DR, DOCTOR, ПАЦИЕНТ, ПАЦИЕНТКА, РЕБЕНОК)
	name = name.replace(/^(mr|mrs|ms|dr|doctor|пациент|пациентка|ребенок)\b\.?\s+/iu, "");

	// Удаляем постфиксы исследований в скобках, например "(CT)", "(3D)", "[OPG]"
	name = name.replace(/[\(\[][^()\[\]]*[\)\]]/g, " ");

	// Очищаем от спецсимволов, оставляя только буквы, дефисы и пробелы
	name = name.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s-]/g, " ");
	return name.replace(/\s+/g, " ").trim();
}

/**
 * Токенизация полного имени (разделение на отдельные слова и инициалы)
 */
export function tokenizeName(name: string): string[] {
	return cleanDicomName(name)
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t.length > 0);
}
