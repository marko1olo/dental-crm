import assert from "node:assert";
import { describe, test } from "node:test";

import {
	formatKopecksRu,
	kopecksToNumericString,
	multiplyKopecks,
	parseKopecks,
	RU_MONEY_NBSP,
} from "@dental/shared";

import {
	buildPatientLedger,
	buildPatientLedgers,
	buildVisitLedger,
	chargeLineKopecks,
	clinicDebtTotals,
	clinicOwesPatientKopecks,
	DEFAULT_SIGNIFICANCE_KOPECKS,
	debtNumericText,
	explainDebtTotals,
	kopecksFromNumericText,
	kopecksFromRubles,
	MoneyPrecisionError,
	type PaymentRow,
	patientAccountBalanceKopecks,
	patientOwesClinicKopecks,
	QuantityContractError,
	rublesFromKopecks,
	type TreatmentChargeRow,
	visitOutstandingKopecks,
	visitOverpaidKopecks,
} from "./patientDebt.js";

/**
 * Тесты одного дома для формулы долга.
 *
 * Проверяется не «функция что-то вернула», а три вещи, из-за которых формул
 * стало девять:
 *
 *  1. КОПЕЙКИ НЕ ТЕРЯЮТСЯ. Ни на разборе, ни на сложении, ни на обратном
 *     преобразовании. Грязь ниже копейки отвергается, а не округляется.
 *  2. ЧИСЛА СОВПАДАЮТ С ЖИВОЙ БАЗОЙ. Фикстура — не выдумка: это десять строк
 *     `treatment_items` и восемь строк `payments` клиники
 *     d0000000-…-00000000d001, выгруженные 2026-07-29. Модуль обязан выдать на
 *     них ровно те 53 000,00 / 1 600,00 / 51 400,00, которые печатает прямой SQL.
 *  3. КАЖДОЕ РАСХОЖДЕНИЕ ВОСПРОИЗВЕДЕНО РЯДОМ. Для каждой из девяти прежних
 *     формул здесь стоит её арифметика в чистом виде, и тест показывает ЧИСЛОМ,
 *     чем её ответ отличается от канонического. Иначе «канон» — это слово, а не
 *     проверяемое утверждение: тест, который просто вызывает мою функцию, прошёл
 *     бы и на неверной формуле.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Живые строки клиники d0000000-0000-4000-8000-00000000d001 (выгрузка 2026-07-29)
//
// $ psql -c "select right(patient_id::text,4), right(visit_id::text,4), status,
//            unit_price_rub::text, quantity::text, discount_rub::text
//            from treatment_items …"
//
// Суммы записаны ТЕКСТОМ, ровно как их отдаёт колонка numeric(12,2): фикстура,
// переписанная в число, проверяла бы уже испорченные данные.
//
// ПРИВЯЗКА К ПРИЁМУ (`visitId`) добавлена 2026-07-29 тем же прогоном: в живой базе
// её несут ВСЕ 10 позиций и ВСЕ 8 оплат, и без неё фикстура была беднее таблицы.
// Вопросы про пациента и клинику это поле не читают — их ответы не изменились ни
// на копейку, что и проверяют прежние наборы ниже.
//
// ЭТО СНИМОК ДО ПРИВЕДЕНИЯ ЦЕН К ПРАЙСУ, И ОБНОВЛЯТЬ ЕГО НЕ НАДО. Позже в тот же
// день демо-цены исправили по прайсу (коммит 4759d63f0: `7200.00` стало `7200.50`,
// `14800.00` — `14800.99`), поэтому суммы ниже живой базе больше НЕ равны. Это не
// устаревшая фикстура, а нарочно замороженный набор круглых чисел: на нём стоят
// проверки, где важна арифметика, а не копейки. Числа ПОСЛЕ правки прайса — и
// вместе с ними единственный в базе долг меньше рубля — живут отдельным набором
// внизу файла (`SUB_THRESHOLD_LIVE`), и именно он ловит потерю копейки. Переписать
// суммы здесь значит потерять сравнение «круглые числа против копеек», на котором
// видно, почему дефект прожил незамеченным.
// ─────────────────────────────────────────────────────────────────────────────

const LIVE_CHARGES: readonly TreatmentChargeRow[] = [
	{
		patientId: "0100",
		visitId: "0405",
		status: "completed",
		unitPriceRub: "5400.00",
		quantity: 1,
		discountRub: "800.00",
	},
	{
		patientId: "0101",
		visitId: "0406",
		status: "completed",
		unitPriceRub: "14800.00",
		quantity: 1,
		discountRub: "0.00",
	},
	{
		patientId: "0101",
		visitId: "0400",
		status: "completed",
		unitPriceRub: "7200.00",
		quantity: 1,
		discountRub: "800.00",
	},
	{
		patientId: "0102",
		visitId: "0401",
		status: "completed",
		unitPriceRub: "5400.00",
		quantity: 1,
		discountRub: "0.00",
	},
	{
		patientId: "0103",
		visitId: "0402",
		status: "completed",
		unitPriceRub: "14800.00",
		quantity: 1,
		discountRub: "0.00",
	},
	{
		patientId: "0103",
		visitId: "0407",
		status: "completed",
		unitPriceRub: "26500.00",
		quantity: 1,
		discountRub: "0.00",
	},
	{
		patientId: "0104",
		visitId: "0403",
		status: "completed",
		unitPriceRub: "26500.00",
		quantity: 1,
		discountRub: "0.00",
	},
	{
		patientId: "0104",
		visitId: "0408",
		status: "completed",
		unitPriceRub: "7200.00",
		quantity: 1,
		discountRub: "0.00",
	},
	{
		patientId: "0105",
		visitId: "0409",
		status: "completed",
		unitPriceRub: "5400.00",
		quantity: 1,
		discountRub: "0.00",
	},
	{
		patientId: "0106",
		visitId: "0404",
		status: "completed",
		unitPriceRub: "7200.00",
		quantity: 1,
		discountRub: "0.00",
	},
];

const LIVE_PAYMENTS: readonly PaymentRow[] = [
	{ patientId: "0100", visitId: "0405", status: "paid", amountRub: "5400.00" },
	{ patientId: "0101", visitId: "0406", status: "paid", amountRub: "14800.00" },
	{ patientId: "0101", visitId: "0400", status: "paid", amountRub: "7200.00" },
	{ patientId: "0102", visitId: "0401", status: "paid", amountRub: "5400.00" },
	{ patientId: "0103", visitId: "0402", status: "paid", amountRub: "14800.00" },
	{ patientId: "0104", visitId: "0408", status: "paid", amountRub: "7200.00" },
	{ patientId: "0105", visitId: "0409", status: "paid", amountRub: "5400.00" },
	{ patientId: "0106", visitId: "0404", status: "paid", amountRub: "7200.00" },
];

/**
 * Разделитель разрядов, который `toLocaleString("ru-RU")` реально печатает, —
 * НЕРАЗРЫВНЫЙ пробел U+00A0, а не обычный.
 *
 * Это моя собственная ошибка на первом прогоне: в тесте стоял литерал
 * `"3 100,50"` с ASCII-пробелом, и падение выглядело как `'3 100,50' !==
 * '3 100,50'` — два визуально одинаковых значения. Для суммы это правильное
 * поведение (сумма не должна разрываться на две строки при переносе), поэтому
 * код точки здесь проверяется явно, а не обходится нормализацией.
 *
 * Значение берётся из `@dental/shared` (`RU_MONEY_NBSP`), а не пишется литералом:
 * невидимый символ в исходнике глазами не отличить от обычного пробела, и
 * общий модуль хранит его escape-последовательностью именно поэтому.
 */
const NBSP = RU_MONEY_NBSP;

