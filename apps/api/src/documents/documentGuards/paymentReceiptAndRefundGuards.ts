import {
	type CreateDocumentInput,
	type GeneratedDocument,
	type Payment,
	type PaymentReceiptPayload,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	moneyKopecksText,
	moneyRubEquals,
	moneyRubText,
} from "./moneyUtils.js";
import { normalizeInnDigits } from "./taxGuards.js";
import type { PaymentRefundSettlement } from "./types.js";

export function selectedPaymentReceiptIds(
	input: Pick<CreateDocumentInput, "payload">,
): string[] {
	return input.payload?.paymentReceipt?.selectedPaymentIds ?? [];
}

export function selectedPaymentRefundCorrectionIds(
	input: Pick<CreateDocumentInput, "payload">,
): string[] {
	return input.payload?.paymentRefundCorrection?.selectedPaymentIds ?? [];
}

export function normalizedDocumentValue(value: string | null | undefined): string {
	return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

export function normalizedFiscalReceiptNumber(
	value: string | null | undefined,
): string {
	return (value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("ru-RU");
}

export function paymentReceiptStoredFieldMatchesPayload(
	storedValue: string | null | undefined,
	payloadValue: string | null | undefined,
): boolean {
	const normalizedStoredValue = normalizedDocumentValue(storedValue);
	if (!normalizedStoredValue) return true;
	return normalizedStoredValue === normalizedDocumentValue(payloadValue);
}

export function paymentReceiptStoredInnMatchesPayload(
	storedValue: string | null | undefined,
	payloadValue: string | null | undefined,
): boolean {
	const normalizedStoredValue = normalizeInnDigits(storedValue);
	if (!normalizedStoredValue) return true;
	return normalizedStoredValue === normalizeInnDigits(payloadValue);
}

export function paymentReceiptPayloadMatchesPayer(
	payment: Payment,
	payload: PaymentReceiptPayload,
): boolean {
	if (
		normalizedDocumentValue(payment.payerFullName) !==
		normalizedDocumentValue(payload.payerFullName)
	)
		return false;
	if (!payload.taxSupportRequested) return true;
	return (
		paymentReceiptStoredFieldMatchesPayload(
			payment.payerBirthDate,
			payload.payerBirthDate,
		) &&
		paymentReceiptStoredInnMatchesPayload(payment.payerInn, payload.payerInn) &&
		paymentReceiptStoredFieldMatchesPayload(
			payment.payerIdentityDocument,
			payload.payerIdentityDocument,
		) &&
		paymentReceiptStoredFieldMatchesPayload(
			payment.payerRelationship,
			payload.payerRelationship,
		)
	);
}

export function paymentReceiptMissingPayerFact(
	payment: Payment,
	payload: PaymentReceiptPayload,
): string | null {
	if (!payment.payerFullName?.trim()) {
		return "В выбранной оплате не заполнено ФИО плательщика. Заполните плательщика в оплате, затем создавайте квитанцию.";
	}
	if (!payload.taxSupportRequested) return null;
	if (!payment.payerBirthDate?.trim()) {
		return "В выбранной оплате не заполнена дата рождения плательщика. Налоговая квитанция не берет дату из карточки пациента.";
	}
	if (!payment.payerRelationship?.trim()) {
		return "В выбранной оплате не указана связь плательщика с пациентом.";
	}
	if (
		!normalizeInnDigits(payment.payerInn) &&
		!payment.payerIdentityDocument?.trim()
	) {
		return "В выбранной оплате не указан ИНН или документ плательщика для налоговой опоры.";
	}
	return null;
}

export function paymentReceiptSelectionErrorForDocument(
	input: CreateDocumentInput,
	payments: readonly Payment[],
): string | null {
	if (input.kind !== "payment_receipt") return null;
	const payload = input.payload?.paymentReceipt;
	if (!payload) return null;

	const selectedIds = selectedPaymentReceiptIds(input);
	const uniqueSelectedIds = new Set(selectedIds);
	if (uniqueSelectedIds.size !== selectedIds.length) {
		return "В выбранных платежах квитанции есть дубли. Оставьте каждый платеж один раз.";
	}

	const paymentsById = new Map(
		payments.map((payment) => [payment.id, payment]),
	);
	const selectedPayments: Payment[] = [];
	for (const paymentId of selectedIds) {
		const payment = paymentsById.get(paymentId);
		if (!payment)
			return "Выбранный платеж для квитанции не найден. Обновите экран и выберите платеж заново.";
		if (payment.patientId !== input.patientId)
			return "Выбранный платеж для квитанции относится к другому пациенту.";
		if (input.visitId && payment.visitId !== input.visitId)
			return "Выбранный платеж для квитанции относится к другому визиту.";
		if (payment.status !== "paid" || payment.amountRub <= 0) {
			return "В платежную квитанцию можно включать только проведенные положительные оплаты.";
		}
		if (!payment.fiscalReceiptNumber?.trim())
			return "Платежная квитанция требует номер фискального чека в каждом выбранном платеже.";
		if (!payment.fiscalReceiptIssuedAt?.trim())
			return "Платежная квитанция требует дату фискального чека в каждом выбранном платеже.";
		const missingPayerFact = paymentReceiptMissingPayerFact(payment, payload);
		if (missingPayerFact) return missingPayerFact;
		if (!paymentReceiptPayloadMatchesPayer(payment, payload)) {
			return "Платежная квитанция не должна смешивать разные данные плательщика. Проверьте выбранные оплаты и карточку плательщика.";
		}
		selectedPayments.push(payment);
	}

	const selectedTotalKopecks = sumKopecks(
		selectedPayments.map((payment) => parseKopecks(payment.amountRub)),
	);
	if (!moneyRubEquals(selectedTotalKopecks, payload.totalPaidRub)) {
		return `Платежная квитанция: сумма ${moneyRubText(payload.totalPaidRub)} руб. не совпадает с выбранными оплатами ${moneyKopecksText(selectedTotalKopecks)} руб.`;
	}

	const actualReceiptNumbers = new Set(
		selectedPayments
			.map((payment) =>
				normalizedFiscalReceiptNumber(payment.fiscalReceiptNumber),
			)
			.filter(Boolean),
	);
	const payloadReceiptNumbers = [
		...new Set(
			payload.fiscalReceiptNumbers
				.map(normalizedFiscalReceiptNumber)
				.filter(Boolean),
		),
	];
	const unknownPayloadReceipts = payloadReceiptNumbers.filter(
		(receiptNumber) => !actualReceiptNumbers.has(receiptNumber),
	);
	if (unknownPayloadReceipts.length) {
		return `Платежная квитанция содержит фискальный чек без связи с выбранной оплатой: ${unknownPayloadReceipts.join(", ")}.`;
	}
	const missingPayloadReceipts = [...actualReceiptNumbers].filter(
		(receiptNumber) => !payloadReceiptNumbers.includes(receiptNumber),
	);
	if (missingPayloadReceipts.length) {
		return `Платежная квитанция должна включать все фискальные чеки выбранных оплат: ${missingPayloadReceipts.join(", ")}.`;
	}

	return null;
}

/**
 * Копейки, уже возвращённые по платежу ВЫДАННЫМИ документами возврата/коррекции.
 *
 * ЗАЧЕМ: без этого учёта возврат по одному чеку можно было оформить сколько
 * угодно раз. Проверка сравнивала каждую заявку с ИСХОДНОЙ суммой платежа,
 * а не с остатком. Два возврата по 30 000 ₽ с чека на 50 000 ₽ проходили оба —
 * клиника выплачивала 60 000 ₽.
 *
 * Считаем по фактически выданным документам, поэтому отдельная колонка в БД
 * и миграция не нужны: источник истины — сами документы возврата.
 *
 * ПОЧЕМУ ЦЕЛЫЕ КОПЕЙКИ, А НЕ СУММА РУБЛЁВЫХ `Number`. Прежняя реализация
 * складывала рубли в плавающей точке (`total += amount`). Для сравнения «больше
 * остатка» это ещё сходило, но на этой же сумме теперь стоит решение «чек
 * возвращён ПОЛНОСТЬЮ», а это равенство, а не «примерно». Замерено: четыре
 * частичных возврата 100.10 + 100.10 + 100.10 + 99.70 по чеку на 400.00 ₽ дают
 * в double 399.99999999999994 — то есть полностью возвращённый чек выглядит как
 * «остался почти ноль» и НАВСЕГДА остаётся в выручке клиники. В целых копейках
 * равенство точное, и такой чек уходит из выручки, как и должен.
 */
export function alreadyRefundedKopecksForPayment(
	paymentId: string,
	documents: readonly GeneratedDocument[] | null | undefined,
	excludeDocumentId?: string | null,
): number {
	if (!documents?.length) return 0;
	const refundedKopecks: number[] = [];
	for (const candidate of documents) {
		if (candidate.kind !== "payment_refund_correction_request") continue;
		if (candidate.status !== "issued") continue;
		if (excludeDocumentId && candidate.id === excludeDocumentId) continue;
		const refund = candidate.payload?.paymentRefundCorrection;
		if (!refund) continue;
		const selected = refund.selectedPaymentIds ?? [];
		if (!selected.includes(paymentId)) continue;
		const amount = Number(refund.amountRub ?? 0);
		// Повреждённая или неположительная сумма пропускается ровно как раньше:
		// `parseKopecks` по контракту бросает на NaN, а расчёт остатка по чеку
		// обязан продолжиться и на битом соседнем документе.
		if (!Number.isFinite(amount) || amount <= 0) continue;
		refundedKopecks.push(parseKopecks(amount));
	}
	return sumKopecks(refundedKopecks);
}

/**
 * Чем возврат обязан кончиться для КАССЫ по одному платежу.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. Возврат существовал только как документ. Ни один маршрут
 * не переводил платёж в статус `refunded` — во всём `apps/api/src` было
 * объявление перечисления, чтение в этом файле и признание проблемы в
 * комментарии. Замерено сквозным прогоном: заявление на возврат 500 ₽ оформлено
 * и ВЫДАНО (HTTP 200), а `payments.status` того платежа остался `paid`. Выручка
 * (`sum(amount_rub) where status = 'paid'`, services/reports/managerReports.ts)
 * и отчёты руководителю считали возвращённые деньги полученными: касса не
 * сходилась с фактическим остатком, а налоговая справка собрала бы возвращённую
 * сумму как оплату пациента.
 *
 * ЧАСТИЧНЫЙ ВОЗВРАТ НЕ ВЫРАЖАЕТСЯ СУЩЕСТВУЮЩИМИ СТОЛБЦАМИ, И ЭТО ПРОВЕРЕНО ПО
 * СХЕМЕ. В `payments` (db/schema.ts) есть `status` — один флаг на всю строку из
 * перечисления planned/paid/refunded/voided — и `amount_rub`, сумма ИСХОДНОГО
 * фискального чека. Колонки «возвращено столько-то» нет ни одной. Поэтому:
 *   • `amount_rub` править нельзя — этот номер напечатан на чеке у пациента, и с
 *     ним же сравнивается остаток по чеку выше;
 *   • ставить `refunded` при частичном возврате нельзя — это убрало бы из
 *     выручки ВЕСЬ чек вместо возвращённой части, то есть промах кассы в другую
 *     сторону, и соврало бы налоговой справке о полном возврате.
 * Значит статус меняется ТОЛЬКО когда выданные возвраты покрыли чек целиком, до
 * копейки. Частичный возврат остаётся `paid` и объявлен долгом: выразить его
 * нечем без новой колонки, а выдумывать колонку здесь запрещено.
 */
export function paymentRefundSettlements(
	payments: readonly Payment[],
	documents: readonly GeneratedDocument[] | null | undefined,
): PaymentRefundSettlement[] {
	const touchedPaymentIds = new Set<string>();
	for (const candidate of documents ?? []) {
		if (candidate.kind !== "payment_refund_correction_request") continue;
		const selected =
			candidate.payload?.paymentRefundCorrection?.selectedPaymentIds ?? [];
		for (const paymentId of selected) touchedPaymentIds.add(paymentId);
	}
	if (!touchedPaymentIds.size) return [];

	const settlements: PaymentRefundSettlement[] = [];
	for (const payment of payments) {
		if (!touchedPaymentIds.has(payment.id)) continue;
		// Между `paid` и `refunded` сведение и ходит. `planned` — ещё не деньги,
		// `voided` — отменённая строка кассы; ни ту, ни другую возврат не двигает.
		if (payment.status !== "paid" && payment.status !== "refunded") continue;
		const amountKopecks = parseKopecks(payment.amountRub);
		const refundedKopecks = alreadyRefundedKopecksForPayment(
			payment.id,
			documents,
		);
		settlements.push({
			paymentId: payment.id,
			amountKopecks,
			refundedKopecks,
			fullyRefunded: amountKopecks > 0 && refundedKopecks >= amountKopecks,
		});
	}
	return settlements;
}

export function paymentRefundCorrectionSelectionErrorForDocument(
	input: CreateDocumentInput,
	payments: readonly Payment[],
	/** Ранее выданные документы пациента — нужны для учёта прошлых возвратов. */
	issuedDocuments?: readonly GeneratedDocument[] | null,
	/** Идентификатор текущего документа, чтобы не считать его самого. */
	currentDocumentId?: string | null,
): string | null {
	if (input.kind !== "payment_refund_correction_request") return null;
	const payload = input.payload?.paymentRefundCorrection;
	if (!payload) return null;

	const selectedIds = selectedPaymentRefundCorrectionIds(input);
	if (!selectedIds.length) {
		return "Для возврата или коррекции выберите конкретный исходный оплаченный платеж.";
	}
	const uniqueSelectedIds = new Set(selectedIds);
	if (uniqueSelectedIds.size !== selectedIds.length) {
		return "В выбранных исходных платежах есть дубли. Оставьте каждый платеж один раз.";
	}

	const expectedReceiptNumber = normalizedFiscalReceiptNumber(
		payload.originalFiscalReceiptNumber,
	);
	const paymentsById = new Map(
		payments.map((payment) => [payment.id, payment]),
	);
	for (const paymentId of selectedIds) {
		const payment = paymentsById.get(paymentId);
		if (!payment)
			return "Выбранный исходный платеж для возврата или коррекции не найден. Обновите экран и выберите платеж заново.";
		if (payment.patientId !== input.patientId)
			return "Выбранный исходный платеж для возврата или коррекции относится к другому пациенту.";
		if (input.visitId && payment.visitId !== input.visitId)
			return "Выбранный исходный платеж для возврата или коррекции относится к другому визиту.";
		if (payment.status === "refunded") {
			return "По выбранному платежу/чеку уже выполнен полный возврат средств. Повторный возврат заблокирован.";
		}
		if (payment.status !== "paid" || payment.amountRub <= 0) {
			return "Возврат или коррекцию можно оформить только по проведенному положительному платежу.";
		}
		const alreadyRefundedKopecks = alreadyRefundedKopecksForPayment(
			payment.id,
			issuedDocuments,
			currentDocumentId,
		);
		const paymentKopecks = parseKopecks(payment.amountRub);
		const refundableKopecks = paymentKopecks - alreadyRefundedKopecks;
		if (refundableKopecks <= 0) {
			return `По чеку на ${moneyKopecksText(paymentKopecks)} руб. уже возвращено ${moneyKopecksText(alreadyRefundedKopecks)} руб. Свободного остатка для возврата нет.`;
		}
		if (parseKopecks(payload.amountRub) > refundableKopecks) {
			return alreadyRefundedKopecks > 0
				? `Сумма возврата (${moneyRubText(payload.amountRub)} руб.) превышает остаток по чеку: из ${moneyKopecksText(paymentKopecks)} руб. уже возвращено ${moneyKopecksText(alreadyRefundedKopecks)} руб., доступно ${moneyKopecksText(refundableKopecks)} руб.`
				: `Сумма возврата (${moneyRubText(payload.amountRub)} руб.) не может превышать сумму исходного чека (${moneyKopecksText(paymentKopecks)} руб.).`;
		}
		if (!payment.fiscalReceiptNumber?.trim()) {
			return "Возврат или коррекция требуют номер исходного фискального чека в выбранном платеже.";
		}
		if (!payment.fiscalReceiptIssuedAt?.trim()) {
			return "Возврат или коррекция требуют дату исходного фискального чека в выбранном платеже.";
		}
		if (
			normalizedFiscalReceiptNumber(payment.fiscalReceiptNumber) !==
			expectedReceiptNumber
		) {
			return "Исходный фискальный чек в заявлении не совпадает с выбранным платежом.";
		}
	}

	return null;
}
