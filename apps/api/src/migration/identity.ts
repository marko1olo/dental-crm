import { createHash } from "node:crypto";
import type { MigrationEntityKind } from "@dental/shared";
import { normalizePhoneValue } from "./valueNormalize.js";

/**
 * Установление тождества записей: тот же это пациент или другой.
 *
 * ОТКУДА ВЗЯЛСЯ ЭТОТ МОДУЛЬ
 * Логика сравнения ФИО по расстоянию Левенштейна и взвешенная оценка совпадения
 * были написаны в services/ingestion/IdentityResolutionEngine.ts — единственном
 * из четырёх файлов «движка приёма», где вместо заглушки был настоящий код. Но
 * его не импортировал никто, включая тесты: класс существовал и не работал.
 * Логика перенесена сюда и исправлена в трёх местах:
 *
 *   1. normalizePhone возвращал "+123" для строки "123" — то есть любой мусор
 *      превращался в «номер», и два разных пациента с мусором в поле телефона
 *      получали одинаковый ключ и склеивались. Теперь нормализация телефона
 *      одна на весь движок, и невалидный номер не участвует в сравнении вовсе.
 *   2. Оценка считалась по всем парам записей. На выгрузке в 50 000 пациентов
 *      это 1,25 миллиарда сравнений с Левенштейном внутри — часы работы.
 *      Добавлены ключи блокировки: сравниваются только записи, имеющие шанс
 *      совпасть.
 *   3. Расстояние Левенштейна считалось полной матрицей (a+1)×(b+1). Для
 *      сравнения ФИО достаточно двух строк, и при заведомо большой разнице
 *      длин сравнение можно не начинать.
 */

/**
 * Расстояние Левенштейна.
 *
 * Хранятся две строки матрицы вместо всей: для ФИО экономия невелика, но
 * функция вызывается миллионы раз за прогон, и выделение матрицы 40×40 на
 * каждый вызов создаёт заметное давление на сборщик мусора.
 */
export function levenshteinDistance(left: string, right: string): number {
	if (left === right) return 0;
	if (left.length === 0) return right.length;
	if (right.length === 0) return left.length;

	// Короткая строка идёт по столбцам: массив меньше.
	const [shorter, longer] =
		left.length <= right.length ? [left, right] : [right, left];

	let previous = Array.from(
		{ length: shorter.length + 1 },
		(_, index) => index,
	);
	let current = new Array<number>(shorter.length + 1);

	for (let longIndex = 1; longIndex <= longer.length; longIndex += 1) {
		current[0] = longIndex;
		const longChar = longer[longIndex - 1];
		for (let shortIndex = 1; shortIndex <= shorter.length; shortIndex += 1) {
			const cost = longChar === shorter[shortIndex - 1] ? 0 : 1;
			current[shortIndex] = Math.min(
				previous[shortIndex]! + 1,
				current[shortIndex - 1]! + 1,
				previous[shortIndex - 1]! + cost,
			);
		}
		const swap = previous;
		previous = current;
		current = swap;
	}

	return previous[shorter.length]!;
}

/** Сходство строк 0..1 на основе расстояния Левенштейна. */
export function stringSimilarity(left: string, right: string): number {
	const maxLength = Math.max(left.length, right.length);
	if (maxLength === 0) return 1;
	/**
	 * Разница длин уже задаёт нижнюю границу расстояния. Если она такова, что
	 * сходство не превысит 0.5, считать матрицу незачем.
	 */
	const lengthGap = Math.abs(left.length - right.length);
	if (lengthGap / maxLength > 0.5) return 1 - lengthGap / maxLength;
	return (maxLength - levenshteinDistance(left, right)) / maxLength;
}

/** Приводит ФИО к виду для сравнения: регистр, ё→е, порядок слов. */
export function normalizeNameForComparison(
	value: string | null | undefined,
): string {
	if (!value) return "";
	return (
		value
			.toLowerCase()
			.replace(/ё/g, "е")
			.replace(/[^\p{L}\s]/gu, " ")
			.split(/\s+/)
			.filter(Boolean)
			/**
			 * Слова сортируются: «Иванов Иван» и «Иван Иванов» — один человек,
			 * записанный в разном порядке. Для выгрузок из разных систем это обычное
			 * расхождение, и оно не должно давать расстояние Левенштейна как у
			 * совершенно разных людей.
			 */
			.sort()
			.join(" ")
	);
}

export interface IdentityCandidate {
	fullName: string;
	phone?: string | null;
	birthDate?: string | null;
	email?: string | null;
}

export type IdentityAction = "same" | "needs_review" | "different";

export interface IdentityVerdict {
	score: number;
	action: IdentityAction;
	/** Почему получилось такое решение — попадает в карантин при needs_review. */
	rationale: string;
}

/**
 * Порог, выше которого записи считаются одним человеком.
 *
 * 0.88 вместо привычного 0.85: при переносе цена ошибки несимметрична. Слить
 * двух разных пациентов в одну карточку — это смешать две истории болезни,
 * и обнаружится это на приёме. Создать дубль — неприятно, но исправимо
 * штатным слиянием карточек. Поэтому планка на слияние поднята.
 */
