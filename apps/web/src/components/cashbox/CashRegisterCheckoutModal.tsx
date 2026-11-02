/**
 * apps/web/src/components/cashbox/CashRegisterCheckoutModal.tsx
 *
 * Canonical SSOT Facade pointing to CashRegisterStudioModal with mode="checkout".
 * Governed by Mandate 8b (< 30 lines facade) & Mandates 8e, 8n.
 */

import React from "react";
import {
	CashRegisterStudioModal,
	type CashRegisterStudioModalProps,
} from "./CashRegisterStudioModal.js";

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
