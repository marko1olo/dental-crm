import {
	type Dashboard,
	kopecksToNumericString,
	parseKopecks,
} from "@dental/shared";

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
	/**
	 * Сколько наличных должно лежать в ящике по записям за этот день.
	 *
	 * Возвраты сюда НЕ вычитаются: возврат — смена статуса той же оплаты, деньги
	 * по ней и пришли, и ушли (см. ветку «refunded» в summarizeCashDay).
	 */
	cashRub: number;
	/** Из принятого — авансы на семейный счёт (в журнале это статус «planned»). */
	advanceRub: number;
	/** Оплачено с семейных счетов: выручка дня, но новых денег не приносит. */
	familyWalletRub: number;
	/**
	 * Возвращено пациентам по оплатам, ПРИНЯТЫМ в этот день.
	 *
	 * Не «возвращено за день»: времени возврата у платежа нет, день берётся по
	 * времени приёма (paidAt). Возврат оплаты прошлой недели окажется в итоге той
	 * недели, а не сегодняшнем.
	 */
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
function paymentKopecks(payment: Payment): number {
	try {
		return parseKopecks(payment.amountRub);
	} catch {
		return 0;
	}
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
 *  • «refunded» — возвращено. В приход не входит и ящик не уменьшает: это та же
 *    строка оплаты со сменённым статусом, деньги по ней и пришли, и ушли.
 *  • «voided» — отменённая запись, не деньги. Не учитывается вовсе.
 */
export function summarizeCashDay(
	payments: readonly Payment[] | null | undefined,
	dayKey: string,
): CashDaySummary {
	const totals = new Map<PaymentMethod, { kopecks: number; count: number }>();
	let receivedKopecks = 0;
	let receivedCount = 0;
	let cashKopecks = 0;
	let advanceKopecks = 0;
	let familyWalletKopecks = 0;
	let refundedKopecks = 0;
	let refundedCount = 0;

	for (const payment of payments ?? []) {
		if (localDayKey(payment.paidAt ?? payment.createdAt ?? "") !== dayKey)
			continue;
		const kopecks = paymentKopecks(payment);
		if (kopecks <= 0) continue;

		if (payment.status === "refunded") {
			refundedKopecks += kopecks;
			refundedCount += 1;
			/*
			 * ЯЩИКА ВОЗВРАТ НЕ КАСАЕТСЯ, И ВОТ ПОЧЕМУ.
			 *
			 * БЫЛО: `cashRub = addRub(cashRub, -amount)`. Возврат в этой базе — не
			 * отдельная запись, а СМЕНА СТАТУСА той же строки платежа: таблица
			 * payments одна, ни ссылки на исходный платёж, ни отдельной суммы
			 * возврата в ней нет (apps/api/src/db/schema.ts, payments). Значит
			 * строка со статусом «refunded» — это та самая принятая оплата:
			 * наличные в ящик пришли (+A) и из ящика ушли (−A), в сумме ноль.
			 * Прежний код вычитал только уход — приход по этой строке нигде не
			 * прибавлялся, ветка стоит ДО прибавления к receivedRub и cashRub, —
			 * и ящик за день оказывался занижен на всю сумму возврата.
			 *
			 * Что видел администратор вечером: принял 5 000 ₽ наличными, отдельно
			 * принял и вернул 1 200 ₽ наличными, в ящике честные 5 000 ₽ — а
			 * программа писала «по записям должно быть 3 800 ₽» и добавляла «в
			 * ящике на 1 200 ₽ больше, скорее всего оплату приняли, но не
			 * записали». Неверная сумма денег плюс ложное обвинение в неучтённой
			 * оплате.
			 *
			 * ДОЛГ (сервер, apps/api — не мой файл): у платежа нет времени
			 * возврата, только paidAt — время ПРИЁМА. Поэтому возврат оплаты,
			 * принятой в предыдущие дни, в сегодняшний итог не попадает вовсе:
			 * строка лежит в чужих сутках, и вечером в ящике будет меньше, чем по
			 * записям. Чтобы такие возвраты считались, нужна колонка refunded_at
			 * (или отдельная строка возврата) на сервере. Пока её нет, сверка
			 * предупреждает об этом текстом, а не занижает ящик молча.
			 */
			continue;
		}
		if (payment.status === "voided") continue;

		if (payment.method === "family_wallet") {
			// Списание с семейного счёта: выручка есть, новых денег нет.
			familyWalletKopecks += kopecks;
			continue;
		}

		receivedKopecks += kopecks;
		receivedCount += 1;
		if (payment.method === "cash") cashKopecks += kopecks;
		if (payment.status === "planned") advanceKopecks += kopecks;

		const row = totals.get(payment.method) ?? { kopecks: 0, count: 0 };
		row.kopecks += kopecks;
		row.count += 1;
		totals.set(payment.method, row);
	}

	const byMethod: CashDayMethodRow[] = METHOD_ORDER.filter((method) =>
		totals.has(method),
	).map((method) => {
		const row = totals.get(method) as { kopecks: number; count: number };
		return {
			method,
			amountRub: Number(kopecksToNumericString(row.kopecks)),
			count: row.count,
		};
	});

	return {
		receivedRub: Number(kopecksToNumericString(receivedKopecks)),
		receivedCount,
		cashRub: Number(kopecksToNumericString(cashKopecks)),
		advanceRub: Number(kopecksToNumericString(advanceKopecks)),
		familyWalletRub: Number(kopecksToNumericString(familyWalletKopecks)),
		refundedRub: Number(kopecksToNumericString(refundedKopecks)),
		refundedCount,
		byMethod,
	};
}
