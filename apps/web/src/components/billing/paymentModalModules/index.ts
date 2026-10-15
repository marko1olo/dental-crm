/**
 * apps/web/src/components/billing/paymentModalModules/index.ts
 *
 * Layer 5: Canonical Barrel Export for Decomposed Payment Modal Modules.
 * Governed by Mandates 8b (<800 lines), 8d (Studio Clinical HIG), 8e (Doctor Autonomy).
 */

export type * from "./types.js";
export { PaymentHeader } from "./PaymentHeader.js";
export { PaymentMethodSelector } from "./PaymentMethodSelector.js";
export { PaymentCashCalculator } from "./PaymentCashCalculator.js";
export { PaymentDiscountsPresets } from "./PaymentDiscountsPresets.js";
export { PaymentBanners } from "./PaymentBanners.js";
export { PaymentFiscalPreview } from "./PaymentFiscalPreview.js";
export { PaymentFooterActions } from "./PaymentFooterActions.js";
export {
	PaymentActiveMethodCockpit,
	type PaymentActiveMethodCockpitProps,
} from "./PaymentActiveMethodCockpit.js";

/** Canonical Studio Modal Root Test ID reference: data-testid="payment-modal-studio" */
export const PAYMENT_MODAL_STUDIO_TEST_ID = "payment-modal-studio";
