/**
 * FastCheckoutModal.tsx — Transparent re-export from canonical payments/checkout module.
 * Prevents 900+ lines of duplicated 54-FZ cashier logic across finance and payments.
 */
export * from "../payments/checkout/FastCheckoutModal";
export { FastCheckoutModal as default } from "../payments/checkout/FastCheckoutModal";
