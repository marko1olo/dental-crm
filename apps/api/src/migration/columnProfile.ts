import {
	type DateFormatHint,
	detectDateOrder,
	isNullToken,
	normalizeDateValue,
	normalizeEmailValue,
	normalizeGenderValue,
	normalizeMoneyValue,
	normalizeNameValue,
	normalizePhoneValue,
	normalizeToothCode,
} from "./valueNormalize.js";

/**
 * Статистический портрет колонки источника.
 *
 * ЗАЧЕМ ЭТО ЕСТЬ
 * Сопоставить колонку с полем по одному имени нельзя: в выгрузках попадаются
 * «F1», «Поле3», «DR», «NKART» — имя не значит ничего. Зато содержимое значит
 * почти всё: колонка, где 98% значений разбираются как российский мобильный
 * номер, — это телефон, как бы она ни называлась.
 *
 * ЗАЧЕМ ИМЕННО ПОРТРЕТ, А НЕ ЗНАЧЕНИЯ
 * Этот портрет — единственное, что уходит в языковую модель. Он не содержит ни
 * одного настоящего значения: только доли разбора, длины и МАСКИ вида
 * «99.99.9999». Отправлять ФИО и телефоны пациентов внешнему провайдеру для
 * решения задачи «как называется эта колонка» не требуется, а значит и не
 * должно происходить: врачебная тайна не обсуждается с подрядчиком ради
 * удобства разработчика.
 *
 * Портрет при этом информативнее сырых значений: доля успешного разбора по
 * каждому нормализатору — прямой ответ на вопрос «что здесь лежит».
 */

export interface ColumnProfile {
	name: string;
	/** Индекс колонки в таблице источника. */
	index: number;
	totalRows: number;
	nonEmptyCount: number;
	/** Число различных значений — отличает идентификатор от справочного поля. */
	distinctCount: number;
	minLength: number;
	maxLength: number;
	averageLength: number;
	/** Доли значений, разобравшихся соответствующим нормализатором: 0..1. */
	parseRates: {
		date: number;
		phone: number;
		money: number;
		email: number;
		personName: number;
		gender: number;
		toothCode: number;
		integer: number;
	};
	composition: {
		digitRatio: number;
		cyrillicRatio: number;
		latinRatio: number;
	};
	/**
	 * Маски значений: цифра → «9», строчная кириллица → «а», прописная → «А»,
	 * латиница → «a»/«A». Настоящих данных не содержат.
	 */
	valueShapes: string[];
	/** Похоже на первичный ключ: целые числа, почти все различны, без пропусков. */
	looksLikePrimaryKey: boolean;
	/** Подсказка о порядке компонентов даты, посчитанная по всей колонке. */
	dateHint: DateFormatHint;
}

/**
 * Сколько значений брать для оценки. Полный проход по колонке в миллион строк
 * ради определения типа не нужен: доля разбора стабилизируется на первых
 * сотнях. Выборка берётся не подряд, а с шагом — начало выгрузки часто
 * отличается от середины (сначала идут старые записи с пустыми полями).
 */
const PROFILE_SAMPLE_LIMIT = 400;
const SHAPE_SAMPLE_LIMIT = 5;

function sampleValues(rows: string[][], columnIndex: number): string[] {
	const total = rows.length;
	if (total === 0) return [];
	const step = Math.max(1, Math.floor(total / PROFILE_SAMPLE_LIMIT));
	const values: string[] = [];
	for (
		let index = 0;
		index < total && values.length < PROFILE_SAMPLE_LIMIT;
		index += step
	) {
		values.push(rows[index]?.[columnIndex] ?? "");
	}
	return values;
}

/** Маска значения: форма без содержимого. */
export function maskValueShape(value: string, maxLength = 24): string {
	const truncated =
		value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
	return truncated.replace(/[\s\S]/gu, (char) => {
		if (/\d/.test(char)) return "9";
		if (/[а-яё]/.test(char)) return "а";
		if (/[А-ЯЁ]/.test(char)) return "А";
		if (/[a-z]/.test(char)) return "a";
		if (/[A-Z]/.test(char)) return "A";
		return char;
	});
}

function ratio(matched: number, total: number): number {
	return total === 0 ? 0 : matched / total;
}

