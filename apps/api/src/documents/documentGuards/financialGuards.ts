import {
	type CompletedWorksActPayload,
	type CreateDocumentInput,
	type DocumentKind,
	documentKindMetadata,
	type InstallmentPaymentSchedulePayload,
	kopecksToNumericString,
	legacyTaxDeductionCertificateMaxYear,
	legacyTaxDeductionCertificateMinYear,
	type PaidMedicalServicesContractPayload,
	type Payment,
	type PaymentInvoicePayload,
	parseKopecks,
	sumKopecks,
	type TreatmentCostEstimatePayload,
	taxDeductionApplicationPayloadSchema,
	taxDeductionCertificateMinYear,
} from "@dental/shared";
/*
 * Итог строки лечения считается в ОДНОМ месте на весь сервер —
 * `money/patientDebt.ts`. Своей формулы здесь больше нет: та, что стояла,
 * округляла КОЛИЧЕСТВО и расходилась с печатной формой того же документа на
 * 500,00 ₽ (замер у `expectedFinancialLineTotalKopecks` ниже).
 */
import {
	type ChargeLineOutcome,
	chargeLineOutcome,
} from "../../money/patientDebt.js";
/*
 * Перевод слов разборщика в слова человека — ОДИН на весь сервер, рядом с домом
 * текстов отказа по кабинету клиники (utils/clinicSessionRefusal.ts).
 */
import { schemaIssueWords } from "../../utils/schemaRefusalWords.js";
import { taxDeductionApplicationFieldLabels } from "./constants.js";
import {
	moneyKopecksText,
	moneyRubEquals,
	moneyRubText,
} from "./moneyUtils.js";
import {
	selectedPaymentReceiptIds,
	selectedPaymentRefundCorrectionIds,
} from "./paymentReceiptAndRefundGuards.js";
import {
	paymentMatchesTaxDocumentScope,
	paymentMatchesTaxPayer,
	paymentPaidInTaxYear,
	selectedTaxPaymentIds,
	taxPaidDocumentKindIsKnd,
	taxPaidDocumentKindIsLegacy,
	taxPaidDocumentRequiresPaymentSelection,
	taxPaidDocumentsNeedYear,
} from "./taxGuards.js";
import type {
	DocumentCreationFacts,
	DocumentTreatmentPlanItem,
	FinancialServicePayloadLine,
} from "./types.js";

/**
 * Итог строки платёжного документа — ТЕМ ЖЕ расчётом, что и везде.
 *
 * ЧТО ЗДЕСЬ БЫЛО И СКОЛЬКО ЭТО СТОИЛО. Стояло
 * `const quantity = Math.max(0, Math.round(line.quantity))`, то есть ворота
 * документа ОКРУГЛЯЛИ КОЛИЧЕСТВО. Замер 2026-08-05 через `validateDocumentCreation`
 * на цене 1 000,00 ₽, количестве 1,5 и нулевой скидке: эта функция требовала
 * итог 2 000,00 ₽, а печатная форма той же сметы
 * (`renderDocument.ts`, `treatmentPlanItemTotalKopecks`) на тех же данных
 * печатала 1 500,00 ₽. Расхождение ворот и печати ОДНОГО документа — 500,00 ₽.
 * Округление количества — это не «приведение к типу»: оно дописывает пациенту
 * половину услуги по полной цене.
 *
 * СТАЛО: расчёт зовётся из ОДНОГО дома (`money/patientDebt.ts`,
 * `chargeLineOutcome`), где записана и формула `цена × количество − скидка`, и
 * причина, по которой порядок именно такой (скидка задана строкой позиции
 * целиком, а не ценой за единицу). Количество вне контракта здесь больше не
 * угадывается — оно становится ПРИЧИНОЙ ОТКАЗА (`ok: false`), и эту причину
 * читает человек, а не молча получает документ с чужой суммой.
 */
export function expectedFinancialLineTotalKopecks(
	line: FinancialServicePayloadLine,
): ChargeLineOutcome {
	return chargeLineOutcome({
		unitPriceRub: line.unitPriceRub,
		quantity: line.quantity,
		discountRub: line.discountRub,
	});
}

export function financialLinesTotalKopecks(
	lines: readonly FinancialServicePayloadLine[],
): number {
	return sumKopecks(lines.map((line) => parseKopecks(line.totalRub)));
}

export function financialServiceLinesMismatchReason(
	lines: readonly FinancialServicePayloadLine[],
	documentLabel: string,
): string | null {
	for (const [index, line] of lines.entries()) {
		const expected = expectedFinancialLineTotalKopecks(line);
		if (!expected.ok) {
			/*
			 * Раньше такая строка молча считалась по округлённому количеству и
			 * уходила в документ. Отказ называет строку и причину целиком: это
			 * ворота денежного документа, и «примерно та сумма» здесь недопустима.
			 */
			return `${documentLabel}: строка ${index + 1} не может быть посчитана. ${expected.reason}`;
		}
		const lineTotalKopecks = parseKopecks(line.totalRub);
		if (lineTotalKopecks !== expected.kopecks) {
			return `${documentLabel}: строка ${index + 1} должна иметь сумму ${moneyKopecksText(expected.kopecks)} руб. по количеству, цене и скидке; передано ${moneyRubText(line.totalRub)} руб.`;
		}
	}
	return null;
}

