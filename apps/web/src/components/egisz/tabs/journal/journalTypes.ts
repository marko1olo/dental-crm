/**
 * journalTypes.ts — Props and badge helpers for EgiszJournalTab
 */

import type { RemdDocumentRecord, RemdDocumentStatus } from "../../egiszJournalData";

export interface EgiszJournalTabProps {
	readonly records: readonly RemdDocumentRecord[];
	readonly journalFilter: RemdDocumentStatus | "all";
	readonly onJournalFilterChange: (status: RemdDocumentStatus | "all") => void;
	readonly selectedJournalId: string;
	readonly onSelectJournalId: (id: string) => void;
	readonly onBatchZipExport: () => void;
	readonly onSingleZipExport: (record: RemdDocumentRecord) => void;
	readonly onSignJournalDocument?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onExportJournalZip?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onSwitchToSignatureTab: () => void;
	readonly onRefreshOutbox?: (() => void) | undefined;
	readonly onBatchSendShift?: (() => void) | undefined;
	readonly isLoading?: boolean | undefined;
}

export function getStatusBadge(status: RemdDocumentStatus): { bg: string; color: string; label: string } {
	switch (status) {
		case "registered":
			return { bg: "rgba(16, 185, 129, 0.15)", color: "var(--success)", label: "Зарегистрирован" };
		case "accepted_by_egisz":
			return { bg: "rgba(16, 185, 129, 0.15)", color: "var(--success)", label: "Принят ЕГИСЗ" };
		case "signed":
			return { bg: "rgba(59, 130, 246, 0.15)", color: "var(--primary)", label: "Подписан" };
		case "sent":
			return { bg: "rgba(6, 182, 212, 0.15)", color: "var(--teal, #0d9488)", label: "Отправлен" };
		case "rejected_by_egisz":
			return { bg: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", label: "Отклонен ЕГИСЗ" };
		case "error":
			return { bg: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", label: "Ошибка" };
		case "draft":
		default:
			return { bg: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", label: "Черновик" };
	}
}
