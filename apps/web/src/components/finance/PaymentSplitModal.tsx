/**
 * PaymentSplitModal.tsx — Dedicated 54-FZ Split & Multi-Tender Payment Modal.
 *
 * Compliance:
 * - Mandate 8b: Integer kopecks arithmetic without float drift.
 * - Mandate 8e: Doctor & cashier autonomy, zero disabled buttons, no forced INN for individuals.
 * - Mandate 8n: Solo doctor & small clinic scale sovereignty.
 * - Mandate 8c: Modal depth strictly 1.
 * - Mandate 8d pt 7: Exclusively vector Lucide icons.
 */

import React from "react";
import { FastCheckoutModal, type FastCheckoutModalProps } from "./FastCheckoutModal.js";

export interface PaymentSplitModalProps extends FastCheckoutModalProps {
	readonly initialSimpleCashierMode?: boolean | undefined;
}

/**
 * PaymentSplitModal — 1-Click Multi-Tender Split Modal (Cash, Card, SBP, Certificate, Deposit, Family).
 * Wraps FastCheckoutModal with split mode active by default (initialSimpleCashierMode=false).
 */
export const PaymentSplitModal: React.FC<PaymentSplitModalProps> = (props) => {
	return (
		<FastCheckoutModal
			{...props}
			containerTestId={props.containerTestId ?? "split-payment-modal"}
			initialSimpleCashierMode={props.initialSimpleCashierMode ?? false}
		/>
	);
};

export default PaymentSplitModal;
