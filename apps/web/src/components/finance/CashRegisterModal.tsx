/**
 * apps/web/src/components/finance/CashRegisterModal.tsx
 *
 * Canonical Facade pointing to CashRegisterStudioModal in cashbox SSOT.
 * Governed by Mandate 8b (< 35 lines facade) & Mandates 8e, 8n.
 */

import React from "react";
import {
	CashRegisterStudioModal,
	type CashRegisterStudioModalProps,
} from "../cashbox/CashRegisterStudioModal.js";

export type CashRegisterModalProps = CashRegisterStudioModalProps;

export const CashRegisterModal: React.FC<CashRegisterModalProps> = (props) => {
	return (
		<CashRegisterStudioModal
			{...props}
			mode="shift"
			initialTab={props.initialTab === "tape" ? "tape" : "shift"}
			containerTestId="cash-register-modal"
			submitButtonTestId="btn-confirm-close-shift-z-report"
			title="Касса и чеки · Управление сменой и Z-отчёт"
		/>
	);
};

export default CashRegisterModal;