const SAME_THRESHOLD = 0.88;
const REVIEW_THRESHOLD = 0.62;

/**
 * Оценка тождества двух записей.
 *
 * Вклады: телефон 0.4, ФИО 0.4, дата рождения 0.3 — сумма больше единицы
 * намеренно, чтобы совпадение по всем трём признакам гарантированно перекрывало
 * порог, а результат ограничивается сверху.
 */
export function scoreIdentity(
	incoming: IdentityCandidate,
	existing: IdentityCandidate,
): IdentityVerdict {
	const reasons: string[] = [];
	let score = 0;

	// ---- Телефон. Сравниваются только валидные номера.
	const incomingPhone = normalizePhoneValue(incoming.phone).value?.e164 ?? null;
	const existingPhone = normalizePhoneValue(existing.phone).value?.e164 ?? null;
	if (incomingPhone && existingPhone) {
		if (incomingPhone === existingPhone) {
			score += 0.4;
			reasons.push("совпал телефон");
		} else {
			/**
			 * Разные телефоны — довод против, но слабый: у пациента меняется номер, а
			 * в старой базе остаётся прежний. Поэтому штраф небольшой и не способен
			 * сам по себе развести записи, совпавшие по ФИО и дате рождения.
			 */
			score -= 0.1;
			reasons.push("телефоны различаются");
		}
	}

	// ---- ФИО.
	const incomingName = normalizeNameForComparison(incoming.fullName);
	const existingName = normalizeNameForComparison(existing.fullName);
	const nameSimilarity =
		incomingName && existingName
			? stringSimilarity(incomingName, existingName)
			: 0;
	score += nameSimilarity * 0.4;
	if (nameSimilarity >= 0.99) reasons.push("ФИО совпадает");
	else if (nameSimilarity >= 0.85)
		reasons.push(`ФИО близко (${Math.round(nameSimilarity * 100)}%)`);
	else
		reasons.push(
			`ФИО различается (совпадение ${Math.round(nameSimilarity * 100)}%)`,
		);

	// ---- Дата рождения. Самый надёжный различитель однофамильцев.
	if (incoming.birthDate && existing.birthDate) {
		if (incoming.birthDate === existing.birthDate) {
			score += 0.3;
			reasons.push("совпала дата рождения");
			if (nameSimilarity > 0.8) score += 0.1;
		} else {
			/**
			 * Разные даты рождения при похожем ФИО — это, как правило, отец и сын с
			 * одинаковым именем. Штраф большой: слить их нельзя ни в каком случае.
			 */
			score -= 0.35;
			reasons.push("даты рождения различаются");
		}
	}

	// ---- Почта как дополнительное подтверждение.
	if (
		incoming.email &&
		existing.email &&
		incoming.email.toLowerCase() === existing.email.toLowerCase()
	) {
		score += 0.15;
		reasons.push("совпала почта");
	}

	const bounded = Math.max(0, Math.min(1, score));
	const action: IdentityAction =
		bounded >= SAME_THRESHOLD
			? "same"
			: bounded >= REVIEW_THRESHOLD
				? "needs_review"
				: "different";

	return { score: bounded, action, rationale: reasons.join(", ") };
}

/**
 * Ключи блокировки — то, что делает поиск дублей выполнимым.
 *
 * Сравнивать каждую входящую запись с каждой существующей нельзя: на 50 000
 * пациентов это 1,25 млрд сравнений. Вместо этого для записи считается набор
 * грубых ключей, и сравнение идёт только с теми, у кого совпал хотя бы один.
 * Ключи выбраны так, чтобы настоящий дубль почти наверняка попал хотя бы в один
 * общий блок, даже если часть полей расходится:
 *
 *   - телефон целиком: самый точный;
 *   - дата рождения + первые три буквы фамилии: ловит опечатки в ФИО;
 *   - фамилия + имя без отчества: ловит отсутствие даты рождения;
 *   - последние семь цифр телефона: ловит расхождение в коде страны.
 */
export function blockingKeys(candidate: IdentityCandidate): string[] {
	const keys: string[] = [];
	const phone = normalizePhoneValue(candidate.phone).value?.e164 ?? null;
	if (phone) {
		keys.push(`p:${phone}`);
		keys.push(`p7:${phone.slice(-7)}`);
	}

	const nameWords = normalizeNameForComparison(candidate.fullName)
		.split(" ")
		.filter(Boolean);
	if (nameWords.length > 0) {
		const nameStem = nameWords
			.map((word) => word.slice(0, 3))
			.sort()
			.join("");
		if (candidate.birthDate)
			keys.push(`bd:${candidate.birthDate}:${nameStem.slice(0, 9)}`);
		if (nameWords.length >= 2)
			keys.push(`n2:${nameWords.slice(0, 2).join(" ")}`);
	}

	if (candidate.email) keys.push(`e:${candidate.email.toLowerCase()}`);

	return keys;
}

