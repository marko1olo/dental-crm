import { repairMojibakeText } from "../text/repairMojibake.js";

/**
 * Определение кодировки исходного файла.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ
 * decodeText в ingestion/documentExtractor.ts читает BOM для UTF-16 и UTF-8, а
 * всё остальное отдаёт декодеру UTF-8. Для российских выгрузок это гарантия
 * порчи: экспорт из 1С, DBF-таблицы стоматологических систем и «сохранить как
 * CSV» из русского Excel дают windows-1251 или cp866 без единого признака в
 * файле. UTF-8-декодер превращает такой текст в вопросительные ромбы, после
 * чего ФИО пациента восстановить нечем — байты уже заменены на U+FFFD.
 *
 * Восстановить кодировку ПОСЛЕ ошибочного декодирования невозможно: замена на
 * U+FFFD необратима. Поэтому решение принимается на байтах, до декодирования.
 */

/** Кодировки, среди которых выбираем. Порядок важен только для равных оценок. */
const CANDIDATE_ENCODINGS = [
	"utf-8",
	"windows-1251",
	"ibm866",
	"koi8-r",
	"iso-8859-5",
	"windows-1252",
] as const;

export type DetectedEncoding =
	| (typeof CANDIDATE_ENCODINGS)[number]
	| "utf-16le"
	| "utf-16be";

export interface EncodingDetection {
	encoding: DetectedEncoding;
	/** 0..1. Ниже 0.5 означает «прочитали как смогли», и это повод предупредить оператора. */
	confidence: number;
	/** Кодировка была объявлена явно (BOM), а не угадана. */
	explicit: boolean;
	/** Замечания на русском для отчёта оператору. */
	warnings: string[];
}

export interface DecodedSource extends EncodingDetection {
	text: string;
	/** Сколько символов заменилось на U+FFFD — прямая мера потери. */
	replacementCharCount: number;
}

/**
 * Частотность букв русского языка (доля от всех букв). Источник — стандартные
 * частотные таблицы; точность до сотых здесь избыточна, важен порядок величин.
 */
const RU_LETTER_FREQUENCY: Record<string, number> = {
	о: 0.1097,
	е: 0.0845,
	а: 0.0801,
	и: 0.0735,
	н: 0.067,
	т: 0.0626,
	с: 0.0547,
	р: 0.0473,
	в: 0.0454,
	л: 0.044,
	к: 0.0349,
	м: 0.0321,
	д: 0.0298,
	п: 0.0281,
	у: 0.0262,
	я: 0.0201,
	ы: 0.019,
	ь: 0.0174,
	г: 0.017,
	з: 0.0165,
	б: 0.0159,
	ч: 0.0144,
	й: 0.0121,
	х: 0.0097,
	ж: 0.0094,
	ш: 0.0073,
	ю: 0.0064,
	ц: 0.0048,
	щ: 0.0036,
	э: 0.0032,
	ф: 0.0026,
	ъ: 0.0004,
	ё: 0.0004,
};

/**
 * Пары букв, которых в русском языке практически не бывает. Их присутствие —
 * надёжный признак того, что кодировка выбрана неверно: cp866, прочитанная как
 * windows-1251, даёт именно такие сочетания («╚тртэ»).
 */
const IMPLAUSIBLE_RU_BIGRAMS =
	/[бвгджзйклмнпрстфхцчшщ]{5,}|[аеёиоуыэюя]{4,}|[ъь][ъь]/;

function hasUtf8Bom(buffer: Buffer): boolean {
	return (
		buffer.length >= 3 &&
		buffer[0] === 0xef &&
		buffer[1] === 0xbb &&
		buffer[2] === 0xbf
	);
}

function hasUtf16LeBom(buffer: Buffer): boolean {
	return buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe;
}

function hasUtf16BeBom(buffer: Buffer): boolean {
	return buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff;
}

