/**
 * CashboxShiftModal.tsx — 54-FZ Cashbox Shift Open/Close & Z/X-Report Modal.
 *
 * Compliance:
 * - Mandate 8b: Integer kopecks arithmetic without float drift.
 * - Mandate 8c: Modal depth strictly 1.
 * - Mandate 8d pt 7: Exclusively vector Lucide icons, zero cartoon emojis.
 * - Mandate 8e: 0 disabled buttons, double-click guards via aria-busy.
 * - Mandate 8n: Solo doctor & small clinic scale sovereignty.
 */

import React from "react";
import { CashRegisterModal, type CashRegisterModalProps } from "./CashRegisterModal.js";

export interface CashboxShiftModalProps extends CashRegisterModalProps {
	readonly initialMode?: "open" | "close" | "reconciliation" | undefined;
}

/**
 * CashboxShiftModal — Unified Shift Management Modal for Opening, Closing (Z-report),
 * and X-report Intermediate Audit.
 */
export const CashboxShiftModal: React.FC<CashboxShiftModalProps> = (props) => {
	const initialTab =
		props.initialMode === "close"
			? "reconciliation"
			: props.initialMode === "reconciliation"
				? "drawer"
				: props.initialTab || "reconciliation";

	return (
		<CashRegisterModal
			{...props}
			initialTab={initialTab}
		/>
	);
};

export default CashboxShiftModal;
