import {
	type DocumentKind,
	type GeneratedDocument,
	type Patient,
	type Payment,
	formatKopecksRu,
	legacyTaxDeductionCertificateMaxYear,
	legacyTaxDeductionCertificateMinYear,
	parseKopecks,
	sumKopecks,
	taxDeductionCertificateMinYear,
} from "@dental/shared";
import { repairMojibakeText } from "../../text/repairMojibake.js";
import {
	DocumentRenderContext,
	digitsOnly,
	hasPersonNameParts,
	patientIdentityDocument,
	patientTaxpayerInn,
	present,
} from "./baseRenderUtils.js";
import {
	documentTaxYear,
	firstTaxPayment,
	hasAllFiscalReceiptDates,
	hasAllFiscalReceipts,
	hasAllPaymentPayerIdentities,
	hasExplicitTaxDeductionCode,
	hasFiscalReceiptDate,
	hasFiscalReceiptNumber,
	hasPaymentPayerIdentity,
	hasTaxPersonIdentifier,
	isValidDateLike,
	normalizedDocumentValue,
	normalizedFiscalReceiptNumber,
	normalizedTaxpayerRelationship,
	paidPaymentsForDocument,
	paymentReceiptStoredFieldMatchesPayload,
	payerNameForTax,
	taxPaymentCode,
	taxPaymentsForDocument,
} from "./taxHelpers.js";

