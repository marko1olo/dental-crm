const taxDocumentSnapshotKinds = new Set([
    "tax_deduction_certificate",
    "legacy_tax_deduction_certificate",
    "tax_deduction_registry"
]);
const duplicateSensitiveTaxCertificateKinds = new Set([
    "tax_deduction_certificate",
    "legacy_tax_deduction_certificate"
]);
export function taxDocumentUsesPaymentSnapshot(kind) {
    return taxDocumentSnapshotKinds.has(kind);
}
export function taxDocumentDuplicateSensitive(kind) {
    return duplicateSensitiveTaxCertificateKinds.has(kind);
}
export function taxPaymentYear(payment) {
    const sourceDate = payment.fiscalReceiptIssuedAt || payment.paidAt;
    if (!sourceDate)
        return null;
    const explicitYear = /^(\d{4})/.exec(sourceDate)?.[1];
    if (explicitYear)
        return Number(explicitYear);
    const parsed = new Date(sourceDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
}
export function taxPaymentReceiptKey(payment) {
    return payment.fiscalReceiptNumber?.trim() || payment.id;
}
function clonePayment(payment) {
    return JSON.parse(JSON.stringify(payment));
}
function normalizedInn(value) {
    return value?.replace(/\D+/g, "") || null;
}
function sameTaxDocumentScope(left, right) {
    return (right.id !== left.id &&
        right.organizationId === left.organizationId &&
        right.status === "issued" &&
        right.kind === left.kind &&
        right.patientId === left.patientId &&
        right.taxYear === left.taxYear);
}
function selectedPaymentIdsForTaxDocument(document) {
    return new Set(document.payload?.taxPaymentSelection?.selectedPaymentIds ?? []);
}
function paymentMatchesDocumentTaxScope(document, payment) {
    return (payment.patientId === document.patientId &&
        payment.status === "paid" &&
        payment.amountRub > 0 &&
        taxPaymentYear(payment) === document.taxYear &&
        (!normalizedInn(document.taxPayerInn) || normalizedInn(payment.payerInn) === normalizedInn(document.taxPayerInn)));
}
export function baseTaxPaymentsForDocument(document, payments) {
    if (!document.taxYear)
        return [];
    const selectedPaymentIds = selectedPaymentIdsForTaxDocument(document);
    const matchingPayments = payments.filter((payment) => paymentMatchesDocumentTaxScope(document, payment));
    if (taxDocumentUsesPaymentSnapshot(document.kind)) {
        return selectedPaymentIds.size ? matchingPayments.filter((payment) => selectedPaymentIds.has(payment.id)) : [];
    }
    const linkedPayments = matchingPayments.filter((payment) => payment.documentId === document.id);
    return linkedPayments.length ? linkedPayments : matchingPayments;
}
export function snapshotPaymentsForDocument(document) {
    const snapshot = document.taxPaymentSnapshot;
    if (!snapshot?.payments?.length)
        return null;
    return snapshot.payments.map(clonePayment);
}
export function taxPaymentsForDocumentScope(document, payments) {
    return snapshotPaymentsForDocument(document) ?? baseTaxPaymentsForDocument(document, payments);
}
export function receiptKeysForTaxDocument(document, payments) {
    return new Set(taxPaymentsForDocumentScope(document, payments).map(taxPaymentReceiptKey).filter(Boolean));
}
export function paymentIdsForTaxDocument(document, payments) {
    return new Set(taxPaymentsForDocumentScope(document, payments).map((payment) => payment.id).filter(Boolean));
}
export function coveredIdentifiersForIssuedTaxCertificates(document, documents, payments) {
    const paymentIds = new Set();
    const fiscalReceiptKeys = new Set();
    if (!taxDocumentDuplicateSensitive(document.kind) || !document.taxYear) {
        return { paymentIds, fiscalReceiptKeys };
    }
    for (const candidate of documents) {
        if (!sameTaxDocumentScope(document, candidate))
            continue;
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
export function taxPaymentsForIssueSnapshot(document, payments, documents) {
    const explicitPaymentIds = selectedPaymentIdsForTaxDocument(document);
    if (explicitPaymentIds.size) {
        return baseTaxPaymentsForDocument(document, payments);
    }
    if (!taxDocumentDuplicateSensitive(document.kind)) {
        return baseTaxPaymentsForDocument(document, payments);
    }
    const covered = coveredIdentifiersForIssuedTaxCertificates(document, documents, payments);
    const selectedPayments = baseTaxPaymentsForDocument(document, payments);
    return selectedPayments.filter((payment) => !covered.paymentIds.has(payment.id) && !covered.fiscalReceiptKeys.has(taxPaymentReceiptKey(payment)));
}
export function buildTaxPaymentSnapshotForIssue(document, payments, documents) {
    if (!taxDocumentUsesPaymentSnapshot(document.kind) || !document.taxYear)
        return null;
    const selectedPayments = taxPaymentsForIssueSnapshot(document, payments, documents);
    if (!selectedPayments.length)
        return null;
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
export function taxPaymentSnapshotTotalRub(snapshot) {
    return snapshot.payments.reduce((total, payment) => total + payment.amountRub, 0);
}
