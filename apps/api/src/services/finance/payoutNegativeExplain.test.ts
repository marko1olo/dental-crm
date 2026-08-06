/**
 * Тесты объяснения отрицательной выплаты.
 *
 * Проверяется то, что владелец и врач прочитают глазами в конце месяца: есть ли
 * в тексте числа, назван ли порог, сказано ли про настройку, названо ли место,
 * куда идти, и НЕ появилось ли лишних слов у положительных строк. Отдельно
 * закреплена связь с `payoutRowNote`: этот модуль заменяет её фразу про минус, и
 * если та фраза изменится, тест должен упасть, а не оставить на экране дубль.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { DoctorPayoutRow, DoctorPayoutTotals } from "./doctorPayouts.js";
import { payoutRowNote } from "./doctorPayouts.js";
import {
	explainNegativePayouts,
	negativeRowExplanation,
	negativeTotalsExplanation,
	SUPERSEDED_METHOD_SENTENCE,
	SUPERSEDED_NEGATIVE_SENTENCE,
	splitPayoutsBySign,
} from "./payoutNegativeExplain.js";

/**
 * Разделитель разрядов в ru-RU — неразрывный пробел U+00A0, а не обычный.
 *
 * ВНИМАНИЕ РЕДАКТИРУЮЩЕМУ: в строке ниже стоит именно U+00A0, а не пробел, и на
 * вид они не отличаются. Нормализовать пробелы в этом файле нельзя. Если это
 * всё-таки случится, проверки вида «1 000 ₽» перестанут совпадать с выводом
 * форматтера и тесты упадут — молча испортить текст про деньги не получится.
 */
const NBSP = " ";

function rowOf(overrides: Partial<DoctorPayoutRow> = {}): DoctorPayoutRow {
	return {
		doctorUserId: "doc-1",
		doctorName: "Иванов И. И.",
		role: "doctor",
		isActive: true,
		revenueRub: 1000,
		paymentCount: 1,
		materialCostRub: 500,
		materialMovements: 2,
		materialMovementsUnpriced: 0,
		materialsState: "counted",
		commissionPct: 10,
		materialDeductionPct: 100,
		rateEffectiveFrom: "2026-07-01T00:00:00.000Z",
		rateRowCount: 1,
		state: "computed",
		accruedRub: 100,
		withheldMaterialRub: 500,
		payoutRub: -400,
		note: "",
		...overrides,
	};
}

function totalsOf(
	overrides: Partial<DoctorPayoutTotals> = {},
): DoctorPayoutTotals {
	return {
		revenueRub: 3500.55,
		paymentCount: 5,
		attributableRevenueRub: 3200.55,
		unattributedRevenueRub: 300,
		materialCostRub: 746.9,
		accruedRub: 550.17,
		withheldMaterialRub: 746.9,
		payoutRub: -196.73,
		doctorsCounted: 2,
		doctorsWithoutRate: 1,
		...overrides,
	};
}

test("минус объяснён числами: начислено, удержано, долг", () => {
	const text = negativeRowExplanation(rowOf());
	assert.ok(text, "у отрицательной строки объяснение обязано быть");

	// Требование ведущего: «удержано за материалы 500 ₽, начислено 100 ₽».
	assert.match(text, /начислено 100 ₽/);
	assert.match(text, /удержано 500 ₽/);
	assert.match(text, new RegExp(`от кассы 1${NBSP}000 ₽`));
	// Знак и сумма не спрятаны, и сказано, почему их нельзя обнулить.
	assert.match(text, /долг врача клинике 400 ₽/);
	assert.match(text, /-400 ₽/);
	assert.match(text, /обнулять его нельзя/);
	// Проценты — с запятой в дробной части, а не с точкой: см. percentText.
	assert.match(text, /это 10 % от кассы/);
	assert.match(text, /это 100 % себестоимости материалов 500 ₽/);
});

test("назван порог безубыточности, а не только факт минуса", () => {
	const text = negativeRowExplanation(rowOf());
	assert.ok(text);
	// 1000 × 10 % / 100 % = 100 ₽; доля порога 10 %; фактическая доля 50 %.
	assert.match(text, /пока материалы за период дешевле 100 ₽/);
	assert.match(text, /это 10 % кассы врача/);
	assert.match(text, /Списано на 500 ₽, то есть 50 % кассы/);
});

test("удержание 100 % названо ошибкой настройки, и сказано, что экрана для него нет", () => {
	const text = negativeRowExplanation(rowOf());
	assert.ok(text);
	assert.match(text, /клиника не выбирала/);
	assert.match(text, /впервые подписывает приём/);
	// Врать про «настройки» нельзя: маршрута записи doctor_commissions нет,
	// экрана для двух процентов тоже нет.
	assert.match(text, /экрана для них нет/);
	assert.doesNotMatch(text, /измените ставку в настройках/i);
});

