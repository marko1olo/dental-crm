/**
 * apps/web/src/components/billing/CashCheckoutStudioModal.tsx
 *
 * Canonical SSOT Re-export pointing to modular cashbox checkout.
 * Governed by Mandate 8b (< 30 lines facade) & Mandate 8n.
 */

import React from "react";
import {
	CashRegisterCheckoutModal,
	type CashRegisterCheckoutModalProps,
	type CashCheckoutStudioModalProps,
} from "../cashbox/checkout/index.js";

export type { CashCheckoutStudioModalProps };

export const CashCheckoutStudioModal: React.FC<CashCheckoutStudioModalProps> = (props) => {
	return (
		<CashRegisterCheckoutModal
			{...props}
			containerTestId={props.containerTestId || "cash-checkout-studio-modal"}
			submitButtonTestId={props.submitButtonTestId || "btn-execute-payment"}
			title={props.title || "Касса и чеки · Приём оплаты"}
		/>
	);
};

export default CashCheckoutStudioModal;
