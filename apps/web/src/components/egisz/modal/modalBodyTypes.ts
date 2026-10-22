/**
 * modalBodyTypes.ts — Interface for EgiszRemdModalBody props.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { useEgiszRemdState } from "../useEgiszRemdState";
import type { useCryptoProSigning } from "../useCryptoProSigning";
import type { RemdDocumentRecord, RemdDocumentStatus } from "../egiszJournalData";
import type { EgiszHubActiveDocType, EgiszHubModalTab } from "./modalTypes";

export interface EgiszRemdModalBodyProps {
	activeTab: EgiszHubModalTab;
	activeDocType: EgiszHubActiveDocType;
	state: ReturnType<typeof useEgiszRemdState>;
	crypto: ReturnType<typeof useCryptoProSigning>;
	isSending: boolean;
	signaturePreviewMode: "print" | "xml";
	onSignaturePreviewModeChange: (mode: "print" | "xml") => void;
	collapsedSections: Record<string, boolean>;
	onToggleSection: (key: string) => void;
	records: RemdDocumentRecord[];
	journalFilter: RemdDocumentStatus | "all";
	onJournalFilterChange: (f: RemdDocumentStatus | "all") => void;
	selectedJournalId: string;
	onSelectJournalId: (id: string) => void;
	isLoadingJournal: boolean;
	onBatchZipExport: () => void;
	onSingleZipExport: (record: RemdDocumentRecord) => void;
	onSignJournalDocument?: ((record: RemdDocumentRecord) => void) | undefined;
	onExportJournalZip?: ((record: RemdDocumentRecord) => void) | undefined;
	onSwitchToSignatureTab: () => void;
	onRefreshOutbox: () => void;
	onBatchSendShift: () => void;
	onSendToRegistry: () => void;
	onQueueDeferred: () => void;
	onPrint: () => void;
	onDownloadXml: () => void;
	onValidateCdaXml: () => void;
	onExportCurrentPackageZip: () => void;
	onCopyXml: () => void;
}
