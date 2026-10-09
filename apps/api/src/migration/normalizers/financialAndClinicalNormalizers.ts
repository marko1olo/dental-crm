import { formatKopecksRu, kopecksToNumericString } from "@dental/shared";
import { bad, empty, isNullToken, ok, truncateForMessage } from "./common.js";
import type { Gender, NormalizedValue } from "./types.js";

export { truncateForMessage } from "./common.js";

// ---------------------------------------------------------------------------
// Деньги
// ---------------------------------------------------------------------------

/**
 * Разбирает денежную сумму в ЦЕЛЫЕ КОПЕЙКИ.
 *
 * Заголовок раньше утверждал «в целые рубли», а функция всегда возвращала
 * копейки (см. `money:kopecks` в конце): именно это расхождение и убедило
 * соседнюю normalizeMoneyRubles округлять до рубля. Возвращаются копейки —
 * целое число, ничего не округлено, ничего не потеряно.
 */
export function normalizeMoneyValue(
	raw: string | null | undefined,
): NormalizedValue<number> {
	if (isNullToken(raw, false)) return empty(["null-token"]);
	const text = String(raw).trim();
	const transforms: string[] = [];

	// Отрицательное в скобках — бухгалтерская запись: (1 500,00).
	let working = text;
	let negative = false;
	if (/^\(.*\)$/.test(working)) {
		negative = true;
		working = working.slice(1, -1);
		transforms.push("accounting-parentheses");
	}

	// Убираем валюту и всё нецифровое, кроме разделителей и знака.
	working = working
		.replace(/(?:руб(?:лей|ля|\.)?|₽|rub|р\.)/gi, "")
		.replace(/[\s ']/g, "")
		.trim();

	if (working.startsWith("-")) {
		negative = true;
		working = working.slice(1);
	} else if (working.startsWith("+")) {
		working = working.slice(1);
	}

	if (!/^[\d.,]+$/.test(working) || !/\d/.test(working)) {
		return bad(
			`Сумма «${truncateForMessage(text)}» не разобрана как число.`,
			transforms,
		);
	}

	/**
	 * Разделитель дробной части. Неоднозначность «1,500» — это полторы тысячи
	 * (США) или один рубль пятьдесят копеек (Россия)? Решаем по правилу: если
	 * после последнего разделителя ровно три цифры И в строке есть другой
	 * разделитель — это группировка разрядов. Иначе — дробная часть.
	 */
	const lastComma = working.lastIndexOf(",");
	const lastDot = working.lastIndexOf(".");
	const lastSeparator = Math.max(lastComma, lastDot);

	let normalized: string;
	if (lastSeparator === -1) {
		normalized = working;
	} else {
		const tail = working.slice(lastSeparator + 1);
		const head = working.slice(0, lastSeparator);
		const headHasSeparator = /[.,]/.test(head);

		if (tail.length === 3 && (headHasSeparator || head.length <= 3)) {
			// Группировка разрядов: 1,500 → 1500. Дробной части нет.
			normalized = working.replace(/[.,]/g, "");
			transforms.push("thousands-separator");
		} else if (tail.length <= 2) {
			normalized = `${head.replace(/[.,]/g, "")}.${tail}`;
			if (tail.length > 0) transforms.push("decimal-separator");
		} else {
			return bad(
				`Сумма «${truncateForMessage(text)}» имеет непонятный разделитель разрядов.`,
				transforms,
			);
		}
	}

	/**
	 * Копейки считаются из строки регулярным выражением, а не через parseFloat:
	 * «23400.50» → 2340050 точно. Тот же приём, что в packages/shared/utils/money.ts,
	 * и по той же причине — деньги не должны проходить через плавающую точку.
	 */
	const kopecksMatch = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
	if (!kopecksMatch) {
		return bad(
			`Сумма «${truncateForMessage(text)}» не разобрана как число.`,
			transforms,
		);
	}
	const wholePart = Number(kopecksMatch[1]);
	const fractionPart = Number((kopecksMatch[2] ?? "").padEnd(2, "0") || "0");
	if (!Number.isSafeInteger(wholePart)) {
		return bad(
			`Сумма «${truncateForMessage(text)}» выходит за допустимые пределы.`,
			transforms,
		);
	}
	const magnitudeKopecks = wholePart * 100 + fractionPart;
	const kopecks = negative ? -magnitudeKopecks : magnitudeKopecks;

	if (!Number.isSafeInteger(kopecks)) {
		return bad(
			`Сумма «${truncateForMessage(text)}» выходит за допустимые пределы.`,
			transforms,
		);
	}
	// Платёж в миллиард рублей в стоматологии — это ошибка разбора, а не платёж.
	if (Math.abs(kopecks) > 100_000_000_000) {
		return bad(
			`Сумма ${formatKopecksRu(kopecks)} неправдоподобна — вероятно, в колонку попало не денежное значение.`,
			transforms,
		);
	}

	return ok(kopecks, [...transforms, "money:kopecks"], 0.97);
}

/**
 * Сумма в рублях с копейками — ровно то значение, которое ложится в денежную
 * колонку numeric(12, 2).
 *
 * ЗАЧЕМ ДВЕ ФУНКЦИИ
 * normalizeMoneyValue отдаёт целые копейки: в них считают и сверяют. Здесь то же
 * значение переводится в рубли для записи в колонку, и перевод точный — через
 * строку numeric(12, 2) из @dental/shared, а не делением с плавающей точкой.
 *
 * БЫЛО: `Math.round(kopecks.value / 100)`, то есть округление до целого рубля,
 * с пометкой «round-kopecks-to-rubles» в происхождении поля. Обоснование стояло
 * в этом же комментарии: «колонка payments.amount_rub объявлена целыми рублями».
 * ЭТО НЕВЕРНО с миграции 0131: колонка — numeric(12, 2), объявлена
 * `numeric("amount_rub", { precision: 12, scale: 2, mode: "number" })`
 * (db/schema.ts), и drizzle пишет её через String(), то есть 23400.5 доходит до
 * базы как «23400.5» и хранится как 23400.50. Копейки влезают.
 *
 * Цена ошибки была необратимой: клиника, переезжающая с чужой системы, теряла
 * копейки на КАЖДОМ платеже своей истории — «23 400,50» ложилось как 23 401, —
 * причём точное значение было посчитано строкой выше и выброшено. Восстановить
 * его после переноса нельзя ничем: исходной выгрузки у клиники может уже не быть.
 *
 * Точные копейки по-прежнему сохраняются в normalized_json (rowTransform.ts):
 * это независимая точка отсчёта для сверки, и она нужна, чтобы доказать, что
 * колонка получила ровно разобранное значение, а не «примерно» его.
 */
export function normalizeMoneyRubles(
	raw: string | null | undefined,
): NormalizedValue<number> {
	const kopecks = normalizeMoneyValue(raw);
	if (kopecks.value === null) {
		return {
			value: null,
			transforms: kopecks.transforms,
			confidence: kopecks.confidence,
			issue: kopecks.issue,
		};
	}
	const rubles = Number(kopecksToNumericString(kopecks.value));
	const transforms = [
		...kopecks.transforms.filter((transform) => transform !== "money:kopecks"),
		"money:rub",
	];
	return ok(rubles, transforms, kopecks.confidence);
}

// ---------------------------------------------------------------------------
// Пол, флаги, перечисления
// ---------------------------------------------------------------------------

const MALE_TOKENS = new Set([
	"м",
	"муж",
	"мужской",
	"мужчина",
	"m",
	"male",
	"1",
	"м.",
]);
const FEMALE_TOKENS = new Set([
	"ж",
	"жен",
	"женский",
	"женщина",
	"f",
	"female",
	"ж.",
	"w",
	"2",
]);

export function normalizeGenderValue(
	raw: string | null | undefined,
): NormalizedValue<Gender> {
	if (isNullToken(raw, false)) return empty(["null-token"]);
	const token = String(raw).trim().toLowerCase();
	if (MALE_TOKENS.has(token)) return ok("male", ["gender:token"], 0.97);
	if (FEMALE_TOKENS.has(token)) return ok("female", ["gender:token"], 0.97);
	return bad(`Значение пола «${truncateForMessage(token)}» не распознано.`, [
		"gender:token",
	]);
}

const TRUE_TOKENS = new Set([
	"1",
	"true",
	"да",
	"yes",
	"y",
	"истина",
	"t",
	"+",
	"есть",
]);
const FALSE_TOKENS = new Set([
	"0",
	"false",
	"нет",
	"no",
	"n",
	"ложь",
	"f",
	"-",
	"отсутствует",
]);

export function normalizeBooleanValue(
	raw: string | null | undefined,
): NormalizedValue<boolean> {
	if (raw === null || raw === undefined || String(raw).trim() === "")
		return empty(["null-token"]);
	const token = String(raw).trim().toLowerCase();
	if (TRUE_TOKENS.has(token)) return ok(true, ["boolean:token"]);
	if (FALSE_TOKENS.has(token)) return ok(false, ["boolean:token"]);
	return bad(
		`Значение «${truncateForMessage(token)}» не распознано как да/нет.`,
		["boolean:token"],
	);
}

/**
 * Приводит значение к одному из допустимых, сопоставляя по словарю синонимов.
 * Используется для статусов записей и способов оплаты, где у каждой системы
 * свой набор слов для одного и того же.
 */
export function normalizeEnumValue<T extends string>(
	raw: string | null | undefined,
	synonyms: Record<string, T>,
	fallback: T | null = null,
): NormalizedValue<T> {
	if (isNullToken(raw, false)) {
		return fallback
			? ok(fallback, ["enum:default"], 0.5)
			: empty(["null-token"]);
	}
	const token = String(raw)
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, " ");
	const direct = synonyms[token];
	if (direct) return ok(direct, ["enum:exact"], 0.97);

	// Частичное совпадение: «отменена пациентом» → «отменена».
	for (const [candidate, target] of Object.entries(synonyms)) {
		if (candidate.length >= 4 && token.includes(candidate)) {
			return ok(target, ["enum:partial"], 0.8);
		}
	}

	if (fallback) {
		return {
			value: fallback,
			transforms: ["enum:fallback"],
			confidence: 0.4,
			issue: null,
		};
	}
	return bad(
		`Значение «${truncateForMessage(token)}» не сопоставлено ни одному известному состоянию.`,
		["enum:miss"],
	);
}

// ---------------------------------------------------------------------------
// Зубные формулы
// ---------------------------------------------------------------------------

/**
 * Приводит номер зуба к нотации FDI (двузначной), принятой в нашей модели.
 *
 * Российские системы используют FDI («16»), американские — Universal («3»),
 * встречается и запись «1.6». Постоянные зубы 11–48, молочные 51–85.
 */
export function normalizeToothCode(
	raw: string | null | undefined,
): NormalizedValue<string> {
	if (isNullToken(raw)) return empty(["null-token"]);
	const text = String(raw).trim().replace(/\s+/g, "");

	const fdiDotted = /^([1-8])\.([1-8])$/.exec(text);
	if (fdiDotted)
		return ok(`${fdiDotted[1]}${fdiDotted[2]}`, ["tooth:fdi-dotted"], 0.97);

	const digits = text.replace(/\D/g, "");
	if (digits.length === 2) {
		const quadrant = Number(digits[0]);
		const position = Number(digits[1]);
		const permanent =
			quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8;
		const deciduous =
			quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5;
		if (permanent || deciduous) return ok(digits, ["tooth:fdi"], 0.98);
		return bad(
			`Номер зуба «${truncateForMessage(text)}» не существует в нотации FDI.`,
			["tooth:fdi"],
		);
	}

	/**
	 * Universal 1..32 переводим в FDI. Однозначного признака нотации у одиночного
	 * значения нет («18» — это FDI восьмёрка справа сверху или Universal
	 * восьмёрка слева снизу), поэтому уверенность понижена и решение видно
	 * в происхождении поля.
	 */
	if (digits.length === 1 || (digits.length === 2 && Number(digits) <= 32)) {
		const universal = Number(digits);
		if (universal >= 1 && universal <= 32) {
			const quadrant = Math.floor((universal - 1) / 8) + 1;
			const indexInQuadrant = (universal - 1) % 8;
			// Universal идёт 1→16 по верхней дуге справа налево, 17→32 по нижней слева направо.
			const fdi =
				quadrant === 1
					? `1${8 - indexInQuadrant}`
					: quadrant === 2
						? `2${indexInQuadrant + 1}`
						: quadrant === 3
							? `3${8 - indexInQuadrant}`
							: `4${indexInQuadrant + 1}`;
			return ok(fdi, ["tooth:universal-to-fdi"], 0.6);
		}
	}

	return bad(`Номер зуба «${truncateForMessage(text)}» не распознан.`, [
		"tooth:unknown",
	]);
}

// ---------------------------------------------------------------------------
// Служебное
// ---------------------------------------------------------------------------

export function normalizeEmailValue(
	raw: string | null | undefined,
): NormalizedValue<string> {
	if (isNullToken(raw, false)) return empty(["null-token"]);
	const text = String(raw).trim().toLowerCase();
	// Несколько адресов в ячейке — берём первый, остальное остаётся в raw_json.
	const first = text.split(/[,;\s]+/).filter(Boolean)[0] ?? text;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(first)) {
		return bad(
			`Адрес «${truncateForMessage(text)}» не похож на электронную почту.`,
			["email:validate"],
		);
	}
	return ok(
		first,
		first === text ? ["email:validate"] : ["email:first-of-many"],
		0.95,
	);
}
