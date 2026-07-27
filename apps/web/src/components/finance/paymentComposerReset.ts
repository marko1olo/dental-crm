/*
 * СВЕЖАЯ ФОРМА ОПЛАТЫ — ОДНО ОПРЕДЕЛЕНИЕ НА ВСЮ ПРОГРАММУ.
 *
 * У формы приёма оплаты два момента, когда она обязана стать пустой: после
 * записанного платежа и при смене пациента. Сбросы были написаны порознь и
 * разошлись. Сброс после платежа (useAppLogic.tsx) очищал все четырнадцать
 * полей, сброс при смене пациента (usePatientLogic.ts) — только шесть:
 * плательщика для вычета. Сумма и весь фискальный блок оставались от прошлого
 * человека.
 *
 * Что из этого следовало. Кассир набирает сумму и переписывает ФН/ФД/ФПД с
 * чека пациента А, не нажимает «Принять оплату», переключается на пациента Б —
 * и видит заполненную форму, неотличимую от только что набранной. Нажатие
 * записывает деньги пациенту Б с суммой пациента А и с фискальными признаками
 * чужого чека. Эти же признаки уходят в налоговые документы.
 *
 * Поэтому перечень полей свежей формы лежит теперь здесь, в одном месте. Сброс
 * при смене пациента вызывает его напрямую. Сброс после платежа пока перечисляет
 * поля у себя, и от повторного расхождения его держит проверка
 * `tests/paymentComposerReset.test.ts`: она читает useAppLogic.tsx и требует,
 * чтобы там гасилось каждое поле из `PaymentComposerFields`. Добавили поле сюда —
 * проверка покажет второе место, где его забыли.
 *
 * Способ оплаты (paymentMethod) сюда не входит намеренно: это настройка
 * рабочего места кассира, а не данные пациента. Она и после платежа не
 * сбрасывается.
 */

/** Код медицинской услуги для налогового вычета: пусто, 1 или 2. */
export type PaymentTaxDeductionCode = "" | "1" | "2";

/** Поля формы приёма оплаты, принадлежащие конкретному платежу. */
export interface PaymentComposerFields {
	paymentAmount: string;
	paymentFiscalCashierName: string;
	paymentFiscalFd: string;
	paymentFiscalFn: string;
	paymentFiscalFpd: string;
	paymentFiscalReceiptIssuedAt: string;
	paymentFiscalReceiptNumber: string;
	paymentFiscalReceiptUrl: string;
	paymentPayerBirthDate: string;
	paymentPayerFullName: string;
	paymentPayerIdentityDocument: string;
	paymentPayerInn: string;
	paymentPayerRelationship: string;
	paymentTaxDeductionCode: PaymentTaxDeductionCode;
}

/** Записывающие функции хранилища для тех же полей плюс строка состояния. */
export interface PaymentComposerSetters {
	setPaymentAmount: (value: string) => void;
	setPaymentFeedback: (value: string) => void;
	setPaymentFiscalCashierName: (value: string) => void;
	setPaymentFiscalFd: (value: string) => void;
	setPaymentFiscalFn: (value: string) => void;
	setPaymentFiscalFpd: (value: string) => void;
	setPaymentFiscalReceiptIssuedAt: (value: string) => void;
	setPaymentFiscalReceiptNumber: (value: string) => void;
	setPaymentFiscalReceiptUrl: (value: string) => void;
	setPaymentPayerBirthDate: (value: string) => void;
	setPaymentPayerFullName: (value: string) => void;
	setPaymentPayerIdentityDocument: (value: string) => void;
	setPaymentPayerInn: (value: string) => void;
	setPaymentPayerRelationship: (value: string) => void;
	setPaymentTaxDeductionCode: (value: PaymentTaxDeductionCode) => void;
}

/**
 * Родство плательщика по умолчанию. Пустым это поле не оставляем: у подавляющего
 * большинства платежей плательщик — сам пациент, и то же значение подставляет
 * сброс после записанного платежа.
 */
export const DEFAULT_PAYER_RELATIONSHIP = "пациент";

/**
 * Значения свежей формы.
 *
 * Сумма — пустая строка, а не ноль: поле хранит то, что набрал человек, вместе
 * с копейками после запятой (`rubAmountInput.ts`), и подставленный ноль касса
 * приняла бы за введённую сумму.
 */
export function emptyPaymentComposerFields(): PaymentComposerFields {
	return {
		paymentAmount: "",
		paymentFiscalCashierName: "",
		paymentFiscalFd: "",
		paymentFiscalFn: "",
		paymentFiscalFpd: "",
		paymentFiscalReceiptIssuedAt: "",
		paymentFiscalReceiptNumber: "",
		paymentFiscalReceiptUrl: "",
		paymentPayerBirthDate: "",
		paymentPayerFullName: "",
		paymentPayerIdentityDocument: "",
		paymentPayerInn: "",
		paymentPayerRelationship: DEFAULT_PAYER_RELATIONSHIP,
		paymentTaxDeductionCode: "",
	};
}

