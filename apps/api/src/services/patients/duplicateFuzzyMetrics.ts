/**
 * duplicateFuzzyMetrics.ts — Математика нечеткого сопоставления пациентов,
 * защита от подмены букв (гомоглифы Cyrillic vs Latin), нормализация телефонов и СНИЛС,
 * расстояние Дамерау — Левенштейна и стемминг славянских фамилий.
 *
 * Мандаты: 8b (строго <= 800 строк), 8e (Doctor Autonomy & отсутствие ложных блокировок).
 */

/**
 * Канонизация визуальных латинских гомоглифов в кириллицу (Cyrillic vs Latin spoofing defense).
 * Предотвращает создание дублей с подменой визуально идентичных букв:
 * a->а, b->в, c->с, e->е, h->н, k->к, m->м, o->о, p->р, t->т, x->х, y->у.
 */
export function canonicalizeHomoglyphs(raw: string): string {
	return (raw ?? "").replace(/[a-zA-Z]/g, (char) => {
		switch (char) {
			case "a":
			case "A":
				return "а";
			case "b":
			case "B":
				return "в";
			case "c":
			case "C":
				return "с";
			case "e":
			case "E":
				return "е";
			case "h":
			case "H":
				return "н";
			case "k":
			case "K":
				return "к";
			case "m":
			case "M":
				return "м";
			case "o":
			case "O":
				return "о";
			case "p":
			case "P":
				return "р";
			case "t":
			case "T":
				return "т";
			case "x":
			case "X":
				return "х";
			case "y":
			case "Y":
				return "у";
			default:
				return char;
		}
	});
}

/**
 * Извлекает канонический 10-значный национальный ключ телефона с устойчивостью к:
 * 1. Форматам РФ/Казахстана: +7, 8, без префикса (9161234567), европейский префикс 007.
 * 2. Разделителям: дефисы, скобки, точки, слэши, обычные пробелы, неразрывные пробелы (\u00A0), узкие пробелы (\u2009, \u202F).
 * 3. Добавочным номерам: «доб. 12», «ext 5», «#101» — добавочный отрезается и не искажает хвост номера.
 * 4. Нескольким номерам в одной строке: «8(916)123-45-67, 8(495)999-88-77» — берётся первый номер.
 * 5. Международным кодам (Беларусь +375 / 80).
 */
export function phoneKey(raw: string | null): string | null {
	if (!raw) return null;
	// 1. Отрезаем добавочный номер (доб., добавочный, ext, x, #)
	const text = raw.replace(/(?:доб\.?|добавочный|ext\.?|extension|x|#)\s*\d+.*$/i, "");
	// 2. Если в строке несколько номеров через запятую/точку с запятой/слэш — берем первый
	// Но если всего 10 или 11 цифр, это один номер (например, 123-45/67)
	const totalDigits = text.replace(/\D/g, "");
	let firstSegment = text;
	if (totalDigits.length > 11) {
		firstSegment = text.split(/[,;]|\s\/\s|\sили\s|\sи\s/i)[0] ?? text;
		if (firstSegment.replace(/\D/g, "").length > 11) {
			firstSegment = firstSegment.split("/")[0] ?? firstSegment;
		}
	}
	// 3. Извлекаем только цифры
	let digits = firstSegment.replace(/\D/g, "");
	if (!digits) return null;

	// Европейский выход 007 -> 7
	if (digits.startsWith("007") && digits.length === 13) {
		digits = digits.slice(2);
	}
	// Беларусь +375 -> 9 цифр номера; 80 -> 9 цифр
	if (digits.startsWith("375") && digits.length === 12) {
		return digits.slice(3);
	}
	if (digits.startsWith("80") && digits.length === 11) {
		return digits.slice(2);
	}

	// РФ / Казахстан: 11 цифр, начинающихся с 7 или 8 -> последние 10 цифр
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return digits.slice(-10);
	}
	// Если передано ровно 10 цифр без кода страны
	if (digits.length === 10) {
		return digits;
	}
	// В остальных случаях, если 10+ цифр, берем последние 10 цифр
	return digits.length >= 10 ? digits.slice(-10) : null;
}

/**
 * Извлекает все возможные ключи номеров телефонов из строки (если указано несколько).
 */
export function phoneKeys(raw: string | null): string[] {
	if (!raw) return [];
	const text = raw.replace(/(?:доб\.?|добавочный|ext\.?|extension|x|#)\s*\d+.*$/i, "");
	const totalDigits = text.replace(/\D/g, "");
	let delimiter = /[,;]|\s\/\s|\sили\s|\sи\s/i;
	if (totalDigits.length > 11 && text.includes("/")) {
		delimiter = /[,;/]|\sили\s|\sи\s/i;
	}
	const segments = text.split(delimiter).map((s) => s.trim()).filter(Boolean);
	const keys = new Set<string>();
	for (const seg of segments) {
		const key = phoneKey(seg);
		if (key) keys.add(key);
	}
	return [...keys];
}

/**
 * Нормализация имени: гомоглифы в кириллицу, регистр, «ё», дефис в пробел для составных фамилий,
 * токенизация и сортировка слов (token-sort).
 * Обеспечивает строгую инвариантность к порядку слов и частям двойных фамилий:
 * «Мамин-Сибиряк» === «Мамин Сибиряк» === «Сибиряк-Мамин».
 */
export function nameKey(raw: string): string {
	const canonical = canonicalizeHomoglyphs(raw ?? "");
	return canonical
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/-/g, " ")
		.replace(/[^\p{L}\s]/gu, "")
		.split(/\s+/)
		.filter(Boolean)
		.sort()
		.join(" ");
}

export function surnameOf(fullName: string): string {
	const canonical = canonicalizeHomoglyphs(fullName ?? "");
	const cleaned = canonical
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^\p{L}\s-]/gu, "")
		.trim();
	return cleaned.split(/\s+/)[0] ?? "";
}

