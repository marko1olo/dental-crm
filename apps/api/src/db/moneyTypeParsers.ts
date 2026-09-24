import pg from "pg";

/**
 * Разбор числовых типов PostgreSQL для денег.
 *
 * ЗАЧЕМ. Драйвер node-postgres по умолчанию отдаёт `numeric` и `bigint` (int8) строкой:
 * он не может обещать, что произвольная точность влезет в число JavaScript. А
 * `integer` отдаёт числом. В этом проекте деньги лежат и так, и так: часть
 * колонок объявлена integer, часть — numeric(10,2) и numeric(12,2), а также bigint
 * (например, счётчики копеек). Из-за этого одна и та же по смыслу сумма приходила
 * в код то числом, то строкой, в зависимости от таблицы.
 *
 * ЧЕМ ЭТО ОПАСНО НА ДЕНЬГАХ:
 *  - сложение превращается в склейку: 1500.50 + 200.00 даёт «1500.50200.00»;
 *  - сравнение идёт по тексту: «900.00» оказывается больше «1500.50»;
 *  - схемы `z.number()` строку не принимают — маршрут отвечает ошибкой на
 *    верных данных;
 *  - `toFixed` и форматирование денег на строке ведут себя иначе, чем на числе;
 *  - parseFloat на финансовых суммах категорически запрещён из-за потери копеек.
 *
 * ЧТО ДЕЛАЕМ.
 * 1. `numeric` (OID 1700): приводим к числу только когда это безусловно безопасно
 *    (значение в пределах safe integers, scale <= 20, без вылета по RangeError в toFixed,
 *    а -0.00 нормализуется в 0). Иначе отдаём строку без потерь.
 * 2. `bigint` (OID 20): приводим к числу без parseFloat, строго через BigInt,
 *    если значение помещается в [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER].
 *    Если выходит за пределы safe integer — отдаём строку.
 */
export const NUMERIC_OID = 1700;
export const BIGINT_OID = 20;

/** Максимум, до которого число JavaScript представляет копейки точно. */
const SAFE_KOPECKS = Number.MAX_SAFE_INTEGER;

export function parseNumericMoney(value: string | null): number | string | null {
	if (value === null || value === undefined) return value ?? null;
	const trimmed = String(value).trim();
	if (trimmed === "") return trimmed;
	// NaN и Infinity numeric допускает; в число их превращать нельзя.
	if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;

	const asNumber = Number(trimmed);
	if (!Number.isFinite(asNumber)) return trimmed;

	// Приведение "-0.00" и "-0" к 0 во избежание дефектов отрицательного нуля
	if (asNumber === 0) return 0;

	if (Math.abs(asNumber) * 100 > SAFE_KOPECKS) return trimmed;

	/*
	 * Контроль без доверия к себе: число обязано вернуться в ровно ту же
	 * строку с той же точностью. Если база отдала больше знаков, чем число
	 * способно удержать (или scale > 20), отдаём строку — пусть вызывающий код решает сам,
	 * лучше чем незаметно округлить деньги.
	 *
	 * Защита от RangeError: toFixed() digits argument must be between 0 and 100.
	 */
	const rawScale = trimmed.includes(".") ? trimmed.split(".")[1]?.length ?? 0 : 0;
	if (rawScale > 20) return trimmed;

	const scale = Math.min(20, Math.max(0, rawScale));
	const formatted = asNumber.toFixed(scale);
	const normalizedWithoutLeadingZeros = trimmed.replace(/^(-?)0*(\d)/, "$1$2");
	const normalizedWithZeros = trimmed.replace(/^(-?)0+(\d)/, "$1$2");

	if (formatted !== normalizedWithoutLeadingZeros && formatted !== normalizedWithZeros) {
		return trimmed;
	}

	return Object.is(asNumber, -0) ? 0 : asNumber;
}

/**
 * Безопасный парсер BIGINT (int8) без потери копеек и БЕЗ parseFloat.
 * Если значение лежит в пределах безопасных целых чисел JS, возвращает number.
 * Если выходит за пределы безопасного диапазона — возвращает строку.
 */
export function parseBigIntMoney(value: string | null): number | string | null {
	if (value === null || value === undefined) return value ?? null;
	const trimmed = String(value).trim();
	if (trimmed === "") return trimmed;
	if (!/^-?\d+$/.test(trimmed)) return trimmed;

	try {
		const asBigInt = BigInt(trimmed);
		if (
			asBigInt >= BigInt(Number.MIN_SAFE_INTEGER) &&
			asBigInt <= BigInt(Number.MAX_SAFE_INTEGER)
		) {
			const asNumber = Number(asBigInt);
			return Object.is(asNumber, -0) ? 0 : asNumber;
		}
	} catch {
		return trimmed;
	}
	return trimmed;
}

let registered = false;

/** Включает разбор денежных типов (NUMERIC и BIGINT) на весь процесс. Повторный вызов безвреден. */
export function registerMoneyTypeParsers(): void {
	if (registered) return;
	pg.types.setTypeParser(NUMERIC_OID as never, parseNumericMoney as never);
	pg.types.setTypeParser(BIGINT_OID as never, parseBigIntMoney as never);
	registered = true;
}