export function profileColumn(
	name: string,
	index: number,
	rows: string[][],
): ColumnProfile {
	const samples = sampleValues(rows, index);
	const filled = samples.filter((value) => !isNullToken(value, false));
	const dateHint = detectDateOrder(filled);

	let dateOk = 0;
	let phoneOk = 0;
	let moneyOk = 0;
	let emailOk = 0;
	let nameOk = 0;
	let genderOk = 0;
	let toothOk = 0;
	let integerOk = 0;

	let digits = 0;
	let cyrillic = 0;
	let latin = 0;
	let characters = 0;
	let lengthSum = 0;
	let minLength = Number.MAX_SAFE_INTEGER;
	let maxLength = 0;

	const distinct = new Set<string>();
	const shapes = new Map<string, number>();

	for (const value of filled) {
		distinct.add(value);
		lengthSum += value.length;
		if (value.length < minLength) minLength = value.length;
		if (value.length > maxLength) maxLength = value.length;

		for (const char of value) {
			characters += 1;
			if (/\d/.test(char)) digits += 1;
			else if (/[А-Яа-яЁё]/.test(char)) cyrillic += 1;
			else if (/[A-Za-z]/.test(char)) latin += 1;
		}

		const shape = maskValueShape(value);
		shapes.set(shape, (shapes.get(shape) ?? 0) + 1);

		if (normalizeDateValue(value, dateHint).value !== null) dateOk += 1;
		if (normalizePhoneValue(value).value !== null) phoneOk += 1;
		if (normalizeMoneyValue(value).value !== null) moneyOk += 1;
		if (normalizeEmailValue(value).value !== null) emailOk += 1;
		if (normalizeGenderValue(value).value !== null) genderOk += 1;
		if (normalizeToothCode(value).value !== null) toothOk += 1;
		if (/^-?\d{1,12}$/.test(value.trim())) integerOk += 1;

		/**
		 * Имя человека проверяется строже, чем нормализатором: тот принимает одно
		 * слово, а признаком колонки ФИО служат несколько именных токенов. Иначе
		 * колонка «Город» получит высокую долю «имён».
		 *
		 * Именным считается либо слово из букв, либо инициалы. Инициалы обязательны:
		 * «Иванов И.И.» — самая частая форма записи ФИО в российских системах
		 * первого поколения, где под ФИО отводили тридцать символов. Правило «все
		 * токены из букв» отвергало такую колонку целиком, и перенос отказывался
		 * заводить пациентов, у которых имя есть.
		 *
		 * Один посторонний токен допускается: выгрузки содержат «Иванов И.И. 2» для
		 * различения однофамильцев и «Петрова (Сидорова) Анна» после смены фамилии.
		 */
		const nameParsed = normalizeNameValue(value);
		if (nameParsed.value !== null) {
			const words = nameParsed.value.fullName.split(/\s+/).filter(Boolean);
			const nameLike = words.filter(
				(word) =>
					/^[\p{L}][\p{L}'’-]*$/u.test(word) ||
					/^(?:[\p{L}]\.){1,3}$/u.test(word),
			).length;
			const foreign = words.length - nameLike;
			if (nameLike >= 2 && words.length <= 5 && foreign <= 1) nameOk += 1;
		}
	}

	const total = filled.length;
	/**
	 * Первичный ключ: целые, почти все различны и заполнены. Порог 0.95 вместо 1.0
	 * намеренно — в выгрузках встречаются дубли идентификатора из-за склеенных
	 * таблиц, и такая колонка всё равно остаётся ключом, а расхождение поймает
	 * дедупликация.
	 */
	const looksLikePrimaryKey =
		total > 3 &&
		ratio(integerOk, total) > 0.98 &&
		distinct.size / total >= 0.95 &&
		ratio(total, samples.length) > 0.95;

	const topShapes = [...shapes.entries()]
		.sort((left, right) => right[1] - left[1])
		.slice(0, SHAPE_SAMPLE_LIMIT)
		.map(([shape]) => shape);

	return {
		name,
		index,
		totalRows: rows.length,
		nonEmptyCount: total,
		distinctCount: distinct.size,
		minLength: total === 0 ? 0 : minLength,
		maxLength,
		averageLength: total === 0 ? 0 : Math.round((lengthSum / total) * 10) / 10,
		parseRates: {
			date: ratio(dateOk, total),
			phone: ratio(phoneOk, total),
			money: ratio(moneyOk, total),
			email: ratio(emailOk, total),
			personName: ratio(nameOk, total),
			gender: ratio(genderOk, total),
			toothCode: ratio(toothOk, total),
			integer: ratio(integerOk, total),
		},
		composition: {
			digitRatio: ratio(digits, characters),
			cyrillicRatio: ratio(cyrillic, characters),
			latinRatio: ratio(latin, characters),
		},
		valueShapes: topShapes,
		looksLikePrimaryKey,
		dateHint,
	};
}

export function profileTable(
	columns: string[],
	rows: string[][],
): ColumnProfile[] {
	return columns.map((name, index) => profileColumn(name, index, rows));
}

/**
 * Краткая сводка портрета для языковой модели и для отчёта оператору.
 *
 * Формат намеренно плотный: модель получает десятки колонок в одном запросе, и
 * многословное описание каждой только размывает внимание. Настоящих значений
 * здесь нет — только доли, длины и маски.
 */
export function describeColumnForModel(profile: ColumnProfile): string {
	const rates = Object.entries(profile.parseRates)
		.filter(([, rate]) => rate >= 0.5)
		.map(([kind, rate]) => `${kind}=${Math.round(rate * 100)}%`)
		.join(" ");

	const fillRate =
		profile.totalRows === 0
			? 0
			: Math.round(
					(profile.nonEmptyCount /
						Math.min(profile.totalRows, PROFILE_SAMPLE_LIMIT)) *
						100,
				);

	const parts = [
		`имя="${profile.name}"`,
		`заполнено=${fillRate}%`,
		`различных=${profile.distinctCount}`,
		`длина=${profile.minLength}-${profile.maxLength}`,
	];
	if (rates) parts.push(`разбор: ${rates}`);
	if (profile.looksLikePrimaryKey) parts.push("похоже на первичный ключ");
	if (profile.valueShapes.length > 0)
		parts.push(`маски: ${profile.valueShapes.slice(0, 3).join(" | ")}`);

	return parts.join("; ");
}
