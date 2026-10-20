/**
 * apps/web/src/components/finance/PaymentSplitModal.tsx
 *
 * Canonical SSOT Split Payment Orchestration (Cash, Card, SBP QR, Family Wallet, Deposit, Insurance).
 * Unifies PaymentSplitModal and SplitPaymentModal under the single finance domain authority.
 * Mandate 8b: < 90 lines.
 */

import type React from "react";
import { clinicalProceduralAudio } from "../../services/audio/clinicalProceduralAudio.js";
import {
	FastCheckoutModal,
	type FastCheckoutModalProps,
} from "./FastCheckoutModal.js";
import {
	PaymentSplitView,
	type PaymentSplitViewProps,
} from "./modal/payment/PaymentSplitView.js";
import { PaymentModal } from "./PaymentModal.js";
import "./paymentModalStudio.css";

export type { FastCheckoutModalProps, PaymentSplitViewProps };
export { FastCheckoutModal, PaymentModal, PaymentSplitView };

export interface SplitPaymentModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalDueRub?: number | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly onSuccess?: ((payload: unknown) => void) | undefined;
	readonly containerTestId?: string | undefined;
}

export type PaymentSplitModalProps = FastCheckoutModalProps &
	SplitPaymentModalProps;

export const PaymentSplitModal: React.FC<PaymentSplitModalProps> = (props) => {
	// If standard FastCheckoutModal props provided (e.g. initialSimpleCashierMode)
	if ("initialSimpleCashierMode" in props || "items" in props) {
		return (
			<FastCheckoutModal
				{...props}
				initialSimpleCashierMode={false}
				containerTestId={props.containerTestId || "split-payment-modal"}
			/>
		);
	}

	// Canonical multi-tender split payment modal delegating to PaymentModal
	return (
		<PaymentModal
			isOpen={props.isOpen}
			onClose={props.onClose}
			amountRub={props.totalDueRub ?? 0}
			patientId={props.patientId || "pat-walkin"}
			patientName={props.patientName || "Пациент"}
			patientPhone={props.patientPhone || ""}
			patientDepositRub={props.patientDepositRub ?? 0}
			patientFamilyBalanceRub={props.patientFamilyBalanceRub ?? 0}
			invoiceId={props.invoiceId}
			visitId={props.visitId}
			cashierName={props.cashierFullName || "Администратор / Кассир"}
			clinicLegalName={props.clinicLegalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
			defaultMethod="split"
			containerTestId={props.containerTestId || "split-payment-modal"}
			onSuccess={(data) => {
				void clinicalProceduralAudio.playCashierKaching();
				props.onSuccess?.(data);
			}}
		/>
	);
};

export { PaymentSplitModal as SplitPaymentModal };
export default PaymentSplitModal;
