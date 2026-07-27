import pg from "pg";

/**
 * Разбор числовых типов PostgreSQL для денег.
 *
 * ЗАЧЕМ. Драйвер node-postgres по умолчанию отдаёт `numeric` строкой: он не
 * может обещать, что произвольная точность влезет в число JavaScript. А
 * `integer` отдаёт числом. В этом проекте деньги лежат и так, и так: часть
 * колонок объявлена integer, часть — numeric(10,2) и numeric(12,2). Из-за этого
 * одна и та же по смыслу сумма приходила в код то числом, то строкой, в
 * зависимости от таблицы.
 *
 * ЧЕМ ЭТО ОПАСНО НА ДЕНЬГАХ:
 *  - сложение превращается в склейку: 1500.50 + 200.00 даёт «1500.50200.00»;
 *  - сравнение идёт по тексту: «900.00» оказывается больше «1500.50»;
 *  - схемы `z.number()` строку не принимают — маршрут отвечает ошибкой на
 *    верных данных;
 *  - `toFixed` и форматирование денег на строке ведут себя иначе, чем на числе.
 *
 * ЧТО ДЕЛАЕМ. Приводим `numeric` к числу, но только когда это безусловно
 * безопасно: значение обязано пройти обратное преобразование в ту же строку.
 * Иначе отдаём строку как раньше — молча терять точность на деньгах нельзя.
 * Для сумм со двумя знаками после запятой в пределах примерно 10^13 рублей
 * число JavaScript точно (граница целых — 2^53 ≈ 9·10^15 копеек).
 *
 * `bigint` (int8) сознательно не трогаем: там лежат счётчики и размеры, и
 * значения могут выходить за пределы точного числа.
 */
const NUMERIC_OID = 1700;

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
	if (Math.abs(asNumber) * 100 > SAFE_KOPECKS) return trimmed;

	/*
	 * Контроль без доверия к себе: число обязано вернуться в ровно ту же
	 * строку с той же точностью. Если база отдала больше знаков, чем число
	 * способно удержать, отдаём строку — пусть вызывающий код решает сам,
	 * лучше чем незаметно округлить деньги.
	 */
	const scale = trimmed.includes(".") ? trimmed.split(".")[1]!.length : 0;
	if (asNumber.toFixed(scale) !== trimmed.replace(/^(-?)0*(\d)/, "$1$2")) {
		const normalized = trimmed.replace(/^(-?)0+(\d)/, "$1$2");
		if (asNumber.toFixed(scale) !== normalized) return trimmed;
	}
	return asNumber;
}

let registered = false;

/** Включает разбор денежных типов на весь процесс. Повторный вызов безвреден. */
export function registerMoneyTypeParsers(): void {
	if (registered) return;
	pg.types.setTypeParser(NUMERIC_OID as never, parseNumericMoney as never);
	registered = true;
}
