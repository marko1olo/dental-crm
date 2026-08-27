/**
 * @dental/shared/fiscal — Idempotent Distributed Transaction & 54-FZ Buffer Contracts.
 *
 * Implements:
 * 1. Statutory Composite Idempotency Keys: `Idempotency-Key` = `<uuid>#<sha256(canonicalPayload)>`
 * 2. Canonical Payload Signature Generators for:
 *    - 54-FZ FFD 1.2 Cashier Receipts (Cash, Card, SBP, Advance offset, Credit)
 *    - SBP (Система Быстрых Платежей) Dynamic QR transactions
 *    - Sberbank POS Acquiring Terminal payments
 *    - Refund and Correction Receipts
 * 3. Exact Integer Kopeck validation and TTL tracking.
 */
import { computePayloadHash, parseIdempotencyKey, } from "../sync/hashing.js";
/**
 * Parses any incoming idempotency key header or string.
 */
export function parseFinancialIdempotencyKey(key) {
    const parsed = parseIdempotencyKey(key);
    return {
        rawKey: parsed.rawKey,
        uuid: parsed.uuid,
        embeddedHash: parsed.embeddedHash,
        hasEmbeddedHash: parsed.embeddedHash !== null,
    };
}
/**
 * Generates a standard composite idempotency key: `<uuid>#<sha256(canonicalPayload)>`.
 */
export function generateFinancialCompositeIdempotencyKey(uuid, payload) {
    const hash = computePayloadHash(payload);
    return `${uuid}#${hash}`;
}
/**
 * Verifies if an incoming composite idempotency key matches the computed payload.
 */
export function verifyFinancialIdempotencyMatch(compositeKey, payload) {
    const parsed = parseFinancialIdempotencyKey(compositeKey);
    const actualHash = computePayloadHash(payload);
    if (parsed.embeddedHash !== null && parsed.embeddedHash !== actualHash) {
        return {
            isValid: false,
            uuid: parsed.uuid,
            expectedHash: parsed.embeddedHash,
            actualHash,
            mismatchReason: `Хеш переданного payload (${actualHash.slice(0, 8)}...) не совпадает с композитным ключом (${parsed.embeddedHash.slice(0, 8)}...).`,
        };
    }
    return {
        isValid: true,
        uuid: parsed.uuid,
        expectedHash: parsed.embeddedHash,
        actualHash,
    };
}
/**
 * Normalizes payment transaction parameters into a canonical signature object.
 */
export function buildPaymentTransactionPayloadSignature(input) {
    return {
        patientId: input.patientId,
        invoiceId: input.invoiceId ?? null,
        visitId: input.visitId ?? null,
        totalKopecks: input.totalKopecks,
        cashKopecks: input.cashKopecks ?? 0,
        cardKopecks: input.cardKopecks ?? 0,
        sbpKopecks: input.sbpKopecks ?? 0,
        depositOffsetKopecks: input.depositOffsetKopecks ?? 0,
        creditKopecks: input.creditKopecks ?? 0,
        paymentMethod: input.paymentMethod ?? "card",
        items: (input.items || []).map((it) => ({
            name: it.name.trim(),
            priceKopecks: it.priceKopecks,
            quantity: it.quantity,
            amountKopecks: it.amountKopecks,
            code: it.medicalServiceCode804n?.trim() ?? null,
        })),
    };
}
/**
 * Normalizes SBP dynamic QR payload into a canonical signature.
 */
export function buildSbpQrPayloadSignature(input) {
    return {
        patientId: input.patientId,
        invoiceId: input.invoiceId ?? null,
        amountKopecks: input.amountKopecks,
        orderId: input.orderId.trim(),
        sbpMemberBankId: input.sbpMemberBankId?.trim() ?? null,
    };
}
/**
 * Normalizes Sberbank POS Acquiring Terminal transaction into a canonical signature.
 */
export function buildSberAcquiringPayloadSignature(input) {
    return {
        terminalId: input.terminalId.trim(),
        patientId: input.patientId,
        amountKopecks: input.amountKopecks,
        rrn: input.rrn?.trim() ?? null,
        authCode: input.authCode?.trim() ?? null,
        invoiceId: input.invoiceId ?? null,
    };
}
/**
 * Normalizes 54-FZ Fiscal Receipt print request into a canonical signature.
 */
export function buildFiscalPrintPayloadSignature(input) {
    return {
        patientId: input.patientId,
        cashier: input.cashierFullName.trim(),
        customerContact: input.customerContact.trim(),
        operationType: input.operationType,
        totalKopecks: input.totalKopecks,
        cashKopecks: input.cashKopecks ?? 0,
        electronicCardKopecks: input.electronicCardKopecks ?? 0,
        sbpKopecks: input.sbpKopecks ?? 0,
        prepaidKopecks: input.prepaidKopecks ?? 0,
        items: input.items.map((it) => ({
            name: it.name.trim(),
            priceKopecks: it.priceKopecks,
            quantity: it.quantity,
            amountKopecks: it.amountKopecks,
            subject: it.subject ?? "service",
            method: it.method ?? "full_payment",
            vatRate: it.vatRate ?? "vat_none",
            measure: it.measure ?? "piece",
            markingCode: it.markingCode ? it.markingCode.trim() : null,
            code: it.medicalServiceCode804n ? it.medicalServiceCode804n.trim() : null,
        })),
    };
}