test("действие названо местом, которое существует в интерфейсе", () => {
	const text = negativeRowExplanation(rowOf());
	assert.ok(text);
	assert.match(text, /на экране «Склад»/);
	assert.match(text, /цену за единицу/);
	assert.match(text, /правилах списания/);
	// Общая фраза «проверьте данные» — это не действие.
	assert.doesNotMatch(text, /проверьте данные/i);
});

test("при удержании меньше 100 % про вписанную системой настройку не говорится", () => {
	// 5000 × 25 % = 1250, удержано 4000 × 50 % = 2000 → −750.
	const text = negativeRowExplanation(
		rowOf({
			revenueRub: 5000,
			materialCostRub: 4000,
			commissionPct: 25,
			materialDeductionPct: 50,
			accruedRub: 1250,
			withheldMaterialRub: 2000,
			payoutRub: -750,
		}),
	);
	assert.ok(text);
	assert.doesNotMatch(text, /клиника не выбирала/);
	// Порог при этом считается по своим процентам: 5000 × 25 / 50 = 2500 ₽.
	assert.match(text, new RegExp(`дешевле 2${NBSP}500 ₽`));
	assert.match(text, /это 50 % кассы врача/);
});

test("при нулевой кассе порог не печатается: «дешевле 0 ₽» — бессмыслица", () => {
	const text = negativeRowExplanation(
		rowOf({
			revenueRub: 0,
			paymentCount: 0,
			accruedRub: 0,
			withheldMaterialRub: 500,
			payoutRub: -500,
		}),
	);
	assert.ok(text);
	assert.doesNotMatch(text, /Порог/);
	assert.doesNotMatch(text, /дешевле 0 ₽/);
	// Числа при этом остаются: долг и удержание названы.
	assert.match(text, /долг врача клинике 500 ₽/);
	assert.match(text, /удержано 500 ₽/);
});

test("правило четырёх: у неотрицательных строк не появляется ни одного слова", () => {
	assert.equal(
		negativeRowExplanation(
			rowOf({
				payoutRub: 203.27,
				accruedRub: 450.17,
				withheldMaterialRub: 246.9,
			}),
		),
		null,
	);
	assert.equal(
		negativeRowExplanation(
			rowOf({ payoutRub: 0, accruedRub: 0, withheldMaterialRub: 0 }),
		),
		null,
	);
	assert.equal(
		negativeRowExplanation(
			rowOf({
				state: "rate_missing",
				accruedRub: null,
				withheldMaterialRub: null,
				payoutRub: null,
			}),
		),
		null,
	);
	assert.equal(
		negativeRowExplanation(
			rowOf({
				state: "material_policy_missing",
				withheldMaterialRub: null,
				payoutRub: null,
			}),
		),
		null,
	);
});

