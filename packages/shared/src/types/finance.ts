/**
 * packages/shared/src/types/finance.ts
 *
 * DENTE Dental CRM — Central Financial Types & Tender SSOT Entry Point.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 friction, non-blocking guidance)
 * - Mandate 8i: Strict Integer Kopeck Arithmetic, zero float drift (IEEE-754)
 * - Mandate 8s: Universal SSOT & Anti-Duplication Law
 * - Federal Law No. 54-FZ & Order of FTS Russia No. ED-7-20/662@ (FFD 1.2)
 */

// ─── 1. CANONICAL TENDERS & ENUMS ───────────────────────────────────────────
export {
	type CanonicalTenderType,
	canonicalTenderTypeSchema,
	type ExtendedTenderType,
	extendedTenderTypeSchema,
	CANONICAL_TENDER_LABELS_RU,
	CANONICAL_TENDER_FFD12_TAGS,
	normalizeTenderType,
	VAT_RATE_LABELS_RU,
	normalizeVatRate,
	calculateVatKopecksFromTotal,
	normalizeCalculationMethod,
	normalizeCalculationSubject,
	calculateCanonicalSplit,
	type CanonicalSplitCalculationInput,
	type CanonicalSplitCalculationResult,
	type CanonicalActiveTenderEntry,
	calculateDenominationsTotalKopecks,
	calculateDenominationsTotalRub,
	type CashDenominationsInput,
} from "../fiscal/tenderTypes.js";

// ─── 2. TENDER PARITY & VALIDATION ──────────────────────────────────────────
export {
	validateTenderParity,
	type ValidateTenderParityInput,
	type ValidateTenderParityResult,
	canonicalTenderItemSchema,
	type CanonicalTenderItem,
	canonicalCashierCheckoutPayloadSchema,
	type CanonicalCashierCheckoutPayload,
} from "../fiscal/fiscalValidation.js";

// ─── 3. STATUTORY FFD 1.2 TYPES ──────────────────────────────────────────────
export type {
	Ffd12OperationType,
	Ffd12PaymentMethod,
	Ffd12PaymentSubject,
	Ffd12QuantityMeasure,
	Ffd12TaxationSystem,
	Ffd12VatRate,
	Ffd12CorrectionType,
	Ffd12AgentSign,
} from "../fiscal/ffd12Types.js";

// ─── 4. KOPECKS ARITHMETIC ──────────────────────────────────────────────────
export {
	kopecksToRub,
	rubToKopecks,
} from "../fiscal/kopecksArithmetic.js";

export { formatKopecksRu, parseKopecks } from "../money.js";

// ─── 5. LEGACY & DOMAIN COMPATIBILITY BRIDGES ────────────────────────────────
export {
	type PaymentMethod,
	paymentMethodSchema,
	type LedgerPaymentMethod,
	ledgerPaymentMethodSchema,
	type PaymentStatus,
	paymentStatusSchema,
	STATUTORY_PAYMENT_METHOD_LABELS_RU,
	normalizePaymentMethod,
} from "../fiscal/fiscalReceiptSchemas.js";

export {
	type SplitTenderKind,
	SPLIT_TENDER_LABELS_RU,
	type SplitPaymentTenderInput,
	type NormalizedSplitTender,
} from "../finance/splitPayment.js";

export {
	type SplitBalancesResult,
	calculateSplitBalances,
	calculateSplitBalances as calculateSplitPaymentBalances,
} from "../billing/billingMath.js";
