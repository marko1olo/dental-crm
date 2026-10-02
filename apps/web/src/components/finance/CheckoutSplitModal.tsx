/**
 * CheckoutSplitModal.tsx — Facade re-exporting canonical PaymentSplitModal.
 * Obeying Mandate 8za (Anti-Duplicates SSOT).
 */
import { PaymentSplitModal, type PaymentSplitModalProps } from "./PaymentSplitModal.js";

export type CheckoutSplitModalProps = PaymentSplitModalProps;
export const CheckoutSplitModal = PaymentSplitModal;
export default CheckoutSplitModal;
