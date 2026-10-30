/**
 * apps/web/src/components/billing/CashRegisterCheckoutModal.tsx
 *
 * Canonical SSOT Re-export pointing to CashCheckoutStudioModal.
 * Governed by Mandate 8b (<40 lines facade) & Mandate 8n.
 */

import React from "react";
import {
	CashCheckoutStudioModal,
	type CashCheckoutStudioModalProps,
} from "./CashCheckoutStudioModal.js";

export type CashRegisterCheckoutModalProps = CashCheckoutStudioModalProps & {
	readonly totalBillRub?: number;
	readonly totalBillKop?: number;
	readonly cashierName?: string;
	readonly doctorName?: string;
	readonly attendingDoctorName?: string;
	readonly initialPaymentMethod?: string;
};

export const CashRegisterCheckoutModal: React.FC<CashRegisterCheckoutModalProps> = (props) => {
	const totalDueRub =
		props.totalDueRub ??
		props.amountRub ??
		props.totalBillRub ??
		(props.totalBillKop ? props.totalBillKop / 100 : undefined);
	const cashierFullName = props.cashierFullName || props.cashierName || "Администратор / Кассир";
	const doctorFullName = props.doctorFullName || props.doctorName || props.attendingDoctorName;
	const defaultMethod = props.defaultMethod || props.initialPaymentMethod || "card";

	return (
		<CashCheckoutStudioModal
			{...props}
			title={props.title || "Касса · Оплата приёма"}
			totalDueRub={totalDueRub}
			cashierFullName={cashierFullName}
			doctorFullName={doctorFullName}
			defaultMethod={defaultMethod}
			containerTestId={props.containerTestId || "cash-register-checkout-modal"}
			submitButtonTestId="btn-submit-checkout-54fz"
		/>
	);
};

export default CashRegisterCheckoutModal;
