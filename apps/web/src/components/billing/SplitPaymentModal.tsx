/**
 * apps/web/src/components/billing/SplitPaymentModal.tsx
 *
 * Single Source of Truth (SSOT) Compatibility Facade:
 * Canonical 54-FZ multi-tender split payment modal delegating directly to PaymentModal.
 *
 * Governed by:
 * - Mandate 8za (Anti-Duplicates SSOT): Single Source of Truth is PaymentModal.
 * - Mandate 8b: Facade pattern (<120 lines).
 * - Mandate 8e: Doctor & cashier autonomy, zero disabled buttons, no forced citizen INN.
 * - Mandate 8n: Solo doctor & small clinic scale sovereignty.
 * - Mandate 8c: Modal depth strictly 1.
 */

import React from "react";
import { PaymentModal } from "./PaymentModal.js";
import { clinicalProceduralAudio } from "../../services/audio/clinicalProceduralAudio.js";
import "./paymentModalStudio.css";

export interface SplitPaymentModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalDueRub: number;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly onSuccess?: ((payload: any) => void) | undefined;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		totalDueRub = 0,
		patientId,
		patientName,
		patientPhone = "",
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		invoiceId,
		visitId,
		cashierFullName = "Администратор / Кассир",
		clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		onSuccess,
	} = props;

	return (
		<PaymentModal
			isOpen={isOpen}
			onClose={onClose}
			amountRub={totalDueRub}
			patientId={patientId}
			patientName={patientName}
			patientPhone={patientPhone}
			patientDepositRub={patientDepositRub}
			patientFamilyBalanceRub={patientFamilyBalanceRub}
			invoiceId={invoiceId}
			visitId={visitId}
			cashierName={cashierFullName}
			clinicLegalName={clinicLegalName}
			defaultMethod="split"
			containerTestId="split-payment-modal"
			onSuccess={(data) => {
				void clinicalProceduralAudio.playCashierKaching();
				onSuccess?.(data as any);
			}}
		/>
	);
};

export default SplitPaymentModal;