export function financialServiceLinesGrandTotalMismatchReason(
	lines: readonly FinancialServicePayloadLine[],
	totalAmountRub: number,
	documentLabel: string,
): string | null {
	const linesTotalKopecks = financialLinesTotalKopecks(lines);
	const targetKopecks = parseKopecks(totalAmountRub);
	if (linesTotalKopecks !== targetKopecks) {
		return `${documentLabel}: общий итог ${moneyRubText(totalAmountRub)} руб. не совпадает с суммой строк ${moneyRubText(kopecksToNumericString(linesTotalKopecks))} руб.`;
	}
	return null;
}

export function plannedFactsTotalMismatchReason(
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

export function paidFactsTotalMismatchReason(
	payloadTotalRub: number,
	facts: DocumentCreationFacts,
	documentLabel: string,
): string | null {
	if (facts.paidAmountRub > 0 && payloadTotalRub !== facts.paidAmountRub) {
		return `${documentLabel}: сумма ${moneyRubText(payloadTotalRub)} руб. не совпадает с реально оплаченным контекстом ${moneyRubText(facts.paidAmountRub)} руб.`;
	}
	return null;
}

export function treatmentCostEstimateMismatchReason(
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

export function paymentInvoiceMismatchReason(
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

export function installmentScheduleMismatchReason(
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

export function paidContractMismatchReason(
	payload: PaidMedicalServicesContractPayload,
	facts: DocumentCreationFacts,
): string | null {
	if (!payload.customerFullName.trim()) {
		return "Договор платных медицинских услуг: укажите заказчика. Для взрослого пациента это сам пациент, для ребенка или оплаты третьим лицом - законный представитель или плательщик.";
	}
	// Регистратор имеет право распечатать пустой договор со строками "_______" (0 руб.) до осмотра врача.
	if (payload.estimatedTotalRub === 0) {
		return null;
	}
	return plannedFactsTotalMismatchReason(
		payload.estimatedTotalRub,
		facts,
		"Договор платных медицинских услуг",
	);
}

export function completedWorksActMismatchReason(
	payload: CompletedWorksActPayload,
	facts: DocumentCreationFacts,
): string | null {
	if (!moneyRubEquals(parseKopecks(payload.totalByActRub), payload.paidRub)) {
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

export function documentPayloadConsistencyReason(
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

/**
 * Пятая формула итога строки, найденная 2026-08-05 в этом же файле.
 *
 * БЫЛО: `Math.max(0, item.unitPriceRub * item.quantity - item.discountRub)` —
 * рубли в ПЛАВАЮЩЕЙ ТОЧКЕ. Комментарий у `plannedDocumentTotalRub` ниже это уже
 * признавал словами: «`plannedAmountRub` складывается из позиций плана в
 * плавающей точке … и такая сумма умеет приносить грязь ниже копейки:
 * 300.01 + 300.05 + 300.07 даёт 900.1299999999999». Грязь там приводилась к
 * копейкам на ВЫХОДЕ, то есть после того, как сравнение
 * `payloadTotalRub !== facts.plannedAmountRub` (`plannedFactsTotalMismatchReason`)
 * уже отбило законный документ.
 *
 * СТАЛО: сложение целыми копейками через тот же единственный дом расчёта, что и
 * у строк платёжного документа выше. Округления больше нет ни одного: `цена ×
 * количество − скидка` на целых копейках точна по построению.
 *
 * ПОЗИЦИЯ С КОЛИЧЕСТВОМ ВНЕ КОНТРАКТА В СУММУ НЕ ВХОДИТ, и это осознанный
 * выбор из двух плохих. Бросить отсюда нельзя: функция зовётся при сборе фактов
 * в `routes/documents/create.ts:88`, и исключение дало бы 500 без объяснения на
 * КАЖДУЮ попытку оформить документ. Подставить догадку — нельзя тем более:
 * ровно из-за такой догадки ворота и печать расходились на 500,00 ₽. Поэтому
 * такая позиция не даёт плану суммы вовсе; документ либо будет отбит проверкой
 * «итог не совпадает с планом лечения», либо не будет выдан —
 * `renderDocument.ts`, `documentIssueBlockReason` называет такую позицию прямо.
 */
export function treatmentLineTotalKopecks(item: DocumentTreatmentPlanItem): number {
	const outcome = chargeLineOutcome(item);
	return outcome.ok ? outcome.kopecks : 0;
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

	const totalKopecks = sumKopecks(
		treatmentPlanItems
			.filter(
				(item) =>
					item.patientId === input.patientId && item.status !== "cancelled",
			)
			.filter((item) => !input.visitId || item.visitId === input.visitId)
			.map(treatmentLineTotalKopecks),
	);
	// Один перевод копеек в рубли на весь итог, через строку numeric(12, 2):
	// деление на 100 в цикле вернуло бы плавающую точку, ради ухода от которой
	// весь расчёт и переведён в целые.
	return Number(kopecksToNumericString(totalKopecks));
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
export function printedPlannedTotalRub(input: CreateDocumentInput): number | null {
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
export function plannedDocumentTotalRub(
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
