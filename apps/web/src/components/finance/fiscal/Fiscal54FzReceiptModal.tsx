/**
 * Fiscal54FzReceiptModal.tsx — 54-FZ FFD 1.2 Canonical Modal Adapter & Re-export.
 *
 * Consolidates the 54-FZ fiscal modal to use the single source of truth
 * FiscalReceipt54FzModal per Mandate 8s (The Best of Breed).
 */

import React from "react";
import {
	FiscalReceipt54FzModal,
	type FiscalReceipt54FzModalProps,
	type FiscalModalTab,
} from "../FiscalReceipt54FzModal";
import type { FiscalItemDraft } from "./fiscal54fzEngine";
import type { TreatmentPlanItem } from "../../treatment-plans/types";

export interface Fiscal54FzReceiptModalProps extends Omit<FiscalReceipt54FzModalProps, "items"> {
	readonly items?: readonly (FiscalItemDraft | TreatmentPlanItem)[] | undefined;
	readonly initialOperationType?: "income" | "income_return" | undefined;
	readonly clinicLicense?: string | undefined;
}

export const Fiscal54FzReceiptModal: React.FC<Fiscal54FzReceiptModalProps> = ({
	initialOperationType,
	initialTab,
	...props
}) => {
	const effectiveInitialTab: FiscalModalTab =
		initialTab || (initialOperationType === "income_return" ? "refund" : "payment");

	return <FiscalReceipt54FzModal initialTab={effectiveInitialTab} {...props} />;
};

export default Fiscal54FzReceiptModal;
export { FiscalReceipt54FzModal };
