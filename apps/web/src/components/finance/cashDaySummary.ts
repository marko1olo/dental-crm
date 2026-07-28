import type { Dashboard } from "@dental/shared";

/*
 * СВЕРКА КАССЫ ЗА ДЕНЬ: СЧЁТ ОТДЕЛЬНО ОТ ПОКАЗА.
 *
 * ЗАЧЕМ ЭТО ВООБЩЕ. Рабочий день администратора кончается сверкой: сколько денег
 * пришло, чем именно и сходится ли ящик. На экране «Оплаты» этого не было ни в
 * каком виде — были только оплаты выбранного пациента. Администратор считал
 * итоги дня на бумаге, пересчитывая строки истории по каждому человеку.
 * (Остаток задуманного, но не написанного виджета смены — осиротевший файл
 * CashShiftWidget.css в этой же папке: открытие и закрытие смены требуют таблицы
 * смен, которой в базе нет. Итоги дня считаются по уже имеющимся платежам и
 * сервера не требуют.)
 *
 * ПОЧЕМУ ФУНКЦИЯ, А НЕ РАСЧЁТ ВНУТРИ КОМПОНЕНТА. Деньги должны быть проверяемы
 * прогоном, а не чтением: cashDayTally.test.ts исполняет именно эту функцию —
 * копейки, строки из драйвера базы, возвраты, чужие сутки. Расчёт внутри JSX
 * проверить прогоном нельзя.
 */

type Payment = Dashboard["payments"][number];
type PaymentMethod = Payment["method"];

/**
 * Ключ календарного дня по МЕСТНОМУ времени: «2026-07-28».
 *
 * Местному, а не UTC: `toISOString()` увёл бы вечерние оплаты в другие сутки.
 * В Москве (UTC+3) оплата 28 июля в 02:30 по Гринвичу — это уже 05:30 28 июля,
 * а в UTC−5 оплата 28 июля в 21:00 по местному времени попала бы в 29-е.
 * Возвращает null, если дату разобрать нельзя: пропущенный платёж лучше
 * посчитанного не в тот день.
 */
export function localDayKey(value: Date | string): string | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : dayKeyFromDate(value);
	}
	const trimmed = value.trim();
	if (!trimmed) return null;
	// Дата без времени берётся как есть. `new Date("2026-07-28")` по стандарту —
	// полночь по Гринвичу, и при отрицательном смещении это предыдущие сутки.
	const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	if (dateOnly) return trimmed;
	const parsed = new Date(trimmed);
	return Number.isNaN(parsed.getTime()) ? null : dayKeyFromDate(parsed);
}

