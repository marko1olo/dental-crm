import { hasEncodingDamage } from "../encoding.js";
import { bad, empty, isNullToken, ok, truncateForMessage } from "./common.js";
import type {
	NormalizedName,
	NormalizedPhone,
	NormalizedValue,
} from "./types.js";

// ---------------------------------------------------------------------------
// Телефоны
// ---------------------------------------------------------------------------

export function normalizePhoneValue(
	raw: string | null | undefined,
): NormalizedValue<NormalizedPhone> {
	if (isNullToken(raw)) return empty(["null-token"]);
	const text = String(raw).trim();
	const transforms: string[] = [];

	// Добавочный: «+7 495 1234567 доб. 205», «... ext 205», «... #205».
	let working = text;
	let extension: string | null = null;
	const extensionMatch =
		/(?:доб\.?|добавочный|ext\.?|extension|x|#)\s*(\d{1,6})\s*$/i.exec(working);
	if (extensionMatch) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		extension = extensionMatch[1]!;
		working = working.slice(0, extensionMatch.index);
		transforms.push("split-extension");
	}

	/**
	 * В одной ячейке часто лежит несколько номеров: «8-900-111-22-33, 495-000-11-22».
	 * Берём первый — остальные не теряются: исходная ячейка целиком сохранена в
	 * стейджинге, а вызывающий код кладёт хвост в примечание.
	 */
	const segments = working
		.split(/[,;/]|\sили\s|\sи\s/i)
		.map((part) => part.trim())
		.filter(Boolean);
	if (segments.length > 1) transforms.push("multiple-numbers-first-taken");
	const candidate = segments[0] ?? working;

	const digits = candidate.replace(/\D/g, "");
	if (!digits) {
		return bad(
			`В значении «${truncateForMessage(text)}» нет ни одной цифры телефона.`,
			transforms,
		);
	}

	let national: string;
	if (
		digits.length === 11 &&
		(digits.startsWith("7") || digits.startsWith("8"))
	) {
		national = digits.slice(1);
		if (digits.startsWith("8")) transforms.push("drop-trunk-8");
	} else if (digits.length === 10) {
		national = digits;
		transforms.push("assume-ru-country-code");
	} else if (digits.length === 12 && digits.startsWith("77")) {
		// Казахстан: +7 7xx. Формально та же зона, но номер национальный.
		national = digits.slice(1, 11);
	} else if (digits.length > 11 && digits.length <= 15) {
		// Иностранный номер — переносим как есть, без домысливания кода страны.
		return ok(
			{ e164: `+${digits}`, mobile: false, extension },
			[...transforms, "foreign-number-as-is"],
			0.6,
		);
	} else if (digits.length >= 5 && digits.length <= 7) {
		return bad(
			`Номер «${truncateForMessage(text)}» состоит из ${digits.length} цифр — это внутренний или укороченный городской номер без кода города, дозвониться по нему нельзя.`,
			transforms,
		);
	} else {
		return bad(
			`Номер «${truncateForMessage(text)}» состоит из ${digits.length} цифр вместо 10 или 11.`,
			transforms,
		);
	}

	if (national.length !== 10) {
		return bad(
			`Номер «${truncateForMessage(text)}» не приводится к российскому формату.`,
			transforms,
		);
	}
	// Код региона/оператора не начинается с 0 или 1 ни у одного действующего номера.
	if (national.startsWith("0") || national.startsWith("1")) {
		return bad(
			`Номер «${truncateForMessage(text)}» имеет несуществующий код «${national.slice(0, 3)}».`,
			transforms,
		);
	}

	const mobile = national.startsWith("9");
	return ok(
		{ e164: `+7${national}`, mobile, extension },
		[...transforms, "phone:e164"],
		mobile ? 0.98 : 0.8,
	);
}

// ---------------------------------------------------------------------------
// Имена
// ---------------------------------------------------------------------------

/**
 * Частицы фамилий, которые пишутся со строчной и не должны получать заглавную
 * при исправлении регистра: «ван дер Берг», «де ла Крус».
 */
const LOWERCASE_NAME_PARTICLES = new Set([
	"ван",
	"де",
	"дер",
	"ла",
	"ле",
	"фон",
	"да",
	"ди",
	"дель",
	"оглы",
	"кызы",
	"уулу",
]);

/**
 * Исправляет регистр имени.
 *
 * Выгрузки из DOS-систем поголовно в верхнем регистре («ИВАНОВ ИВАН»), а
 * записи администраторов — в нижнем. Печатать «ИВАНОВ» в справке для налоговой
 * нельзя, поэтому регистр приводится, но только если он явно однородный: имя
 * «МакДональд» или «Иванов-Петров» не должно пострадать.
 */
