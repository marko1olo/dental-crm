import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DocumentKind, DocumentSourceStatus, DocumentStatus } from "@dental/shared";
import { DocumentAuditModalHeader } from "./auditFacts/DocumentAuditModalHeader";
import { DocumentAuditRequisitesSection } from "./auditFacts/DocumentAuditRequisitesSection";
import { DocumentAuditSignatureSection } from "./auditFacts/DocumentAuditSignatureSection";
import { DocumentAuditClinicalLinksSection } from "./auditFacts/DocumentAuditClinicalLinksSection";
import { DocumentAuditModalFooter } from "./auditFacts/DocumentAuditModalFooter";

export interface DocumentAuditFactsModalProps {
	documentAuditFacts: any;
	documentLabels?: Record<DocumentKind, string>;
	documentStatusLabels?: Record<DocumentStatus, string>;
	formatShortDate?: (date: string | null | undefined) => string;
	documentSourceStatusClassNames?: Record<DocumentSourceStatus, string>;
	documentSourceStatusLabels?: Record<DocumentSourceStatus, string>;
	documentIssueSignatureModeLabels: Record<string, string>;
	documentVoidReasonLabels: Record<string, string>;
	loadDocumentAuditFacts: (id: string) => Promise<void> | void;
	setDocumentAuditFacts: (facts: any) => void;
	openIssuedDocumentHtml: (id: string) => Promise<void> | void;
	downloadIssuedDocumentHtml: (id: string) => Promise<void> | void;
	downloadIssuedDocumentPdf: (id: string) => Promise<void> | void;
}

export const DocumentAuditFactsModal: React.FC<DocumentAuditFactsModalProps> = React.memo(
	function DocumentAuditFactsModal(props) {
		const {
			documentAuditFacts, documentLabels, documentStatusLabels, formatShortDate,
			documentSourceStatusLabels, documentIssueSignatureModeLabels,
			loadDocumentAuditFacts, setDocumentAuditFacts, openIssuedDocumentHtml,
			downloadIssuedDocumentHtml, downloadIssuedDocumentPdf,
		} = props;

		useEffect(() => {
			if (!documentAuditFacts) return;
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") setDocumentAuditFacts(null);
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [documentAuditFacts, setDocumentAuditFacts]);

		if (!documentAuditFacts) return null;

		const modalContent = (
			<div
				className="document-package-modal-overlay"
				role="dialog"
				aria-modal="true"
				aria-labelledby="document-audit-facts-title"
				onClick={(e) => { if (e.target === e.currentTarget) setDocumentAuditFacts(null); }}
				data-testid="modal-document-audit-facts"
			>
				<div className="document-package-modal-content max-w-3xl w-full bg-[var(--paper)] text-[var(--ink)] rounded-2xl border border-[var(--line)] shadow-2xl">
					<DocumentAuditModalHeader
						facts={documentAuditFacts}
						documentLabels={documentLabels}
						documentStatusLabels={documentStatusLabels}
						onClose={() => setDocumentAuditFacts(null)}
					/>
					<div className="document-package-modal-body p-4 overflow-y-auto max-h-[calc(88vh-130px)] flex flex-col gap-3.5">
						<DocumentAuditRequisitesSection
							facts={documentAuditFacts}
							documentLabels={documentLabels}
							documentStatusLabels={documentStatusLabels}
							formatShortDate={formatShortDate}
						/>
						<DocumentAuditSignatureSection
							facts={documentAuditFacts}
							documentSourceStatusLabels={documentSourceStatusLabels}
							documentIssueSignatureModeLabels={documentIssueSignatureModeLabels}
							formatShortDate={formatShortDate}
							onReloadFacts={loadDocumentAuditFacts}
						/>
						<DocumentAuditClinicalLinksSection facts={documentAuditFacts} />
					</div>
					<DocumentAuditModalFooter
						documentId={documentAuditFacts.documentId}
						hasHtmlDownloadUrl={Boolean(documentAuditFacts.htmlDownloadUrl)}
						onClose={() => setDocumentAuditFacts(null)}
						onOpenHtml={openIssuedDocumentHtml}
						onDownloadHtml={downloadIssuedDocumentHtml}
						onDownloadPdf={downloadIssuedDocumentPdf}
					/>
				</div>
			</div>
		);

		return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
	},
);

DocumentAuditFactsModal.displayName = "DocumentAuditFactsModal";
export default DocumentAuditFactsModal;