/**
 * Строгая проверка на корректный UTF-8 по правилам RFC 3629, включая запрет
 * избыточных форм и суррогатов. Node декодирует некорректный UTF-8 молча,
 * подставляя U+FFFD, поэтому проверять надо самим и до декодирования.
 */
function isValidUtf8(buffer: Buffer): boolean {
	let index = 0;
	while (index < buffer.length) {
		const byte = buffer[index]!;
		if (byte <= 0x7f) {
			index += 1;
			continue;
		}

		let extraBytes: number;
		let codePoint: number;
		if (byte >= 0xc2 && byte <= 0xdf) {
			extraBytes = 1;
			codePoint = byte & 0x1f;
		} else if (byte >= 0xe0 && byte <= 0xef) {
			extraBytes = 2;
			codePoint = byte & 0x0f;
		} else if (byte >= 0xf0 && byte <= 0xf4) {
			extraBytes = 3;
			codePoint = byte & 0x07;
		} else {
			// 0x80..0xc1 и 0xf5..0xff не бывают ведущими байтами.
			return false;
		}

		if (index + extraBytes >= buffer.length) return false;
		for (let offset = 1; offset <= extraBytes; offset += 1) {
			const continuation = buffer[index + offset]!;
			if ((continuation & 0xc0) !== 0x80) return false;
			codePoint = (codePoint << 6) | (continuation & 0x3f);
		}

		// Избыточная форма, суррогат или выход за границу Unicode.
		if (extraBytes === 2 && codePoint < 0x800) return false;
		if (extraBytes === 3 && codePoint < 0x10000) return false;
		if (codePoint >= 0xd800 && codePoint <= 0xdfff) return false;
		if (codePoint > 0x10ffff) return false;

		index += extraBytes + 1;
	}
	return true;
}

/** Доля байт вне ASCII. Чисто ASCII-файл декодируется одинаково любой из кодировок. */
function highByteRatio(buffer: Buffer): number {
	if (buffer.length === 0) return 0;
	let high = 0;
	for (const byte of buffer) {
		if (byte > 0x7f) high += 1;
	}
	return high / buffer.length;
}

/**
 * Оценка правдоподобности декодированного текста как русского.
 *
 * Считается не «сколько кириллицы», а насколько распределение букв похоже на
 * русское. Разница существенна: cp866, прочитанная как iso-8859-5, тоже даёт
 * сплошную кириллицу — но бессмысленную, с частотностью, не имеющей ничего
 * общего с языком.
 */
