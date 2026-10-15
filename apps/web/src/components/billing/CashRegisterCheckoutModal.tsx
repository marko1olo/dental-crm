/**
 * apps/web/src/components/billing/CashRegisterCheckoutModal.tsx
 *
 * Single Source of Truth (SSOT) Compatibility Facade:
 * Canonical 54-FZ checkout modal delegating directly to PaymentModal.
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
import type { CashRegisterCheckoutPayload } from "@dental/shared";
import "./paymentModalStudio.css";

export interface CashRegisterCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalDueRub: number;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly onOpenDepositTopup?: (() => void) | undefined;
	readonly onSuccess?: ((payload: CashRegisterCheckoutPayload) => void) | undefined;
}

export const CashRegisterCheckoutModal: React.FC<CashRegisterCheckoutModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		totalDueRub = 0,
		patientId,
		patientName,
		patientPhone = "",
		patientEmail = "",
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		invoiceId,
		visitId,
		cashierFullName = "Администратор / Кассир",
		doctorFullName,
		clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		onOpenSplitPayment,
		onOpenDepositTopup,
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
			patientEmail={patientEmail}
			patientDepositRub={patientDepositRub}
			patientFamilyBalanceRub={patientFamilyBalanceRub}
			invoiceId={invoiceId}
			visitId={visitId}
			cashierName={cashierFullName}
			doctorName={doctorFullName}
			clinicLegalName={clinicLegalName}
			onOpenSplitPayment={onOpenSplitPayment}
			onOpenDepositTopup={onOpenDepositTopup}
			containerTestId="cash-register-checkout-modal"
			onSuccess={(data) => {
				onSuccess?.(data as any);
			}}
		/>
	);
};

export default CashRegisterCheckoutModal;
