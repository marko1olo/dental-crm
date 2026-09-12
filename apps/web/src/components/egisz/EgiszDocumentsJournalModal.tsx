/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD DOCUMENTS JOURNAL MODAL — DENTE DENTAL CRM
 * Canonical SSOT Facade over EgiszRemdHubModal (Mandate 8s)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { EgiszRemdHubModal } from "./EgiszRemdHubModal";
import type { RemdDocumentRecord, RemdDocumentStatus } from "./egiszJournalData";

export * from "./egiszJournalData";

export interface EgiszDocumentsJournalModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialFilter?: RemdDocumentStatus | "all" | undefined;
	initialSelectedId?: string | undefined;
	onOpenSigningStudio?: ((record: RemdDocumentRecord) => void) | undefined;
	patientId?: string | undefined;
}

export const EgiszDocumentsJournalModal: React.FC<EgiszDocumentsJournalModalProps> = ({
	isOpen,
	onClose,
	initialFilter = "all",
	initialSelectedId,
	onOpenSigningStudio,
	patientId: _patientId,
}) => {
	return (
		<EgiszRemdHubModal
			isOpen={isOpen}
			onClose={onClose}
			initialTab="journal"
			initialJournalFilter={initialFilter}
			{...(initialSelectedId ? { initialJournalSelectedId: initialSelectedId } : {})}
			{...(onOpenSigningStudio ? { onSignJournalDocument: onOpenSigningStudio } : {})}
		/>
	);
};