test("фраза без чисел заменяется, а не дублируется", () => {
	/*
	 * Связь с чужим модулем закреплена здесь: `payoutRowNote` обязана всё ещё
	 * печатать ту фразу, которую этот модуль вырезает. Если её текст в
	 * doctorPayouts.ts изменят, упадёт этот тест — а не экран, на котором тихо
	 * появится два одинаковых утверждения подряд.
	 */
	const serverNote = payoutRowNote({
		state: "computed",
		materialsState: "counted",
		materialMovementsUnpriced: 0,
		commissionPct: 10,
		rateRowCount: 1,
		payoutRub: -400,
		revenueRub: 1000,
	});
	assert.ok(
		serverNote.includes(SUPERSEDED_NEGATIVE_SENTENCE),
		"payoutRowNote больше не печатает заменяемую фразу про минус — вырезание в payoutNegativeExplain устарело",
	);
	assert.ok(
		serverNote.includes(SUPERSEDED_METHOD_SENTENCE),
		"payoutRowNote больше не печатает общую фразу о методе — вырезание в payoutNegativeExplain устарело",
	);

	const report = explainNegativePayouts(
		{
			period: {
				from: "2026-07-01T00:00:00.000Z",
				to: "2026-07-31T23:59:59.999Z",
			},
			rows: [rowOf({ note: serverNote })],
			totals: totalsOf({
				payoutRub: -400,
				doctorsCounted: 1,
				doctorsWithoutRate: 0,
			}),
			methodNote: "метод",
			limitations: [],
			isEmpty: false,
		},
		{ scope: "all" },
	);

	const note = report.rows[0]?.note ?? "";
	assert.equal(
		note.includes(SUPERSEDED_NEGATIVE_SENTENCE),
		false,
		"старая фраза без чисел осталась в тексте",
	);
	assert.equal(
		note.includes(SUPERSEDED_METHOD_SENTENCE),
		false,
		"общая фраза о методе осталась висеть хвостом",
	);
	// Важное стоит первым: объяснение с числами, а не общая фраза о методе.
	assert.match(note, /^Выплаты за период нет/);
	// Текст заканчивается действием, а не оборванным хвостом чужой фразы.
	assert.match(note, /а не до неё\.$/);
	assert.doesNotMatch(note, / {2}/);

	/*
	 * Вырезаются ровно две фразы, а не серверный текст целиком: предупреждения о
	 * списаниях без цены и о двоящейся ставке — это другие дефекты данных, и
	 * потерять их вместе с дублем нельзя.
	 */
	const richNote = payoutRowNote({
		state: "computed",
		materialsState: "cost_missing",
		materialMovementsUnpriced: 2,
		commissionPct: 10,
		rateRowCount: 2,
		payoutRub: -400,
		revenueRub: 1000,
	});
	const rich =
		explainNegativePayouts(
			{
				period: {
					from: "2026-07-01T00:00:00.000Z",
					to: "2026-07-31T23:59:59.999Z",
				},
				rows: [
					rowOf({
						note: richNote,
						materialsState: "cost_missing",
						materialMovementsUnpriced: 2,
						rateRowCount: 2,
					}),
				],
				totals: totalsOf({
					payoutRub: -400,
					doctorsCounted: 1,
					doctorsWithoutRate: 0,
				}),
				methodNote: "метод",
				limitations: [],
				isEmpty: false,
			},
			{ scope: "all" },
		).rows[0]?.note ?? "";
	assert.match(rich, /без цены или без количества: 2/);
	assert.match(rich, /Активных ставок у врача найдено 2/);
	assert.equal(rich.includes(SUPERSEDED_NEGATIVE_SENTENCE), false);
	assert.equal(rich.includes(SUPERSEDED_METHOD_SENTENCE), false);
});

test("итог раскладывается на два числа, и деньги считаются точно", () => {
	const split = splitPayoutsBySign([
		rowOf({
			doctorUserId: "a",
			payoutRub: 203.27,
			accruedRub: 450.17,
			withheldMaterialRub: 246.9,
		}),
		rowOf({ doctorUserId: "b", payoutRub: -400 }),
		rowOf({
			doctorUserId: "c",
			state: "rate_missing",
			accruedRub: null,
			withheldMaterialRub: null,
			payoutRub: null,
		}),
		rowOf({
			doctorUserId: "d",
			payoutRub: 0,
			accruedRub: 0,
			withheldMaterialRub: 0,
		}),
	]);

	assert.equal(split.payoutDueRub, 203.27);
	assert.equal(split.debtToClinicRub, 400);
	assert.equal(split.doctorsDue, 1);
	assert.equal(split.doctorsInDebt, 1);
	// Ровный ноль не попал ни в одну группу, врач без ставки — тоже.
	assert.equal(split.doctorsDue + split.doctorsInDebt, 2);

	/*
	 * Почему здесь decimal.js, замером, а не на веру: пара 203,27 + (−400)
	 * складывается в float ТОЧНО, и по ней трап не виден — поэтому его нельзя
	 * ловить на глаз. Хвост появляется на тех же деньгах чуть иначе собранных.
	 */
	assert.equal(203.27 + -400, -196.73);
	assert.notEqual(550.17 - 746.9, -196.73);
	assert.notEqual(203.27 + -400 + -0.01, -196.74);

	// Наш итог остаётся ровным при том же накоплении из трёх строк.
	const drifting = splitPayoutsBySign([
		rowOf({
			doctorUserId: "a",
			payoutRub: 203.27,
			accruedRub: 450.17,
			withheldMaterialRub: 246.9,
		}),
		rowOf({ doctorUserId: "b", payoutRub: -400 }),
		rowOf({ doctorUserId: "c", payoutRub: -0.01 }),
	]);
	assert.equal(drifting.debtToClinicRub, 400.01);
	assert.equal(drifting.payoutDueRub, 203.27);
});

test("отрицательный итог по клинике объяснён двумя числами, а не оставлен красным", () => {
	const text = negativeTotalsExplanation({
		totals: totalsOf(),
		split: {
			payoutDueRub: 203.27,
			debtToClinicRub: 400,
			doctorsDue: 1,
			doctorsInDebt: 1,
		},
		scope: "all",
	});
	assert.ok(text);
	assert.match(text, /сальдо, а не сумму к выплате/);
	assert.match(text, /отдаёт врачам 203,27 ₽ \(1 врач\)/);
	assert.match(text, /400 ₽ врачи должны клинике за материалы \(1 врач\)/);
	assert.match(text, /Выплатить -196,73 ₽ невозможно/);
	assert.match(text, /ни по договору, ни в бухгалтерии/);
});

