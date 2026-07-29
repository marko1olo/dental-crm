import {
	type CompletedWorksActPayload,
	type CreateDocumentInput,
	type DocumentKind,
	type GeneratedDocument,
	documentKindMetadata,
	documentPayloadDisallowedKeys,
	type InstallmentPaymentSchedulePayload,
	legacyTaxDeductionCertificateMaxYear,
	legacyTaxDeductionCertificateMinYear,
	type PaidMedicalServicesContractPayload,
	type Patient,
	type Payment,
	type PaymentInvoicePayload,
	type PaymentReceiptPayload,
	type TreatmentCostEstimatePayload,
	type TreatmentPlanItem,
	taxDeductionApplicationPayloadSchema,
	taxDeductionCertificateMinYear,
	type Visit,
	kopecksToNumericString,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
/*
 * Перевод слов разборщика в слова человека — ОДИН на весь сервер, рядом с домом
 * текстов отказа по кабинету клиники (utils/clinicSessionRefusal.ts).
 */
import { schemaIssueWords } from "../utils/schemaRefusalWords.js";

/**
 * Сравнение денег до копейки, и печать денег человеку.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. Три проверки ниже сравнивали рублёвые суммы через `!==`
 * на числах с плавающей точкой, и одна из них — ворота выдачи платёжной
 * квитанции. Замерено, а не рассуждение: три оплаты по 300.01, 300.05 и 300.07
 * — каждая ровная до копейки и каждая законная по контракту — дают
 * 900.1299999999999 в одном порядке сложения и 900.13 в другом. Клиент
 * складывает оплаты в порядке своего списка, сервер — в порядке
 * `selectedPaymentIds`; порядки независимы, поэтому расхождение возможно на
 * живых данных, а не в теории.
 *
 * Итог для клиники был такой: законная квитанция на три оплаты НЕ выдавалась, а
 * человек читал «сумма 900.1299999999999 руб. не совпадает с выбранными
 * оплатами 900.13 руб.» — два числа, которые глазом не различить.
 *
 * Здесь НЕ вводится допуск epsilon: он спрятал бы и настоящее расхождение в одну
 * копейку, а это ворота денежного документа. Сравнение идёт в ЦЕЛЫХ копейках,
 * то есть остаётся строгим, и «ровно на копейку меньше» по-прежнему отбивается.
 *
 * Второй владелец этой же болезни уже был найден и починен в
 * `renderDocument.ts` — этот файл нёс свою отдельную копию, поэтому правка там
 * его не касалась. Считать деньги здесь теперь нечем, кроме
 * `packages/shared/src/utils/money.ts`; третьей копии не создаётся.
 */
function moneyRubEquals(kopecks: number, rub: number): boolean {
	return kopecks === parseKopecks(rub);
}

/** Заглушка суммы, которую напечатать не удалось: форма денег сохранена, значение — нет. */
const MONEY_TEXT_UNPRINTABLE = "?.??";

/**
 * Печать рублёвой суммы в текст отказа. НЕ БРОСАЕТ, никогда.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. Все одиннадцать мест, где этот файл печатает деньги,
 * находятся ВНУТРИ построения сообщения об отказе. `parseKopecks` по контракту
 * бросает на NaN, на Infinity и на строке, не похожей на деньги — «Денежное
 * значение не является числом: NaN». Для расчёта это верно: повреждённые деньги
 * должны останавливать работу. Но здесь расчёт уже закончен, решение отказать
 * принято, и осталась одна задача — объяснить отказ человеку. Исключение из
 * построителя фразы уносит объяснение целиком: вежливый 409 «сумма не совпадает»
 * превращается в 500 без текста, и клиника не узнаёт даже того, что документ
 * отбит по сумме. Это строго хуже дефекта, который починили сами одиннадцать
 * конверсий.
 *
 * Считать деньги здесь по-прежнему нечем, кроме
 * `packages/shared/src/utils/money.ts`: функция только оборачивает `parseKopecks`
 * и `kopecksToNumericString`. Второй реализации денег не возникает — их в этом
 * репозитории уже находили дважды, и одна отказывала законной квитанции.
 *
 * ЗАГЛУШКА — НЕ НОЛЬ. `0.00` было бы ложью, причём неотличимой от правды:
 * `parseKopecks(null)` законно даёт `0.00` для отсутствующей суммы, поэтому
 * повреждённое значение обязано выглядеть иначе, иначе врач пойдёт искать ноль,
 * которого в данных нет. «undefined руб.» — тоже не объяснение, а мусор.
 * `?.??` держит форму денежного слота прямо перед «руб.», читается как «сумму
 * напечатать не удалось» и ни с одной настоящей суммой не путается.
 *
 * Сравнения этим не затронуты: они идут в целых копейках без допуска и обязаны
 * бросать на повреждённых деньгах, а не печатать заглушку.
 */
export function moneyRubText(rub: string | number | null | undefined): string {
	try {
		return kopecksToNumericString(parseKopecks(rub));
	} catch {
		return MONEY_TEXT_UNPRINTABLE;
	}
}

/**
 * То же для уже посчитанных копеек (результат `sumKopecks`).
 *
 * Отдельный вход, а не признак-единица в одной подписи: перевод копеек в рубли
 * ради общей сигнатуры вернул бы деление в денежный путь. Реализация та же самая,
 * из `@dental/shared`.
 */
export function moneyKopecksText(kopecks: number): string {
	try {
		return kopecksToNumericString(kopecks);
	} catch {
		return MONEY_TEXT_UNPRINTABLE;
	}
}

type DocumentVisit = Pick<Visit, "id" | "patientId">;
type DocumentPatient = Pick<Patient, "id">;
type DocumentTreatmentPlanItem = Pick<
	TreatmentPlanItem,
	| "patientId"
	| "visitId"
	| "status"
	| "unitPriceRub"
	| "quantity"
	| "discountRub"
>;

export type DocumentCreationFacts = {
	patient: DocumentPatient | null;
	visit: DocumentVisit | null;
	paidAmountRub: number;
	plannedAmountRub: number;
	taxPaymentSelectionError?: string | null;
	paymentReceiptSelectionError?: string | null;
	paymentRefundCorrectionSelectionError?: string | null;
};

export type DocumentCreationGuardResult =
	| { ok: true; input: CreateDocumentInput }
	| { ok: false; statusCode: 404 | 409; error: string };

function taxPaidDocumentsNeedYear(kind: DocumentKind): boolean {
	const metadata = documentKindMetadata[kind];
	return metadata.group === "tax" && metadata.amountSource === "paid";
}

function taxPaidDocumentKindIsKnd(kind: DocumentKind): boolean {
	return (
		kind === "tax_deduction_certificate" || kind === "tax_deduction_registry"
	);
}

function taxPaidDocumentKindIsLegacy(kind: DocumentKind): boolean {
	return kind === "legacy_tax_deduction_certificate";
}

function taxCertificateRequiresPayerInn(kind: DocumentKind): boolean {
	return kind === "legacy_tax_deduction_certificate";
}

function taxPaidDocumentRequiresPaymentSelection(kind: DocumentKind): boolean {
	return (
		kind === "tax_deduction_certificate" ||
		kind === "legacy_tax_deduction_certificate" ||
		kind === "tax_deduction_registry"
	);
}

function taxPaidDocumentCanValidatePaymentSelection(
	kind: DocumentKind,
): boolean {
	return (
		taxPaidDocumentRequiresPaymentSelection(kind) ||
		kind === "tax_deduction_application"
	);
}

function selectedTaxPaymentIds(
	input: Pick<CreateDocumentInput, "payload">,
): string[] {
	if (input.payload?.taxDeductionApplication)
		return input.payload.taxDeductionApplication.selectedPaymentIds ?? [];
	return input.payload?.taxPaymentSelection?.selectedPaymentIds ?? [];
}

function selectedPaymentReceiptIds(
	input: Pick<CreateDocumentInput, "payload">,
): string[] {
	return input.payload?.paymentReceipt?.selectedPaymentIds ?? [];
}

function selectedPaymentRefundCorrectionIds(
	input: Pick<CreateDocumentInput, "payload">,
): string[] {
	return input.payload?.paymentRefundCorrection?.selectedPaymentIds ?? [];
}

function payloadKindMismatchReason(input: CreateDocumentInput): string | null {
	const disallowedKeys = documentPayloadDisallowedKeys(
		input.kind,
		input.payload,
	);
	if (disallowedKeys.length === 0) return null;
	const documentLabel = documentKindMetadata[input.kind]?.label ?? input.kind;
	return `Структурированные данные не соответствуют документу "${documentLabel}": ${disallowedKeys.join(", ")}. Создайте документ с данными нужной формы.`;
}

function paymentTaxYear(payment: Payment): number | null {
	const sourceDate = payment.fiscalReceiptIssuedAt || payment.paidAt;
	if (!sourceDate) return null;
	const explicitYear = /^(\d{4})/.exec(sourceDate)?.[1];
	if (explicitYear) return Number(explicitYear);
	const parsed = new Date(sourceDate);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.getFullYear();
}

function paymentPaidInTaxYear(payment: Payment, taxYear: number): boolean {
	return paymentTaxYear(payment) === taxYear;
}

function normalizeInnDigits(value: string | null | undefined): string {
	return (value ?? "").replace(/\D+/g, "");
}

function paymentMatchesTaxPayer(
	payment: Payment,
	payerInn: string | null | undefined,
): boolean {
	const normalizedPayerInn = normalizeInnDigits(payerInn);
	if (!normalizedPayerInn) return true;
	return normalizeInnDigits(payment.payerInn) === normalizedPayerInn;
}

function taxDocumentSelectionScope(input: CreateDocumentInput): {
	taxYear: number | null | undefined;
	payerInn: string | null | undefined;
} {
	const application =
		input.kind === "tax_deduction_application"
			? input.payload?.taxDeductionApplication
			: null;
	return {
		taxYear: application?.requestedTaxYear ?? input.taxYear,
		payerInn: application?.taxpayerInn ?? input.taxPayerInn,
	};
}

function paymentMatchesTaxDocumentScope(
	payment: Payment,
	input: CreateDocumentInput,
): boolean {
	const { taxYear, payerInn } = taxDocumentSelectionScope(input);
	return Boolean(
		taxYear &&
			payment.patientId === input.patientId &&
			payment.status === "paid" &&
			payment.amountRub > 0 &&
			paymentPaidInTaxYear(payment, taxYear) &&
			paymentMatchesTaxPayer(payment, payerInn),
	);
}

export function taxPaymentSelectionErrorForDocument(
	input: CreateDocumentInput,
	payments: readonly Payment[],
): string | null {
	if (!taxPaidDocumentCanValidatePaymentSelection(input.kind)) return null;

	const selectedIds = selectedTaxPaymentIds(input);
	const { taxYear, payerInn } = taxDocumentSelectionScope(input);
	if (!selectedIds.length) {
		if (!taxPaidDocumentRequiresPaymentSelection(input.kind)) return null;
		return "Для налогового заявления, справки или реестра нужно явно выбрать фискальные чеки. Автоматический захват всех оплат за год отключен.";
	}

	const uniqueSelectedIds = new Set(selectedIds);
	if (uniqueSelectedIds.size !== selectedIds.length) {
		return "В выбранных чеках есть дубли. Оставьте каждый фискальный чек один раз.";
	}

	const paymentsById = new Map(
		payments.map((payment) => [payment.id, payment]),
	);
	for (const paymentId of selectedIds) {
		const payment = paymentsById.get(paymentId);
		if (!payment) {
			return "Выбранный фискальный чек не найден. Обновите экран и выберите чек заново.";
		}
		if (payment.patientId !== input.patientId) {
			return "Выбранный фискальный чек относится к другому пациенту.";
		}
		if (payment.status !== "paid" || payment.amountRub <= 0) {
			return "В налоговый документ можно включать только проведенные положительные оплаты.";
		}
		if (!taxYear || !paymentPaidInTaxYear(payment, taxYear)) {
			return "Выбранный фискальный чек не относится к выбранному налоговому году.";
		}
		if (!paymentMatchesTaxPayer(payment, payerInn)) {
			return "Выбранный фискальный чек относится к другому ИНН плательщика.";
		}
	}

	return null;
}

function normalizedDocumentValue(value: string | null | undefined): string {
	return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function normalizedFiscalReceiptNumber(
	value: string | null | undefined,
): string {
	return (value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("ru-RU");
}

function paymentReceiptStoredFieldMatchesPayload(
	storedValue: string | null | undefined,
	payloadValue: string | null | undefined,
): boolean {
	const normalizedStoredValue = normalizedDocumentValue(storedValue);
	if (!normalizedStoredValue) return true;
	return normalizedStoredValue === normalizedDocumentValue(payloadValue);
}

function paymentReceiptStoredInnMatchesPayload(
	storedValue: string | null | undefined,
	payloadValue: string | null | undefined,
): boolean {
	const normalizedStoredValue = normalizeInnDigits(storedValue);
	if (!normalizedStoredValue) return true;
	return normalizedStoredValue === normalizeInnDigits(payloadValue);
}

function paymentReceiptPayloadMatchesPayer(
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

function paymentReceiptMissingPayerFact(
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
export type PaymentRefundSettlement = {
	paymentId: string;
	/** Сумма исходного чека в копейках. */
	amountKopecks: number;
	/** Уже возвращено выданными заявлениями, в копейках. */
	refundedKopecks: number;
	/** Возврат покрыл чек целиком — платёж обязан уйти из выручки. */
	fullyRefunded: boolean;
};

/**
 * Сведение возвратов с кассой по всем платежам, которых касались заявления
 * на возврат этого пациента.
 *
 * Считается ОТ ДОКУМЕНТОВ, а не от предыдущего состояния платежа, поэтому
 * функция самовосстанавливающаяся: она одинаково верно отвечает и после выдачи
 * заявления, и после его аннулирования. Аннулирование обязано быть учтено —
 * `alreadyRefundedKopecksForPayment` считает только `issued`, и без обратного
 * хода платёж навсегда остался бы `refunded` при нулевом учтённом возврате:
 * выручка занижена, а новый возврат по этому чеку заблокирован проверкой
 * «уже выполнен полный возврат» выше.
 *
 * Черновик заявления кассы не касается: его можно изменить или удалить, деньги
 * ещё не выходили, и снимать их с выручки без юридического основания нельзя.
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
		// БЫЛО: сравнение с ПОЛНОЙ суммой платежа без учёта предыдущих возвратов —
		// по чеку на 50 000 ₽ проходили два возврата по 30 000 ₽ подряд.
		//
		// ОСТАТОК СЧИТАЕТСЯ В ЦЕЛЫХ КОПЕЙКАХ, И ЭТО НЕ КОСМЕТИКА. Вычитание рублей
		// в плавающей точке отбивало ЗАКОННЫЙ последний возврат: по чеку на 400.00 ₽
		// после возвратов 100.10 + 100.10 + 100.10 остаток равен ровно 99.70 ₽, а
		// `400 − 300.30` в double даёт 99.69999999999999, то есть `99.70 > остаток` —
		// правда, и пациенту отказывают в его же деньгах словами «превышает остаток
		// по чеку». Прежняя реализация промахивалась в ДРУГУЮ сторону и по
		// случайности: она складывала рубли и получала 300.29999999999995, откуда
		// остаток 99.70000000000005. Обе цифры — мусор разного знака; в копейках
		// 40000 − 30030 = 9970 и сравнение точное.
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

function structuredPayloadMissingReason(
	input: CreateDocumentInput,
): string | null {
	if (
		input.kind === "patient_intake_questionnaire" &&
		!input.payload?.patientIntakeQuestionnaire
	) {
		return "Для анкеты пациента нужны структурированные данные: жалоба, аллергии, препараты, хронические заболевания, беременность/лактация, антикоагулянты и подтверждение пациента.";
	}
	if (
		input.kind === "tax_deduction_application" &&
		!input.payload?.taxDeductionApplication
	) {
		return "Для заявления на налоговую справку нужны структурированные данные: заявитель, ИНН, дата рождения, документ, родство, год, форма справки, канал выдачи, контакт и подтверждение проверки дублей.";
	}
	if (
		input.kind === "paid_medical_services_contract" &&
		!input.payload?.paidMedicalServicesContract
	) {
		return "Для договора платных медицинских услуг нужны структурированные данные: номер и дата договора, сроки, заказчик, основание обращения, состав услуг, сумма, порядок оплаты, изменение цены, уведомление о бесплатной помощи, предупреждение о рекомендациях врача, отказ/возврат, гарантия и подтверждения пациента.";
	}
	if (
		input.kind === "completed_works_act" &&
		!input.payload?.completedWorksAct
	) {
		return "Для акта выполненных работ нужны структурированные данные: номер и дата акта, договор, период оказания, врач, состав работ, суммы, фискальные чеки, претензии или их отсутствие и подтверждения пациента.";
	}
	if (
		input.kind === "treatment_cost_estimate" &&
		!input.payload?.treatmentCostEstimate
	) {
		return "Для сметы лечения нужны структурированные данные: номер, дата, пациент или плательщик, основание лечения, состав услуг, сумма, срок действия, правила изменения цены, исключения, условия оплаты, ответственный врач и подтверждения пациента.";
	}
	if (input.kind === "payment_invoice" && !input.payload?.paymentInvoice) {
		return "Для счета на оплату нужны структурированные данные: номер и дата счета, плательщик, назначение платежа, состав услуг, сумма, срок оплаты, реквизиты, способы оплаты и подтверждение, что счет не заменяет кассовый чек.";
	}
	if (input.kind === "payment_receipt" && !input.payload?.paymentReceipt) {
		return "Для платежной квитанции нужны структурированные данные: номер и дата квитанции, выбранные оплаченные платежи, сумма, плательщик, фискальные чеки, назначение оплаты и подтверждение проверки.";
	}
	if (
		input.kind === "installment_payment_schedule" &&
		!input.payload?.installmentPaymentSchedule
	) {
		return "Для графика рассрочки нужны структурированные данные: номер и дата графика, базовый договор или план, плательщик, сумма, предоплата, остаток, платежи, правила просрочки, способы оплаты и подтверждения пациента.";
	}
	if (
		input.kind === "minor_legal_representative_consent" &&
		!input.payload?.minorLegalRepresentativeConsent
	) {
		return "Для согласия законного представителя нужны структурированные данные: представитель, родство, документ личности, основание полномочий, данные несовершеннолетнего, вмешательство, риски, альтернативы, врач и подтверждения проверки.";
	}
	if (
		input.kind === "warranty_service_memo" &&
		!input.payload?.warrantyServiceMemo
	) {
		return "Для гарантийной памятки нужны структурированные данные: работа, дата завершения, зубы или область, материалы, срок гарантии, контрольные визиты, обязанности пациента, исключения, срочные признаки, связанный акт или договор и подтверждения выдачи.";
	}
	if (
		input.kind === "anesthesia_consent_log" &&
		!input.payload?.anesthesiaConsentLog
	) {
		return "Для журнала анестезии нужны структурированные данные: метод, препарат, зона, аллергоанамнез и дозы.";
	}
	if (
		input.kind === "prescription_medication_order" &&
		!input.payload?.prescriptionMedicationOrder
	) {
		return "Для назначения препаратов нужны структурированные данные: препарат, дозировка, режим, срок и памятка безопасности.";
	}
	if (input.kind === "lab_work_order" && !input.payload?.labWorkOrder) {
		return "Для лабораторного заказа нужны структурированные данные: работа, зона, материал, цвет, источник данных и срок.";
	}
	if (
		input.kind === "photo_video_consent" &&
		!input.payload?.photoVideoConsent
	) {
		return "Для согласия на фото, видео и снимки нужны структурированные данные: типы материалов, разрешенные цели, запрет/разрешение публикации и порядок отзыва.";
	}
	if (input.kind === "xray_cbct_referral" && !input.payload?.xrayCbctReferral) {
		return "Для направления на рентген или КЛКТ нужны структурированные данные: вид исследования, область, клинический вопрос, показание, ограничения и ответственный врач.";
	}
	if (
		input.kind === "medical_record_extract" &&
		!input.payload?.medicalRecordExtract
	) {
		return "Для выписки из медицинской карты нужны структурированные данные: период, источники записей, жалобы и анамнез, объективный статус, диагноз, лечение, рекомендации, врач, получатель и проверка данных третьих лиц.";
	}
	if (
		input.kind === "outpatient_medical_card_025u" &&
		!input.payload?.outpatientMedicalCard025u
	) {
		return "Для медицинской карты 025/у нужны структурированные данные: организация, пациент, номер карты, период, подписанные врачебные записи, диагнозы, стоматологические строки и подтверждения проверки формы 274н.";
	}
	if (
		input.kind === "medical_record_copy_request" &&
		!input.payload?.medicalRecordCopyRequest
	) {
		return "Для запроса копий медицинской документации нужны структурированные данные: состав документов, период, формат, получатель, документ получателя, полномочия, контакт выдачи и проверка лишних данных третьих лиц.";
	}
	if (
		input.kind === "post_visit_recommendations" &&
		!input.payload?.postVisitRecommendations
	) {
		return "Для рекомендаций после приема нужны структурированные данные: процедура, зона, дата, врач, разрешенные действия, ограничения, назначения, питание, гигиена, тревожные признаки, контакт клиники и краткий текст для Telegram.";
	}
	if (input.kind === "treatment_plan" && !input.payload?.treatmentPlan) {
		return "Для плана лечения нужны структурированные данные: причина обращения, диагноз, область, цели, этапы, стоимость, альтернативы, риски, прогноз, контроль, врач и подтверждения пациента.";
	}
	if (
		input.kind === "treatment_plan_acceptance" &&
		!input.payload?.treatmentPlanAcceptance
	) {
		return "Для согласования плана лечения нужны структурированные данные: выбранный вариант, диагноз/цель, зона, этапы, сумма, срок действия сметы, условия оплаты, отклоненные альтернативы, риски, врач и подтверждения пациента.";
	}
	if (
		input.kind === "visit_attendance_certificate" &&
		!input.payload?.visitAttendanceCertificate
	) {
		return "Для справки о посещении нужны структурированные данные: время начала и окончания приема, цель выдачи, получатель, дата, подписант и подтверждение, что диагноз не раскрывается.";
	}
	if (
		input.kind === "medical_document_release_receipt" &&
		!input.payload?.medicalDocumentReleaseReceipt
	) {
		return "Для расписки о выдаче медицинских документов нужны структурированные данные: получатель, основание, канал, состав выдачи, дата и защита передачи.";
	}
	if (
		input.kind === "payment_refund_correction_request" &&
		!input.payload?.paymentRefundCorrection
	) {
		return "Для возврата или коррекции оплаты нужны структурированные данные: действие, сумма, основание, способ, получатель, исходный чек и решение ответственного.";
	}
	if (input.kind === "informed_consent" && !input.payload?.informedConsent) {
		return "Для информированного согласия нужны структурированные данные: вмешательство, область, показание, ожидаемая польза, риски, альтернативы, рекомендации после вмешательства, врач и подтверждения пациента.";
	}
	if (
		input.kind === "procedure_specific_consent_packet" &&
		!input.payload?.procedureSpecificConsent
	) {
		return "Для процедурного согласия нужны структурированные данные: вид процедуры, область, показание, анестезия, материалы, персональные риски пациента, процедурные риски, альтернативы, ограничения после процедуры, врач и подтверждения пациента.";
	}
	if (
		input.kind === "personal_data_processing_consent" &&
		!input.payload?.personalDataProcessingConsent
	) {
		return "Для согласия на обработку персональных данных нужны структурированные данные: оператор, ИНН, адрес, цели, категории данных, действия обработки, правила передачи третьим лицам, срок хранения, отзыв согласия и подтверждение обработки медицинских данных.";
	}
	if (
		input.kind === "medical_intervention_refusal" &&
		!input.payload?.medicalInterventionRefusal
	) {
		return "Для отказа от медицинского вмешательства нужны структурированные данные: вмешательство, показание, причина отказа, разъясненные риски, альтернативы, тревожные признаки и подтверждения пациента.";
	}
	return null;
}

type FinancialServicePayloadLine = {
	quantity: number;
	unitPriceRub: number;
	discountRub: number;
	totalRub: number;
};

function expectedFinancialLineTotal(line: FinancialServicePayloadLine): number {
	return Math.max(0, Math.round((line.quantity * line.unitPriceRub - line.discountRub) * 100) / 100);
}

function financialLinesTotal(
	lines: readonly FinancialServicePayloadLine[],
): number {
	return Math.round(lines.reduce((total, line) => total + line.totalRub, 0) * 100) / 100;
}

function financialServiceLinesMismatchReason(
	lines: readonly FinancialServicePayloadLine[],
	documentLabel: string,
): string | null {
	for (const [index, line] of lines.entries()) {
		const expectedTotalRub = expectedFinancialLineTotal(line);
		if (Math.abs(line.totalRub - expectedTotalRub) > 0.01) {
			return `${documentLabel}: строка ${index + 1} должна иметь сумму ${moneyRubText(expectedTotalRub)} руб. по количеству, цене и скидке; передано ${moneyRubText(line.totalRub)} руб.`;
		}
	}
	return null;
}

function financialServiceLinesGrandTotalMismatchReason(
	lines: readonly FinancialServicePayloadLine[],
	totalAmountRub: number,
	documentLabel: string,
): string | null {
	const linesTotalRub = financialLinesTotal(lines);
	const targetRub = Math.round(totalAmountRub * 100) / 100;
	if (Math.abs(linesTotalRub - targetRub) > 0.01) {
		return `${documentLabel}: общий итог ${moneyRubText(totalAmountRub)} руб. не совпадает с суммой строк ${moneyRubText(linesTotalRub)} руб.`;
	}
	return null;
}

function plannedFactsTotalMismatchReason(
	payloadTotalRub: number,
	facts: DocumentCreationFacts,
	documentLabel: string,
): string | null {
	if (
		facts.plannedAmountRub > 0 &&
		payloadTotalRub !== facts.plannedAmountRub
	) {
		return `${documentLabel}: сумма ${moneyRubText(payloadTotalRub)} руб. не совпадает с актуальным планом лечения ${moneyRubText(facts.plannedAmountRub)} руб.`;
	}
	return null;
}

function paidFactsTotalMismatchReason(
	payloadTotalRub: number,
	facts: DocumentCreationFacts,
	documentLabel: string,
): string | null {
	if (facts.paidAmountRub > 0 && payloadTotalRub !== facts.paidAmountRub) {
		return `${documentLabel}: сумма ${moneyRubText(payloadTotalRub)} руб. не совпадает с реально оплаченным контекстом ${moneyRubText(facts.paidAmountRub)} руб.`;
	}
	return null;
}

function treatmentCostEstimateMismatchReason(
	payload: TreatmentCostEstimatePayload,
	facts: DocumentCreationFacts,
): string | null {
	return (
		financialServiceLinesMismatchReason(
			payload.serviceLines,
			"Смета лечения",
		) ??
		financialServiceLinesGrandTotalMismatchReason(
			payload.serviceLines,
			payload.totalAmountRub,
			"Смета лечения",
		) ??
		plannedFactsTotalMismatchReason(
			payload.totalAmountRub,
			facts,
			"Смета лечения",
		)
	);
}

function paymentInvoiceMismatchReason(
	payload: PaymentInvoicePayload,
	facts: DocumentCreationFacts,
): string | null {
	return (
		financialServiceLinesMismatchReason(
			payload.serviceLines,
			"Счет на оплату",
		) ??
		financialServiceLinesGrandTotalMismatchReason(
			payload.serviceLines,
			payload.totalAmountRub,
			"Счет на оплату",
		) ??
		plannedFactsTotalMismatchReason(
			payload.totalAmountRub,
			facts,
			"Счет на оплату",
		)
	);
}

function installmentScheduleMismatchReason(
	payload: InstallmentPaymentSchedulePayload,
	facts: DocumentCreationFacts,
): string | null {
	const expectedRemainingRub = Math.max(
		0,
		payload.totalAmountRub - payload.prepaidAmountRub,
	);
	if (payload.remainingAmountRub !== expectedRemainingRub) {
		return `График рассрочки: остаток ${moneyRubText(payload.remainingAmountRub)} руб. не совпадает с суммой минус предоплатой ${moneyRubText(expectedRemainingRub)} руб.`;
	}

	const installmentsTotalKopecks = sumKopecks(
		payload.installments.map((installment) =>
			parseKopecks(installment.amountRub),
		),
	);
	if (!moneyRubEquals(installmentsTotalKopecks, payload.remainingAmountRub)) {
		return `График рассрочки: сумма платежей ${moneyKopecksText(installmentsTotalKopecks)} руб. не совпадает с остатком ${moneyRubText(payload.remainingAmountRub)} руб.`;
	}

	return plannedFactsTotalMismatchReason(
		payload.totalAmountRub,
		facts,
		"График рассрочки",
	);
}

function paidContractMismatchReason(
	payload: PaidMedicalServicesContractPayload,
	facts: DocumentCreationFacts,
): string | null {
	if (!payload.customerFullName.trim()) {
		return "Договор платных медицинских услуг: укажите заказчика. Для взрослого пациента это сам пациент, для ребенка или оплаты третьим лицом - законный представитель или плательщик.";
	}
	return plannedFactsTotalMismatchReason(
		payload.estimatedTotalRub,
		facts,
		"Договор платных медицинских услуг",
	);
}

function completedWorksActMismatchReason(
	payload: CompletedWorksActPayload,
	facts: DocumentCreationFacts,
): string | null {
	if (
		!moneyRubEquals(parseKopecks(payload.totalByActRub), payload.paidRub)
	) {
		return `Акт выполненных работ: сумма акта ${moneyRubText(payload.totalByActRub)} руб. не совпадает с оплаченной суммой ${moneyRubText(payload.paidRub)} руб.`;
	}
	return (
		paidFactsTotalMismatchReason(
			payload.totalByActRub,
			facts,
			"Акт выполненных работ",
		) ??
		paidFactsTotalMismatchReason(
			payload.paidRub,
			facts,
			"Акт выполненных работ",
		)
	);
}

/**
 * Русские подписи полей заявления на налоговый вычет: ключ контракта → подпись
 * из формы заявления.
 *
 * Без словаря отказ называл бы поле латинским ключом (`taxpayerIdentityDocument`
 * — 24 знака), а латинское слово из шести и более знаков гасит фразу целиком
 * фильтром клиента.
 */
const taxDeductionApplicationFieldLabels: Record<string, string> = {
	taxpayerFullName: "ФИО налогоплательщика",
	taxpayerInn: "ИНН налогоплательщика",
	taxpayerBirthDate: "дата рождения налогоплательщика",
	taxpayerIdentityDocument: "документ налогоплательщика",
	relationshipToPatient: "родство с пациентом",
	requestedTaxYear: "год вычета",
	requestedForm: "форма справки",
	selectedPaymentIds: "выбранные оплаты",
	deliveryChannel: "способ выдачи документа",
	contactForReadyDocument: "контакт для готового документа",
	applicantAuthorityDocument: "документ о полномочиях заявителя",
	requestedAt: "дата заявления",
	duplicateWarningAccepted: "подтверждение о повторном заявлении",
};

function documentPayloadConsistencyReason(
	input: CreateDocumentInput,
	facts: DocumentCreationFacts,
): string | null {
	if (
		input.kind === "paid_medical_services_contract" &&
		input.payload?.paidMedicalServicesContract
	) {
		return paidContractMismatchReason(
			input.payload.paidMedicalServicesContract,
			facts,
		);
	}
	if (
		input.kind === "completed_works_act" &&
		input.payload?.completedWorksAct
	) {
		return completedWorksActMismatchReason(
			input.payload.completedWorksAct,
			facts,
		);
	}
	if (
		input.kind === "treatment_cost_estimate" &&
		input.payload?.treatmentCostEstimate
	) {
		return treatmentCostEstimateMismatchReason(
			input.payload.treatmentCostEstimate,
			facts,
		);
	}
	if (input.kind === "payment_invoice" && input.payload?.paymentInvoice) {
		return paymentInvoiceMismatchReason(input.payload.paymentInvoice, facts);
	}
	if (
		input.kind === "installment_payment_schedule" &&
		input.payload?.installmentPaymentSchedule
	) {
		return installmentScheduleMismatchReason(
			input.payload.installmentPaymentSchedule,
			facts,
		);
	}
	if (
		input.kind === "tax_deduction_application" &&
		input.payload?.taxDeductionApplication
	) {
		const application = input.payload.taxDeductionApplication;
		const applicationPayloadResult =
			taxDeductionApplicationPayloadSchema.safeParse(application);
		if (!applicationPayloadResult.success) {
			/*
			 * ПРИЧИНА ОТКАЗА НАЗЫВАЕТ ПОЛЕ ЗАЯВЛЕНИЯ И СЛЕДУЮЩИЙ ШАГ.
			 *
			 * БЫЛО: `issues[0]?.message` — сообщение разборщика ЦЕЛИКОМ и БЕЗ
			 * подписи поля, например «Required» либо
			 * «Number must be greater than or equal to 2021». Здесь дефект хуже, чем
			 * у соседей: поле не называлось вовсе, то есть даже прочитав фразу,
			 * администратор не узнал бы, какое из шестнадцати полей заявления
			 * поправить. А прочитать её он не мог: фильтр клиента
			 * (`apps/web/src/AppHelpers.tsx`, `technicalWorkflowFailurePattern` под
			 * флагом `/i`) гасит фразу с латинским словом из шести и более знаков
			 * целиком.
			 *
			 * Заявление на налоговый вычет — юридический документ, и пациент ждёт
			 * его в срок подачи декларации. Отказ без имени поля означает, что
			 * документ не выпущен и никто не знает почему.
			 *
			 * Часть проверок этой схемы уже несёт написанный человеком текст
			 * («Для старой налоговой справки нужен 10- или 12-значный ИНН
			 * налогоплательщика.») — общий перевод пропускает его как есть.
			 */
			const issue = applicationPayloadResult.error.issues[0];
			if (!issue) {
				return "Заявление на налоговый вычет содержит некорректные данные. Откройте заявление, проверьте поля налогоплательщика и суммы и оформите документ заново.";
			}
			const words = schemaIssueWords(issue, taxDeductionApplicationFieldLabels);
			return `Заявление на налоговый вычет не оформлено: ${words.cause} — ${words.action} и оформите документ заново.`;
		}
		if (input.taxYear && input.taxYear !== application.requestedTaxYear) {
			return `Заявление на налоговый вычет: год документа ${input.taxYear} не совпадает с годом заявления ${application.requestedTaxYear}.`;
		}
		if (
			application.requestedForm === "knd_1151156" &&
			application.requestedTaxYear < taxDeductionCertificateMinYear
		) {
			return "Заявление на налоговый вычет: КНД 1151156 доступна только для оплат с 2024 года.";
		}
		if (
			application.requestedForm === "legacy_2021_2023" &&
			(application.requestedTaxYear < legacyTaxDeductionCertificateMinYear ||
				application.requestedTaxYear > legacyTaxDeductionCertificateMaxYear)
		) {
			return "Заявление на налоговый вычет: старая форма доступна только для оплат 2021-2023.";
		}
	}
	return null;
}

export function paidAmountRubForDocument(
	kind: DocumentKind,
	input: CreateDocumentInput,
	payments: Payment[],
) {
	const metadata = documentKindMetadata[kind];
	if (
		metadata.requiresPaidRecord &&
		metadata.group !== "tax" &&
		!input.visitId
	) {
		return 0;
	}
	if (taxPaidDocumentsNeedYear(kind) && !input.taxYear) {
		return 0;
	}
	if (
		taxPaidDocumentKindIsKnd(kind) &&
		input.taxYear &&
		input.taxYear < taxDeductionCertificateMinYear
	) {
		return 0;
	}
	if (
		taxPaidDocumentKindIsLegacy(kind) &&
		input.taxYear &&
		(input.taxYear < legacyTaxDeductionCertificateMinYear ||
			input.taxYear > legacyTaxDeductionCertificateMaxYear)
	) {
		return 0;
	}
	if (taxPaidDocumentRequiresPaymentSelection(kind)) {
		const selectedIds = new Set(selectedTaxPaymentIds(input));
		if (!selectedIds.size) return 0;
		return payments
			.filter(
				(payment) =>
					selectedIds.has(payment.id) &&
					paymentMatchesTaxDocumentScope(payment, input),
			)
			.reduce((total, payment) => total + payment.amountRub, 0);
	}
	if (kind === "payment_receipt" && input.payload?.paymentReceipt) {
		const selectedIds = new Set(selectedPaymentReceiptIds(input));
		if (!selectedIds.size) return 0;
		return payments
			.filter(
				(payment) =>
					selectedIds.has(payment.id) &&
					payment.patientId === input.patientId &&
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					(!input.visitId || payment.visitId === input.visitId),
			)
			.reduce((total, payment) => total + payment.amountRub, 0);
	}
	if (
		kind === "payment_refund_correction_request" &&
		input.payload?.paymentRefundCorrection
	) {
		const selectedIds = new Set(selectedPaymentRefundCorrectionIds(input));
		if (!selectedIds.size) return 0;
		return payments
			.filter(
				(payment) =>
					selectedIds.has(payment.id) &&
					payment.patientId === input.patientId &&
					payment.status === "paid" &&
					payment.amountRub > 0 &&
					(!input.visitId || payment.visitId === input.visitId),
			)
			.reduce((total, payment) => total + payment.amountRub, 0);
	}

	return payments
		.filter(
			(payment) =>
				payment.patientId === input.patientId && payment.status === "paid",
		)
		.filter((payment) =>
			metadata.group === "tax"
				? Boolean(
						input.taxYear &&
							paymentPaidInTaxYear(payment, input.taxYear) &&
							paymentMatchesTaxPayer(payment, input.taxPayerInn),
					)
				: !input.visitId || payment.visitId === input.visitId,
		)
		.reduce((total, payment) => total + payment.amountRub, 0);
}

function treatmentLineTotal(item: DocumentTreatmentPlanItem): number {
	return Math.max(0, item.unitPriceRub * item.quantity - item.discountRub);
}

export function plannedAmountRubForDocument(
	kind: DocumentKind,
	input: CreateDocumentInput,
	treatmentPlanItems: DocumentTreatmentPlanItem[],
) {
	const metadata = documentKindMetadata[kind];
	if (metadata.amountSource !== "planned") {
		return 0;
	}
	if (!input.visitId) {
		return 0;
	}

	return treatmentPlanItems
		.filter(
			(item) =>
				item.patientId === input.patientId && item.status !== "cancelled",
		)
		.filter((item) => !input.visitId || item.visitId === input.visitId)
		.reduce((total, item) => total + treatmentLineTotal(item), 0);
}

/**
 * Итог, НАПЕЧАТАННЫЙ В ТЕЛЕ документа с плановой суммой.
 *
 * Это не «ещё один расчёт денег», а чтение той единственной суммы, которую
 * документ уже показывает человеку: строки счёта, итог сметы, сумма договора.
 * Каждое из этих полей к этому месту уже проверено — состав строк сходится с
 * итогом (`financialServiceLinesMismatchReason`), а при существующем плане
 * лечения итог обязан совпасть с планом (`plannedFactsTotalMismatchReason`,
 * иначе документ отбит с 409).
 *
 * `lab_work_order` здесь отсутствует намеренно: у заказ-наряда в лабораторию
 * денежного поля нет вовсе, и придумывать ему сумму нечем.
 */
function printedPlannedTotalRub(input: CreateDocumentInput): number | null {
	const payload = input.payload;
	if (!payload) return null;
	switch (input.kind) {
		case "payment_invoice":
			return payload.paymentInvoice?.totalAmountRub ?? null;
		case "treatment_cost_estimate":
			return payload.treatmentCostEstimate?.totalAmountRub ?? null;
		case "installment_payment_schedule":
			return payload.installmentPaymentSchedule?.totalAmountRub ?? null;
		case "paid_medical_services_contract":
			return payload.paidMedicalServicesContract?.estimatedTotalRub ?? null;
		case "treatment_plan":
			return payload.treatmentPlan?.estimatedTotalRub ?? null;
		case "treatment_plan_acceptance":
			return payload.treatmentPlanAcceptance?.estimatedTotalRub ?? null;
		default:
			return null;
	}
}

/**
 * Сумма для денежной колонки документа с плановой суммой.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Здесь стояло
 * `totalAmountRub = facts.plannedAmountRub > 0 ? facts.plannedAmountRub : null`,
 * и это БЕЗУСЛОВНО затирало присланный итог. Замерено сквозным прогоном: счёт
 * создан (HTTP 201), в теле счёта строки на 3491,49 ₽ — они прошли все проверки
 * состава и итога, — а `generated_documents.total_amount_rub = NULL`. Пациент
 * получал счёт без суммы, бухгалтерия не видела выставленного требования: счёт
 * есть, денег в нём нет.
 *
 * ЭТО НЕ «СУММА НЕИЗВЕСТНА», А ПОТЕРЯ. Документ, у которого в теле напечатано
 * 3491,49 ₽, а в денежной колонке пусто, противоречит сам себе: печатная форма
 * и учёт расходятся ВНУТРИ одного документа, и какая из двух половин правда —
 * по данным не определить.
 *
 * ПОЧЕМУ ПОРЯДОК ИМЕННО ТАКОЙ.
 *  1. План лечения, когда он есть, остаётся главным: при `plannedAmountRub > 0`
 *     итог документа обязан совпасть с планом, иначе документ уже отбит с 409
 *     (`plannedFactsTotalMismatchReason`). Так что первый источник ничего не
 *     меняет по сравнению с прежним поведением — правка не ослабляет проверку.
 *  2. Когда позиции плана до `treatment_items` не дошли, `plannedAmountRub`
 *     равен нулю. Тогда напечатанный в теле итог — ЕДИНСТВЕННАЯ существующая
 *     сумма этого документа, и она же на руках у пациента.
 *  3. `input.totalAmountRub` — последняя опора: её присылает экран для
 *     документов, у которых своего денежного поля в теле нет.
 *  4. `null` остаётся законным ответом «суммы в этом документе нет вообще» —
 *     например для заказ-наряда в лабораторию. Пустая колонка при пустом теле
 *     — правда; пустая колонка при напечатанной сумме — нет.
 *
 * КОПЕЙКИ ПРИВОДЯТСЯ К ТОЧНЫМ. `plannedAmountRub` складывается из позиций
 * плана в плавающей точке (`unitPriceRub * quantity - discountRub`), и такая
 * сумма умеет приносить грязь ниже копейки: 300.01 + 300.05 + 300.07 даёт
 * 900.1299999999999. В денежную колонку уходит значение, приведённое через
 * целые копейки, поэтому в ответе маршрута и в базе стоит одно и то же число.
 */
function plannedDocumentTotalRub(
	input: CreateDocumentInput,
	facts: DocumentCreationFacts,
): number | null {
	const source =
		facts.plannedAmountRub > 0
			? facts.plannedAmountRub
			: (printedPlannedTotalRub(input) ?? input.totalAmountRub ?? null);
	if (source === null) return null;
	return Number(kopecksToNumericString(parseKopecks(source)));
}

export function validateDocumentCreation(
	input: CreateDocumentInput,
	facts: DocumentCreationFacts,
): DocumentCreationGuardResult {
	if (!facts.patient) {
		return { ok: false, statusCode: 404, error: "Пациент не найден" };
	}

	if (input.visitId && !facts.visit) {
		return { ok: false, statusCode: 404, error: "Визит не найден" };
	}

	if (facts.visit && facts.visit.patientId !== input.patientId) {
		return {
			ok: false,
			statusCode: 409,
			error: "Визит не принадлежит выбранному пациенту",
		};
	}

	const metadata = documentKindMetadata[input.kind];
	if (metadata.requiresVisit && !input.visitId) {
		return {
			ok: false,
			statusCode: 409,
			error: "Документ должен быть связан с конкретным визитом.",
		};
	}
	if (
		metadata.requiresPaidRecord &&
		metadata.group !== "tax" &&
		!input.visitId
	) {
		return {
			ok: false,
			statusCode: 409,
			error: "Платежному документу нужен явный визит или платежный контекст.",
		};
	}
	if (taxPaidDocumentsNeedYear(input.kind) && !input.taxYear) {
		return {
			ok: false,
			statusCode: 409,
			error: "Налоговым документам нужен явный год оплаты.",
		};
	}
	if (
		taxCertificateRequiresPayerInn(input.kind) &&
		!input.taxPayerInn?.trim()
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Налоговой справке нужен ИНН налогоплательщика. Для разных плательщиков создавайте отдельные справки.",
		};
	}
	if (
		taxPaidDocumentKindIsKnd(input.kind) &&
		input.taxYear &&
		input.taxYear < taxDeductionCertificateMinYear
	) {
		return {
			ok: false,
			statusCode: 409,
			error: "КНД 1151156 поддерживается только для оплат с 2024 года.",
		};
	}
	if (
		taxPaidDocumentKindIsLegacy(input.kind) &&
		input.taxYear &&
		(input.taxYear < legacyTaxDeductionCertificateMinYear ||
			input.taxYear > legacyTaxDeductionCertificateMaxYear)
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Старая налоговая справка поддерживается только для оплат 2021-2023; для оплат с 2024 года используйте КНД 1151156.",
		};
	}
	if (
		taxPaidDocumentRequiresPaymentSelection(input.kind) &&
		!selectedTaxPaymentIds(input).length
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Для налогового заявления, справки или реестра нужно явно выбрать фискальные чеки. Автоматический захват всех оплат за год отключен.",
		};
	}
	if (metadata.amountSource === "planned" && !input.visitId) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Документ с плановой суммой требует явный визит или контекст плана лечения.",
		};
	}

	const payloadMismatchReason = payloadKindMismatchReason(input);
	if (payloadMismatchReason) {
		return { ok: false, statusCode: 409, error: payloadMismatchReason };
	}

	const payloadReason = structuredPayloadMissingReason(input);
	if (payloadReason) {
		return { ok: false, statusCode: 409, error: payloadReason };
	}

	const payloadConsistencyReason = documentPayloadConsistencyReason(
		input,
		facts,
	);
	if (payloadConsistencyReason) {
		return { ok: false, statusCode: 409, error: payloadConsistencyReason };
	}
	if (facts.taxPaymentSelectionError) {
		return {
			ok: false,
			statusCode: 409,
			error: facts.taxPaymentSelectionError,
		};
	}
	if (facts.paymentReceiptSelectionError) {
		return {
			ok: false,
			statusCode: 409,
			error: facts.paymentReceiptSelectionError,
		};
	}
	if (facts.paymentRefundCorrectionSelectionError) {
		return {
			ok: false,
			statusCode: 409,
			error: facts.paymentRefundCorrectionSelectionError,
		};
	}

	if (
		input.kind === "photo_video_consent" &&
		input.payload?.photoVideoConsent?.recognizablePublicationAllowed &&
		!input.payload.photoVideoConsent.educationUseAllowed &&
		!input.payload.photoVideoConsent.marketingUseAllowed
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Публикация узнаваемых фото или видео требует отдельного разрешения на обучение или маркетинг.",
		};
	}

	if (
		input.kind === "xray_cbct_referral" &&
		input.payload?.xrayCbctReferral?.studyType === "cbct" &&
		input.payload.xrayCbctReferral.pregnancyStatus !== "not_applicable" &&
		!input.payload.xrayCbctReferral.safetyNotes.trim()
	) {
		return {
			ok: false,
			statusCode: 409,
			error:
				"Для КЛКТ при возможной беременности или неясном статусе нужен явный комментарий по ограничениям и защите.",
		};
	}

	let totalAmountRub =
		metadata.amountSource === "none" ? null : (input.totalAmountRub ?? null);

	if (metadata.requiresPaidRecord) {
		if (facts.paidAmountRub <= 0) {
			return {
				ok: false,
				statusCode: 409,
				error:
					"Для этого документа нужен существующий оплаченный платеж; плановые суммы не подходят.",
			};
		}
		totalAmountRub = facts.paidAmountRub;
	}

	if (
		input.kind === "payment_refund_correction_request" &&
		input.payload?.paymentRefundCorrection
	) {
		const requestedAmountRub = input.payload.paymentRefundCorrection.amountRub;
		if (requestedAmountRub > facts.paidAmountRub) {
			return {
				ok: false,
				statusCode: 409,
				error:
					"Сумма возврата или коррекции не может превышать фактически оплаченную сумму по выбранному визиту.",
			};
		}
	}

	if (metadata.amountSource === "planned") {
		totalAmountRub = plannedDocumentTotalRub(input, facts);
	}

	return {
		ok: true,
		input: {
			...input,
			taxYear: metadata.group === "tax" ? (input.taxYear ?? null) : null,
			taxPayerInn:
				metadata.group === "tax" ? input.taxPayerInn?.trim() || null : null,
			payload: input.payload ?? null,
			totalAmountRub,
		},
	};
}