/**
 * Сравнение фамилий с распознаванием гендерных славянских окончаний
 * (-ов/-ова, -ев/-ева, -ин/-ина, -ский/-ская, -ый/-ая, -ий/-яя, -ой/-ая).
 * Позволяет корректно идентифицировать супругов и родственников с общим номером телефона
 * как `same_phone_and_surname`, а не `same_phone_only`.
 */
export function areSurnamesMatching(surnameA: string, surnameB: string): boolean {
	const a = surnameOf(surnameA);
	const b = surnameOf(surnameB);
	if (!a || !b) return false;
	if (a === b) return true;

	const stem = (s: string): string => {
		const base = s.replace(/ё/g, "е");
		if (base.endsWith("ова") || base.endsWith("ева")) return base.slice(0, -1);
		if (base.endsWith("ина") || base.endsWith("ына")) return base.slice(0, -1);
		if (
			base.endsWith("ский") ||
			base.endsWith("ская") ||
			base.endsWith("ское") ||
			base.endsWith("ские")
		)
			return base.slice(0, -2);
		if (
			base.endsWith("цкий") ||
			base.endsWith("цкая") ||
			base.endsWith("цкое") ||
			base.endsWith("цкие")
		)
			return base.slice(0, -2);
		if (base.endsWith("ая") || base.endsWith("яя")) return base.slice(0, -2);
		if (base.endsWith("ый") || base.endsWith("ий") || base.endsWith("ой"))
			return base.slice(0, -2);
		return base;
	};

	return stem(a) === stem(b);
}

/**
 * Вычисляет расстояние Дамерау — Левенштейна между двумя строками.
 * Учитывает вставки, удаления, замены и транспозиции двух соседних символов.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
	const aLen = a.length;
	const bLen = b.length;
	if (aLen === 0) return bLen;
	if (bLen === 0) return aLen;
	if (a === b) return 0;

	const maxDist = aLen + bLen;
	const da = new Map<string, number>();
	const d: number[][] = Array.from({ length: aLen + 2 }, () =>
		new Array<number>(bLen + 2).fill(0),
	);

	d[0]![0] = maxDist;
	for (let i = 0; i <= aLen; i += 1) {
		d[i + 1]![0] = maxDist;
		d[i + 1]![1] = i;
	}
	for (let j = 0; j <= bLen; j += 1) {
		d[0]![j + 1] = maxDist;
		d[1]![j + 1] = j;
	}

	for (let i = 1; i <= aLen; i += 1) {
		let dbCol = 0;
		const aChar = a[i - 1]!;
		for (let j = 1; j <= bLen; j += 1) {
			const bChar = b[j - 1]!;
			const k = da.get(bChar) ?? 0;
			const l = dbCol;
			const cost = aChar === bChar ? 0 : 1;
			if (cost === 0) dbCol = j;

			d[i + 1]![j + 1] = Math.min(
				d[i]![j + 1]! + 1, // удаление
				d[i + 1]![j]! + 1, // вставка
				d[i]![j]! + cost, // замена
				d[k]![l]! + (i - k - 1) + 1 + (j - l - 1), // транспозиция
			);
		}
		da.set(aChar, i);
	}

	return d[aLen + 1]![bLen + 1]!;
}

/** Сходство строк по Дамерау — Левенштейну (0..1). */
export function stringLevenshteinSimilarity(a: string, b: string): number {
	if (a === b) return 1.0;
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 1.0;
	const dist = damerauLevenshteinDistance(a, b);
	return Math.max(0, 1 - dist / maxLen);
}

/** Построение набора триграмм с граничными маркерами. */
export function buildTrigrams(str: string): Set<string> {
	const set = new Set<string>();
	const padded = `  ${str}  `;
	for (let i = 0; i < padded.length - 2; i += 1) {
		set.add(padded.slice(i, i + 3));
	}
	return set;
}

