/**
 * ============================================================================
 * STERILIZATION JOURNAL MODAL (CANONICAL BEST-OF-BREED DELEGATE)
 * Canonical delegate to SterilizationAutoclaveLogModal (СанПиН 3.3686-21).
 * Eliminates 1400+ lines of duplicate modal code (Mandates 8d, 8e, 8j, 8n).
 * ============================================================================
 */

import React from "react";
import {
	SterilizationAutoclaveLogModal,
	type SterilizationAutoclaveLogModalProps,
} from "./SterilizationAutoclaveLogModal";

export type SterilizationJournalTab = "form257" | "pso366" | "kraft_packages" | "print_blanks";

export interface SterilizationJournalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: SterilizationJournalTab | "form257" | "form366" | "kraft" | "print" | string | undefined;
	readonly clinicRequisites?: unknown;
}

export function SterilizationJournalModal({
	isOpen,
	onClose,
	initialTab = "form257",
}: SterilizationJournalModalProps) {
	if (!isOpen) return null;

	const mappedTab: "form257" | "form366" | "kraft" | "print" =
		initialTab === "pso366" || initialTab === "form366"
			? "form366"
			: initialTab === "kraft_packages" || initialTab === "kraft"
				? "kraft"
				: initialTab === "print_blanks" || initialTab === "print"
					? "print"
					: "form257";

	return (
		<SterilizationAutoclaveLogModal
			isOpen={isOpen}
			onClose={onClose}
			initialTab={mappedTab}
		/>
	);
}

export default SterilizationJournalModal;