test("положительное сальдо с долгом внутри тоже названо разницей, а не выплатой", () => {
	const text = negativeTotalsExplanation({
		totals: totalsOf({ payoutRub: 600 }),
		split: {
			payoutDueRub: 1000,
			debtToClinicRub: 400,
			doctorsDue: 2,
			doctorsInDebt: 1,
		},
		scope: "all",
	});
	assert.ok(text);
	assert.match(text, /Число в плитке \(600 ₽\) — это разница между ними/);
	assert.match(text, new RegExp(`отдаёт врачам 1${NBSP}000 ₽ \\(2 врача\\)`));
	assert.doesNotMatch(text, /Выплатить/);
});

test("если к выплате нет никого, подпись «к выплате всего» названа неверной", () => {
	const text = negativeTotalsExplanation({
		totals: totalsOf({ payoutRub: -400 }),
		split: {
			payoutDueRub: 0,
			debtToClinicRub: 400,
			doctorsDue: 0,
			doctorsInDebt: 1,
		},
		scope: "all",
	});
	assert.ok(text);
	assert.match(text, /Подпись «к выплате всего» здесь неверна/);
	assert.match(text, /долг врачей клинике за материалы \(1 врач\)/);
});

test("врачу про его собственный минус сказано, чем это число НЕ является", () => {
	const text = negativeTotalsExplanation({
		totals: totalsOf({ payoutRub: -400 }),
		split: {
			payoutDueRub: 0,
			debtToClinicRub: 400,
			doctorsDue: 0,
			doctorsInDebt: 1,
		},
		scope: "own",
	});
	assert.ok(text);
	assert.match(text, /не сумма, которую с вас требуют доплатить/);
	assert.match(text, /400 ₽/);
	// Числа из строки здесь не повторяются: они стоят прямо над плитками.
	assert.doesNotMatch(text, /сальдо/);
});

test("клиника без долгов не видит ни одного нового слова", () => {
	assert.equal(
		negativeTotalsExplanation({
			totals: totalsOf({ payoutRub: 5000 }),
			split: {
				payoutDueRub: 5000,
				debtToClinicRub: 0,
				doctorsDue: 3,
				doctorsInDebt: 0,
			},
			scope: "all",
		}),
		null,
	);

	const positive = rowOf({
		payoutRub: 203.27,
		accruedRub: 450.17,
		withheldMaterialRub: 246.9,
		note: "как было",
	});
	const report = explainNegativePayouts(
		{
			period: {
				from: "2026-07-01T00:00:00.000Z",
				to: "2026-07-31T23:59:59.999Z",
			},
			rows: [positive],
			totals: totalsOf({
				payoutRub: 203.27,
				doctorsCounted: 1,
				doctorsWithoutRate: 0,
			}),
			methodNote: "метод",
			limitations: ["ограничение расчёта"],
			isEmpty: false,
		},
		{ scope: "all" },
	);
	assert.equal(report.rows[0]?.note, "как было");
	assert.deepEqual(report.limitations, ["ограничение расчёта"]);
});

test("объяснение не меняет ни одного числа расчёта", () => {
	const rows = [rowOf({ note: "исходный текст" })];
	const totals = totalsOf({
		payoutRub: -400,
		doctorsCounted: 1,
		doctorsWithoutRate: 0,
	});
	const report = explainNegativePayouts(
		{
			period: {
				from: "2026-07-01T00:00:00.000Z",
				to: "2026-07-31T23:59:59.999Z",
			},
			rows,
			totals,
			methodNote: "метод",
			limitations: ["прежнее ограничение"],
			isEmpty: false,
		},
		{ scope: "all" },
	);

	assert.equal(report.rows[0]?.payoutRub, -400);
	assert.equal(report.rows[0]?.accruedRub, 100);
	assert.equal(report.rows[0]?.withheldMaterialRub, 500);
	assert.equal(report.totals.payoutRub, -400);
	assert.equal(report.totals.accruedRub, 550.17);
	// Разложенный итог доехал до контракта ответа.
	assert.equal(report.totals.debtToClinicRub, 400);
	assert.equal(report.totals.payoutDueRub, 0);
	assert.equal(report.totals.doctorsInDebt, 1);
	// Объяснение итога встало первым, прежние ограничения сохранены.
	assert.equal(report.limitations.length, 2);
	assert.equal(report.limitations[1], "прежнее ограничение");
	// Исходный отчёт не изменён на месте.
	assert.equal(rows[0]?.note, "исходный текст");
});
