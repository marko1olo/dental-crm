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
export type FinancialTransactionSource = "kkt_54fz" | "sbp_qr" | "sber_acquiring" | "cash_drawer" | "deposit_offset";
export type FinancialIdempotencyStatus = "in_progress" | "completed" | "conflict" | "failed";
export interface CompositeIdempotencyParseResult {
    readonly rawKey: string;
    readonly uuid: string;
    readonly embeddedHash: string | null;
    readonly hasEmbeddedHash: boolean;
}
/**
 * Parses any incoming idempotency key header or string.
 */
export declare function parseFinancialIdempotencyKey(key: string): CompositeIdempotencyParseResult;
/**
 * Generates a standard composite idempotency key: `<uuid>#<sha256(canonicalPayload)>`.
 */
export declare function generateFinancialCompositeIdempotencyKey(uuid: string, payload: unknown): string;
/**
 * Verifies if an incoming composite idempotency key matches the computed payload.
 */
export declare function verifyFinancialIdempotencyMatch(compositeKey: string, payload: unknown): {
    readonly isValid: boolean;
    readonly uuid: string;
    readonly expectedHash: string | null;
    readonly actualHash: string;
    readonly mismatchReason?: string | undefined;
};
/**
 * Normalizes payment transaction parameters into a canonical signature object.
 */
export declare function buildPaymentTransactionPayloadSignature(input: {
    readonly organizationId?: string | undefined;
    readonly patientId: string;
    readonly invoiceId?: string | null | undefined;
    readonly visitId?: string | null | undefined;
    readonly totalKopecks: number;
    readonly cashKopecks?: number | undefined;
    readonly cardKopecks?: number | undefined;
    readonly sbpKopecks?: number | undefined;
    readonly depositOffsetKopecks?: number | undefined;
    readonly creditKopecks?: number | undefined;
    readonly paymentMethod?: string | undefined;
    readonly items?: readonly {
        readonly name: string;
        readonly priceKopecks: number;
        readonly quantity: number;
        readonly amountKopecks: number;
        readonly medicalServiceCode804n?: string | null | undefined;
    }[] | undefined;
}): Record<string, unknown>;
/**
 * Normalizes SBP dynamic QR payload into a canonical signature.
 */
export declare function buildSbpQrPayloadSignature(input: {
    readonly organizationId?: string | undefined;
    readonly patientId: string;
    readonly invoiceId?: string | null | undefined;
    readonly amountKopecks: number;
    readonly orderId: string;
    readonly sbpMemberBankId?: string | null | undefined;
}): Record<string, unknown>;
/**
 * Normalizes Sberbank POS Acquiring Terminal transaction into a canonical signature.
 */
export declare function buildSberAcquiringPayloadSignature(input: {
    readonly terminalId: string;
    readonly patientId: string;
    readonly amountKopecks: number;
    readonly rrn?: string | null | undefined;
    readonly authCode?: string | null | undefined;
    readonly invoiceId?: string | null | undefined;
}): Record<string, unknown>;
/**
 * Normalizes 54-FZ Fiscal Receipt print request into a canonical signature.
 */
export declare function buildFiscalPrintPayloadSignature(input: {
    readonly patientId: string;
    readonly cashierFullName: string;
    readonly customerContact: string;
    readonly operationType: string;
    readonly totalKopecks: number;
    readonly cashKopecks?: number | undefined;
    readonly electronicCardKopecks?: number | undefined;
    readonly sbpKopecks?: number | undefined;
    readonly prepaidKopecks?: number | undefined;
    readonly items: readonly {
        readonly name: string;
        readonly priceKopecks: number;
        readonly quantity: number;
        readonly amountKopecks: number;
        readonly subject?: string | undefined;
        readonly method?: string | undefined;
        readonly vatRate?: string | undefined;
        readonly measure?: string | undefined;
        readonly markingCode?: string | null | undefined;
        readonly medicalServiceCode804n?: string | null | undefined;
    }[];
}): Record<string, unknown>;
/**
 * Standard HTTP Error detail for 409 Conflict when idempotency key payload mismatches.
 */
export interface IdempotencyConflictResponse {
    readonly error: "IDEMPOTENCY_PAYLOAD_MISMATCH";
    readonly message: string;
    readonly idempotencyKey: string;
    readonly expectedPayloadHash: string;
    readonly receivedPayloadHash: string;
    readonly existingTransactionId?: string | undefined;
    readonly existingCreatedAt?: string | undefined;
}
