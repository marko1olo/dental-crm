/**
 * packages/shared/src/billing/index.ts
 *
 * DENTE Dental CRM — Canonical Billing & Cash Register Module.
 */

export * from "./billingTypes.js";
export * from "./billingMath.js";
export * from "./invoiceContract.js";
export {
	type SplitTenderKind,
	SPLIT_TENDER_LABELS_RU,
	type SplitPaymentTenderInput,
	type NormalizedSplitTender,
	type Ffd12PaymentTagsSummary,
	type SplitPaymentValidationResult,
	type SplitPaymentPositionItem,
	type AllocatedItemSplitPayment,
	SplitPaymentValidationError,
	validateAndBalanceSplitPayment,
	allocateSplitPaymentAcrossItems,
	balanceSplitTenderRemainder,
	balanceSplitDepositPlusCard,
	type AutoAlignRemainderInput,
	type AutoAlignRemainderResult,
	autoAlignSplitRemainder,
	calculate5050Split,
	isSplitBalanced,
} from "./splitPayment.js";



