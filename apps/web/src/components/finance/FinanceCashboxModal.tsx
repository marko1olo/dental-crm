/**
 * apps/web/src/components/finance/FinanceCashboxModal.tsx
 *
 * Canonical SSOT Cashbox Modal Facade pointing to CashRegisterStudioModal.
 * Unifies fragmented cashbox views under a single cashier authority.
 * Governed by Mandate 8b (< 50 lines facade) & Mandates 8e, 8n.
 */

import React from "react";
import { CashRegisterStudioModal } from "../cashbox/CashRegisterStudioModal.js";

export interface FinanceCashboxModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly isShiftOpen: boolean;
	readonly cashierName: string;
	readonly clinicName: string;
	readonly clinicInn?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly onPaymentComplete: () => void;
}

export function FinanceCashboxModal({
	isOpen,
	onClose,
	isShiftOpen,
	cashierName,
	clinicName,
	clinicInn,
	patientId,
	patientName,
	patientPhone,
	patientDepositRub,
	patientFamilyBalanceRub,
	onPaymentComplete,
}: FinanceCashboxModalProps): React.JSX.Element | null {
	return (
		<CashRegisterStudioModal
			isOpen={isOpen}
			onClose={onClose}
			mode="studio"
			isShiftOpen={isShiftOpen}
			cashierFullName={cashierName}
			clinicName={clinicName}
			clinicLegalName={clinicName}
			cashierInn={clinicInn}
			patientId={patientId}
			patientName={patientName}
			patientPhone={patientPhone}
			patientDepositRub={patientDepositRub}
			patientFamilyBalanceRub={patientFamilyBalanceRub}
			onPaymentComplete={onPaymentComplete}
			containerTestId="modal-finance-cashbox"
			title="Касса клиники · Приём оплаты"
		/>
	);
}

export default FinanceCashboxModal;