/**
 * Приводит форму приёма оплаты к свежему виду и гасит строку состояния:
 * «Оплата 5 000 ₽ записана для Иванова» над формой следующего пациента —
 * такая же подстановка чужих данных, как незачищенная сумма.
 */
export function resetPaymentComposer(setters: PaymentComposerSetters): void {
	const fields = emptyPaymentComposerFields();
	setters.setPaymentAmount(fields.paymentAmount);
	setters.setPaymentFiscalCashierName(fields.paymentFiscalCashierName);
	setters.setPaymentFiscalFd(fields.paymentFiscalFd);
	setters.setPaymentFiscalFn(fields.paymentFiscalFn);
	setters.setPaymentFiscalFpd(fields.paymentFiscalFpd);
	setters.setPaymentFiscalReceiptIssuedAt(fields.paymentFiscalReceiptIssuedAt);
	setters.setPaymentFiscalReceiptNumber(fields.paymentFiscalReceiptNumber);
	setters.setPaymentFiscalReceiptUrl(fields.paymentFiscalReceiptUrl);
	setters.setPaymentPayerBirthDate(fields.paymentPayerBirthDate);
	setters.setPaymentPayerFullName(fields.paymentPayerFullName);
	setters.setPaymentPayerIdentityDocument(fields.paymentPayerIdentityDocument);
	setters.setPaymentPayerInn(fields.paymentPayerInn);
	setters.setPaymentPayerRelationship(fields.paymentPayerRelationship);
	setters.setPaymentTaxDeductionCode(fields.paymentTaxDeductionCode);
	setters.setPaymentFeedback("");
}

/*
 * ПОЧЕМУ СБРОС НЕ ИМЕЕТ ПРАВА СРАБАТЫВАТЬ НА МОНТИРОВАНИИ.
 *
 * Форма приёма оплаты лежит в общем хранилище (documentStore), а не при экране
 * кассы. Эффект «сменился пациент — форма пустая» живёт в useAppLogic, и этот
 * контекст создаётся НЕ один раз за сеанс: кроме корня приложения его заводит
 * заново useVisitDiaryLogic. Значит, эффект монтируется каждый раз, когда врач
 * открывает вкладку «Зубная формула и Дневник», — а `useEffect` на монтировании
 * выполняется всегда, независимо от значений в массиве зависимостей.
 *
 * Без защиты это стирало набранную сумму и переписанный с чека фискальный блок
 * у кассира, который никакого пациента не переключал: достаточно было отойти на
 * «Приём», открыть вкладку дневника и вернуться. Одна беда (деньги уезжают к
 * чужому пациенту) была бы обменена на другую (деньги молча пропадают из формы).
 *
 * Поэтому решение о сбросе принимает эта функция, а не сам эффект: она помнит
 * пациента предыдущего прогона и гасит форму только при настоящей смене.
 */

/**
 * «Этот экземпляр эффекта ещё ни разу не выполнялся».
 *
 * Отдельный символ, а не `undefined` и не `null`: «пациент не выбран» — это
 * настоящее состояние формы (`documentPatient?.id` равен `undefined`), и путать
 * его с первым прогоном нельзя. Иначе монтирование при выбранном пациенте снова
 * выглядело бы сменой пациента и снова стирало сумму.
 */
export const PAYMENT_COMPOSER_PATIENT_UNTRACKED: unique symbol = Symbol(
	"payment-composer-patient-untracked",
);

/** Пациент предыдущего прогона эффекта либо признак первого прогона. */
export type TrackedComposerPatientId =
	| string
	| undefined
	| typeof PAYMENT_COMPOSER_PATIENT_UNTRACKED;

/** Ссылка (`useRef`), в которой эффект держит пациента предыдущего прогона. */
export interface TrackedComposerPatientRef {
	current: TrackedComposerPatientId;
}

/**
 * Гасит форму приёма оплаты только при настоящей смене пациента.
 *
 * Первый прогон экземпляра эффекта (монтирование) сбросом не считается: набранное
 * человеком остаётся. Снятие выбора пациента — переход в `undefined` — смена, и
 * форма гасится: сумма без пациента ни к кому не относится.
 *
 * Возвращает `true`, если форма была сброшена. Возвращаемое значение — не
 * украшение: на нём держится проверка `tests/paymentComposerReset.test.ts`,
 * которая считает сбросы на последовательности пациентов.
 */
export function resetPaymentComposerOnPatientChange(
	trackedPatientId: TrackedComposerPatientRef,
	patientId: string | undefined,
	setters: PaymentComposerSetters,
): boolean {
	const previousPatientId = trackedPatientId.current;
	trackedPatientId.current = patientId;
	if (previousPatientId === PAYMENT_COMPOSER_PATIENT_UNTRACKED) return false;
	if (previousPatientId === patientId) return false;
	resetPaymentComposer(setters);
	return true;
}
