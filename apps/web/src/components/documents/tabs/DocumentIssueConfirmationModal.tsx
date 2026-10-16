import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import { DocumentIssueModalHeader } from "./issueConfirmation/DocumentIssueModalHeader";
import { DocumentIssueParamsCard } from "./issueConfirmation/DocumentIssueParamsCard";
import { DocumentIssueAttestationGrid } from "./issueConfirmation/DocumentIssueAttestationGrid";
import { DocumentIssueChecklistSection } from "./issueConfirmation/DocumentIssueChecklistSection";
import { DocumentIssueModalFooter } from "./issueConfirmation/DocumentIssueModalFooter";

export interface DocumentIssueConfirmationModalProps {
	documentIssueConfirmation: GeneratedDocument | null;
	documentLabels?: Record<DocumentKind, string>;
	patientName?: (patients: Patient[] | undefined, id: string | null | undefined) => string;
	patients?: Patient[];
	money?: (val: number | null | undefined) => string;
	documentIssueSignatureMode: string; setDocumentIssueSignatureMode: (mode: any) => void;
	normalizedDocumentIssueSignatureMode: (val: string) => any;
	documentIssueSignatureModeLabels: Record<string, string>;
	documentIssueSignedAt: string; setDocumentIssueSignedAt: (val: string) => void;
	documentIssueRecipientFullName: string; setDocumentIssueRecipientFullName: (val: string) => void;
	documentIssueRecipientRole: string; setDocumentIssueRecipientRole: (val: string) => void;
	documentIssueStaffFullName: string; setDocumentIssueStaffFullName: (val: string) => void;
	documentIssueStaffRole: string; setDocumentIssueStaffRole: (val: string) => void;
	documentIssueNote: string; setDocumentIssueNote: (val: string) => void;
	activeDoctor?: { fullName?: string } | null;
	documentIssueIdentityChecked: boolean; setDocumentIssueIdentityChecked: (val: boolean) => void;
	documentIssueDocumentOpenedAndChecked: boolean; setDocumentIssueDocumentOpenedAndChecked: (val: boolean) => void;
	documentIssueRecipientSigned: boolean; setDocumentIssueRecipientSigned: (val: boolean) => void;
	documentIssueClinicSigned: boolean; setDocumentIssueClinicSigned: (val: boolean) => void;
	documentIssueAttestationReady: boolean; documentIssueMissingSteps: string[];
	documentIssueMissingGuidanceId: string; documentIssueSaving: boolean;
	setDocumentIssueConfirmationId: (id: string | null) => void;
	confirmDocumentIssue: (bypassChecks?: boolean) => Promise<void> | void;
}

export const DocumentIssueConfirmationModal: React.FC<DocumentIssueConfirmationModalProps> = React.memo(
	function DocumentIssueConfirmationModal(props) {
		const {
			documentIssueConfirmation, documentLabels, patientName, patients, money,
			documentIssueSignatureMode, setDocumentIssueSignatureMode, normalizedDocumentIssueSignatureMode,
			documentIssueSignatureModeLabels, documentIssueSignedAt, setDocumentIssueSignedAt,
			documentIssueRecipientFullName, setDocumentIssueRecipientFullName,
			documentIssueRecipientRole, setDocumentIssueRecipientRole,
			documentIssueStaffFullName, setDocumentIssueStaffFullName,
			documentIssueStaffRole, setDocumentIssueStaffRole,
			documentIssueNote, setDocumentIssueNote, activeDoctor,
			documentIssueIdentityChecked, setDocumentIssueIdentityChecked,
			documentIssueDocumentOpenedAndChecked, setDocumentIssueDocumentOpenedAndChecked,
			documentIssueRecipientSigned, setDocumentIssueRecipientSigned,
			documentIssueClinicSigned, setDocumentIssueClinicSigned,
			documentIssueAttestationReady, documentIssueMissingSteps, documentIssueMissingGuidanceId,
			documentIssueSaving, setDocumentIssueConfirmationId, confirmDocumentIssue,
		} = props;

		useEffect(() => {
			if (!documentIssueConfirmation) return;
			const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setDocumentIssueConfirmationId(null); };
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [documentIssueConfirmation, setDocumentIssueConfirmationId]);

		if (!documentIssueConfirmation) return null;

		const handleConfirm = () => {
			setDocumentIssueIdentityChecked(true); setDocumentIssueDocumentOpenedAndChecked(true);
			setDocumentIssueRecipientSigned(true); setDocumentIssueClinicSigned(true);
			void confirmDocumentIssue(true);
		};

		const modalContent = (
			<div
				className="document-package-modal-overlay" role="dialog" aria-modal="true"
				aria-labelledby="document-issue-confirmation-title" data-testid="modal-document-issue-confirmation"
				onClick={(e) => { if (e.target === e.currentTarget) setDocumentIssueConfirmationId(null); }}
			>
				<div className="document-package-modal-content max-w-2xl w-full bg-[var(--paper)] text-[var(--ink)] rounded-2xl border border-[var(--line)] shadow-2xl">
					<DocumentIssueModalHeader doc={documentIssueConfirmation} documentLabels={documentLabels} patientName={patientName} patients={patients} onClose={() => setDocumentIssueConfirmationId(null)} />
					<div className="document-package-modal-body p-4 overflow-y-auto max-h-[calc(88vh-130px)] flex flex-col gap-3.5">
						<DocumentIssueParamsCard doc={documentIssueConfirmation} documentLabels={documentLabels} money={money} />
						<DocumentIssueAttestationGrid
							signatureMode={documentIssueSignatureMode} onSignatureModeChange={(v) => setDocumentIssueSignatureMode(normalizedDocumentIssueSignatureMode(v))}
							signatureModeLabels={documentIssueSignatureModeLabels} signedAt={documentIssueSignedAt} onSignedAtChange={setDocumentIssueSignedAt}
							recipientFullName={documentIssueRecipientFullName} onRecipientFullNameChange={setDocumentIssueRecipientFullName}
							recipientRole={documentIssueRecipientRole} onRecipientRoleChange={setDocumentIssueRecipientRole}
							staffFullName={documentIssueStaffFullName} onStaffFullNameChange={setDocumentIssueStaffFullName}
							staffRole={documentIssueStaffRole} onStaffRoleChange={setDocumentIssueStaffRole}
							note={documentIssueNote} onNoteChange={setDocumentIssueNote} defaultStaffName={activeDoctor?.fullName}
						/>
						<DocumentIssueChecklistSection
							identityChecked={documentIssueIdentityChecked} onIdentityCheckedChange={setDocumentIssueIdentityChecked}
							documentOpened={documentIssueDocumentOpenedAndChecked} onDocumentOpenedChange={setDocumentIssueDocumentOpenedAndChecked}
							recipientSigned={documentIssueRecipientSigned} onRecipientSignedChange={setDocumentIssueRecipientSigned}
							clinicSigned={documentIssueClinicSigned} onClinicSignedChange={setDocumentIssueClinicSigned}
							attestationReady={documentIssueAttestationReady} missingSteps={documentIssueMissingSteps} missingGuidanceId={documentIssueMissingGuidanceId}
						/>
					</div>
					<DocumentIssueModalFooter saving={documentIssueSaving} onClose={() => setDocumentIssueConfirmationId(null)} onConfirm={handleConfirm} />
				</div>
			</div>
		);

		return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
	},
);

DocumentIssueConfirmationModal.displayName = "DocumentIssueConfirmationModal";
export default DocumentIssueConfirmationModal;
