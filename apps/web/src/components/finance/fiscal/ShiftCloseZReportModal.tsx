/**
 * ShiftCloseZReportModal.tsx — 1-Click Shift Close & Daily Z-Report Modal Facade.
 *
 * Governed by:
 * - Mandate 8b: Monolith Decomposition (Facade <= 80 lines, modules <= 120 lines).
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, non-blocking 1-click execution).
 * - Mandate 8d pt 6: Anti-Matryoshka (Modal depth strictly 1).
 * - Mandate 8x: Living clinical & cashier language without Soviet bureaucracy.
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import type { ShiftCloseZReportModalProps } from "./shiftClose/types";
import { ShiftCloseModalView } from "./shiftClose/ShiftCloseModalView";
import { OfflineFiscalBatchModal } from "./OfflineFiscalBatchModal";

export type { ShiftCloseZReportModalProps } from "./shiftClose/types";

export const ShiftCloseZReportModal: React.FC<ShiftCloseZReportModalProps> = (props) => {
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

	if (!props.isOpen) return null;

	// Mandate 8d pt 6: Anti-Matryoshka — top-level conditional return to ensure modal depth is strictly 1
	if (isBatchModalOpen) {
		const batchModal = (
			<OfflineFiscalBatchModal
				isOpen={isBatchModalOpen}
				onClose={() => setIsBatchModalOpen(false)}
				clinicName={props.clinicLegalName}
				cashierFullName={props.cashierFullName}
				shiftNumber={props.shiftNumber}
			/>
		);
		return typeof document !== "undefined" ? createPortal(batchModal, document.body) : batchModal;
	}

	const modalNode = (
		<ShiftCloseModalView
			props={props}
			onOpenBatchModal={() => setIsBatchModalOpen(true)}
		/>
	);

	return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
};