/** Итоги прямого SQL к живой базе, против которых сверяется модуль. */
const LIVE_SQL = {
	plannedKopecks: 11_880_000, // 118 800,00
	paidKopecks: 6_740_000, //  67 400,00
	receivableKopecks: 5_300_000, //  53 000,00 — отчёт дебиторки
	refundLiabilityKopecks: 160_000, //   1 600,00 — переплаты двух пациентов
	netUncollectedKopecks: 5_140_000, //  51 400,00 — главный экран
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 1. КОПЕЙКИ
// ═══════════════════════════════════════════════════════════════════════════

describe("копейки: разбор текста колонки numeric", () => {
	test("1500,50 разбирается в 150050 копеек и возвращается тем же текстом", () => {
		const kopecks = kopecksFromNumericText("1500.50");
		assert.strictEqual(kopecks, 150_050);
		assert.strictEqual(debtNumericText(kopecks), "1500.50");
	});

	test("один знак дробной части дополняется до двух, а не отбрасывается", () => {
		assert.strictEqual(kopecksFromNumericText("3100.5"), 310_050);
		// Именно это место в отчётах печаталось как «3 100,5» и читалось как
		// другая сумма.
		assert.strictEqual(debtNumericText(310_050), "3100.50");
		// Печать — общая formatKopecksRu из @dental/shared, своей у модуля нет.
		assert.strictEqual(formatKopecksRu(310_050), `3${NBSP}100,50${NBSP}₽`);
		// Разделитель обязан быть неразрывным: сумма не должна переноситься.
		assert.strictEqual(formatKopecksRu(310_050).charCodeAt(1), 0x00a0);
	});

	test("отрицательная сумма допустима: это переплата, а не ошибка", () => {
		assert.strictEqual(kopecksFromNumericText("-800.00"), -80_000);
		assert.strictEqual(debtNumericText(-80_000), "-800.00");
	});

	test("ноль, целое и одна копейка", () => {
		assert.strictEqual(kopecksFromNumericText("0"), 0);
		assert.strictEqual(kopecksFromNumericText("0.00"), 0);
		assert.strictEqual(kopecksFromNumericText("0.01"), 1);
		assert.strictEqual(kopecksFromNumericText("118800.00"), 11_880_000);
		assert.strictEqual(debtNumericText(1), "0.01");
	});

	test("round-trip: текст -> копейки -> текст неизменен на всех живых суммах", () => {
		for (const text of [
			"0.00",
			"0.01",
			"800.00",
			"1500.50",
			"1990.99",
			"3491.49",
			"5400.00",
			"26500.00",
			"53000.00",
			"99999.99",
			"-1600.00",
		]) {
			assert.strictEqual(
				debtNumericText(kopecksFromNumericText(text)),
				text.includes(".") ? text : `${text}.00`,
				`round-trip сломался на ${text}`,
			);
		}
	});
});

describe("копейки: грязь ниже копейки — это ПРОВАЛ, а не «то же самое»", () => {
	test("третий знак после запятой отвергается, а не округляется", () => {
		assert.throws(
			() => kopecksFromNumericText("1500.505"),
			MoneyPrecisionError,
			"1500,505 обязано быть отвергнуто: numeric(12,2) обрежет его молча",
		);
		assert.throws(() => kopecksFromRubles(1500.505), MoneyPrecisionError);
	});

	test("4500.299999999999 отвергается: это не «почти 4500,30», это след float", () => {
		// Ровно то, что даёт 1500.10 * 3 в плавающей точке.
		assert.strictEqual(1500.1 * 3, 4500.299999999999);
		assert.throws(() => kopecksFromRubles(1500.1 * 3), MoneyPrecisionError);
	});

	test("3491.4900000000002 отвергается — это провал, а не 3491,49", () => {
		// Три реальные суммы в рублях, чей float-итог грязный.
		const dirty = 1000.0 + 1001.82 + 1489.67;
		assert.strictEqual(dirty, 3491.4900000000002);
		assert.throws(() => kopecksFromRubles(dirty), MoneyPrecisionError);

		// А тот же расчёт в копейках даёт ровно 3 491,49 — без единого шанса на грязь.
		const clean =
			kopecksFromNumericText("1000.00") +
			kopecksFromNumericText("1001.82") +
			kopecksFromNumericText("1489.67");
		assert.strictEqual(clean, 349_149);
		assert.strictEqual(debtNumericText(clean), "3491.49");
	});

	test("0.30000000000000004 отвергается", () => {
		assert.strictEqual(0.1 + 0.2, 0.30000000000000004);
		assert.throws(() => kopecksFromRubles(0.1 + 0.2), MoneyPrecisionError);
		assert.strictEqual(
			kopecksFromNumericText("0.10") + kopecksFromNumericText("0.20"),
			30,
		);
	});

	test("мусор, пустая строка, NaN, Infinity и экспонента отвергаются", () => {
		for (const bad of [
			"",
			"   ",
			"abc",
			"1 500,50",
			"1500,50",
			"1e3",
			"NaN",
			"Infinity",
			"--5",
		]) {
			assert.throws(
				() => kopecksFromNumericText(bad),
				MoneyPrecisionError,
				`«${bad}» не должно приниматься`,
			);
		}
		for (const bad of [
			Number.NaN,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
			1e21,
		]) {
			assert.throws(
				() => kopecksFromRubles(bad),
				MoneyPrecisionError,
				`${bad} не должно приниматься`,
			);
		}
	});

	test("чистые рубли принимаются: 1500,5 — законная сумма в кассе", () => {
		assert.strictEqual(kopecksFromRubles(1500.5), 150_050);
		assert.strictEqual(kopecksFromRubles(1990.99), 199_099);
		assert.strictEqual(kopecksFromRubles(0.01), 1);
		assert.strictEqual(kopecksFromRubles(-800), -80_000);
		assert.strictEqual(rublesFromKopecks(150_050), 1500.5);
	});
});

describe("копейки: требование задачи — 1500,50 + 1990,99 = ровно 3491,49", () => {
	test("сумма двух оплат даёт ровно 3491,49 и текстом, и копейками", () => {
		const first = kopecksFromNumericText("1500.50");
		const second = kopecksFromNumericText("1990.99");
		const total = first + second;

		assert.strictEqual(total, 349_149);
		assert.strictEqual(debtNumericText(total), "3491.49");
		assert.strictEqual(rublesFromKopecks(total), 3491.49);
		assert.strictEqual(formatKopecksRu(total), `3${NBSP}491,49${NBSP}₽`);
	});

	test("та же сумма через сальдо пациента: назначено 3491,49 − оплачено 1500,50", () => {
		const ledger = buildPatientLedger(
			"p1",
			[
				{
					patientId: "p1",
					status: "proposed",
					unitPriceRub: "1500.50",
					quantity: 1,
					discountRub: "0.00",
				},
				{
					patientId: "p1",
					status: "proposed",
					unitPriceRub: "1990.99",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[{ patientId: "p1", status: "paid", amountRub: "1500.50" }],
		);

		assert.strictEqual(ledger.chargedKopecks, 349_149);
		assert.strictEqual(ledger.paidKopecks, 150_050);
		assert.strictEqual(ledger.balanceKopecks, 199_099);
		assert.strictEqual(
			debtNumericText(patientOwesClinicKopecks(ledger)),
			"1990.99",
		);
		assert.strictEqual(clinicOwesPatientKopecks(ledger), 0);
	});

	test("итог РАВЕН сумме частей: 1500,10 × 3 не даёт хвоста", () => {
		const line = chargeLineKopecks({
			patientId: "p1",
			status: "proposed",
			unitPriceRub: "1500.10",
			quantity: 3,
			discountRub: "0.00",
		});
		assert.strictEqual(line, 450_030);
		assert.strictEqual(debtNumericText(line), "4500.30");
		// Прежняя формула в плавающей точке на этой же строке:
		assert.strictEqual(1500.1 * 3, 4500.299999999999);
		assert.notStrictEqual(1500.1 * 3, 4500.3);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. ЖИВЫЕ ЧИСЛА
// ═══════════════════════════════════════════════════════════════════════════

describe("живая база: модуль повторяет числа прямого SQL", () => {
	const ledgers = buildPatientLedgers(LIVE_CHARGES, LIVE_PAYMENTS);
	const totals = clinicDebtTotals(ledgers);

	test("семь пациентов, назначено 118 800,00 и оплачено 67 400,00", () => {
		assert.strictEqual(ledgers.size, 7);
		const charged = [...ledgers.values()].reduce(
			(sum, l) => sum + l.chargedKopecks,
			0,
		);
		const paid = [...ledgers.values()].reduce(
			(sum, l) => sum + l.paidKopecks,
			0,
		);
		assert.strictEqual(charged, LIVE_SQL.plannedKopecks);
		assert.strictEqual(paid, LIVE_SQL.paidKopecks);
	});

	test("сальдо по каждому пациенту совпадает с построчным SQL", () => {
		const expected: Record<string, [string, string, string]> = {
			// пациент: [назначено, оплачено, сальдо]
			"0100": ["4600.00", "5400.00", "-800.00"],
			"0101": ["21200.00", "22000.00", "-800.00"],
			"0102": ["5400.00", "5400.00", "0.00"],
			"0103": ["41300.00", "14800.00", "26500.00"],
			"0104": ["33700.00", "7200.00", "26500.00"],
			"0105": ["5400.00", "5400.00", "0.00"],
			"0106": ["7200.00", "7200.00", "0.00"],
		};
		for (const [patientId, [charged, paid, balance]] of Object.entries(
			expected,
		)) {
			const ledger = ledgers.get(patientId);
			assert.ok(ledger, `пациент ${patientId} потерян`);
			assert.strictEqual(
				debtNumericText(ledger.chargedKopecks),
				charged,
				patientId,
			);
			assert.strictEqual(debtNumericText(ledger.paidKopecks), paid, patientId);
			assert.strictEqual(
				debtNumericText(ledger.balanceKopecks),
				balance,
				patientId,
			);
		}
	});

	test("дебиторка = 53 000,00 у двух должников — как в отчёте", () => {
		assert.strictEqual(totals.receivableKopecks, LIVE_SQL.receivableKopecks);
		assert.strictEqual(debtNumericText(totals.receivableKopecks), "53000.00");
		assert.strictEqual(totals.debtorCount, 2);
	});

	test("клиника должна вернуть 1 600,00 двум пациентам — их не видел ни один экран", () => {
		assert.strictEqual(
			totals.refundLiabilityKopecks,
			LIVE_SQL.refundLiabilityKopecks,
		);
		assert.strictEqual(
			debtNumericText(totals.refundLiabilityKopecks),
			"1600.00",
		);
		assert.strictEqual(totals.overpaidCount, 2);
	});

	test("не собрано нетто = 51 400,00 — как на главном экране", () => {
		assert.strictEqual(
			totals.netUncollectedKopecks,
			LIVE_SQL.netUncollectedKopecks,
		);
		assert.strictEqual(
			debtNumericText(totals.netUncollectedKopecks),
			"51400.00",
		);
	});

	test("РАСХОЖДЕНИЕ ДВУХ ЭКРАНОВ равно переплатам ровно, а не приблизительно", () => {
		const gap = totals.receivableKopecks - totals.netUncollectedKopecks;
		assert.strictEqual(gap, totals.refundLiabilityKopecks);
		assert.strictEqual(debtNumericText(gap), "1600.00");
	});

	test("объяснение для оператора называет обе величины и печатает копейки", () => {
		const text = explainDebtTotals(totals);
		assert.ok(text.includes(`53${NBSP}000,00`), text);
		assert.ok(text.includes(`1${NBSP}600,00`), text);
		assert.ok(text.includes(`51${NBSP}400,00`), text);
		assert.match(text, /РАЗНЫЕ величины/);
	});

	test("порог не молчит: с нулевым порогом итоги те же, порог виден в ответе", () => {
		assert.strictEqual(
			totals.significanceKopecks,
			DEFAULT_SIGNIFICANCE_KOPECKS,
		);
		const exact = clinicDebtTotals(ledgers, { significanceKopecks: 0 });
		assert.strictEqual(exact.receivableKopecks, LIVE_SQL.receivableKopecks);
		assert.strictEqual(
			exact.refundLiabilityKopecks,
			LIVE_SQL.refundLiabilityKopecks,
		);
		assert.strictEqual(exact.significanceKopecks, 0);
	});

	test("порог 1 ₽ прячет копеечный долг, и это видно числом", () => {
		const kopeckDebt = buildPatientLedgers(
			[
				{
					patientId: "p1",
					status: "proposed",
					unitPriceRub: "100.50",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[{ patientId: "p1", status: "paid", amountRub: "100.00" }],
		);
		assert.strictEqual(clinicDebtTotals(kopeckDebt).receivableKopecks, 0);
		assert.strictEqual(
			clinicDebtTotals(kopeckDebt, { significanceKopecks: 0 })
				.receivableKopecks,
			50,
		);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. КАЖДОЕ РАСХОЖДЕНИЕ ВОСПРОИЗВЕДЕНО РЯДОМ
//
// Ниже — арифметика каждой прежней формулы в чистом виде. Если моя формула
// когда-нибудь сползёт к любой из них, эти тесты упадут; если сползёт прежняя,
// тест продолжит показывать разницу числом. Одиночная проверка «моя функция
// вернула 53000» этого не даёт: она прошла бы и на неверной формуле.
// ═══════════════════════════════════════════════════════════════════════════

describe("против sampleData.ts:1349 buildBillingSummary — нетто по клинике", () => {
	test("клиника-нетто и дебиторка на живых данных дают РАЗНЫЕ числа", () => {
		const ledgers = buildPatientLedgers(LIVE_CHARGES, LIVE_PAYMENTS);
		const totals = clinicDebtTotals(ledgers);

		// Прежняя формула дословно: max(0, Σназначено − Σоплачено) по всей клинике.
		const legacy = Math.max(0, LIVE_SQL.plannedKopecks - LIVE_SQL.paidKopecks);

		assert.strictEqual(
			legacy,
			5_140_000,
			"прежняя формула обязана давать 51 400,00",
		);
		assert.strictEqual(
			totals.netUncollectedKopecks,
			legacy,
			"она равна нетто, а не долгу",
		);
		assert.notStrictEqual(
			totals.receivableKopecks,
			legacy,
			"дебиторка НЕ равна нетто — в этом и была ошибка на главном экране",
		);
		assert.strictEqual(totals.receivableKopecks - legacy, 160_000);
	});

	test("Math.max(0, …) прежнего итога прячет случай «клиника должна больше»", () => {
		// Один должник на 100 ₽ и один переплативший на 1 000 ₽.
		const ledgers = buildPatientLedgers(
			[
				{
					patientId: "d",
					status: "proposed",
					unitPriceRub: "100.00",
					quantity: 1,
					discountRub: "0.00",
				},
				{
					patientId: "o",
					status: "proposed",
					unitPriceRub: "0.00",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[{ patientId: "o", status: "paid", amountRub: "1000.00" }],
		);
		const totals = clinicDebtTotals(ledgers);

		assert.strictEqual(debtNumericText(totals.receivableKopecks), "100.00");
		assert.strictEqual(
			debtNumericText(totals.refundLiabilityKopecks),
			"1000.00",
		);
		// Моё нетто честно отрицательное; прежняя формула показала бы ноль.
		assert.strictEqual(
			debtNumericText(totals.netUncollectedKopecks),
			"-900.00",
		);
		assert.strictEqual(Math.max(0, totals.netUncollectedKopecks), 0);
	});
});

describe("против sampleData_opt.ts:1087 — та же формула без округления", () => {
	test("мёртвая копия расходится с каноном ровно на копейках", () => {
		const items = [
			{ price: 1500.1, quantity: 3, discount: 0 },
			{ price: 1990.99, quantity: 1, discount: 0 },
		];
		// sampleData_opt: ни одного округления.
		const opt = items.reduce(
			(sum, i) => sum + Math.max(0, i.price * i.quantity - i.discount),
			0,
		);
		// Мой расчёт: целые копейки.
		const canon =
			chargeLineKopecks({
				patientId: "p",
				status: "proposed",
				unitPriceRub: "1500.10",
				quantity: 3,
				discountRub: "0.00",
			}) +
			chargeLineKopecks({
				patientId: "p",
				status: "proposed",
				unitPriceRub: "1990.99",
				quantity: 1,
				discountRub: "0.00",
			});

		assert.strictEqual(opt, 6491.289999999999);
		assert.strictEqual(canon, 649_129);
		assert.strictEqual(debtNumericText(canon), "6491.29");
		assert.notStrictEqual(opt, 6491.29);
		// Именно такое значение и отвергает контракт moneyRubSchema.
		assert.throws(() => kopecksFromRubles(opt), MoneyPrecisionError);
	});
});

describe("против domainStateHydration.ts:546 — Math.round до целого рубля", () => {
	test("округление несимметрично по знаку: 50 копеек то прощают, то приписывают", () => {
		// Прежняя формула: Math.round(оплачено − назначено), результат в рублях.
		assert.strictEqual(
			Math.round(-49_899.5),
			-49_899,
			"должнику 50 копеек прощены",
		);
		assert.strictEqual(
			Math.round(49_899.5),
			49_900,
			"переплатившему 50 копеек приписаны",
		);
	});

	test("на сумме из сквозной проверки (оплата 1500,50) теряется ровно 50 копеек", () => {
		const ledger = buildPatientLedger(
			"p1",
			[
				{
					patientId: "p1",
					status: "proposed",
					unitPriceRub: "51400.00",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[{ patientId: "p1", status: "paid", amountRub: "1500.50" }],
		);

		assert.strictEqual(debtNumericText(ledger.balanceKopecks), "49899.50");

		// Прежний путь: сальдо с обратным знаком, округлённое до рубля.
		const legacyBalanceRub = Math.round(
			rublesFromKopecks(ledger.paidKopecks) -
				rublesFromKopecks(ledger.chargedKopecks),
		);
		assert.strictEqual(legacyBalanceRub, -49_899);

		// Мой ответ в тех же рублях — точный.
		const exactRub = rublesFromKopecks(-ledger.balanceKopecks);
		assert.strictEqual(exactRub, -49_899.5);
		assert.strictEqual(Math.abs(legacyBalanceRub - exactRub), 0.5);
	});

	test("знак: у меня положительное сальдо = долг пациента, у прежнего — наоборот", () => {
		const ledger = buildPatientLedger(
			"p1",
			[
				{
					patientId: "p1",
					status: "proposed",
					unitPriceRub: "1000.00",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[],
		);
		assert.strictEqual(ledger.balanceKopecks, 100_000);
		assert.strictEqual(patientOwesClinicKopecks(ledger), 100_000);
		assert.strictEqual(clinicOwesPatientKopecks(ledger), 0);
	});
});

describe("против patientsQuery.ts:67 — balanceRub: 0", () => {
	test("на живых данных константа врёт семь раз из семи", () => {
		const ledgers = buildPatientLedgers(LIVE_CHARGES, LIVE_PAYMENTS);
		const nonZero = [...ledgers.values()].filter((l) => l.balanceKopecks !== 0);
		assert.strictEqual(ledgers.size, 7);
		assert.strictEqual(
			nonZero.length,
			4,
			"четверо с ненулевым сальдо: два по 26 500 и два по −800",
		);
		for (const ledger of nonZero) {
			assert.notStrictEqual(
				ledger.balanceKopecks,
				0,
				`у ${ledger.patientId} сальдо не ноль, а константа даёт 0`,
			);
		}
	});
});

/*
 * ШЕСТОЙ ОТВЕТ: сальдо карточки со знаком, которым его объявил общий контракт.
 *
 * Проверяется не «функция что-то вернула», а три утверждения, каждое из которых
 * может не сойтись независимо от остальных:
 *   1. Знак совпадает с тем, что печатает ЖИВОЙ второй производитель того же
 *      поля (гидратация сводки): минус — долг, плюс — переплата.
 *   2. Это НЕ третий расчёт: на всех живых сальдо значение побитово равно
 *      разности двух уже существующих ответов.
 *   3. Копейки доживают до рублей контракта — прежний производитель терял их на
 *      `Math.round` до целого рубля, и потеря несимметрична по знаку.
 */
describe("шестой ответ: сальдо карточки пациента со знаком контракта", () => {
	const ledgers = buildPatientLedgers(LIVE_CHARGES, LIVE_PAYMENTS);

	test("знак тот же, что у живой гидратации: должник в минусе, переплативший в плюсе", () => {
		/*
		 * Числа — не выдумка, а вывод боевого маршрута GET /api/dashboard по
		 * клинике d0000000-…-d001 (замер 2026-07-29, поле dashboard.patients[].
		 * balanceRub, производитель — db/domainStateHydration.ts):
		 *     0100=800, 0101=800, 0103=-26500, 0104=-26500.
		 * Если карточка начнёт печатать канонический знак, тот же пациент окажется
		 * должником на одном экране и переплатившим на другом.
		 */
		const expected: Record<string, number> = {
			"0100": 800,
			"0101": 800,
			"0102": 0,
			"0103": -26_500,
			"0104": -26_500,
			"0105": 0,
			"0106": 0,
		};
		for (const [patientId, rubles] of Object.entries(expected)) {
			const ledger = ledgers.get(patientId);
			assert.ok(ledger, `пациент ${patientId} потерян`);
			assert.strictEqual(
				rublesFromKopecks(patientAccountBalanceKopecks(ledger)),
				rubles,
				`сальдо карточки пациента ${patientId} разошлось с живым замером гидратации`,
			);
		}
	});

	test("рассчитавшийся пациент получает НОЛЬ, а не отрицательный ноль", () => {
		/*
		 * Ловушка, найденная этим тестом на первом прогоне: `-ledger.balanceKopecks`
		 * на нулевом сальдо даёт -0. `Object.is(-0, 0)` — false, а
		 * `(-0).toLocaleString("ru-RU")` печатает «-0», то есть пациент, рассчитавшийся
		 * до копейки, увидел бы в карточке «−0 ₽».
		 */
		const settled = ledgers.get("0102");
		assert.ok(settled);
		assert.strictEqual(settled.balanceKopecks, 0);
		const card = patientAccountBalanceKopecks(settled);
		assert.strictEqual(card, 0);
		assert.ok(
			Object.is(card, 0),
			"сальдо карточки — отрицательный ноль: сравнение с нулём станет ложным, а печать даст «-0»",
		);
		assert.strictEqual(rublesFromKopecks(card).toLocaleString("ru-RU"), "0");
	});

	test("это не третий расчёт: величина равна разности двух прежних ответов", () => {
		for (const ledger of ledgers.values()) {
			assert.strictEqual(
				patientAccountBalanceKopecks(ledger),
				clinicOwesPatientKopecks(ledger) - patientOwesClinicKopecks(ledger),
				`у ${ledger.patientId} сальдо карточки не выводится из двух ответов дома — значит завелась новая формула`,
			);
			// И обратно: сумма долга и переплаты равна модулю сальдо, то есть
			// ненулевым может быть только одно из двух.
			assert.strictEqual(
				patientOwesClinicKopecks(ledger) + clinicOwesPatientKopecks(ledger),
				Math.abs(ledger.balanceKopecks),
				`у ${ledger.patientId} долг и переплата ненулевые одновременно`,
			);
		}
	});

	test("копейки доживают до карточки, а прежний Math.round их терял", () => {
		// Долг 49 899,50 ₽: назначено 53 000,00, оплачено 3 100,50.
		const ledger = buildPatientLedger(
			"p1",
			[
				{
					patientId: "p1",
					status: "completed",
					unitPriceRub: "53000.00",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[{ patientId: "p1", status: "paid", amountRub: "3100.50" }],
		);
		const cardKopecks = patientAccountBalanceKopecks(ledger);
		assert.strictEqual(cardKopecks, -4_989_950);
		assert.strictEqual(debtNumericText(cardKopecks), "-49899.50");
		assert.strictEqual(rublesFromKopecks(cardKopecks), -49_899.5);

		// Прежний производитель: Math.round(оплачено − назначено).
		const legacyRounded = Math.round(3100.5 - 53_000);
		assert.strictEqual(legacyRounded, -49_899);
		assert.strictEqual(
			rublesFromKopecks(cardKopecks) - legacyRounded,
			-0.5,
			"прежний расчёт прощал должнику 50 копеек — на переплате он их, наоборот, приписывал",
		);
		assert.strictEqual(Math.round(49_899.5), 49_900);
	});

	test("согласие с итогами клиники: сумма карточек равна нетто со обратным знаком", () => {
		/*
		 * Продолжение проверки согласия: до этого сходимость проверялась по
		 * дебиторке и возвратам, а карточка в ней не участвовала. Теперь
		 * участвует, и с нулевым порогом — потому что порог значимости отбрасывает
		 * копеечные суммы, а сумма карточек их содержит.
		 */
		const cardSum = [...ledgers.values()].reduce(
			(sum, ledger) => sum + patientAccountBalanceKopecks(ledger),
			0,
		);
		const totals = clinicDebtTotals(ledgers, { significanceKopecks: 0 });
		assert.strictEqual(cardSum, -totals.netUncollectedKopecks);
		assert.strictEqual(debtNumericText(cardSum), "-51400.00");
		assert.strictEqual(
			debtNumericText(totals.netUncollectedKopecks),
			"51400.00",
		);
	});
});

describe("против sampleData.ts:1720 patientInsight — пропущенный фильтр cancelled", () => {
	test("отменённая позиция не попадает в долг, а прежняя формула её считала", () => {
		const charges: TreatmentChargeRow[] = [
			{
				patientId: "p1",
				status: "completed",
				unitPriceRub: "5000.00",
				quantity: 1,
				discountRub: "0.00",
			},
			{
				patientId: "p1",
				status: "cancelled",
				unitPriceRub: "26500.00",
				quantity: 1,
				discountRub: "0.00",
			},
		];
		const ledger = buildPatientLedger("p1", charges, []);
		assert.strictEqual(debtNumericText(ledger.chargedKopecks), "5000.00");

		// Прежняя формула: groupByPatientId(treatmentPlanItems) без фильтра статуса.
		const legacyCharged = charges.reduce(
			(sum, row) =>
				sum +
				Math.max(
					0,
					Number(row.unitPriceRub) * Number(row.quantity) -
						Number(row.discountRub),
				),
			0,
		);
		assert.strictEqual(legacyCharged, 31_500);
		assert.strictEqual(rublesFromKopecks(ledger.chargedKopecks), 5_000);
		// 26 500 ₽ отменённого лечения висели на пациенте долгом.
		assert.strictEqual(
			legacyCharged - rublesFromKopecks(ledger.chargedKopecks),
			26_500,
		);
	});

	test("платёж не в статусе paid в оплаченное не идёт", () => {
		const ledger = buildPatientLedger(
			"p1",
			[
				{
					patientId: "p1",
					status: "proposed",
					unitPriceRub: "1000.00",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[
				{ patientId: "p1", status: "pending", amountRub: "1000.00" },
				{ patientId: "p1", status: "refunded", amountRub: "500.00" },
			],
		);
		assert.strictEqual(ledger.paidKopecks, 0);
		assert.strictEqual(debtNumericText(ledger.balanceKopecks), "1000.00");
	});
});

describe("против sampleData.ts:8548 — Math.round долга в ключе идемпотентности", () => {
	test("доплата 40 копеек меняет долг, но НЕ меняла прежний ключ напоминания", () => {
		const legacyKey = (rub: number) =>
			`payment-reminder:p1:${Math.max(0, Math.round(rub))}`;
		assert.strictEqual(legacyKey(1000.5), legacyKey(1000.51));
		assert.strictEqual(legacyKey(1000.1), legacyKey(1000.49));
		// Мой ключ — по копейкам, поэтому разные долги дают разные ключи.
		const exactKey = (kopecks: number) =>
			`payment-reminder:p1:${debtNumericText(kopecks)}`;
		assert.notStrictEqual(exactKey(100_010), exactKey(100_049));
	});

	test("и наоборот: одна копейка через границу полурубля рождала новый ключ", () => {
		const legacyKey = (rub: number) =>
			`payment-reminder:p1:${Math.max(0, Math.round(rub))}`;
		assert.strictEqual(Math.round(1000.49), 1000);
		assert.strictEqual(Math.round(1000.5), 1001);
		assert.notStrictEqual(legacyKey(1000.49), legacyKey(1000.5));
	});
});

describe("против TreatmentPlanBuilder.ts:128 — (цена − скидка) × количество", () => {
	test("на живых строках со скидкой при количестве 2 расхождение 1 600,00 ₽", () => {
		// Две живые строки несут скидку 800 ₽: 7200−800 и 5400−800.
		const discounted = LIVE_CHARGES.filter(
			(row) => row.discountRub !== "0.00",
		).map((row) => ({
			...row,
			quantity: 2,
		}));
		assert.strictEqual(discounted.length, 2);

		const canon = discounted.reduce(
			(sum, row) => sum + chargeLineKopecks(row),
			0,
		);
		// Формула TreatmentPlanBuilder: (цена − скидка) × количество.
		const tpb = discounted.reduce(
			(sum, row) =>
				sum +
				(kopecksFromNumericText(String(row.unitPriceRub)) -
					kopecksFromNumericText(String(row.discountRub))) *
					Number(row.quantity),
			0,
		);

		assert.strictEqual(debtNumericText(canon), "23600.00");
		assert.strictEqual(debtNumericText(tpb), "22000.00");
		assert.strictEqual(debtNumericText(canon - tpb), "1600.00");
	});

	test("расхождение равно скидка × (количество − 1) на любом количестве", () => {
		for (const quantity of [1, 2, 3, 10]) {
			const row: TreatmentChargeRow = {
				patientId: "p1",
				status: "proposed",
				unitPriceRub: "7200.00",
				quantity,
				discountRub: "800.00",
			};
			const canon = chargeLineKopecks(row);
			const tpb = (720_000 - 80_000) * quantity;
			assert.strictEqual(
				canon - tpb,
				80_000 * (quantity - 1),
				`количество ${quantity}`,
			);
		}
	});

	test("строка не уходит в минус: скидка больше цены даёт 0, а не отрицательную сумму", () => {
		const line = chargeLineKopecks({
			patientId: "p1",
			status: "proposed",
			unitPriceRub: "1000.00",
			quantity: 1,
			discountRub: "1500.00",
		});
		assert.strictEqual(line, 0);
		// TreatmentPlanBuilder зажима не имеет: та же строка уменьшила бы итог акта.
		assert.strictEqual((100_000 - 150_000) * 1, -50_000);
	});
});

describe("количество: контракт вместо трёх молчаливых догадок", () => {
	test("дробное количество отвергается, а не округляется", () => {
		assert.throws(
			() =>
				chargeLineKopecks({
					patientId: "p1",
					status: "proposed",
					unitPriceRub: "1000.00",
					quantity: 1.5,
					discountRub: "0.00",
				}),
			QuantityContractError,
		);
		// Три прежних места дали бы на 1,5 три разных ответа:
		assert.strictEqual(1000 * Math.max(1, 1.5), 1500); // SQL: greatest(quantity, 1)
		assert.strictEqual(1000 * Math.round(1.5), 2000); // domainStateHydration
		assert.strictEqual(1000 * 1.5, 1500); // sampleData, сырое количество
	});

	test("ноль и отрицательное количество отвергаются, а не подменяются единицей", () => {
		for (const quantity of [0, -1]) {
			assert.throws(
				() =>
					chargeLineKopecks({
						patientId: "p1",
						status: "proposed",
						unitPriceRub: "1000.00",
						quantity,
						discountRub: "0.00",
					}),
				QuantityContractError,
				`количество ${quantity}`,
			);
		}
		// Канон подставил бы 1 и выставил счёт за единицу, которой в позиции нет.
		assert.strictEqual(Math.max(1, 0), 1);
	});

	test("количество текстом колонки numeric принимается, если целое", () => {
		const line = chargeLineKopecks({
			patientId: "p1",
			status: "proposed",
			unitPriceRub: "1000.00",
			quantity: "2.00",
			discountRub: "0.00",
		});
		assert.strictEqual(debtNumericText(line), "2000.00");
	});
});

describe("переплата видна как отдельная величина, а не как ноль", () => {
	test("два пациента с одинаковым нулевым долгом различимы", () => {
		const ledgers = buildPatientLedgers(LIVE_CHARGES, LIVE_PAYMENTS);
		const settled = ledgers.get("0102");
		const overpaid = ledgers.get("0100");
		assert.ok(settled && overpaid);

		// Прежний ответ на вопрос «сколько должен» у обоих одинаковый — ноль.
		assert.strictEqual(patientOwesClinicKopecks(settled), 0);
		assert.strictEqual(patientOwesClinicKopecks(overpaid), 0);
		// Второй вопрос их разделяет.
		assert.strictEqual(clinicOwesPatientKopecks(settled), 0);
		assert.strictEqual(
			debtNumericText(clinicOwesPatientKopecks(overpaid)),
			"800.00",
		);
	});

	test("пациент, заплативший вперёд без назначений, не теряется", () => {
		// Соединение по позициям лечения его бы не увидело вовсе.
		const ledgers = buildPatientLedgers(
			[],
			[{ patientId: "new", status: "paid", amountRub: "1500.50" }],
		);
		const ledger = ledgers.get("new");
		assert.ok(ledger, "пациент только с платежом обязан присутствовать");
		assert.strictEqual(ledger.chargedKopecks, 0);
		assert.strictEqual(
			debtNumericText(clinicOwesPatientKopecks(ledger)),
			"1500.50",
		);

		const totals = clinicDebtTotals(ledgers);
		assert.strictEqual(totals.receivableKopecks, 0);
		assert.strictEqual(
			debtNumericText(totals.refundLiabilityKopecks),
			"1500.50",
		);
		assert.strictEqual(
			debtNumericText(totals.netUncollectedKopecks),
			"-1500.50",
		);
	});
});

describe("копейки считает общий модуль: второй реализации денег нет", () => {
	/*
	 * Моя ошибка №2, найденная до коммита: первую версию patientDebt.ts я написал
	 * с собственным разбором копеек, не заметив packages/shared/src/utils/money.ts
	 * — то есть создал ровно ту вторую копию, запрет на которую уже записан в
	 * apps/api/src/documents/guards.ts. Переписано на общий модуль. Здесь
	 * проверяется, что слой долга ОТ общего отличается только сужением, и
	 * отличие названо числом, а не словом.
	 */

	test("на чистых суммах слой долга и общий parseKopecks дают одно и то же", () => {
		for (const text of [
			"0",
			"0.01",
			"800.00",
			"1500.50",
			"1990.99",
			"-1600.00",
			"118800.00",
		]) {
			assert.strictEqual(
				kopecksFromNumericText(text),
				parseKopecks(text),
				`расхождение с общим разбором на ${text}`,
			);
		}
		for (const value of [0, 1500, 1500.5, 1990.99, -800]) {
			assert.strictEqual(
				kopecksFromRubles(value),
				parseKopecks(value),
				`${value}`,
			);
		}
	});

	test("на грязи общий разбор ОКРУГЛЯЕТ, а слой долга ОТКАЗЫВАЕТ", () => {
		// parseKopecks по замыслу приводит нецелое число через toFixed(2).
		assert.strictEqual(
			parseKopecks(1500.505),
			150_051,
			"общий разбор округляет вверх",
		);
		assert.strictEqual(
			parseKopecks(1500.1 * 3),
			450_030,
			"общий разбор сглаживает грязь float",
		);
		assert.strictEqual(parseKopecks(1000.0 + 1001.82 + 1489.67), 349_149);

		// Для расчёта долга это недопустимо: сглаженная грязь неотличима от факта.
		assert.throws(() => kopecksFromRubles(1500.505), MoneyPrecisionError);
		assert.throws(() => kopecksFromRubles(1500.1 * 3), MoneyPrecisionError);
		assert.throws(
			() => kopecksFromRubles(1000.0 + 1001.82 + 1489.67),
			MoneyPrecisionError,
		);

		// Разница в копейках, которую общий разбор придумал бы из воздуха:
		assert.strictEqual(parseKopecks(1500.505) - parseKopecks("1500.50"), 1);
	});

	test("пустое значение: общий разбор даёт 0, расчёт долга отказывает", () => {
		assert.strictEqual(parseKopecks(null), 0);
		assert.strictEqual(parseKopecks(""), 0);
		// «Сумма не пришла» и «лечение бесплатное» — разные факты, а колонки
		// unit_price_rub / discount_rub / amount_rub объявлены not null.
		assert.throws(() => kopecksFromNumericText(""), MoneyPrecisionError);
	});

	test("количество 0: общее умножение разрешает, расчёт долга отказывает", () => {
		assert.strictEqual(multiplyKopecks(100_000, 0), 0);
		assert.throws(
			() =>
				chargeLineKopecks({
					patientId: "p1",
					status: "proposed",
					unitPriceRub: "1000.00",
					quantity: 0,
					discountRub: "0.00",
				}),
			QuantityContractError,
		);
	});

	test("печать суммы — общая функция, своей у модуля нет", () => {
		assert.strictEqual(
			debtNumericText(150_050),
			kopecksToNumericString(150_050),
		);
		assert.strictEqual(
			debtNumericText(-160_000),
			kopecksToNumericString(-160_000),
		);
	});
});

describe("моя собственная ошибка, закрытая проверкой: Map вместо сальдо", () => {
	/*
	 * На первом прогоне тестов clinicDebtTotals принимал Iterable<PatientLedger>,
	 * а я передал ему Map. `for (… of map)` перебирает ПАРЫ [ключ, значение], и
	 * все три итога вышли НУЛЯМИ — «долгов в клинике нет». Типизация этого не
	 * поймала, потому что tsx типы не проверяет, а на глаз ноль выглядит как
	 * пустые данные. Теперь Map разворачивается явно, а неверная форма падает.
	 */
	test("Map сальдо считается правильно, а не молча в ноль", () => {
		const ledgers = buildPatientLedgers(LIVE_CHARGES, LIVE_PAYMENTS);
		const fromMap = clinicDebtTotals(ledgers);
		const fromValues = clinicDebtTotals(ledgers.values());
		const fromArray = clinicDebtTotals([...ledgers.values()]);

		assert.strictEqual(fromMap.receivableKopecks, LIVE_SQL.receivableKopecks);
		assert.deepStrictEqual(fromMap, fromValues);
		assert.deepStrictEqual(fromMap, fromArray);
	});

	test("пары [ключ, значение] и мусор падают, а не превращаются в ноль", () => {
		const ledgers = buildPatientLedgers(LIVE_CHARGES, LIVE_PAYMENTS);
		const pairs = [...ledgers.entries()] as unknown as Iterable<never>;
		assert.throws(() => clinicDebtTotals(pairs), MoneyPrecisionError);
		assert.throws(
			() => clinicDebtTotals([undefined] as unknown as Iterable<never>),
			MoneyPrecisionError,
		);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// ОСТАТОК ПО ОДНОМУ ПРИЁМУ
//
// Вопрос администратора, закрывающего приём, — «сколько осталось получить ПО
// ЭТОМУ приёму», и до появления VisitLedger на него не отвечал никто: карточка
// закрытия приёма показывала buildBillingSummary().totalDueRub, то есть нетто по
// ВСЕЙ КЛИНИКЕ. Замер на живой базе 2026-07-29: одна и та же строка «Остаток по
// плану 51 400 ₽» стояла во всех ДЕСЯТИ приёмах клиники d0000000-…-d001,
// включая полностью оплаченные.
// ═══════════════════════════════════════════════════════════════════════════

describe("остаток по приёму: три разных ответа на одних и тех же данных", () => {
	test("полностью оплаченный приём даёт 0, а клиника в это время не собрала 51 400,00", () => {
		// Приём 0401 (пациент 0102): назначено 5 400,00, получено 5 400,00.
		const ledger = buildVisitLedger("0401", LIVE_CHARGES, LIVE_PAYMENTS);
		assert.strictEqual(ledger.chargedKopecks, 540_000);
		assert.strictEqual(ledger.paidKopecks, 540_000);
		assert.strictEqual(visitOutstandingKopecks(ledger), 0);
		assert.strictEqual(visitOverpaidKopecks(ledger), 0);

		// А в карточке этого приёма стояло вот это число — по всей клинике.
		const clinic = clinicDebtTotals(
			buildPatientLedgers(LIVE_CHARGES, LIVE_PAYMENTS),
		);
		assert.strictEqual(
			clinic.netUncollectedKopecks,
			LIVE_SQL.netUncollectedKopecks,
		);
		assert.strictEqual(
			clinic.netUncollectedKopecks - (visitOutstandingKopecks(ledger) ?? 0),
			5_140_000,
			"расхождение между «по приёму» и «по клинике» на этом приёме — вся сумма целиком",
		);
	});

	test("три области — три разных ответа для ОДНОГО приёма", () => {
		/*
		 * Приём 0402 пациента 0103: по приёму рассчитались ровно (14 800,00 из
		 * 14 800,00), но у пациента открыт второй приём 0407 на 26 500,00 без
		 * оплаты. Все три числа законны и отвечают на РАЗНЫЕ вопросы; подставить
		 * одно вместо другого — это и есть дефект карточки.
		 */
		const visit = buildVisitLedger("0402", LIVE_CHARGES, LIVE_PAYMENTS);
		const patient = buildPatientLedger("0103", LIVE_CHARGES, LIVE_PAYMENTS);
		const clinic = clinicDebtTotals(
			buildPatientLedgers(LIVE_CHARGES, LIVE_PAYMENTS),
		);

		assert.strictEqual(visitOutstandingKopecks(visit), 0, "по приёму — ноль");
		assert.strictEqual(
			patientOwesClinicKopecks(patient),
			2_650_000,
			"по пациенту — 26 500,00",
		);
		assert.strictEqual(
			clinic.netUncollectedKopecks,
			5_140_000,
			"по клинике — 51 400,00",
		);
	});

	test("недоплаченный приём: остаток равен назначенному, а оплат по нему НОЛЬ строк", () => {
		// Приём 0403 (пациент 0104): 26 500,00 назначено, ни одной оплаты.
		const ledger = buildVisitLedger("0403", LIVE_CHARGES, LIVE_PAYMENTS);
		assert.strictEqual(visitOutstandingKopecks(ledger), 2_650_000);
		assert.strictEqual(ledger.billedLineCount, 1);
		assert.strictEqual(
			ledger.paymentRowCount,
			0,
			"счётчик оплат обязан отличать «недоплатил» от «оплату не привязали к приёму»",
		);
		assert.strictEqual(formatKopecksRu(2_650_000), `26${NBSP}500,00${NBSP}₽`);
	});

	test("переплаченный приём: остаток 0 И переплата названа отдельным числом", () => {
		// Приём 0400 (пациент 0101): назначено 7 200,00 − 800,00 = 6 400,00,
		// получено 7 200,00.
		const ledger = buildVisitLedger("0400", LIVE_CHARGES, LIVE_PAYMENTS);
		assert.strictEqual(ledger.chargedKopecks, 640_000);
		assert.strictEqual(ledger.paidKopecks, 720_000);
		assert.strictEqual(visitOutstandingKopecks(ledger), 0);
		assert.strictEqual(
			visitOverpaidKopecks(ledger),
			80_000,
			"без этого числа ноль означал бы сразу «рассчитались ровно» и «переплатили 800,00»",
		);
	});

	test("сумма приёмов пациента равна сальдо пациента: это одна величина, а не вторая формула", () => {
		for (const patientId of [
			"0100",
			"0101",
			"0102",
			"0103",
			"0104",
			"0105",
			"0106",
		]) {
			const patient = buildPatientLedger(
				patientId,
				LIVE_CHARGES,
				LIVE_PAYMENTS,
			);
			const visitIds = [
				...new Set(
					[...LIVE_CHARGES, ...LIVE_PAYMENTS]
						.filter((row) => row.patientId === patientId)
						.map((row) => row.visitId)
						.filter(
							(visitId): visitId is string => typeof visitId === "string",
						),
				),
			];
			const visits = visitIds.map((visitId) =>
				buildVisitLedger(visitId, LIVE_CHARGES, LIVE_PAYMENTS),
			);

			// Все живые строки привязаны к приёму, поэтому разбивка обязана сойтись
			// с целым до копейки. Разойдётся — значит в дереве снова две формулы.
			assert.strictEqual(
				visits.reduce((sum, visit) => sum + visit.chargedKopecks, 0),
				patient.chargedKopecks,
				`назначено по приёмам пациента ${patientId} не сошлось с назначенным по пациенту`,
			);
			assert.strictEqual(
				visits.reduce((sum, visit) => sum + visit.paidKopecks, 0),
				patient.paidKopecks,
				`оплачено по приёмам пациента ${patientId} не сошлось с оплаченным по пациенту`,
			);
		}
	});

	test("у пациента с единственным приёмом сальдо приёма побитово равно сальдо пациента", () => {
		const patient = buildPatientLedger("0102", LIVE_CHARGES, LIVE_PAYMENTS);
		const visit = buildVisitLedger("0401", LIVE_CHARGES, LIVE_PAYMENTS);
		assert.strictEqual(visit.chargedKopecks, patient.chargedKopecks);
		assert.strictEqual(visit.paidKopecks, patient.paidKopecks);
		assert.strictEqual(visit.balanceKopecks, patient.balanceKopecks);
		assert.strictEqual(
			visitOutstandingKopecks(visit),
			patientOwesClinicKopecks(patient),
		);
	});

	test("чужие приёмы и строки без приёма в сальдо приёма не попадают", () => {
		const charges: readonly TreatmentChargeRow[] = [
			{
				patientId: "0102",
				visitId: "0401",
				status: "completed",
				unitPriceRub: "1000.00",
				quantity: 1,
				discountRub: "0.00",
			},
			{
				patientId: "0102",
				visitId: null,
				status: "completed",
				unitPriceRub: "9999.00",
				quantity: 1,
				discountRub: "0.00",
			},
			{
				patientId: "0102",
				visitId: "0402",
				status: "completed",
				unitPriceRub: "7777.00",
				quantity: 1,
				discountRub: "0.00",
			},
			{
				patientId: "0102",
				status: "completed",
				unitPriceRub: "5555.00",
				quantity: 1,
				discountRub: "0.00",
			},
		];
		const ledger = buildVisitLedger("0401", charges, []);
		assert.strictEqual(ledger.chargedKopecks, 100_000);
		assert.strictEqual(ledger.chargeRowCount, 1);
	});
});

describe("остаток по приёму: «ноль» и «неизвестно» — РАЗНЫЕ ответы", () => {
	test("приём без позиций и без оплат отвечает null, а не 0", () => {
		const ledger = buildVisitLedger("0499", LIVE_CHARGES, LIVE_PAYMENTS);
		assert.strictEqual(ledger.hasRecords, false);
		assert.strictEqual(ledger.chargeRowCount, 0);
		assert.strictEqual(ledger.paymentRowCount, 0);
		assert.strictEqual(
			visitOutstandingKopecks(ledger),
			null,
			"ноль здесь означал бы «доплачивать нечего» по приёму, о котором модуль не знает ничего",
		);
		assert.strictEqual(visitOverpaidKopecks(ledger), null);
		// Сальдо при этом посчитано и равно нулю: null возвращает ЧТЕНИЕ, а не
		// первичная величина, — иначе ноль и незнание нельзя было бы различить.
		assert.strictEqual(ledger.balanceKopecks, 0);
	});

	test("приём с единственной ОТМЕНЁННОЙ позицией — это измеренный ноль, а не незнание", () => {
		const ledger = buildVisitLedger(
			"0500",
			[
				{
					patientId: "0102",
					visitId: "0500",
					status: "cancelled",
					unitPriceRub: "26500.00",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[],
		);
		assert.strictEqual(
			ledger.hasRecords,
			true,
			"строка есть — значит деньги приёма кто-то заводил",
		);
		assert.strictEqual(ledger.chargeRowCount, 1);
		assert.strictEqual(ledger.billedLineCount, 0, "отменённое не назначено");
		assert.strictEqual(ledger.chargedKopecks, 0);
		assert.strictEqual(
			visitOutstandingKopecks(ledger),
			0,
			"лечение отменено — требовать нечего, и это ЗНАНИЕ, а не его отсутствие",
		);
	});

	test("неоплаченный платёж приёма делает ответ известным, но в оплаченное не попадает", () => {
		const ledger = buildVisitLedger(
			"0501",
			[],
			[
				{
					patientId: "0102",
					visitId: "0501",
					status: "pending",
					amountRub: "5400.00",
				},
			],
		);
		assert.strictEqual(ledger.paymentRowCount, 1);
		assert.strictEqual(ledger.paidPaymentCount, 0);
		assert.strictEqual(ledger.paidKopecks, 0);
		assert.strictEqual(visitOutstandingKopecks(ledger), 0);
	});

	test("пустой идентификатор приёма — отказ, а не уверенный ноль", () => {
		assert.throws(
			() => buildVisitLedger("", LIVE_CHARGES, LIVE_PAYMENTS),
			MoneyPrecisionError,
		);
		assert.throws(
			() => buildVisitLedger("   ", LIVE_CHARGES, LIVE_PAYMENTS),
			MoneyPrecisionError,
		);
		assert.throws(
			() =>
				buildVisitLedger(
					null as unknown as string,
					LIVE_CHARGES,
					LIVE_PAYMENTS,
				),
			MoneyPrecisionError,
		);
	});
});

describe("остаток по приёму: копейки", () => {
	test("1500,50 + 1990,99 = ровно 3491,49, а не 3491.4900000000002", () => {
		const ledger = buildVisitLedger(
			"0600",
			[
				{
					patientId: "0102",
					visitId: "0600",
					status: "completed",
					unitPriceRub: "1500.50",
					quantity: 1,
					discountRub: "0.00",
				},
				{
					patientId: "0102",
					visitId: "0600",
					status: "completed",
					unitPriceRub: "1990.99",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[],
		);
		assert.strictEqual(ledger.chargedKopecks, 349_149);
		assert.strictEqual(debtNumericText(ledger.chargedKopecks), "3491.49");
		assert.strictEqual(rublesFromKopecks(ledger.chargedKopecks), 3491.49);

		const outstanding = visitOutstandingKopecks(ledger);
		assert.strictEqual(outstanding, 349_149);
		assert.strictEqual(formatKopecksRu(349_149), `3${NBSP}491,49${NBSP}₽`);

		/*
		 * МОЯ ОШИБКА, ЗАКРЫТАЯ ЭТИМ ЖЕ ТЕСТОМ. Сначала здесь стояло утверждение
		 * `1500.50 + 1990.99 === 3491.4900000000002`, и оно покраснело: эта пара
		 * складывается в плавающей точке ТОЧНО. Грязь даёт другой набор слагаемых —
		 * тот, что назван в patientDebt.ts, — и три позиции на 3 491,49 ₽ ниже
		 * показывают её на настоящем приёме, а не в отвлечённом примере.
		 */
		assert.strictEqual(1500.5 + 1990.99, 3491.49);
		assert.strictEqual(1000.0 + 1001.82 + 1489.67, 3491.4900000000002);
	});

	test("три позиции, чья сумма в рублях даёт 3491.4900000000002, в копейках дают ровно 3491,49", () => {
		const ledger = buildVisitLedger(
			"0603",
			["1000.00", "1001.82", "1489.67"].map((unitPriceRub) => ({
				patientId: "0102",
				visitId: "0603",
				status: "completed",
				unitPriceRub,
				quantity: 1,
				discountRub: "0.00",
			})),
			[],
		);

		assert.strictEqual(ledger.billedLineCount, 3);
		assert.strictEqual(ledger.chargedKopecks, 349_149);
		assert.strictEqual(visitOutstandingKopecks(ledger), 349_149);
		assert.strictEqual(debtNumericText(349_149), "3491.49");

		// Тот же итог в рублях — с третьим знаком, который не проходит
		// moneyRubSchema и который колонка numeric(12,2) молча обрежет.
		const inRubles = [1000.0, 1001.82, 1489.67].reduce(
			(sum, value) => sum + value,
			0,
		);
		assert.strictEqual(inRubles, 3491.4900000000002);
		assert.notStrictEqual(inRubles, rublesFromKopecks(ledger.chargedKopecks));
		assert.strictEqual(rublesFromKopecks(ledger.chargedKopecks), 3491.49);
	});

	test("частичная оплата с копейками: 3491,49 − 1500,50 = 1990,99", () => {
		const ledger = buildVisitLedger(
			"0601",
			[
				{
					patientId: "0102",
					visitId: "0601",
					status: "completed",
					unitPriceRub: "3491.49",
					quantity: 1,
					discountRub: "0.00",
				},
			],
			[
				{
					patientId: "0102",
					visitId: "0601",
					status: "paid",
					amountRub: "1500.50",
				},
			],
		);
		assert.strictEqual(visitOutstandingKopecks(ledger), 199_099);
		assert.strictEqual(debtNumericText(199_099), "1990.99");
	});

	test("грязь float в строке приёма отвергается, а не сглаживается", () => {
		assert.throws(
			() =>
				buildVisitLedger(
					"0602",
					[
						{
							patientId: "0102",
							visitId: "0602",
							status: "completed",
							unitPriceRub: 1500.1 * 3,
							quantity: 1,
							discountRub: "0.00",
						},
					],
					[],
				),
			MoneyPrecisionError,
		);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// ЗАМОК НА ПОТЕРЮ КОПЕЙКИ ПОРОГОМ ЗНАЧИМОСТИ
//
// ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Порог 1 ₽ — шумовой фильтр СПИСКА должников: строка
// на 50 копеек в обзвоне не нужна. Но итог клиники «не собрано, нетто» собирался
// из ОТФИЛЬТРОВАННЫХ сторон (`receivableKopecks − refundLiabilityKopecks`), и
// фильтр списка молча уносил деньги из итога. Замер живой демо-клиники
// `d0000000-…-d001` от 2026-07-29, уже после приведения цен к прайсу (4759d63f0):
// у пациента `…0106` назначено 7 200,50, оплачено 7 200,00, долг РОВНО 0,50 ₽.
// Итог модуля дал 51 402,98 ₽, главный экран — 51 403,48 ₽. Бухгалтеру нечем
// объяснить дырку в 50 копеек: строки, из которой она взялась, в отчёте нет —
// её и убрали.
//
// ПОЧЕМУ ЧИСЛА ЗАДАНЫ ЗДЕСЬ, А НЕ ПРОЧИТАНЫ ИЗ БАЗЫ. Проверка, зависящая от живых
// данных, бывает зелёной на возвращённом дефекте: ровно этот дефект и прожил всю
// жизнь на круглых ценах, где 0,50 ₽ не встречалось ни в одной сумме. Пересев
// демо-клиники круглыми ценами обнулит расхождение — эти тесты обязаны остаться
// красными на возврате округления при любом состоянии базы.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Сальдо семи пациентов живой демо-клиники — ровно как их печатает точный
 * `numeric` PostgreSQL (замер 2026-07-29, после `4759d63f0`).
 *
 * Каждая строка — один пациент: одна позиция лечения и одна оплата. Величина
 * важна не тем, из чего сложена, а тем, что `…0106` даёт долг НИЖЕ порога.
 */
const SUB_THRESHOLD_LIVE: readonly {
	readonly patientId: string;
	readonly chargedRub: string;
	readonly paidRub: string;
	readonly balanceRub: string;
}[] = [
	{
		patientId: "0103",
		chargedRub: "41300.99",
		paidRub: "14800.00",
		balanceRub: "26500.99",
	},
	{
		patientId: "0104",
		chargedRub: "33700.50",
		paidRub: "7200.00",
		balanceRub: "26500.50",
	},
	// ВОТ ОН, ПОЛТИННИК: долг 0,50 ₽ — меньше порога 1 ₽.
	{
		patientId: "0106",
		chargedRub: "7200.50",
		paidRub: "7200.00",
		balanceRub: "0.50",
	},
	{
		patientId: "0102",
		chargedRub: "5400.00",
		paidRub: "5400.00",
		balanceRub: "0.00",
	},
	{
		patientId: "0105",
		chargedRub: "5400.00",
		paidRub: "5400.00",
		balanceRub: "0.00",
	},
	{
		patientId: "0101",
		chargedRub: "21201.49",
		paidRub: "22000.00",
		balanceRub: "-798.51",
	},
	{
		patientId: "0100",
		chargedRub: "4600.00",
		paidRub: "5400.00",
		balanceRub: "-800.00",
	},
];

function subThresholdLedgers() {
	return buildPatientLedgers(
		SUB_THRESHOLD_LIVE.map((row) => ({
			patientId: row.patientId,
			status: "completed",
			unitPriceRub: row.chargedRub,
			quantity: 1,
			discountRub: "0.00",
		})),
		SUB_THRESHOLD_LIVE.map((row) => ({
			patientId: row.patientId,
			status: "paid",
			amountRub: row.paidRub,
		})),
	);
}

describe("порог значимости: фильтр списка не имеет права уносить копейки из итога", () => {
	const ledgers = subThresholdLedgers();
	const totals = clinicDebtTotals(ledgers);

	test("фикстура воспроизводит замер: сальдо каждого пациента до копейки", () => {
		assert.strictEqual(ledgers.size, 7);
		for (const row of SUB_THRESHOLD_LIVE) {
			const ledger = ledgers.get(row.patientId);
			assert.ok(ledger, `пациент ${row.patientId} потерян`);
			assert.strictEqual(
				debtNumericText(ledger.balanceKopecks),
				row.balanceRub,
				`сальдо ${row.patientId} разошлось с замером psql`,
			);
		}
	});

	test("проверка не выродилась: копеечный должник в фикстуре ЕСТЬ", () => {
		/*
		 * Без этого утверждения весь набор ниже стал бы зелёным на данных без
		 * копеек — то есть ровно там, где дефект и жил незамеченным.
		 */
		assert.strictEqual(totals.subThresholdDebtorCount, 1);
		assert.strictEqual(
			debtNumericText(totals.subThresholdReceivableKopecks),
			"0.50",
		);
		assert.ok(
			totals.subThresholdReceivableKopecks < DEFAULT_SIGNIFICANCE_KOPECKS,
			"копеечный долг обязан быть НИЖЕ порога, иначе фильтр его не тронет и проверять нечего",
		);
	});

	test("список должников — с порогом: 53 001,49 у двоих, копеечный должник не в списке", () => {
		assert.strictEqual(debtNumericText(totals.receivableKopecks), "53001.49");
		assert.strictEqual(totals.debtorCount, 2);
	});

	test("полная дебиторка — без порога: 53 001,99, как её показывают карточки пациентов", () => {
		assert.strictEqual(
			debtNumericText(totals.fullReceivableKopecks),
			"53001.99",
		);
		// Карточка считает по пациенту и порога не имеет: сумма её долгов и есть
		// полная дебиторка. Это то самое число, которое сквозная сверка сравнивала
		// со списочным и объявляла расхождением.
		const cardSum = [...ledgers.values()].reduce(
			(sum, ledger) => sum + patientOwesClinicKopecks(ledger),
			0,
		);
		assert.strictEqual(cardSum, totals.fullReceivableKopecks);
		assert.strictEqual(
			totals.fullReceivableKopecks - totals.receivableKopecks,
			50,
			"разница списка и полной дебиторки — ровно те 50 копеек, что порог унёс",
		);
	});

	test("ИТОГ КЛИНИКИ = Σ сальдо всех пациентов: 51 403,48, а не 51 402,98", () => {
		const sumOfBalances = [...ledgers.values()].reduce(
			(sum, ledger) => sum + ledger.balanceKopecks,
			0,
		);
		assert.strictEqual(
			totals.netUncollectedKopecks,
			sumOfBalances,
			"итог клиники обязан равняться сумме сальдо: иначе деньги пропали между пациентом и итогом",
		);
		assert.strictEqual(
			debtNumericText(totals.netUncollectedKopecks),
			"51403.48",
		);

		// Прежняя формула итога — дословно, из отфильтрованных сторон.
		const withThresholdLeak =
			totals.receivableKopecks - totals.refundLiabilityKopecks;
		assert.strictEqual(debtNumericText(withThresholdLeak), "51402.98");
		assert.strictEqual(
			totals.netUncollectedKopecks - withThresholdLeak,
			50,
			"порог уносил из итога клиники ровно 50 копеек — это и есть тот полтинник",
		);
	});

	test("ЗАМОК: итог клиники ОДИН И ТОТ ЖЕ при любом пороге", () => {
		/*
		 * Главное утверждение набора и есть замок. Порог — свойство СПИСКА, значит
		 * итог от него не зависит вовсе: ни при нулевом, ни при рублёвом, ни при
		 * стократном. Любое возвращение фильтра в итог красит эту проверку, каким бы
		 * способом его ни вернули.
		 */
		const expected = totals.netUncollectedKopecks;
		for (const significanceKopecks of [0, 1, 50, 100, 10_000, 10_000_000]) {
			const shifted = clinicDebtTotals(ledgers, { significanceKopecks });
			assert.strictEqual(
				shifted.netUncollectedKopecks,
				expected,
				`порог ${significanceKopecks} копеек изменил итог клиники — фильтр списка снова уносит деньги`,
			);
			// И сходимость внутри самого ответа: списочное плюс отброшенное = полное.
			assert.strictEqual(
				shifted.receivableKopecks + shifted.subThresholdReceivableKopecks,
				shifted.fullReceivableKopecks,
				`порог ${significanceKopecks}: отброшенные долги не сошлись с полной дебиторкой`,
			);
			assert.strictEqual(
				shifted.refundLiabilityKopecks + shifted.subThresholdRefundKopecks,
				shifted.fullRefundLiabilityKopecks,
				`порог ${significanceKopecks}: отброшенные переплаты не сошлись с полным возвратом`,
			);
		}
		// Порог 100 000 ₽ выше любого живого сальдо и уносит из списков ВСЁ — итог
		// обязан остаться тем же до копейки, потому что деньги никуда не делись.
		const everythingFiltered = clinicDebtTotals(ledgers, {
			significanceKopecks: 10_000_000,
		});
		assert.strictEqual(everythingFiltered.receivableKopecks, 0);
		assert.strictEqual(everythingFiltered.refundLiabilityKopecks, 0);
		assert.strictEqual(everythingFiltered.debtorCount, 0);
		assert.strictEqual(everythingFiltered.subThresholdDebtorCount, 3);
		assert.strictEqual(
			debtNumericText(everythingFiltered.netUncollectedKopecks),
			"51403.48",
		);
	});

	test("расхождение двух экранов сходится ТОЧНО, с названными причинами", () => {
		/*
		 * Ровно то утверждение, которое краснело в сквозной сверке. Список отчёта
		 * минус долг главного экрана — это НЕ просто переплаты: это переплаты минус
		 * долги, которые порог из списка выкинул. Обе причины названы, допуска нет.
		 */
		const dashboardDueKopecks = Math.max(0, totals.netUncollectedKopecks);
		const screenGap = totals.receivableKopecks - dashboardDueKopecks;
		assert.strictEqual(debtNumericText(screenGap), "1598.01");
		assert.strictEqual(
			screenGap,
			totals.fullRefundLiabilityKopecks - totals.subThresholdReceivableKopecks,
			"разница экранов не свелась к переплатам минус отброшенные порогом долги",
		);
		// А без копеечного должника это была бы просто сумма переплат — и именно так
		// утверждение и было записано, пока в базе стояли круглые цены.
		assert.strictEqual(
			debtNumericText(totals.fullRefundLiabilityKopecks),
			"1598.51",
		);
		assert.strictEqual(
			totals.fullRefundLiabilityKopecks - screenGap,
			50,
			"расхождение утверждения со «просто переплатами» — те же 50 копеек",
		);
	});

	test("объяснение оператору называет порог, сумму под ним и сходится глазами", () => {
		const text = explainDebtTotals(totals);
		assert.ok(text.includes(`53${NBSP}001,99`), text);
		assert.ok(text.includes(`1${NBSP}598,51`), text);
		assert.ok(text.includes(`51${NBSP}403,48`), text);
		assert.match(text, /Ниже порога значимости/);
		assert.ok(text.includes(`0,50${NBSP}₽`), text);
		assert.match(text, /1 чел/);
		// Печатное вычитание обязано сходиться: пока итог считался с порогом, в
		// объяснении стояло «53 001,49 − 1 598,51 = 51 402,98» при 51 403,48 на экране.
		assert.ok(
			!text.includes(`51${NBSP}402,98`),
			`объяснение всё ещё печатает итог, посчитанный с порогом: ${text}`,
		);
	});

	test("грязь float не заменяет копейку: итог точен там, где сложение рублей врёт", () => {
		/*
		 * Три пациента, чьи долги в рублях складываются с хвостом. Итог клиники
		 * обязан быть ровно 3 491,49 — а не 3491.4900000000002, который
		 * `Math.round(value * 100)` молча признал бы за 3 491,49 (в этом дереве этот
		 * приём уже отвергали).
		 */
		const dirty = clinicDebtTotals(
			buildPatientLedgers(
				["1000.00", "1001.82", "1489.67"].map((unitPriceRub, index) => ({
					patientId: `dirty-${index}`,
					status: "completed",
					unitPriceRub,
					quantity: 1,
					discountRub: "0.00",
				})),
				[],
			),
		);
		assert.strictEqual(dirty.netUncollectedKopecks, 349_149);
		assert.strictEqual(debtNumericText(dirty.netUncollectedKopecks), "3491.49");
		assert.strictEqual(1000.0 + 1001.82 + 1489.67, 3491.4900000000002);
		assert.notStrictEqual(
			rublesFromKopecks(dirty.netUncollectedKopecks),
			1000.0 + 1001.82 + 1489.67,
		);
	});

	test("копеечная переплата тоже не теряется: порог симметричен", () => {
		// Долг 100 ₽ у одного и переплата 0,50 ₽ у другого: порог уносит из списка
		// переплату, но не из итога.
		const totalsWithSmallRefund = clinicDebtTotals(
			buildPatientLedgers(
				[
					{
						patientId: "debtor",
						status: "completed",
						unitPriceRub: "100.00",
						quantity: 1,
						discountRub: "0.00",
					},
					{
						patientId: "overpaid",
						status: "completed",
						unitPriceRub: "100.00",
						quantity: 1,
						discountRub: "0.00",
					},
				],
				[{ patientId: "overpaid", status: "paid", amountRub: "100.50" }],
			),
		);
		assert.strictEqual(totalsWithSmallRefund.refundLiabilityKopecks, 0);
		assert.strictEqual(totalsWithSmallRefund.overpaidCount, 0);
		assert.strictEqual(totalsWithSmallRefund.subThresholdRefundKopecks, 50);
		assert.strictEqual(totalsWithSmallRefund.subThresholdOverpaidCount, 1);
		assert.strictEqual(
			debtNumericText(totalsWithSmallRefund.netUncollectedKopecks),
			"99.50",
			"переплата 0,50 ₽ обязана уменьшить «не собрано», даже если в список возвратов не попала",
		);
		assert.strictEqual(
			debtNumericText(
				totalsWithSmallRefund.receivableKopecks -
					totalsWithSmallRefund.refundLiabilityKopecks,
			),
			"100.00",
			"прежняя формула итога вернула бы 100,00 — на 50 копеек больше, чем клинике причитается",
		);
	});
});