function dayKeyFromDate(date: Date): string {
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

/** Итог по одному способу оплаты. */
export interface CashDayMethodRow {
	method: PaymentMethod;
	amountRub: number;
	count: number;
}

export interface CashDaySummary {
	/**
	 * Пришло деньгами за день: наличные, карта, перевод, онлайн, ДМС, иное —
	 * и внесённые авансы. Списания с семейного счёта СЮДА НЕ ВХОДЯТ: это
	 * внутренний перевод, деньги за них клиника получила в день пополнения, и
	 * сложение того и другого посчитало бы одни деньги дважды.
	 */
	receivedRub: number;
	/** Сколько оплат посчитано в receivedRub. */
	receivedCount: number;
	/** Сколько должно остаться наличными: принято минус возвращено наличными. */
	cashRub: number;
	/** Из принятого — авансы на семейный счёт (в журнале это статус «planned»). */
	advanceRub: number;
	/** Оплачено с семейных счетов: выручка дня, но новых денег не приносит. */
	familyWalletRub: number;
	/** Возвращено пациентам за день. */
	refundedRub: number;
	refundedCount: number;
	/** Разбивка пришедших денег по способам, без нулевых строк. */
	byMethod: CashDayMethodRow[];
}

/**
 * Сложение денег без хвостов плавающей точки.
 *
 * 1500.10 + 1500.20 в двоичной дроби даёт 3000.3000000000002, и такой хвост
 * доезжает до экрана. Тот же приём (округление до копейки на каждом шаге)
 * применяют расчёт сводки в useAppLogic и сверка сметы на сервере.
 */
function addRub(total: number, addition: number): number {
	return Math.round((total + addition) * 100) / 100;
}

/**
 * Сумма платежа числом.
 *
 * Number() обязателен: колонка numeric без mode «number» отдаётся драйвером
 * СТРОКОЙ, и `total + "1500.50"` склеил бы строки вместо сложения. Данные
 * дашборда на клиенте схемой не проверяются, поэтому полагаться на объявленный
 * тип нельзя. Нечисловое значение считаем нулём и НЕ показываем как деньги:
 * NaN в сумме превратил бы весь итог дня в «не число».
 */
function paymentRub(payment: Payment): number {
	const amount = Number(payment.amountRub);
	return Number.isFinite(amount) ? amount : 0;
}

/** Порядок способов на экране: сначала то, что чаще всего в кассе. */
const METHOD_ORDER: readonly PaymentMethod[] = [
	"cash",
	"card",
	"bank_transfer",
	"online",
	"insurance",
	"other",
	"family_wallet",
];

/**
 * Итоги дня по журналу платежей.
 *
 * Что во что попадает:
 *  • «paid» — принято. Способ «family_wallet» отложен отдельно: это списание с
 *    семейного счёта, внутренний перевод, а не пришедшие деньги.
 *  • «planned» — внесённый аванс на семейный счёт. Единственное место, которое
 *    пишет платежи с этим статусом, — пополнение семейного кошелька
 *    (apps/api/src/routes/finance_family.ts), а деньги при пополнении приходят
 *    по-настоящему: наличными, картой или переводом. Поэтому аванс в приход
 *    входит, но показывается отдельной строкой — выручкой он ещё не стал.
 *  • «refunded» — возвращено. Из прихода вычитается по своему способу: наличный
 *    возврат уменьшает то, что должно лежать в ящике.
 *  • «voided» — отменённая запись, не деньги. Не учитывается вовсе.
 */
export function summarizeCashDay(
	payments: readonly Payment[] | null | undefined,
	dayKey: string,
): CashDaySummary {
	const totals = new Map<PaymentMethod, { amountRub: number; count: number }>();
	let receivedRub = 0;
	let receivedCount = 0;
	let cashRub = 0;
	let advanceRub = 0;
	let familyWalletRub = 0;
	let refundedRub = 0;
	let refundedCount = 0;

	for (const payment of payments ?? []) {
		if (localDayKey(payment.paidAt ?? payment.createdAt ?? "") !== dayKey) continue;
		const amount = paymentRub(payment);
		if (amount <= 0) continue;

		if (payment.status === "refunded") {
			refundedRub = addRub(refundedRub, amount);
			refundedCount += 1;
			// Наличный возврат уходит из ящика. Возврат по карте ящика не касается.
			if (payment.method === "cash") cashRub = addRub(cashRub, -amount);
			continue;
		}
		if (payment.status === "voided") continue;

		if (payment.method === "family_wallet") {
			// Списание с семейного счёта: выручка есть, новых денег нет.
			familyWalletRub = addRub(familyWalletRub, amount);
			continue;
		}

		receivedRub = addRub(receivedRub, amount);
		receivedCount += 1;
		if (payment.method === "cash") cashRub = addRub(cashRub, amount);
		if (payment.status === "planned") advanceRub = addRub(advanceRub, amount);

		const row = totals.get(payment.method) ?? { amountRub: 0, count: 0 };
		row.amountRub = addRub(row.amountRub, amount);
		row.count += 1;
		totals.set(payment.method, row);
	}

	const byMethod: CashDayMethodRow[] = METHOD_ORDER.filter((method) => totals.has(method)).map(
		(method) => {
			const row = totals.get(method) as { amountRub: number; count: number };
			return { method, amountRub: row.amountRub, count: row.count };
		},
	);

	return {
		receivedRub,
		receivedCount,
		cashRub,
		advanceRub,
		familyWalletRub,
		refundedRub,
		refundedCount,
		byMethod,
	};
}
