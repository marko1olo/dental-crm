import assert from "node:assert";
import test, { describe } from "node:test";
import {
	buildDoctorProfitabilityRow,
	type DoctorProfitabilityQueryRow,
} from "../cronAnalyticsWorker.js";

/**
 * Срез BI не должен содержать выдуманных чисел.
 *
 * Проверяется сборщик строки «эффективность врача» — ровно то, что уходит в
 * bi_analytics_snapshots.doctor_profitability_json и оттуда на экран аналитики.
 * До правки здесь стояли `margin: revenue * 0.4` («Simplified margin heuristic»)
 * и `completionRate: 85`: обе величины выглядели расчётом, расчётом не являясь.
 *
 * Тест без базы: сборщик — чистая функция, ей на вход подаётся такая же строка,
 * какую отдаёт драйвер.
 */

function queryRow(
	over: Partial<DoctorProfitabilityQueryRow> = {},
): DoctorProfitabilityQueryRow {
	return {
		name: "Иванова А. П.",
		revenue: 480_000,
		total_appointments: 27,
		completed_appointments: 13,
		...over,
	};
}

describe("buildDoctorProfitabilityRow — маржа", () => {
	test("маржа всегда null: себестоимости в системе нет", () => {
		const row = buildDoctorProfitabilityRow(queryRow());
		assert.strictEqual(row.margin, null);
	});

	test("маржа не выводится из выручки ни при каком её значении", () => {
		// Прежняя формула давала 40 % выручки. Ни одно значение выручки не должно
		// порождать число в поле прибыли — ни 0.4 от неё, ни ноль, ни что-либо ещё.
		for (const revenue of [0, 1, 7, 333, 100_000, 123_457, 9_999_999]) {
			const row = buildDoctorProfitabilityRow(queryRow({ revenue }));
			assert.strictEqual(
				row.margin,
				null,
				`выручка ${revenue}: в прибыль попало число ${row.margin}`,
			);
			assert.notStrictEqual(row.margin, revenue * 0.4);
		}
	});

	test("ноль не подставляется вместо неизвестной прибыли", () => {
		// Ноль означал бы «посчитали, прибыли нет». Считать не из чего — прочерк.
		const row = buildDoctorProfitabilityRow(queryRow({ revenue: 500_000 }));
		assert.notStrictEqual(row.margin, 0);
		assert.strictEqual(row.margin, null);
	});
});

describe("buildDoctorProfitabilityRow — успешность", () => {
	test("успешность — доля завершённых приёмов, а не константа 85", () => {
		const row = buildDoctorProfitabilityRow(
			queryRow({ total_appointments: 27, completed_appointments: 13 }),
		);
		assert.notStrictEqual(row.completionRate, 85);
		assert.strictEqual(row.completionRate, (13 / 27) * 100);
	});

	test("единица измерения — процентные пункты, а не доля 0..1", () => {
		// formatCompletionRate (pages/analyticsDoctorMetrics.ts:117-118) печатает
		// значение как проценты: доля 0.5 отрисовалась бы как «1 %».
		const row = buildDoctorProfitabilityRow(
			queryRow({ total_appointments: 4, completed_appointments: 2 }),
		);
		assert.strictEqual(row.completionRate, 50);
	});

	test("все приёмы завершены — 100 процентных пунктов", () => {
		const row = buildDoctorProfitabilityRow(
			queryRow({ total_appointments: 6, completed_appointments: 6 }),
		);
		assert.strictEqual(row.completionRate, 100);
	});

	test("приёмы есть, завершённых нет — это измеренный ноль, а не прочерк", () => {
		const row = buildDoctorProfitabilityRow(
			queryRow({ total_appointments: 5, completed_appointments: 0 }),
		);
		assert.strictEqual(row.completionRate, 0);
	});

	test("приёмов нет вовсе — null, делить не на что", () => {
		// Ноль здесь был бы утверждением «врач не завершил ни одного приёма».
		const row = buildDoctorProfitabilityRow(
			queryRow({ total_appointments: null, completed_appointments: null }),
		);
		assert.strictEqual(row.completionRate, null);
	});
});

describe("buildDoctorProfitabilityRow — типы из драйвера", () => {
	test("COUNT(*) приходит строкой: bigint драйвер числом не отдаёт", () => {
		// db/moneyTypeParsers.ts сознательно не трогает int8 — счётчики остаются
		// строками. Строковое деление «13»/«27» обязано дать то же число.
		const row = buildDoctorProfitabilityRow(
			queryRow({ total_appointments: "27", completed_appointments: "13" }),
		);
		assert.strictEqual(row.completionRate, (13 / 27) * 100);
	});

	test("numeric-выручка строкой разбирается в число", () => {
		// parseNumericMoney возвращает строку, когда точности числа не хватает.
		const row = buildDoctorProfitabilityRow(queryRow({ revenue: "480000.00" }));
		assert.strictEqual(row.revenue, 480_000);
	});

	test("пустая выручка — ноль рублей, а не NaN", () => {
		const row = buildDoctorProfitabilityRow(queryRow({ revenue: null }));
		assert.strictEqual(row.revenue, 0);
		assert.ok(Number.isFinite(row.revenue));
	});

	test("врач без имени получает подпись, а не пустую строку", () => {
		const row = buildDoctorProfitabilityRow(queryRow({ name: null }));
		assert.strictEqual(row.name, "Врач не указан");
	});
});

describe("buildDoctorProfitabilityRow — форма записи в снимок", () => {
	test("в снимок уходят ровно четыре поля", () => {
		// Лишнее поле уехало бы в jsonb молча: колонка нетипизирована.
		const row = buildDoctorProfitabilityRow(queryRow());
		assert.deepStrictEqual(Object.keys(row).sort(), [
			"completionRate",
			"margin",
			"name",
			"revenue",
		]);
	});

	test("ни одно поле снимка не содержит выдуманной константы", () => {
		// Сводная проверка на прежние две выдумки сразу, по всей сетке входов.
		for (const revenue of [0, 1000, 480_000]) {
			for (const total of [0, 1, 27]) {
				for (const completed of [0, 1]) {
					const row = buildDoctorProfitabilityRow(
						queryRow({
							revenue,
							total_appointments: total,
							completed_appointments: Math.min(completed, total),
						}),
					);
					assert.strictEqual(row.margin, null);
					if (total === 0) {
						assert.strictEqual(row.completionRate, null);
					} else {
						assert.strictEqual(
							row.completionRate,
							(Math.min(completed, total) / total) * 100,
						);
					}
				}
			}
		}
	});
});