function scoreRussianPlausibility(text: string): number {
	const sample = text.length > 40_000 ? text.slice(0, 40_000) : text;
	if (!sample) return 0;

	let cyrillic = 0;
	let latin = 0;
	let digits = 0;
	let punctuation = 0;
	let control = 0;
	let pseudographics = 0;
	let replacement = 0;
	const letterCounts = new Map<string, number>();

	for (const char of sample) {
		const code = char.codePointAt(0)!;
		if (code === 0xfffd) {
			replacement += 1;
			continue;
		}
		// Псевдографика DOS (│┤╡╢╖) — верный признак cp866, прочитанной как 1251.
		if (code >= 0x2500 && code <= 0x257f) {
			pseudographics += 1;
			continue;
		}
		if (code < 0x20 && char !== "\n" && char !== "\r" && char !== "\t") {
			control += 1;
			continue;
		}
		if (/[А-Яа-яЁё]/.test(char)) {
			cyrillic += 1;
			const lower = char.toLowerCase();
			letterCounts.set(lower, (letterCounts.get(lower) ?? 0) + 1);
			continue;
		}
		if (/[A-Za-z]/.test(char)) {
			latin += 1;
			continue;
		}
		if (/[0-9]/.test(char)) {
			digits += 1;
			continue;
		}
		if (/[\s.,;:!?()[\]{}'"«»\-+/\\@#№%*=_|]/.test(char)) {
			punctuation += 1;
		}
	}

	const total = sample.length;
	const knownGood = cyrillic + latin + digits + punctuation;
	// Базовая оценка: доля символов, которые вообще могут стоять в данных клиники.
	let score = knownGood / total;

	// Штрафы за прямые признаки неверной кодировки.
	score -= (replacement / total) * 3;
	score -= (control / total) * 3;
	score -= (pseudographics / total) * 2;

	// Совпадение частотности с русским языком. Работает только на достаточном
	// объёме кириллицы: на десяти буквах статистика не значит ничего.
	if (cyrillic >= 40) {
		let divergence = 0;
		for (const [letter, expected] of Object.entries(RU_LETTER_FREQUENCY)) {
			const actual = (letterCounts.get(letter) ?? 0) / cyrillic;
			divergence += Math.abs(actual - expected);
		}
		// divergence ~0.3 для настоящего русского текста, ~1.4 для мусора.
		const frequencyFit = Math.max(0, 1 - divergence / 1.2);
		score = score * 0.55 + frequencyFit * 0.45;

		if (IMPLAUSIBLE_RU_BIGRAMS.test(sample.toLowerCase())) {
			score -= 0.25;
		}
	}

	return Math.max(0, Math.min(1, score));
}

function decodeWith(buffer: Buffer, encoding: string): string | null {
	try {
		return new TextDecoder(encoding, { fatal: false }).decode(buffer);
	} catch {
		// Сборка Node без нужной таблицы ICU. Кандидат просто выбывает.
		return null;
	}
}

/**
 * Определяет кодировку по байтам.
 *
 * Порядок решения:
 *   1. BOM — единственный явный признак, доверяем безоговорочно.
 *   2. Чистый ASCII — кодировка не важна, читаем как UTF-8.
 *   3. Корректный UTF-8 по строгой проверке — почти наверняка UTF-8: случайный
 *      однобайтовый текст проходит эту проверку исчезающе редко.
 *   4. Иначе перебираем восьмибитные кандидаты и берём наиболее правдоподобный.
 */
export function detectEncoding(buffer: Buffer): EncodingDetection {
	const warnings: string[] = [];

	if (hasUtf16LeBom(buffer)) {
		return { encoding: "utf-16le", confidence: 1, explicit: true, warnings };
	}
	if (hasUtf16BeBom(buffer)) {
		return { encoding: "utf-16be", confidence: 1, explicit: true, warnings };
	}
	if (hasUtf8Bom(buffer)) {
		return { encoding: "utf-8", confidence: 1, explicit: true, warnings };
	}

	if (buffer.length === 0) {
		return {
			encoding: "utf-8",
			confidence: 1,
			explicit: false,
			warnings: ["Источник пуст."],
		};
	}

	/**
	 * UTF-16 без BOM встречается в выгрузках через Windows-скрипты. Признак —
	 * каждый второй байт нулевой. Проверяем до всего остального, потому что для
	 * восьмибитных декодеров такой файл выглядит как текст с дырами.
	 */
	const utf16Probe = Math.min(buffer.length - (buffer.length % 2), 2048);
	if (utf16Probe >= 32) {
		let evenZero = 0;
		let oddZero = 0;
		for (let index = 0; index < utf16Probe; index += 2) {
			if (buffer[index] === 0) evenZero += 1;
			if (buffer[index + 1] === 0) oddZero += 1;
		}
		const pairs = utf16Probe / 2;
		if (oddZero / pairs > 0.6 && evenZero / pairs < 0.1) {
			warnings.push("UTF-16LE без BOM определён по расположению нулевых байт.");
			return {
				encoding: "utf-16le",
				confidence: 0.85,
				explicit: false,
				warnings,
			};
		}
		if (evenZero / pairs > 0.6 && oddZero / pairs < 0.1) {
			warnings.push("UTF-16BE без BOM определён по расположению нулевых байт.");
			return {
				encoding: "utf-16be",
				confidence: 0.85,
				explicit: false,
				warnings,
			};
		}
	}

	const highRatio = highByteRatio(buffer);
	if (highRatio === 0) {
		// Ни одного байта выше 0x7F: все кандидаты дадут идентичный результат.
		return { encoding: "utf-8", confidence: 1, explicit: false, warnings };
	}

	if (isValidUtf8(buffer)) {
		/**
		 * Строгая проверка пройдена. Остаётся редкий, но реальный случай: текст
		 * UTF-8, который однажды уже прочитали как cp1251 и сохранили обратно в
		 * UTF-8 («РИРІР°РЅРѕРІ»). Байты корректны, а содержимое испорчено. Ловим
		 * это на уровне текста, а не байт.
		 */
		const decoded = decodeWith(buffer, "utf-8") ?? "";
		if (looksDoubleEncoded(decoded)) {
			warnings.push(
				"Текст похож на UTF-8, ранее прочитанный как windows-1251; выполнено восстановление.",
			);
			return { encoding: "utf-8", confidence: 0.75, explicit: false, warnings };
		}
		return { encoding: "utf-8", confidence: 0.97, explicit: false, warnings };
	}

	let best: { encoding: DetectedEncoding; score: number } | null = null;
	let runnerUp = 0;
	for (const candidate of CANDIDATE_ENCODINGS) {
		if (candidate === "utf-8") continue;
		const decoded = decodeWith(buffer, candidate);
		if (decoded === null) continue;
		const score = scoreRussianPlausibility(decoded);
		if (!best || score > best.score) {
			if (best) runnerUp = best.score;
			best = { encoding: candidate, score };
		} else if (score > runnerUp) {
			runnerUp = score;
		}
	}

	if (!best) {
		warnings.push(
			"Ни одна кодировка не распозналась; текст прочитан как UTF-8 с потерями.",
		);
		return { encoding: "utf-8", confidence: 0.1, explicit: false, warnings };
	}

	/**
	 * Уверенность — это не оценка победителя, а отрыв от второго места. Если два
	 * кандидата дают одинаково правдоподобный текст, выбор между ними случаен, и
	 * оператор обязан это увидеть.
	 */
	const margin = best.score - runnerUp;
	const confidence = Math.max(
		0,
		Math.min(1, best.score * 0.6 + Math.min(margin * 4, 1) * 0.4),
	);

	if (confidence < 0.6) {
		warnings.push(
			`Кодировка определена неуверенно (${best.encoding}). Проверьте, как выглядят ФИО в предпросмотре, до запуска переноса.`,
		);
	}

	return { encoding: best.encoding, confidence, explicit: false, warnings };
}

/**
 * Признак двойного кодирования UTF-8 → windows-1251 → UTF-8.
 *
 * repairMojibakeText в text/repairMojibake.ts ловит вариант через cp1252
 * («Ð˜Ð²Ð°Ð½»), потому что документы приходят из западных систем. Российская
 * выгрузка портится иначе — через cp1251, и даёт узнаваемое «Р»-облако:
 * кириллическая «Р» (U+0420) плюс второй символ. Признак специфичный: в
 * настоящем русском тексте «Р» перед строчной латиницей или знаком не стоит.
 */
function looksDoubleEncoded(text: string): boolean {
	const sample = text.length > 8000 ? text.slice(0, 8000) : text;
	const suspicious = sample.match(/[РС][-ӿ]/g)?.length ?? 0;
	const cyrillic = sample.match(/[А-Яа-яЁё]/g)?.length ?? 0;
	if (cyrillic < 20) return false;
	return suspicious / cyrillic > 0.35;
}

/** Обратное преобразование двойного кодирования через windows-1251. */
function repairCp1251DoubleEncoding(text: string): string {
	try {
		const bytes: number[] = [];
		const encoder = cp1251EncodeMap();
		for (const char of text) {
			const code = char.codePointAt(0)!;
			if (code <= 0x7f) {
				bytes.push(code);
				continue;
			}
			const byte = encoder.get(code);
			// Символ, которого нет в cp1251 — значит гипотеза неверна, откатываемся.
			if (byte === undefined) return text;
			bytes.push(byte);
		}
		const repaired = Buffer.from(bytes).toString("utf8");
		if (repaired.includes("�")) return text;
		// Принимаем только если стало правдоподобнее.
		return scoreRussianPlausibility(repaired) > scoreRussianPlausibility(text)
			? repaired
			: text;
	} catch {
		return text;
	}
}

let cp1251EncodeMapCache: Map<number, number> | null = null;

/**
 * Таблица «код символа → байт cp1251». Строится один раз через декодер: так
 * она гарантированно совпадает с тем, чем декодировали, и не содержит опечаток
 * ручного списка из 128 строк.
 */
function cp1251EncodeMap(): Map<number, number> {
	if (cp1251EncodeMapCache) return cp1251EncodeMapCache;
	const map = new Map<number, number>();
	const decoder = new TextDecoder("windows-1251");
	for (let byte = 0x80; byte <= 0xff; byte += 1) {
		const char = decoder.decode(Uint8Array.of(byte));
		const code = char.codePointAt(0);
		if (code !== undefined && !map.has(code)) map.set(code, byte);
	}
	cp1251EncodeMapCache = map;
	return map;
}

/**
 * Нормализация текста после декодирования: переводы строк к \n, удаление
 * нулевых байт и невидимых управляющих символов, которые ломают разбор CSV.
 *
 * BOM удаляется отдельно: TextDecoder для utf-8 оставляет U+FEFF первым
 * символом, и он приклеивается к имени первой колонки — классическая причина
 * того, что «первый столбец не сопоставился».
 */
export function normalizeDecodedText(value: string): string {
	return (
		value
			.replace(/^\uFEFF/, "")
			.replace(/\u0000/g, "")
			// Мягкий перенос и неразрывный пробел нулевой ширины из копипаста Word.
			.replace(/\u00AD|\u200B|\u200C|\u200D|\u2060/g, "")
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n")
	);
}

/**
 * Читает буфер как текст с определением кодировки и восстановлением искажений.
 *
 * Возвращает и текст, и всё, что известно о том, как он получен: оператору
 * нужно видеть, что файл прочитан как cp866 с уверенностью 0.62, а не только
 * итоговые строки.
 */
export function decodeSourceBuffer(buffer: Buffer): DecodedSource {
	const detection = detectEncoding(buffer);

	let body = buffer;
	if (detection.explicit) {
		if (detection.encoding === "utf-8") body = buffer.subarray(3);
		else if (
			detection.encoding === "utf-16le" ||
			detection.encoding === "utf-16be"
		)
			body = buffer.subarray(2);
	}

	let text = decodeWith(body, detection.encoding) ?? body.toString("utf8");
	text = normalizeDecodedText(text);

	// Двойное кодирование: сначала российский вариант через cp1251, затем
	// западный через cp1252 существующим общим восстановлением.
	if (looksDoubleEncoded(text)) {
		text = repairCp1251DoubleEncoding(text);
	}
	text = repairMojibakeText(text);

	const replacementCharCount = (text.match(/�/g) ?? []).length;
	const warnings = [...detection.warnings];
	if (replacementCharCount > 0) {
		warnings.push(
			`Не удалось прочитать ${replacementCharCount} символ(ов): в файле байты, недопустимые для кодировки ${detection.encoding}. Строки с ними уйдут в карантин, а не запишутся с браком.`,
		);
	}

	return { ...detection, warnings, text, replacementCharCount };
}

/**
 * Проверка отдельного значения на остаточное повреждение кодировкой.
 * Используется валидатором строки: значение с U+FFFD или псевдографикой
 * записывать в карточку пациента нельзя — лучше карантин.
 */
export function hasEncodingDamage(value: string): boolean {
	if (!value) return false;
	if (value.includes("�")) return true;
	// Псевдографика DOS внутри содержательного текста.
	if (/[─-╿]/.test(value) && /[A-Za-zА-Яа-я0-9]/.test(value)) return true;
	return false;
}
