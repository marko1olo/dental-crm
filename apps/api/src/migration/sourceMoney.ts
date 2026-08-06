import { normalizeMoneyValue } from "./valueNormalize.js";

/**
 * Сумма платежей источника в копейках — либо честное «не определяется».
 *
 * БЫЛО (engine.ts, prepareSource): `sum + (parsedAmount.value ?? 0)`. Значение,
 * которое суммой не является («б/н», «оплата по договору», «1 500 в кассу 3»),
 * даёт value === null, и `?? 0` подставлял вместо неизвестной суммы ноль. Дальше
 * это число уходит в сверку как НЕЗАВИСИМАЯ точка отсчёта — ради неё оно и
 * считается до загрузки, из исходных значений (reconcile.ts, проверка
 * money_parse_completeness_kopecks).
 *
 * ПОЧЕМУ ПОДСТАВЛЕННЫЙ НОЛЬ УБИВАЛ ИМЕННО ЭТУ ПРОВЕРКУ. Она сравнивает эту сумму
 * с суммой стейджинга. Строка, чья сумма не разобралась, не попадает НИ В ОДНУ ИЗ
 * СТОРОН: в стейджинге normalized_json.amountKopecks у неё null, и SQL-сумма её
 * пропускает. Обе стороны теряли одни и те же деньги на одну и ту же величину,
 * разность выходила ровно 0, проверка получала passed: true и печатала в акт
 * переноса «Сумма платежей источника 24 901,50 ₽ разобрана полностью, копейка в
 * копейку» — про перенос, где часть денег не разобралась вообще. Проверка,
 * которая не может провалиться, доказательством не является.
 *
 * ТЕПЕРЬ неизвестное остаётся неизвестным: хотя бы одно нечитаемое значение в
 * колонке суммы — и точки отсчёта нет, сумма null. Акт переноса печатает «не
 * определяется» (reconciliationReportCsv), а оператор получает предупреждение с
 * числом таких значений и именем колонки.
 *
 * Пустая клетка (`empty`: пусто, «нет», «н/д») сумму НЕ отравляет: источник прямо
 * говорит, что суммы нет, это известное отсутствие, а не неизвестная величина.
 * Но если не заполнено НИ ОДНО значение, складывать нечего, и ноль здесь тоже
 * означал бы «сумма источника равна нулю» вместо «сумма не определялась».
 *
 * Модуль отдельный и БЕЗ обращений к базе намеренно: engine.ts тянет db/client.ts,
 * который на импорте создаёт пул и требует DATABASE_URL, и денежное правило было
 * бы невозможно проверить без живой базы.
 */
export function sourceMoneyTotalFromRows(
	rows: readonly (readonly string[])[],
	amountColumnIndex: number,
): {
	totalKopecks: number | null;
	unreadableCells: number;
	parsedCells: number;
} {
	let totalKopecks = 0;
	let unreadableCells = 0;
	let parsedCells = 0;

	for (const row of rows) {
		// normalizeMoneyValue возвращает копейки — суммируем целые, без потерь.
		const parsedAmount = normalizeMoneyValue(row[amountColumnIndex] ?? "");
		if (parsedAmount.value === null) {
			/*
			 * issue !== null означает «в колонке суммы лежит не сумма» (bad), а не
			 * «суммы нет» (empty). Различие принципиальное: в первом случае величина
			 * неизвестна, во втором — известно, что её нет.
			 */
			if (parsedAmount.issue !== null) unreadableCells += 1;
			continue;
		}
		totalKopecks += parsedAmount.value;
		parsedCells += 1;
	}

	return {
		totalKopecks:
			unreadableCells > 0 || parsedCells === 0 ? null : totalKopecks,
		unreadableCells,
		parsedCells,
	};
}
