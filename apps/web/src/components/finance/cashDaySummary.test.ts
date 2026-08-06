import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Dashboard } from "@dental/shared";
import { localDayKey, summarizeCashDay } from "./cashDaySummary";

/**
 * СВЕРКА КАССЫ ЗА ДЕНЬ СЧИТАЕТСЯ ДЕНЬГАМИ, А НЕ НА ГЛАЗ.
 *
 * Итог дня — то, с чем администратор сверяет ящик и терминал. Ошибка здесь
 * заканчивается недостачей и разговором о том, кто взял. Поэтому проверяем
 * ровно те четыре способа испортить деньги, которые в этом коде возможны:
 *  1. чужие сутки в итоге дня;
 *  2. копейки: хвост плавающей точки и потерянный полтинник;
 *  3. строка из драйвера базы (numeric без mode «number») вместо числа —
 *     сложение строк вместо сложения денег;
 *  4. двойной счёт: списание с семейного счёта — не пришедшие деньги, а возврат
 *     не должен увеличивать приход.
 */

type Payment = Dashboard["payments"][number];

const TODAY = "2026-07-28";

let sequence = 0;

/** Платёж с полями, которые читает расчёт; остальное для расчёта безразлично. */
function payment(fields: {
	amountRub: number | string;
	method?: Payment["method"];
	status?: Payment["status"];
	paidAt?: string | null;
}): Payment {
	sequence += 1;
	return {
		id: `00000000-0000-4000-8000-${`${sequence}`.padStart(12, "0")}`,
		organizationId: "00000000-0000-4000-8000-000000000001",
		patientId: "00000000-0000-4000-8000-000000000002",
		visitId: null,
		documentId: null,
		amountRub: fields.amountRub as number,
		method: fields.method ?? "cash",
		status: fields.status ?? "paid",
		paidAt: fields.paidAt === undefined ? `${TODAY}T12:00:00` : fields.paidAt,
		createdAt: `${TODAY}T12:00:00`,
		note: null,
	} as Payment;
}

describe("ключ календарного дня", () => {
	it("берёт местные сутки, а не гринвичские", () => {
		// Полночь с небольшим по местному времени: UTC-ключ дал бы предыдущий день
		// при положительном смещении часового пояса.
		const localMidnight = new Date(2026, 6, 28, 0, 30, 0);
		assert.equal(localDayKey(localMidnight), "2026-07-28");
		const localBeforeMidnight = new Date(2026, 6, 28, 23, 45, 0);
		assert.equal(localDayKey(localBeforeMidnight), "2026-07-28");
	});

	it("дату без времени берёт как есть", () => {
		assert.equal(localDayKey("2026-07-28"), "2026-07-28");
	});

	it("на мусоре отвечает null, а не сегодняшним днём", () => {
		assert.equal(localDayKey("не дата"), null);
		assert.equal(localDayKey(""), null);
	});
});

