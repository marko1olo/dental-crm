import type { GeneratedDocument, Payment, TaxPaymentSnapshot } from "@dental/shared";

const taxDocumentSnapshotKinds = new Set<GeneratedDocument["kind"]>([
  "tax_deduction_certificate",
  "legacy_tax_deduction_certificate",
  "tax_deduction_registry"
]);

const duplicateSensitiveTaxCertificateKinds = new Set<GeneratedDocument["kind"]>([
  "tax_deduction_certificate",
  "legacy_tax_deduction_certificate"
]);

export function taxDocumentUsesPaymentSnapshot(kind: GeneratedDocument["kind"]): boolean {
  return taxDocumentSnapshotKinds.has(kind);
}

export function taxDocumentDuplicateSensitive(kind: GeneratedDocument["kind"]): boolean {
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

export function taxPaymentReceiptKey(payment: Pick<Payment, "id" | "fiscalReceiptNumber">): string {
  return payment.fiscalReceiptNumber?.trim() || payment.id;
}

function clonePayment(payment: Payment): Payment {
  return JSON.parse(JSON.stringify(payment)) as Payment;
}

function normalizedInn(value: string | null | undefined): string | null {
  return value?.replace(/\D+/g, "") || null;
}

function sameTaxDocumentScope(left: GeneratedDocument, right: GeneratedDocument): boolean {
  return (
    right.id !== left.id &&
    right.organizationId === left.organizationId &&
    right.status === "issued" &&
    right.kind === left.kind &&
    right.patientId === left.patientId &&
    right.taxYear === left.taxYear
  );
}

function selectedPaymentIdsForTaxDocument(document: GeneratedDocument): Set<string> {
  return new Set(document.payload?.taxPaymentSelection?.selectedPaymentIds ?? []);
}

function paymentMatchesDocumentTaxScope(document: GeneratedDocument, payment: Payment): boolean {
  return (
    payment.patientId === document.patientId &&
    payment.status === "paid" &&
    payment.amountRub > 0 &&
    taxPaymentYear(payment) === document.taxYear &&
    (!normalizedInn(document.taxPayerInn) || normalizedInn(payment.payerInn) === normalizedInn(document.taxPayerInn))
  );
}

export function baseTaxPaymentsForDocument(document: GeneratedDocument, payments: readonly Payment[]): Payment[] {
  if (!document.taxYear) return [];
  const selectedPaymentIds = selectedPaymentIdsForTaxDocument(document);
  const matchingPayments = payments.filter((payment) => paymentMatchesDocumentTaxScope(document, payment));
  if (taxDocumentUsesPaymentSnapshot(document.kind)) {
    return selectedPaymentIds.size ? matchingPayments.filter((payment) => selectedPaymentIds.has(payment.id)) : [];
  }
  const linkedPayments = matchingPayments.filter((payment) => payment.documentId === document.id);
  return linkedPayments.length ? linkedPayments : matchingPayments;
}

export function snapshotPaymentsForDocument(document: GeneratedDocument): Payment[] | null {
  const snapshot = document.taxPaymentSnapshot;
  if (!snapshot?.payments?.length) return null;
  return snapshot.payments.map(clonePayment);
}

export function taxPaymentsForDocumentScope(document: GeneratedDocument, payments: readonly Payment[]): Payment[] {
  return snapshotPaymentsForDocument(document) ?? baseTaxPaymentsForDocument(document, payments);
}

export function receiptKeysForTaxDocument(document: GeneratedDocument, payments: readonly Payment[]): Set<string> {
  return new Set(taxPaymentsForDocumentScope(document, payments).map(taxPaymentReceiptKey).filter(Boolean));
}

export function paymentIdsForTaxDocument(document: GeneratedDocument, payments: readonly Payment[]): Set<string> {
  return new Set(taxPaymentsForDocumentScope(document, payments).map((payment) => payment.id).filter(Boolean));
}

export function coveredIdentifiersForIssuedTaxCertificates(
  document: GeneratedDocument,
  documents: readonly GeneratedDocument[],
  payments: readonly Payment[]
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
  documents: readonly GeneratedDocument[]
): Payment[] {
  const selectedPayments = baseTaxPaymentsForDocument(document, payments);
  if (selectedPaymentIdsForTaxDocument(document).size) return selectedPayments;
  if (!taxDocumentDuplicateSensitive(document.kind)) return selectedPayments;

  const covered = coveredIdentifiersForIssuedTaxCertificates(document, documents, payments);
  return selectedPayments.filter(
    (payment) => !covered.paymentIds.has(payment.id) && !covered.fiscalReceiptKeys.has(taxPaymentReceiptKey(payment))
  );
}

export function buildTaxPaymentSnapshotForIssue(
  document: GeneratedDocument,
  payments: readonly Payment[],
  documents: readonly GeneratedDocument[]
): TaxPaymentSnapshot | null {
  if (!taxDocumentUsesPaymentSnapshot(document.kind) || !document.taxYear) return null;

  const selectedPayments = taxPaymentsForIssueSnapshot(document, payments, documents);
  if (!selectedPayments.length) return null;

  const snapshotPayments = selectedPayments.map(clonePayment);
  return {
    createdAt: new Date().toISOString(),
    taxYear: document.taxYear,
    taxPayerInn: normalizedInn(document.taxPayerInn),
    paymentIds: snapshotPayments.map((payment) => payment.id),
    fiscalReceiptKeys: snapshotPayments.map(taxPaymentReceiptKey),
    payments: snapshotPayments
  };
}

export function taxPaymentSnapshotTotalRub(snapshot: TaxPaymentSnapshot): number {
  return snapshot.payments.reduce((total, payment) => total + payment.amountRub, 0);
}
