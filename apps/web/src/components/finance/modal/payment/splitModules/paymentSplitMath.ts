/**
 * apps/web/src/components/finance/modal/payment/splitModules/paymentSplitMath.ts
 *
 * Re-exports canonical split payment math from @dental/shared SSOT.
 * Governed by Mandate 8i (integer kopecks precision, zero float drift).
 */

export {
	type AutoAlignRemainderInput,
	type AutoAlignRemainderResult,
	autoAlignSplitRemainder,
	calculate5050Split,
	isSplitBalanced,
} from "@dental/shared";