export function paymentReceiptSelectionBlockReason(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): string | null {
	if (document.kind !== "payment_receipt") return null;
	const payload = document.payload?.paymentReceipt;
	if (!payload) return null;

	const paymentsById = new Map(
		(context.payments ?? []).map((payment) => [payment.id, payment]),
	);
	const selectedPayments: Payment[] = [];
	for (const paymentId of payload.selectedPaymentIds) {
		const payment = paymentsById.get(paymentId);
		if (!payment)
			return "Платежная квитанция содержит выбранный платеж, которого нет в базе. Обновите экран и выберите чек заново.";
		if (payment.patientId !== document.patientId)
			return "Платежная квитанция содержит платеж другого пациента.";
		if (document.visitId && payment.visitId !== document.visitId) {
			return "Платежная квитанция содержит платеж не из выбранного визита.";
		}
		if (
			payment.status !== "paid" ||
			!Number.isFinite(payment.amountRub) ||
			parseKopecks(payment.amountRub) <= 0
		) {
			return "Платежная квитанция может включать только проведенные положительные оплаты.";
		}
		selectedPayments.push(payment);
	}

	/**
	 * Сумма квитанции сверяется в целых копейках.
	 *
	 * Здесь стояло строгое сравнение двух дробных чисел, и сложение шло в
	 * плавающей точке. Двадцать оплат по 55.55 руб. давали 1110.9999999999995
	 * вместо 1111, десять по 1010.10 — 10101.000000000002 вместо 10101, и
	 * квитанция на верную сумму не выдавалась вообще: клиника видела отказ
	 * «сумма 1111 руб. не совпадает с выбранными оплатами 1110.9999999999995 руб.»
	 * и не могла ничего с ним сделать.
	 *
	 * Допуск (эпсилон) здесь был бы неверным решением, а не более мягким: это
	 * гейт выдачи платёжного документа, и допуск, принимающий 1110.9999999999995
	 * за 1111, принял бы и настоящее расхождение в одну копейку. Поэтому сумма
	 * каждой оплаты переводится в целые копейки по её собственному десятичному
	 * значению (ровно то, что лежит в numeric(12, 2)), складывается целыми
	 * числами, и сравнение остаётся строгим: 111099 против 111100 по-прежнему
	 * блокирует выдачу.
	 */
	const actualTotalKopecks = sumKopecks(
		selectedPayments.map((payment) => parseKopecks(payment.amountRub)),
	);
	const declaredTotalKopecks = parseKopecks(payload.totalPaidRub);
	if (actualTotalKopecks !== declaredTotalKopecks) {
		return `Платежная квитанция: указана сумма ${formatKopecksRu(declaredTotalKopecks)}, а выбранные оплаты дают ${formatKopecksRu(
			actualTotalKopecks,
		)}. Исправьте сумму в квитанции или измените набор выбранных оплат.`;
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

	const payloadPayer = {
		fullName: normalizedDocumentValue(payload.payerFullName),
		birthDate: payload.payerBirthDate,
		inn: payload.payerInn,
		identityDocument: payload.payerIdentityDocument,
		relationship: payload.payerRelationship,
	};
	for (const payment of selectedPayments) {
		if (
			normalizedDocumentValue(payment.payerFullName) !==
				payloadPayer.fullName ||
			(payload.taxSupportRequested &&
				(!paymentReceiptStoredFieldMatchesPayload(
					payment.payerBirthDate,
					payloadPayer.birthDate,
				) ||
					!paymentReceiptStoredFieldMatchesPayload(
						payment.payerInn,
						payloadPayer.inn,
					) ||
					!paymentReceiptStoredFieldMatchesPayload(
						payment.payerIdentityDocument,
						payloadPayer.identityDocument,
					) ||
					!paymentReceiptStoredFieldMatchesPayload(
						payment.payerRelationship,
						payloadPayer.relationship,
					)))
		) {
			return "Платежная квитанция не должна смешивать разные данные плательщика. Проверьте выбранные оплаты и карточку плательщика.";
		}
	}

	return null;
}

export function completedWorksActFiscalReceiptBlockReason(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): string | null {
	if (document.kind !== "completed_works_act") return null;
	const payload = document.payload?.completedWorksAct;
	if (!payload) return null;

	const paidPayments = paidPaymentsForDocument(document, context);
	const actualReceiptNumbers = new Set(
		paidPayments
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

	if (!paidPayments.length) return null;
	if (!actualReceiptNumbers.size) {
		return "Акт выполненных работ требует фискальные чеки из реально оплаченных платежей выбранного визита.";
	}

	const unknownPayloadReceipts = payloadReceiptNumbers.filter(
		(receiptNumber) => !actualReceiptNumbers.has(receiptNumber),
	);
	if (unknownPayloadReceipts.length) {
		return `Акт выполненных работ содержит фискальный чек без связи с оплатой визита: ${unknownPayloadReceipts.join(", ")}.`;
	}

	const missingPayloadReceipts = [...actualReceiptNumbers].filter(
		(receiptNumber) => !payloadReceiptNumbers.includes(receiptNumber),
	);
	if (missingPayloadReceipts.length) {
		return `Акт выполненных работ должен включать все фискальные чеки оплаченных платежей визита: ${missingPayloadReceipts.join(", ")}.`;
	}

	return null;
}

export function paymentRefundCorrectionFiscalReceiptBlockReason(
	document: GeneratedDocument,
	context: DocumentRenderContext,
): string | null {
	if (document.kind !== "payment_refund_correction_request") return null;
	const payload = document.payload?.paymentRefundCorrection;
	if (!payload) return null;
	const expectedReceipt = normalizedFiscalReceiptNumber(
		payload.originalFiscalReceiptNumber,
	);
	if (!expectedReceipt)
		return "Заявление на возврат или коррекцию требует исходный номер фискального чека.";

	const actualReceiptNumbers = new Set(
		paidPaymentsForDocument(document, context)
			.map((payment) =>
				normalizedFiscalReceiptNumber(payment.fiscalReceiptNumber),
			)
			.filter(Boolean),
	);
	if (!actualReceiptNumbers.size) return null;
	return actualReceiptNumbers.has(expectedReceipt)
		? null
		: `Заявление на возврат или коррекцию содержит фискальный чек без связи с оплатой визита: ${expectedReceipt}.`;
}


export const taxFiscalDocumentKinds = new Set<DocumentKind>([
	"tax_deduction_certificate",
	"legacy_tax_deduction_certificate",
	"tax_deduction_registry",
]);

export function normalizedTaxpayerIdentityPart(
	value: string | null | undefined,
): string {
	return (present(value) ?? "").replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

export function taxpayerIdentityKey(payment: Payment, patient: Patient): string {
	return [
		normalizedTaxpayerIdentityPart(payerNameForTax(payment, patient)),
		normalizedTaxpayerIdentityPart(payment.payerInn),
		normalizedTaxpayerIdentityPart(payment.payerBirthDate),
		normalizedTaxpayerIdentityPart(payment.payerIdentityDocument),
		normalizedTaxpayerIdentityPart(
			normalizedTaxpayerRelationship(payment.payerRelationship) ??
				payment.payerRelationship,
		),
	].join("::");
}

export function taxDocumentBlockReason(
	document: GeneratedDocument,
	patient: Patient,
	context: DocumentRenderContext,
): string | null {
	if (!taxFiscalDocumentKinds.has(document.kind)) return null;
	if (!document.taxYear)
		return "Для налогового документа нужно выбрать налоговый год.";
	if (
		document.kind === "legacy_tax_deduction_certificate" &&
		(document.taxYear < legacyTaxDeductionCertificateMinYear ||
			document.taxYear > legacyTaxDeductionCertificateMaxYear)
	) {
		return "Старая налоговая справка действует только для оплат 2021-2023; для оплат с 2024 года используйте КНД 1151156.";
	}
	if (
		document.kind !== "legacy_tax_deduction_certificate" &&
		document.taxYear < taxDeductionCertificateMinYear
	) {
		return "КНД 1151156 действует только для оплат с 2024 года; для более ранних оплат используйте старую справку.";
	}

	const taxPayments = taxPaymentsForDocument(document, context);
	if (!taxPayments.length)
		return "Для налогового документа нужен хотя бы один оплаченный платеж за выбранный год.";
	const missingPayerFullName = taxPayments.some(
		(payment) => !present(payment.payerFullName),
	);
	if (missingPayerFullName)
		return "Налоговый документ требует ФИО плательщика в каждом включенном платеже.";
	const invalidPayerFullName = taxPayments.some(
		(payment) => !hasPersonNameParts(payment.payerFullName),
	);
	if (invalidPayerFullName)
		return "Налоговый документ требует ФИО плательщика минимум из фамилии и имени.";
	const invalidPayerBirthDate = taxPayments.some(
		(payment) => !isValidDateLike(payment.payerBirthDate),
	);
	if (invalidPayerBirthDate)
		return "Налоговый документ требует корректную дату рождения плательщика в каждом включенном платеже.";
	const missingPayerIdentifier = taxPayments.some(
		(payment) =>
			!hasTaxPersonIdentifier(payment.payerInn, payment.payerIdentityDocument),
	);
	if (missingPayerIdentifier) {
		return "Налоговый документ требует 12-значный ИНН налогоплательщика либо реквизиты документа личности с датой выдачи в каждом включенном платеже.";
	}
	const missingPayerRelationship = taxPayments.some(
		(payment) => !present(payment.payerRelationship),
	);
	if (missingPayerRelationship)
		return "Налоговый документ требует родство плательщика с пациентом в каждом включенном платеже.";
	const invalidPayerRelationship = taxPayments.some(
		(payment) => !normalizedTaxpayerRelationship(payment.payerRelationship),
	);
	if (invalidPayerRelationship) {
		return "Налоговый документ поддерживает только отношения: пациент, супруг, родитель, ребенок или подопечный.";
	}
	if (
		new Set(taxPayments.map((payment) => taxpayerIdentityKey(payment, patient)))
			.size > 1
	) {
		return "Налоговый документ не может смешивать разных налогоплательщиков; создайте отдельную справку на каждого плательщика.";
	}
	if (
		document.kind === "tax_deduction_certificate" ||
		document.kind === "tax_deduction_registry"
	) {
		const invalidKndPayerInn = taxPayments.some(
			(payment) =>
				Boolean(present(payment.payerInn)) &&
				digitsOnly(payment.payerInn).length !== 12,
		);
		const explicitDocumentTaxpayerInn = digitsOnly(document.taxPayerInn);
		if (
			invalidKndPayerInn ||
			(Boolean(present(document.taxPayerInn)) &&
				explicitDocumentTaxpayerInn.length !== 12)
		) {
			return "КНД 1151156 требует 12-значный ИНН физического лица-налогоплательщика; 10-значный ИНН организации для этой справки/XML не подходит.";
		}
		const nonSelfPayer = taxPayments.some(
			(payment) =>
				normalizedTaxpayerRelationship(payment.payerRelationship) !== "self",
		);
		if (nonSelfPayer) {
			if (!hasPersonNameParts(patient.fullName)) {
				return "Если налогоплательщик и пациент разные, для КНД 1151156 нужно ФИО пациента минимум из фамилии и имени.";
			}
			if (
				!hasTaxPersonIdentifier(
					patientTaxpayerInn(patient),
					patientIdentityDocument(patient),
				)
			) {
				return "Если налогоплательщик и пациент разные, для КНД 1151156 нужен 12-значный ИНН пациента либо документ личности пациента с датой выдачи.";
			}
			if (!isValidDateLike(patient.birthDate)) {
				return "Если налогоплательщик и пациент разные, для КНД 1151156 нужна корректная дата рождения пациента.";
			}
		}
	}
	if (!hasAllFiscalReceipts(taxPayments))
		return "Налоговый документ требует номер фискального чека в каждом включенном платеже.";
	if (!hasAllFiscalReceiptDates(taxPayments))
		return "Налоговый документ требует дату фискального чека в каждом включенном платеже.";
	if (
		taxPayments.some(
			(payment) => !isValidDateLike(payment.fiscalReceiptIssuedAt),
		)
	) {
		return "Налоговый документ требует корректную дату фискального чека в каждом включенном платеже.";
	}
	if (taxPayments.some((payment) => !hasExplicitTaxDeductionCode(payment))) {
		return "Налоговый документ требует явный код медицинской услуги 1 или 2 в каждом включенном платеже.";
	}
	return null;
}

export function taxFiscalDocumentBlockReason(
	document: GeneratedDocument,
	patient: Patient,
	context: DocumentRenderContext = {},
): string | null {
	const reason = taxDocumentBlockReason(document, patient, context);
	return reason ? repairMojibakeText(reason) : null;
}