/**
 * Индекс существующих записей по ключам блокировки.
 *
 * Строится один раз на прогон. Память: на 50 000 пациентов это порядка
 * 200 000 записей в Map — десятки мегабайт, что приемлемо, а альтернатива
 * (запрос к базе на каждую строку) означает 50 000 обращений.
 */
export class IdentityIndex<T extends IdentityCandidate> {
	private readonly buckets = new Map<string, T[]>();

	add(record: T): void {
		for (const key of blockingKeys(record)) {
			const bucket = this.buckets.get(key);
			if (bucket) bucket.push(record);
			else this.buckets.set(key, [record]);
		}
	}

	/** Записи, имеющие шанс совпасть. Дубликаты между блоками отфильтрованы. */
	candidatesFor(candidate: IdentityCandidate): T[] {
		const seen = new Set<T>();
		for (const key of blockingKeys(candidate)) {
			for (const record of this.buckets.get(key) ?? []) seen.add(record);
		}
		return [...seen];
	}

	/** Лучшее совпадение либо null. */
	findBest(
		candidate: IdentityCandidate,
	): { record: T; verdict: IdentityVerdict } | null {
		let best: { record: T; verdict: IdentityVerdict } | null = null;
		for (const record of this.candidatesFor(candidate)) {
			const verdict = scoreIdentity(candidate, record);
			if (!best || verdict.score > best.verdict.score)
				best = { record, verdict };
		}
		return best;
	}

	get size(): number {
		return this.buckets.size;
	}
}

// ---------------------------------------------------------------------------
// Ключи для идемпотентности
// ---------------------------------------------------------------------------

/**
 * Бизнес-ключ сущности — то, по чему запись узнаётся между прогонами.
 *
 * Приоритет у идентификатора старой системы: он стабилен и не зависит от того,
 * исправил ли администратор опечатку в ФИО между двумя выгрузками. Если его
 * нет, ключ считается из содержимого, и тогда исправление опечатки даёт другой
 * ключ — поэтому для таких источников дополнительно работает поиск дублей по
 * сходству, а не только по ключу.
 */
export function naturalKeyFor(
	entityKind: MigrationEntityKind,
	values: {
		externalId?: string | null | undefined;
		fullName?: string | null | undefined;
		phone?: string | null | undefined;
		birthDate?: string | null | undefined;
		date?: string | null | undefined;
		amountRub?: number | null | undefined;
		patientKey?: string | null | undefined;
		toothCode?: string | null | undefined;
	},
): string | null {
	if (values.externalId && String(values.externalId).trim() !== "") {
		return `id:${String(values.externalId).trim()}`;
	}

	const hash = (parts: Array<string | number | null | undefined>): string =>
		createHash("sha256")
			.update(parts.map((part) => String(part ?? "")).join(""))
			.digest("hex")
			.slice(0, 32);

	const phone = normalizePhoneValue(values.phone).value?.e164 ?? null;

	switch (entityKind) {
		case "patient":
		case "doctor": {
			const name = normalizeNameForComparison(values.fullName);
			if (!name && !phone) return null;
			return `nk:${hash([name, phone, values.birthDate])}`;
		}
		case "appointment":
		case "visit": {
			/**
			 * Приём узнаётся по пациенту и дате. Двух приёмов одного пациента в один
			 * день в выгрузках почти не бывает, а если бывает — второй попадёт в
			 * карантин как конфликт дублей, что правильнее тихого перезаписывания.
			 */
			if (!values.patientKey || !values.date) return null;
			return `nk:${hash([values.patientKey, values.date])}`;
		}
		case "payment": {
			// Платёж: пациент, дата и сумма. Два одинаковых платежа в один день —
			// редкость, и её тоже лучше вынести на разбор человеку.
			if (
				!values.patientKey ||
				values.amountRub === null ||
				values.amountRub === undefined
			)
				return null;
			return `nk:${hash([values.patientKey, values.date, values.amountRub])}`;
		}
		case "service": {
			if (!values.fullName) return null;
			return `nk:${hash([values.fullName.trim().toLowerCase()])}`;
		}
		case "tooth_state": {
			if (!values.patientKey || !values.toothCode) return null;
			return `nk:${hash([values.patientKey, values.toothCode])}`;
		}
		default:
			return null;
	}
}

/**
 * Отпечаток исходной строки для поиска буквальных повторов внутри выгрузки.
 *
 * Ключи сортируются, значения приводятся к сжатым пробелам: одна и та же строка,
 * выгруженная дважды с разным порядком колонок, должна дать один отпечаток.
 */
export function rawRowHash(raw: Record<string, string>): string {
	const canonical = Object.keys(raw)
		.sort()
		.map((key) => `${key}${(raw[key] ?? "").replace(/\s+/g, " ").trim()}`)
		.join("");
	return createHash("sha256").update(canonical).digest("hex");
}

/** Отпечаток исходных байт источника — узнаёт повторно загружаемый файл. */
export function sourceFingerprint(content: Buffer | string): string {
	return createHash("sha256").update(content).digest("hex");
}
