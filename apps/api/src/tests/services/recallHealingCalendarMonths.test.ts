import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addCalendarMonths } from "../../services/recallScheduler.js";

/**
 * СРОК ПРИЖИВЛЕНИЯ ИМПЛАНТА СЧИТАЕТСЯ КАЛЕНДАРНЫМИ МЕСЯЦАМИ, А МЕСЯЦ НЕ 30 ДНЕЙ.
 *
 * Запуск: из apps/api
 *   node --import tsx --test src/tests/services/recallHealingCalendarMonths.test.ts
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. Срок приживления считался как
 * `healingDate.setMonth(healingDate.getMonth() + healingMonths)`. `setMonth` не
 * проверяет, существует ли текущее число в целевом месяце: 31 августа + 6
 * месяцев даёт «31 февраля», а это 3 марта. Приглашение на 3-й этап имплантации
 * уходило на 1-3 дня позже срока — очередь напоминаний расходилась с планом
 * лечения у всех имплантов, поставленных в конце длинного месяца.
 *
 * Часы здесь не нужны и намеренно не мокаются: проверяемая функция получает
 * обе точки явными параметрами, от момента прогона её результат не зависит
 * вообще. Прибивать нечего — сторож детерминирован по построению.
 */

const pad = (value: number) => String(value).padStart(2, "0");
const asDay = (date: Date) =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Прежний расчёт — ровно то, что стояло в планировщике до починки. */
function bySetMonth(from: Date, months: number): Date {
	const shifted = new Date(from.getTime());
	shifted.setMonth(shifted.getMonth() + months);
	return shifted;
}

describe("срок приживления не перескакивает через короткий месяц", () => {
	it("31 августа + 6 месяцев (верхняя челюсть) = 28 февраля, а не 3 марта", () => {
		const placed = new Date(2025, 7, 31, 9, 30, 0, 0);
		assert.equal(asDay(addCalendarMonths(placed, 6)), "2026-02-28");
		assert.equal(
			asDay(bySetMonth(placed, 6)),
			"2026-03-03",
			"стенд: прежний расчёт уносил в март",
		);
	});

	it("31 августа + 3 месяца (нижняя челюсть) = 30 ноября, а не 1 декабря", () => {
		const placed = new Date(2025, 7, 31, 9, 30, 0, 0);
		assert.equal(asDay(addCalendarMonths(placed, 3)), "2025-11-30");
		assert.equal(
			asDay(bySetMonth(placed, 3)),
			"2025-12-01",
			"стенд: прежний расчёт уносил в декабрь",
		);
	});

	it("30 ноября + 3 месяца = 28 февраля, а не 2 марта", () => {
		const placed = new Date(2025, 10, 30, 14, 0, 0, 0);
		assert.equal(asDay(addCalendarMonths(placed, 3)), "2026-02-28");
		assert.equal(
			asDay(bySetMonth(placed, 3)),
			"2026-03-02",
			"стенд: прежний расчёт уносил в март",
		);
	});

	it("31 января + 1 месяц в високосном году = 29 февраля", () => {
		const placed = new Date(2028, 0, 31, 8, 0, 0, 0);
		assert.equal(asDay(addCalendarMonths(placed, 1)), "2028-02-29");
	});

	it("31 декабря + 3 месяца = 31 марта: где переполнения нет, дата не меняется", () => {
		const placed = new Date(2025, 11, 31, 18, 45, 0, 0);
		assert.equal(asDay(addCalendarMonths(placed, 3)), "2026-03-31");
		assert.equal(
			asDay(addCalendarMonths(placed, 3)),
			asDay(bySetMonth(placed, 3)),
			"на существующем числе оба расчёта обязаны совпадать — починка не сдвигает верные случаи",
		);
	});

	it("15-е число не задето ни при 3, ни при 6 месяцах — задета только граница месяца", () => {
		const placed = new Date(2025, 7, 15, 11, 0, 0, 0);
		assert.equal(asDay(addCalendarMonths(placed, 3)), "2025-11-15");
		assert.equal(asDay(addCalendarMonths(placed, 6)), "2026-02-15");
	});

	it("время суток сохраняется: сравнение now >= healingDate идёт по мгновению", () => {
		const placed = new Date(2025, 7, 31, 9, 30, 15, 250);
		const healing = addCalendarMonths(placed, 6);
		assert.equal(healing.getHours(), 9);
		assert.equal(healing.getMinutes(), 30);
		assert.equal(healing.getSeconds(), 15);
		assert.equal(healing.getMilliseconds(), 250);
	});

	it("срок никогда не наступает раньше конца целевого месяца и не позже его последнего дня", () => {
		// Перебор всех дат 2025 года против обоих расчётов: снос прежнего расчёта
		// обязан быть только вперёд, а новый — никогда не выходить за месяц.
		let driftedForward = 0;
		for (let dayOffset = 0; dayOffset < 365; dayOffset += 1) {
			const placed = new Date(2025, 0, 1 + dayOffset, 12, 0, 0, 0);
			for (const months of [3, 6]) {
				const fixed = addCalendarMonths(placed, months);
				const legacy = bySetMonth(placed, months);
				const expectedMonth = (placed.getMonth() + months) % 12;
				assert.equal(
					fixed.getMonth(),
					expectedMonth,
					`срок ушёл в чужой месяц: ${asDay(placed)} + ${months} мес -> ${asDay(fixed)}`,
				);
				assert.ok(
					legacy.getTime() >= fixed.getTime(),
					`снос прежнего расчёта обязан быть только вперёд: ${asDay(placed)} + ${months} мес`,
				);
				if (legacy.getTime() > fixed.getTime()) driftedForward += 1;
			}
		}
		assert.ok(
			driftedForward > 0,
			"стенд: прежний расчёт обязан расходиться хотя бы где-то",
		);
		assert.equal(
			driftedForward,
			12,
			"измерено: ровно 12 дат 2025 года уносило в чужой месяц",
		);
	});

	it("неразобранная дата плана не создаёт задачу: срок остаётся неопределённым", () => {
		const healing = addCalendarMonths(new Date("не дата"), 6);
		assert.ok(
			Number.isNaN(healing.getTime()),
			"срок обязан остаться Invalid Date",
		);
		// now >= NaN всегда false, поэтому приглашение не уйдёт — отказ в пользу
		// пациента: лучше не позвать вовремя, чем позвать до приживления.
		assert.equal(new Date() >= healing, false);
	});
});
