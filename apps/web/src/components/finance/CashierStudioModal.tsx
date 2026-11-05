/**
 * apps/web/src/components/finance/CashierStudioModal.tsx
 *
 * Transparent Facade Proxy pointing to canonical SSOT CashRegisterStudioModal.tsx (Mandates 8aq & 8s).
 * Eliminates duplicate cashier modals and guarantees a single unified checkout authority.
 */

import React from "react";
import {
	CashRegisterStudioModal,
	type CashRegisterStudioModalProps,
} from "../cashbox/CashRegisterStudioModal.js";
import type { CashierReceiptRecord } from "./cashierCatalogData.js";
import "./cashier.css";

export interface CashierStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: ("checkout" | "shift" | "history") | undefined;
	readonly totalDueRub?: number | undefined;
	readonly totalDueKopecks?: number | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly onSuccess?: ((receipt: CashierReceiptRecord) => void) | undefined;
}

export const CashierStudioModal: React.FC<CashierStudioModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		initialTab = "checkout",
		totalDueRub,
		totalDueKopecks,
		patientId,
		patientName,
		patientDepositRub,
		invoiceId,
		visitId,
		cashierFullName,
		onSuccess,
	} = props;

	const mappedTab = initialTab === "history" ? "tape" : initialTab;
	const computedDueRub =
		totalDueRub !== undefined
			? totalDueRub
			: totalDueKopecks !== undefined
				? totalDueKopecks / 100
				: undefined;

	return (
		<CashRegisterStudioModal
			isOpen={isOpen}
			onClose={onClose}
			mode="studio"
			initialTab={mappedTab}
			totalDueRub={computedDueRub}
			totalDueKopecks={totalDueKopecks !== undefined ? BigInt(totalDueKopecks) : undefined}
			patientId={patientId}
			patientName={patientName}
			patientDepositRub={patientDepositRub}
			invoiceId={invoiceId}
			visitId={visitId}
			cashierFullName={cashierFullName}
			onSuccess={onSuccess as any}
			containerTestId="cashier-studio-modal"
			submitButtonTestId="cashier-submit-btn"
			title="Студия кассы и чеков"
		/>
	);
};

export default CashierStudioModal;
