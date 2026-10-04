import type React from "react";
import type { DocumentKind, DocumentKindMetadata, DocumentStatus, GeneratedDocument, Patient, StaffMember } from "@dental/shared";
import { MobileDocumentsHub } from "../../documents/mobile/MobileDocumentsHub";

export interface PatientDocumentsMobileSheetProps {
	readonly patient: Patient;
	readonly documents: GeneratedDocument[];
	readonly activeDoctor?: StaffMember | null | undefined;
	readonly documentLabels?: Record<DocumentKind, string> | undefined;
	readonly documentStatusLabels?: Record<DocumentStatus, string> | undefined;
	readonly documentKindMetadata?: Record<DocumentKind, DocumentKindMetadata> | undefined;
	readonly formatShortDate?: ((date: string | null | undefined) => string) | undefined;
	readonly money?: ((val: number | null | undefined) => string) | undefined;
	readonly onRequestIssue?: ((doc: GeneratedDocument) => void) | undefined;
	readonly onDownloadPdf: (id: string) => Promise<void> | void;
	readonly onOpenHtml: (id: string) => Promise<void> | void;
	readonly onLoadAuditFacts?: ((id: string) => Promise<void> | void) | undefined;
	readonly onDirectPrintPrimaryIntake?: (() => void) | undefined;
}

export function PatientDocumentsMobileSheet({
	patient,
	documents,
	activeDoctor,
	documentLabels,
	documentStatusLabels,
	documentKindMetadata,
	formatShortDate,
	money,
	onRequestIssue,
	onDownloadPdf,
	onOpenHtml,
	onLoadAuditFacts,
	onDirectPrintPrimaryIntake,
}: PatientDocumentsMobileSheetProps): React.JSX.Element {
	const patientDocs = documents.filter((d) => d.patientId === patient.id);

	return (
		<MobileDocumentsHub
			documents={patientDocs}
			activePatient={patient}
			activeDoctor={activeDoctor}
			documentLabels={documentLabels}
			documentStatusLabels={documentStatusLabels}
			documentKindMetadata={documentKindMetadata}
			formatShortDate={formatShortDate}
			money={money}
			onRequestIssue={onRequestIssue}
			onDownloadPdf={onDownloadPdf}
			onOpenHtml={onOpenHtml}
			onLoadAuditFacts={onLoadAuditFacts}
			onDirectPrintPrimaryIntake={onDirectPrintPrimaryIntake}
		/>
	);
}
