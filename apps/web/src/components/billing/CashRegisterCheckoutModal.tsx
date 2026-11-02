/**
 * apps/web/src/components/billing/CashRegisterCheckoutModal.tsx
 *
 * Canonical SSOT Re-export pointing to CashRegisterStudioModal in cashbox domain.
 * Governed by Mandate 8b (< 25 lines facade) & Mandate 8n.
 */

import React from "react";
import {
	CashRegisterStudioModal,
	type CashRegisterStudioModalProps,
} from "../cashbox/CashRegisterStudioModal.js";

export type CashRegisterCheckoutModalProps = CashRegisterStudioModalProps;

export const CashRegisterCheckoutModal: React.FC<CashRegisterCheckoutModalProps> = (props) => {
	return (
		<CashRegisterStudioModal
			{...props}
			mode="checkout"
			initialTab="checkout"
			containerTestId={props.containerTestId || "cash-register-checkout-modal"}
			submitButtonTestId={props.submitButtonTestId || "btn-confirm-checkout-payment"}
			title={props.title || "Касса · Оплата приёма"}
		/>
	);
};

export default CashRegisterCheckoutModal;
