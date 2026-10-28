import React from "react";
import type { DocumentVoidConfirmationModalProps } from "./voidConfirmation/types";
import { DocumentVoidModalHeader } from "./voidConfirmation/DocumentVoidModalHeader";
import { DocumentVoidAttestationGrid } from "./voidConfirmation/DocumentVoidAttestationGrid";
import { DocumentVoidChecklistSection } from "./voidConfirmation/DocumentVoidChecklistSection";
import { DocumentVoidModalFooter } from "./voidConfirmation/DocumentVoidModalFooter";

export type { DocumentVoidConfirmationModalProps };

export const DocumentVoidConfirmationModal: React.FC<DocumentVoidConfirmationModalProps> = React.memo(
	function DocumentVoidConfirmationModal(props) {
		const {
			documentVoidConfirmation,
			documentLabels,
			documentStatusLabels,
			patientName,
			patients,
			documentVoidReasonCode,
			setDocumentVoidReasonCode,
			normalizedDocumentVoidReasonCode,
			documentVoidReasonLabels,
			documentVoidStaffFullName,
			setDocumentVoidStaffFullName,
			activeDoctor,
			documentVoidStaffRole,
			setDocumentVoidStaffRole,
			documentVoidCorrectionDocumentId,
			setDocumentVoidCorrectionDocumentId,
			activeUsableDocuments,
			documentVoidReasonText,
			setDocumentVoidReasonText,
			documentVoidReplacementRequired,
			setDocumentVoidReplacementRequired,
			documentVoidPatientOrPayerNotified,
			setDocumentVoidPatientOrPayerNotified,
			documentVoidArchivePreserved,
			setDocumentVoidArchivePreserved,
			documentVoidStatusReviewed,
			setDocumentVoidStatusReviewed,
			documentVoidReady,
			documentVoidMissingSteps,
			documentVoidMissingGuidanceId,
			documentVoidSaving,
			setDocumentVoidConfirmationId,
			confirmDocumentVoid,
		} = props;

		if (!documentVoidConfirmation) return null;

		return (
			<section className="document-issue-confirmation" role="dialog" aria-label="Аннулирование документа">
				<DocumentVoidModalHeader
					document={documentVoidConfirmation}
					documentLabels={documentLabels}
					documentStatusLabels={documentStatusLabels}
					patientName={patientName}
					patients={patients}
				/>
				<DocumentVoidAttestationGrid
					documentId={documentVoidConfirmation.id}
					documentVoidReasonCode={documentVoidReasonCode}
					setDocumentVoidReasonCode={setDocumentVoidReasonCode}
					normalizedDocumentVoidReasonCode={normalizedDocumentVoidReasonCode}
					documentVoidReasonLabels={documentVoidReasonLabels}
					documentVoidStaffFullName={documentVoidStaffFullName}
					setDocumentVoidStaffFullName={setDocumentVoidStaffFullName}
					activeDoctor={activeDoctor}
					documentVoidStaffRole={documentVoidStaffRole}
					setDocumentVoidStaffRole={setDocumentVoidStaffRole}
					documentVoidCorrectionDocumentId={documentVoidCorrectionDocumentId}
					setDocumentVoidCorrectionDocumentId={setDocumentVoidCorrectionDocumentId}
					activeUsableDocuments={activeUsableDocuments}
					documentLabels={documentLabels}
					documentStatusLabels={documentStatusLabels}
					documentVoidReasonText={documentVoidReasonText}
					setDocumentVoidReasonText={setDocumentVoidReasonText}
				/>
				<DocumentVoidChecklistSection
					replacementRequired={documentVoidReplacementRequired}
					setReplacementRequired={setDocumentVoidReplacementRequired}
					patientNotified={documentVoidPatientOrPayerNotified}
					setPatientNotified={setDocumentVoidPatientOrPayerNotified}
					archivePreserved={documentVoidArchivePreserved}
					setArchivePreserved={setDocumentVoidArchivePreserved}
					statusReviewed={documentVoidStatusReviewed}
					setStatusReviewed={setDocumentVoidStatusReviewed}
					ready={documentVoidReady}
					missingSteps={documentVoidMissingSteps}
					guidanceId={documentVoidMissingGuidanceId}
				/>
				<DocumentVoidModalFooter
					saving={documentVoidSaving}
					ready={documentVoidReady}
					guidanceId={documentVoidMissingGuidanceId}
					onClose={() => setDocumentVoidConfirmationId(null)}
					onConfirm={confirmDocumentVoid}
				/>
			</section>
		);
	},
);
