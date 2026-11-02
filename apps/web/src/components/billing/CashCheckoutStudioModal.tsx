/**
 * apps/web/src/components/billing/CashCheckoutStudioModal.tsx
 *
 * Canonical SSOT Re-export pointing to CashRegisterStudioModal with mode="checkout".
 * Governed by Mandate 8b (< 30 lines facade) & Mandate 8n.
 */

import React from "react";
import {
	CashRegisterStudioModal,
	type CashRegisterStudioModalProps,
} from "../cashbox/CashRegisterStudioModal.js";

export type CashCheckoutStudioModalProps = CashRegisterStudioModalProps;

export const CashCheckoutStudioModal: React.FC<CashCheckoutStudioModalProps> = (props) => {
	return (
		<CashRegisterStudioModal
			{...props}
			mode="checkout"
			initialTab="checkout"
			containerTestId={props.containerTestId || "cash-checkout-studio-modal"}
			submitButtonTestId={props.submitButtonTestId || "btn-execute-payment"}
			title={props.title || "Касса и чеки · Приём оплаты"}
		/>
	);
};

export default CashCheckoutStudioModal;
