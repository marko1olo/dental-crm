/**
 * modalTypes.ts — Interfaces and props for EgiszRemdHubModal and its subcomponents.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { EgiszDentalCdaPayload, FnsTaxCertificatePayload } from "../egiszRemdEngine";
import type { RemdDocumentRecord, RemdDocumentStatus } from "../egiszJournalData";

export type EgiszHubActiveDocType = "cda_semd" | "fns_tax";
export type EgiszHubModalTab =
	| "clinical"
	| "tax_deduction"
	| "preflight"
	| "signature"
	| "xml_preview"
	| "journal"
	| "xml"
	| "signing";

export interface EgiszRemdHubModalProps {
	isOpen?: boolean | undefined;
	onClose: () => void;
	initialDocType?: EgiszHubActiveDocType | undefined;
	initialPayload?: Partial<EgiszDentalCdaPayload> | undefined;
	initialXmlPayload?: any | undefined;
	initialFnsPayload?: Partial<FnsTaxCertificatePayload> | undefined;
	initialTab?: EgiszHubModalTab | undefined;
	initialJournalFilter?: RemdDocumentStatus | "all" | undefined;
	initialJournalSelectedId?: string | undefined;
	initialJournalRecords?: RemdDocumentRecord[] | undefined;
	onSentSuccess?: ((result: { type: string; documentId: string; timestamp: string }) => void) | undefined;
	onSignJournalDocument?: ((record: RemdDocumentRecord) => void) | undefined;
	onExportJournalZip?: ((record: RemdDocumentRecord) => void) | undefined;
}
