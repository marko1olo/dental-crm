import type {
	GeneratedDocument,
	Payment,
	TaxPaymentSnapshot,
} from "@dental/shared";
import {
	kopecksToNumericString,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";

const taxDocumentSnapshotKinds = new Set<GeneratedDocument["kind"]>([
	"tax_deduction_certificate",
	"legacy_tax_deduction_certificate",
	"tax_deduction_registry",
]);

const duplicateSensitiveTaxCertificateKinds = new Set<
	GeneratedDocument["kind"]
>(["tax_deduction_certificate", "legacy_tax_deduction_certificate"]);

export function taxDocumentUsesPaymentSnapshot(
	kind: GeneratedDocument["kind"],
): boolean {
	return taxDocumentSnapshotKinds.has(kind);
}

export function taxDocumentDuplicateSensitive(
	kind: GeneratedDocument["kind"],
): boolean {
	return duplicateSensitiveTaxCertificateKinds.has(kind);
}

export function taxPaymentYear(payment: Payment): number | null {
	const sourceDate = payment.fiscalReceiptIssuedAt || payment.paidAt;
	if (!sourceDate) return null;
	const explicitYear = /^(\d{4})/.exec(sourceDate)?.[1];
	if (explicitYear) return Number(explicitYear);
	const parsed = new Date(sourceDate);
	return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
}

export function taxPaymentReceiptKey(
	payment: Pick<Payment, "id" | "fiscalReceiptNumber">,
): string {
	return payment.fiscalReceiptNumber?.trim() || payment.id;
}

function clonePayment(payment: Payment): Payment {
	return JSON.parse(JSON.stringify(payment)) as Payment;
}

function normalizedInn(value: string | null | undefined): string | null {
	return value?.replace(/\D+/g, "") || null;
}

function sameTaxDocumentScope(
	left: GeneratedDocument,
	right: GeneratedDocument,
): boolean {
	return (
		right.id !== left.id &&
		right.organizationId === left.organizationId &&
		right.status === "issued" &&
		right.kind === left.kind &&
		right.patientId === left.patientId &&
		right.taxYear === left.taxYear
	);
}

function selectedPaymentIdsForTaxDocument(
	document: GeneratedDocument,
): Set<string> {
	return new Set(
		document.payload?.taxPaymentSelection?.selectedPaymentIds ?? [],
	);
}

function paymentMatchesDocumentTaxScope(
	document: GeneratedDocument,
	payment: Payment,
): boolean {
	return (
		payment.patientId === document.patientId &&
		payment.status === "paid" &&
		payment.amountRub > 0 &&
		taxPaymentYear(payment) === document.taxYear &&
		(!normalizedInn(document.taxPayerInn) ||
			normalizedInn(payment.payerInn) === normalizedInn(document.taxPayerInn))
	);
}

export function baseTaxPaymentsForDocument(
	document: GeneratedDocument,
	payments: readonly Payment[],
): Payment[] {
	if (!document.taxYear) return [];
	const selectedPaymentIds = selectedPaymentIdsForTaxDocument(document);
	const matchingPayments = payments.filter((payment) =>
		paymentMatchesDocumentTaxScope(document, payment),
	);
	if (taxDocumentUsesPaymentSnapshot(document.kind)) {
		return selectedPaymentIds.size
			? matchingPayments.filter((payment) => selectedPaymentIds.has(payment.id))
			: [];
	}
	const linkedPayments = matchingPayments.filter(
		(payment) => payment.documentId === document.id,
	);
	return linkedPayments.length ? linkedPayments : matchingPayments;
}

export function snapshotPaymentsForDocument(
	document: GeneratedDocument,
): Payment[] | null {
	const snapshot = document.taxPaymentSnapshot;
	if (!snapshot?.payments?.length) return null;
	return snapshot.payments.map(clonePayment);
}

export function taxPaymentsForDocumentScope(
	document: GeneratedDocument,
	payments: readonly Payment[],
): Payment[] {
	return (
		snapshotPaymentsForDocument(document) ??
		baseTaxPaymentsForDocument(document, payments)
	);
}

export function receiptKeysForTaxDocument(
	document: GeneratedDocument,
	payments: readonly Payment[],
): Set<string> {
	return new Set(
		taxPaymentsForDocumentScope(document, payments)
			.map(taxPaymentReceiptKey)
			.filter(Boolean),
	);
}

export function paymentIdsForTaxDocument(
	document: GeneratedDocument,
	payments: readonly Payment[],
): Set<string> {
	return new Set(
		taxPaymentsForDocumentScope(document, payments)
			.map((payment) => payment.id)
			.filter(Boolean),
	);
}

export function coveredIdentifiersForIssuedTaxCertificates(
	document: GeneratedDocument,
	documents: readonly GeneratedDocument[],
	payments: readonly Payment[],
): { paymentIds: Set<string>; fiscalReceiptKeys: Set<string> } {
	const paymentIds = new Set<string>();
	const fiscalReceiptKeys = new Set<string>();

	if (!taxDocumentDuplicateSensitive(document.kind) || !document.taxYear) {
		return { paymentIds, fiscalReceiptKeys };
	}

	for (const candidate of documents) {
		if (!sameTaxDocumentScope(document, candidate)) continue;
		for (const paymentId of candidate.taxPaymentSnapshot?.paymentIds ?? []) {
			paymentIds.add(paymentId);
		}
		for (const key of candidate.taxPaymentSnapshot?.fiscalReceiptKeys ?? []) {
			fiscalReceiptKeys.add(key);
		}
		for (const payment of taxPaymentsForDocumentScope(candidate, payments)) {
			paymentIds.add(payment.id);
			fiscalReceiptKeys.add(taxPaymentReceiptKey(payment));
		}
	}

	return { paymentIds, fiscalReceiptKeys };
}

export function taxPaymentsForIssueSnapshot(
	document: GeneratedDocument,
	payments: readonly Payment[],
	documents: readonly GeneratedDocument[],
): Payment[] {
	const selectedPayments = baseTaxPaymentsForDocument(document, payments);
	if (!taxDocumentDuplicateSensitive(document.kind)) {
		return selectedPayments;
	}

	// БЫЛО: при явно выбранных платежах функция возвращалась здесь досрочно, не
	// сверяясь с уже выданными справками. А для справок без явного выбора
	// baseTaxPaymentsForDocument отдаёт пустой список (см. ветку snapshot-видов),
	// и фильтр ниже всегда работал по пустому массиву. То есть защита от
	// повторного включения платежа не срабатывала ни на одном пути:
	// coveredIdentifiersForIssuedTaxCertificates была мёртвым кодом, и один и тот
	// же чек мог попасть в две выданные справки за один налоговый год.
	//
	// Своих платежей документ при этом не теряет: sameTaxDocumentScope исключает
	// сам документ по id и учитывает только уже выданные (issued) справки того же
	// вида, пациента и года.
	const covered = coveredIdentifiersForIssuedTaxCertificates(
		document,
		documents,
		payments,
	);
	return selectedPayments.filter(
		(payment) =>
			!covered.paymentIds.has(payment.id) &&
			!covered.fiscalReceiptKeys.has(taxPaymentReceiptKey(payment)),
	);
}

export function buildTaxPaymentSnapshotForIssue(
	document: GeneratedDocument,
	payments: readonly Payment[],
	documents: readonly GeneratedDocument[],
): TaxPaymentSnapshot | null {
	if (!taxDocumentUsesPaymentSnapshot(document.kind) || !document.taxYear)
		return null;

	const selectedPayments = taxPaymentsForIssueSnapshot(
		document,
		payments,
		documents,
	);
	if (!selectedPayments.length) return null;

	const snapshotPayments = selectedPayments.map(clonePayment);
	return {
		createdAt: new Date().toISOString(),
		taxYear: document.taxYear,
		taxPayerInn: normalizedInn(document.taxPayerInn),
		paymentIds: snapshotPayments.map((payment) => payment.id),
		fiscalReceiptKeys: snapshotPayments.map(taxPaymentReceiptKey),
		payments: snapshotPayments,
	};
}

/**
 * Итог справки для налогового вычета.
 *
 * БЫЛО: `payments.reduce((total, p) => total + p.amountRub, 0)` — сложение в
 * двоичной плавающей точке. Двадцать приёмов по 55,55 давали не 1111, а
 * 1110.9999999999995; десять по 1010,10 — 10101.000000000002. Это число уходит
 * в `totalAmountRub` документа (routes/documents.ts, `taxSnapshotDocument`),
 * оттуда в печатную форму, в PDF и в SHA-256 выданного снимка. Справку человек
 * несёт в налоговую, и её итог обязан быть равен сумме её же строк — не
 * «примерно равен».
 *
 * Считается целыми копейками через @dental/shared (`parseKopecks` + `sumKopecks`),
 * то есть сложением целых чисел, а результат приводится обратно в рубли через
 * ту же строку numeric(12, 2), которая лежит в колонке базы. Своей арифметики
 * денег здесь нет и быть не должно.
 */
export function taxPaymentSnapshotTotalRub(
	snapshot: TaxPaymentSnapshot,
): number {
	const totalKopecks = sumKopecks(
		snapshot.payments.map((payment) => parseKopecks(payment.amountRub)),
	);
	return Number(kopecksToNumericString(totalKopecks));
}