export function fixNameCase(value: string): {
	value: string;
	changed: boolean;
} {
	const letters = value.replace(/[^\p{L}]/gu, "");
	if (!letters) return { value, changed: false };

	const allUpper =
		letters === letters.toUpperCase() && letters !== letters.toLowerCase();
	const allLower =
		letters === letters.toLowerCase() && letters !== letters.toUpperCase();
	if (!allUpper && !allLower) return { value, changed: false };

	const fixed = value
		.toLowerCase()
		.split(/(\s+|-)/)
		.map((token) => {
			if (!token.trim() || token === "-") return token;
			if (LOWERCASE_NAME_PARTICLES.has(token)) return token;
			return token.charAt(0).toUpperCase() + token.slice(1);
		})
		.join("");

	return { value: fixed, changed: fixed !== value };
}

/**
 * Разбирает ФИО.
 *
 * Поддерживает три формата, встречающиеся в выгрузках:
 *   «Иванов Иван Иванович»        — российский порядок,
 *   «Иванов, Иван Иванович»       — фамилия отделена запятой,
 *   «IVANOV^IVAN^IVANOVICH»       — DICOM, разделитель «^».
 */
export function normalizeNameValue(
	raw: string | null | undefined,
): NormalizedValue<NormalizedName> {
	if (isNullToken(raw, false)) return empty(["null-token"]);
	const text = String(raw).trim();
	const transforms: string[] = [];

	if (hasEncodingDamage(text)) {
		return bad(
			"ФИО содержит нечитаемые символы — повреждена кодировка источника.",
			["encoding-check"],
		);
	}

	let parts: string[];
	if (text.includes("^")) {
		parts = text
			.split("^")
			.map((part) => part.trim())
			.filter(Boolean);
		transforms.push("dicom-caret-format");
	} else if (text.includes(",")) {
		const [surname, rest] = text.split(",", 2);
		parts = [surname ?? "", ...(rest ?? "").trim().split(/\s+/)]
			.map((part) => part.trim())
			.filter(Boolean);
		transforms.push("comma-separated");
	} else {
		parts = text.split(/\s+/).filter(Boolean);
	}

	if (parts.length === 0) return empty(transforms);

	/**
	 * Строка вида «Иванов И.И.» — инициалы, а не имя и отчество. Разворачивать их
	 * в полные имена нельзя (это выдумывание данных), но и склеивать неверно.
	 */
	const cased = parts.map((part) => {
		const { value, changed } = fixNameCase(part);
		if (changed && !transforms.includes("fix-case"))
			transforms.push("fix-case");
		return value;
	});

	// Мусор вместо ФИО: одни цифры, одна буква, служебные слова.
	const letterCount = cased.join("").replace(/[^\p{L}]/gu, "").length;
	if (letterCount < 2) {
		return bad(
			`Значение «${truncateForMessage(text)}» не похоже на ФИО.`,
			transforms,
		);
	}

	const fullName = cased.join(" ");
	const [lastName = null, firstName = null, ...restParts] = cased;
	const middleName = restParts.length > 0 ? restParts.join(" ") : null;

	/**
	 * Один токен — это либо только фамилия, либо название организации-плательщика.
	 * Переносим, но с пониженной уверенностью: оператор увидит такие строки
	 * в списке предупреждений.
	 */
	const confidence =
		cased.length === 1 ? 0.65 : cased.length === 2 ? 0.9 : 0.98;

	return ok(
		{ fullName, lastName, firstName, middleName },
		transforms,
		confidence,
	);
}

/** Собирает ФИО из раздельных колонок фамилии, имени и отчества. */
export function combineNameParts(
	lastName: string | null | undefined,
	firstName: string | null | undefined,
	middleName: string | null | undefined,
): NormalizedValue<NormalizedName> {
	const pieces = [lastName, firstName, middleName]
		.map((part) => (isNullToken(part, false) ? null : String(part).trim()))
		.filter((part): part is string => Boolean(part));

	if (pieces.length === 0) return empty(["null-token"]);

	const transforms = ["combine-name-parts"];
	const cased = pieces.map((part) => {
		const { value, changed } = fixNameCase(part);
		if (changed && !transforms.includes("fix-case"))
			transforms.push("fix-case");
		return value;
	});

	return ok(
		{
			fullName: cased.join(" "),
			lastName: cased[0] ?? null,
			firstName: cased[1] ?? null,
			middleName: cased.slice(2).join(" ") || null,
		},
		transforms,
		pieces.length >= 2 ? 0.98 : 0.7,
	);
}
