import assert from "node:assert";
import test, { describe } from "node:test";
import {
	doctorProfitabilityRow,
	startBiAnalyticsWorker,
} from "../biAnalyticsWorker.js";
import { db } from "../../db/client.js";

/**
 * ПЯТЬ ПРЕЖНИХ ПРОВЕРОК ОХРАНЯЛИ ВЫДУМАННЫЕ ЧИСЛА, А НЕ РАСЧЁТ.
 *
 * Они требовали, чтобы `materialCost` равнялся 15 % выручки, `commission` — 25 %,
 * а `margin` — остатку, то есть ровно 60 %: «доли считаются точно: 15% и 25% от
 * 1000 руб.» проверяла, что 1000 ₽ даёт 150 / 250 / 600. Арифметика была верной,
 * а величины — придуманными: числа 1500 и 2500 базисных пунктов не выведены ни из
 * одной строки базы. ПРОВЕРЕНО на живой базе 2026-07-29: все источники затрат
 * пусты (inventory_transactions, inventory_items, procedure_material_rules,
 * doctor_commissions, pricelist_doctor_payrolls — по нулю строк).
 *
 * Проверка, требующая выдуманного числа, — худший вид сторожа: она делает подмену
 * обязательной и наказывает за починку. Поэтому здесь проверяется обратное: что
 * непосчитанная величина ОТСУТСТВУЕТ, а посчитанная доходит до экрана.
 */

describe("doctorProfitabilityRow", () => {
	test("выручка берётся в рублях, а не делится на 100", () => {
		// Раньше запрос считал sum(CAST(amount_rub AS float) / 100), хотя колонка
		// хранит целые рубли: врач с выручкой 500 000 руб. показывался как 5 000.
		const row = doctorProfitabilityRow("Иванов", 500_000);
		assert.strictEqual(row.revenue, 500_000);
	});

	test("выручка отдаётся числом, иначе экран показывает ноль", () => {
		// Здесь стояло kopecksToNumericString → "500000.00". Разборщик ответа
		// принимает только число (numberOr, pages/analyticsDoctorMetrics.ts:231-233)
		// и на строке подставляет 0: единственная измеренная величина строки
		// показывалась нулём, пока выдуманная маржа показывалась как факт.
		const row = doctorProfitabilityRow("Иванов", 500_000);
		assert.strictEqual(
			typeof row.revenue,
			"number",
			"выручка ушла строкой — экран покажет 0 вместо неё",
		);
	});

	test("маржи нет: себестоимости в системе не существует", () => {
		const row = doctorProfitabilityRow("Врач", 1000);
		assert.strictEqual(
			row.margin,
			null,
			"маржа снова заполнена. Затрат в базе нет ни одной строки, поэтому прибыль взять неоткуда; " +
				"ноль тоже нельзя — он объявляет прибылью всю выручку целиком.",
		);
	});

	test("материалы и комиссия не подставляются вовсе", () => {
		const row: Record<string, unknown> = doctorProfitabilityRow("Врач", 1000) as unknown as Record<string, unknown>;
		assert.strictEqual(
			row.materialCost,
			undefined,
			"вернулась стоимость материалов: 15 % выручки — выдуманная доля, а не расчёт",
		);
		assert.strictEqual(
			row.commission,
			undefined,
			"вернулась комиссия: 25 % выручки — выдуманная доля, а не расчёт",
		);
	});

	test("успешность не измеряется по числу платежей", () => {
		// Стояло `paymentCount > 0 ? 100 : 0`: врач с одним найденным платежом
		// объявлялся завершившим 100 % приёмов. Эта выборка идёт по платежам и
		// статусов приёмов не содержит вовсе.
		const row = doctorProfitabilityRow("Врач", 500_000);
		assert.strictEqual(
			row.completionRate,
			null,
			"успешность снова заполнена из выборки, в которой нет статусов приёмов",
		);
	});

	test("bigint из драйвера приходит строкой и разбирается без потерь", () => {
		// sum() над integer в PostgreSQL — bigint, node-postgres отдаёт его строкой.
		const row = doctorProfitabilityRow("Врач", "1000");
		assert.strictEqual(row.revenue, 1000);
	});

	test("отсутствие выручки не ломает расчёт", () => {
		const row = doctorProfitabilityRow("Врач", null);
		assert.strictEqual(row.revenue, 0);
		assert.strictEqual(row.margin, null);
		assert.strictEqual(row.completionRate, null);
	});
});

test("startBiAnalyticsWorker scheduling and execution", async (t) => {
	t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
	const setTimeoutMock = t.mock.method(global, "setTimeout");
	const setIntervalMock = t.mock.method(global, "setInterval");

	let dbSelectCalled = 0;
	t.mock.method(db, "select", () => {
		dbSelectCalled++;
		return {
			from: () => Promise.resolve([])
		};
	});

	startBiAnalyticsWorker();

	assert.strictEqual(setTimeoutMock.mock.calls.length, 1);
	assert.strictEqual(setTimeoutMock.mock.calls[0].arguments[1], 5000);

	assert.strictEqual(setIntervalMock.mock.calls.length, 1);
	assert.strictEqual(
		setIntervalMock.mock.calls[0].arguments[1],
		1000 * 60 * 60,
	);

	assert.strictEqual(dbSelectCalled, 0, "Не должно быть вызовов до срабатывания таймера");

	t.mock.timers.tick(5000);
	await Promise.resolve(); // даём микротаскам (async функциям) выполниться

	assert.strictEqual(dbSelectCalled, 1, "Должен произойти один вызов через 5 секунд (setTimeout)");

	t.mock.timers.tick(1000 * 60 * 60);
	await Promise.resolve();

	assert.strictEqual(dbSelectCalled, 2, "Должен произойти второй вызов через час (setInterval)");

	t.mock.timers.reset();
});
