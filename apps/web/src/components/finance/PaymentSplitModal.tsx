/**
 * PaymentSplitModal.tsx — Canonical Multi-Tender Split Payment Modal Adapter.
 *
 * Compliance:
 * - Mandate 8za (Anti-Duplicates SSOT): Single Source of Truth is PaymentModal.
 * - Mandate 8b: Integer kopecks arithmetic without float drift.
 * - Mandate 8e: Doctor & cashier autonomy, zero disabled buttons, no forced INN for individuals.
 * - Mandate 8n: Solo doctor & small clinic scale sovereignty.
 * - Mandate 8c: Modal depth strictly 1.
 */

import React from "react";
import { PaymentModal } from "./PaymentModal.js";
import type { PaymentModalProps } from "./modal/payment/paymentModalTypes.js";
import type { FastCheckoutModalProps } from "./FastCheckoutModal.js";

export interface PaymentSplitModalProps extends Partial<FastCheckoutModalProps>, Partial<PaymentModalProps> {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillRub?: number | undefined;
	readonly totalDueRub?: number | undefined;
	readonly initialSimpleCashierMode?: boolean | undefined;
	readonly containerTestId?: string | undefined;
}

/**
 * PaymentSplitModal — Canonical SSOT multi-tender split payment modal.
 * Delegates directly to PaymentModal with defaultMethod="split" active.
 */
export const PaymentSplitModal: React.FC<PaymentSplitModalProps> = (props) => {
	const rawAmountRub =
		props.amountRub ??
		props.totalBillRub ??
		props.totalDueRub ??
		(typeof props.totalBillKop === "number" ? props.totalBillKop / 100 : 0);

	return (
		<PaymentModal
			{...props}
			isOpen={props.isOpen}
			onClose={props.onClose}
			amountRub={rawAmountRub}
			patientId={props.patientId}
			patientName={props.patientName}
			patientPhone={props.patientPhone}
			patientDepositRub={props.patientDepositRub}
			patientFamilyBalanceRub={props.patientFamilyBalanceRub}
			cashierName={props.cashierName ?? props.cashierFullName}
			doctorName={props.doctorName ?? props.attendingDoctorName}
			invoiceId={props.invoiceId ?? props.orderId}
			visitId={props.visitId}
			defaultMethod="split"
			onSuccess={(data) => {
				props.onSuccess?.(data);
				props.onPaymentComplete?.(data as any);
			}}
		/>
	);
};

export default PaymentSplitModal;

