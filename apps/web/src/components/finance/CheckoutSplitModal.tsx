import React from "react";
import { FastCheckoutModal, type FastCheckoutModalProps } from "./FastCheckoutModal.js";

export interface CheckoutSplitModalProps extends FastCheckoutModalProps {
	readonly initialSimpleCashierMode?: boolean | undefined;
}

/**
 * CheckoutSplitModal — Dedicated Split Billing & Multi-Tender Checkout Modal.
 *
 * Implements Mandate 8e, 8n (KKT fault tolerance, 1-click autonomous terminal checkout,
 * warranty 100% discount, zero-kopeck drift balancer, and doctor autonomy).
 * Obeying Mandate 8za (Anti-Duplicates): directly re-uses FastCheckoutModal with
 * initialSimpleCashierMode={false} (Split Mode by default).
 */
export const CheckoutSplitModal: React.FC<CheckoutSplitModalProps> = (props) => {
	return (
		<FastCheckoutModal
			{...props}
			initialSimpleCashierMode={props.initialSimpleCashierMode ?? false}
		/>
	);
};

export default CheckoutSplitModal;
