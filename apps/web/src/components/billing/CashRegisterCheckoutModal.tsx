/**
 * apps/web/src/components/billing/CashRegisterCheckoutModal.tsx
 *
 * Canonical SSOT Re-export pointing to modular cashbox checkout.
 * Governed by Mandate 8b (< 25 lines facade) & Mandate 8n.
 */

import React from "react";
import {
	CashRegisterCheckoutModal as CanonicalModal,
	type CashRegisterCheckoutModalProps,
} from "../cashbox/checkout/index.js";

export type { CashRegisterCheckoutModalProps };

export const CashRegisterCheckoutModal: React.FC<CashRegisterCheckoutModalProps> = (props) => {
	return (
		<CanonicalModal
			{...props}
			containerTestId={props.containerTestId || "cash-register-checkout-modal"}
			title={props.title || "Касса · Оплата приёма"}
		/>
	);
};

export default CashRegisterCheckoutModal;