/** Коэффициент Сёренсена — Дайса по триграммам (0..1). */
export function trigramSimilarity(a: string, b: string): number {
	if (a === b) return 1.0;
	if (!a || !b) return 0.0;
	const triA = buildTrigrams(a);
	const triB = buildTrigrams(b);
	let intersection = 0;
	for (const tri of triA) {
		if (triB.has(tri)) intersection += 1;
	}
	const total = triA.size + triB.size;
	return total === 0 ? 1.0 : (2 * intersection) / total;
}

/**
 * Нечеткое сходство ФИО с комбинированием Дамерау — Левенштейна,
 * триграмм, перестановки слов (token-sort) и частичного совпадения (отсутствие отчества).
 */
export function nameFuzzySimilarity(rawA: string, rawB: string): number {
	const normA = nameKey(rawA);
	const normB = nameKey(rawB);
	if (!normA || !normB) return 0.0;
	if (normA === normB) return 1.0;

	// 1. Прямое сходство по Левенштейну
	const levSim = stringLevenshteinSimilarity(normA, normB);
	// 2. Сходство по триграммам
	const triSim = trigramSimilarity(normA, normB);

	// 3. Token-sort: сортировка слов (например «Иван Иванович Иванов» == «Иванов Иван Иванович»)
	const tokensA = normA.split(" ").filter(Boolean);
	const tokensB = normB.split(" ").filter(Boolean);
	const sortedA = [...tokensA].sort().join(" ");
	const sortedB = [...tokensB].sort().join(" ");
	const tokenSortSim =
		sortedA === sortedB ? 1.0 : stringLevenshteinSimilarity(sortedA, sortedB);

	// 4. Частичное совпадение слов (например фамилия + имя совпали, а отчество отсутствует)
	let matchedWords = 0;
	for (const wordA of tokensA) {
		if (
			tokensB.some((wordB) => stringLevenshteinSimilarity(wordA, wordB) >= 0.85)
		) {
			matchedWords += 1;
		}
	}
	const minTokens = Math.min(tokensA.length, tokensB.length);
	const tokenCoverage = minTokens > 0 ? matchedWords / minTokens : 0;
	const tokenOverlapSim =
		tokensA.length !== tokensB.length && tokenCoverage === 1.0 ? 0.85 : 0;

	return Math.max(levSim, triSim, tokenSortSim, tokenOverlapSim);
}

/** Нормализация СНИЛС (11 цифр). */
export function snilsKey(raw: string | null | undefined): string | null {
	const digits = (raw ?? "").replace(/\D/g, "");
	return digits.length === 11 ? digits : null;
}

/** Сходство СНИЛС (1.0 при точном совпадении 11 цифр, 0.85 при опечатке в 1 цифру, иначе 0.0). */
export function snilsFuzzySimilarity(
	snilsA: string | null | undefined,
	snilsB: string | null | undefined,
): number | null {
	const a = snilsKey(snilsA);
	const b = snilsKey(snilsB);
	if (!a || !b) return null;
	if (a === b) return 1.0;
	if (damerauLevenshteinDistance(a, b) === 1) return 0.85;
	return 0.0;
}

/** Сходство телефона (1.0 при совпадении канонических ключей, 0.85 при опечатке в 1 цифру). */
export function phoneFuzzySimilarity(
	phoneA: string | null | undefined,
	phoneB: string | null | undefined,
): number | null {
	const keysA = phoneKeys(phoneA ?? null);
	const keysB = phoneKeys(phoneB ?? null);
	if (keysA.length === 0 || keysB.length === 0) return null;

	// Проверяем точное пересечение среди любых указанных номеров
	for (const a of keysA) {
		for (const b of keysB) {
			if (a === b) return 1.0;
		}
	}

	// Проверяем Левенштейн для опечатки в 1 цифру между первыми номерами
	const primaryA = keysA[0]!;
	const primaryB = keysB[0]!;
	if (damerauLevenshteinDistance(primaryA, primaryB) === 1) return 0.85;

	return 0.0;
}

/** Сходство даты рождения. */
export function birthDateFuzzySimilarity(
	dobA: string | null | undefined,
	dobB: string | null | undefined,
): number | null {
	const a = (dobA ?? "").trim();
	const b = (dobB ?? "").trim();
	if (!a || !b) return null;
	if (a === b) return 1.0;
	// День и месяц перепутаны (YYYY-MM-DD vs YYYY-DD-MM)
	const matchA = a.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	const matchB = b.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (matchA && matchB) {
		if (
			matchA[1] === matchB[1] &&
			matchA[2] === matchB[3] &&
			matchA[3] === matchB[2]
		) {
			return 0.85;
		}
	}
	if (damerauLevenshteinDistance(a, b) === 1) return 0.8;
	return 0.0;
}

/** Пара идентификаторов в устойчивом порядке — чтобы не считать дважды. */
export function pairKey(left: string, right: string): string {
	return left < right ? `${left}|${right}` : `${right}|${left}`;
}