describe("итог дня", () => {
	it("считает только сегодняшние оплаты", () => {
		const summary = summarizeCashDay(
			[
				payment({ amountRub: 5000 }),
				payment({ amountRub: 3000, paidAt: "2026-07-27T19:00:00" }),
				payment({ amountRub: 100, paidAt: "2026-07-29T09:00:00" }),
			],
			TODAY,
		);
		assert.equal(summary.receivedRub, 5000);
		assert.equal(summary.receivedCount, 1);
		assert.equal(summary.cashRub, 5000);
	});

	it("складывает копейки без хвоста плавающей точки", () => {
		const summary = summarizeCashDay(
			[
				payment({ amountRub: 1500.1 }),
				payment({ amountRub: 1500.2 }),
				payment({ amountRub: 0.5 }),
			],
			TODAY,
		);
		// 1500.1 + 1500.2 в двоичной дроби даёт 3000.3000000000002.
		assert.equal(summary.receivedRub, 3000.8);
		assert.equal(summary.cashRub, 3000.8);
	});

	it("сумму-строку из драйвера базы складывает как число", () => {
		const summary = summarizeCashDay(
			[payment({ amountRub: "1500.50" }), payment({ amountRub: "3.00" })],
			TODAY,
		);
		assert.equal(summary.receivedRub, 1503.5);
	});

	it("нечисловую сумму не превращает в NaN на весь день", () => {
		const summary = summarizeCashDay(
			[payment({ amountRub: "неизвестно" }), payment({ amountRub: 2000 })],
			TODAY,
		);
		assert.equal(summary.receivedRub, 2000);
		assert.equal(summary.receivedCount, 1);
	});

	it("делит приход по способам и не теряет наличные в ящике", () => {
		const summary = summarizeCashDay(
			[
				payment({ amountRub: 1000, method: "cash" }),
				payment({ amountRub: 2000, method: "card" }),
				payment({ amountRub: 500, method: "cash" }),
				payment({ amountRub: 7000, method: "bank_transfer" }),
			],
			TODAY,
		);
		assert.equal(summary.receivedRub, 10500);
		assert.equal(summary.cashRub, 1500);
		assert.deepEqual(
			summary.byMethod.map((row) => [row.method, row.amountRub, row.count]),
			[
				["cash", 1500, 2],
				["card", 2000, 1],
				["bank_transfer", 7000, 1],
			],
		);
	});

	it("списание с семейного счёта не считает пришедшими деньгами", () => {
		const summary = summarizeCashDay(
			[
				payment({ amountRub: 4000, method: "family_wallet" }),
				payment({ amountRub: 1000, method: "cash" }),
			],
			TODAY,
		);
		// Иначе одни деньги посчитались бы дважды: при пополнении счёта и при
		// оплате с него.
		assert.equal(summary.receivedRub, 1000);
		assert.equal(summary.familyWalletRub, 4000);
		assert.equal(summary.cashRub, 1000);
	});

	it("аванс на семейный счёт входит в приход и виден отдельной строкой", () => {
		const summary = summarizeCashDay(
			[payment({ amountRub: 30000, method: "card", status: "planned" })],
			TODAY,
		);
		assert.equal(summary.receivedRub, 30000);
		assert.equal(summary.advanceRub, 30000);
		assert.equal(summary.cashRub, 0);
	});

	it("возврат не входит в приход и НЕ занижает ящик", () => {
		const summary = summarizeCashDay(
			[
				payment({ amountRub: 5000, method: "cash" }),
				payment({ amountRub: 1200, method: "cash", status: "refunded" }),
				payment({ amountRub: 800, method: "card", status: "refunded" }),
			],
			TODAY,
		);
		assert.equal(summary.receivedRub, 5000);
		/*
		 * 5 000, а не 3 800. Возврат — смена статуса той же строки платежа
		 * (отдельной записи возврата в базе нет), поэтому 1 200 ₽ в ящик пришли и
		 * из ящика ушли: ноль. БЫЛО −1 200: вечером программа заявляла «в ящике на
		 * 1 200 ₽ больше, чем по записям, скорее всего оплату не записали».
		 */
		assert.equal(summary.cashRub, 5000);
		assert.equal(summary.refundedRub, 2000);
		assert.equal(summary.refundedCount, 2);
	});

	it("возврат единственной наличной оплаты не делает ящик отрицательным", () => {
		const summary = summarizeCashDay(
			[payment({ amountRub: 3000, method: "cash", status: "refunded" })],
			TODAY,
		);
		assert.equal(summary.cashRub, 0);
		assert.equal(summary.receivedRub, 0);
		assert.equal(summary.refundedRub, 3000);
	});

	it("отменённую запись не считает вовсе", () => {
		const summary = summarizeCashDay(
			[
				payment({ amountRub: 9999, status: "voided" }),
				payment({ amountRub: 100 }),
			],
			TODAY,
		);
		assert.equal(summary.receivedRub, 100);
		assert.equal(summary.refundedRub, 0);
	});

	it("на пустом и непрочитанном журнале отдаёт нули, а не падает", () => {
		for (const input of [[], null, undefined]) {
			const summary = summarizeCashDay(input, TODAY);
			assert.equal(summary.receivedRub, 0);
			assert.equal(summary.receivedCount, 0);
			assert.deepEqual(summary.byMethod, []);
		}
	});
});
