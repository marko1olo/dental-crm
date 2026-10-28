import {
	type GeneratedDocument,
	type VoidDocumentInput,
} from "@dental/shared";
import { currentLocalDateTimeInputValue } from "../../../AppHelpers";
import { staffRoleLabels } from "../../../workspaceUiLabels";
import type { DocumentVoidProps } from "./documentActionTypes";

export function useDocumentVoidActions({
	activeDoctor,
	documentVoidConfirmation,
	documentVoidReasonCode,
	setDocumentVoidReasonCode,
	documentVoidReasonText,
	setDocumentVoidReasonText,
	documentVoidStaffFullName,
	setDocumentVoidStaffFullName,
	documentVoidStaffRole,
	setDocumentVoidStaffRole,
	documentVoidCorrectionDocumentId,
	setDocumentVoidCorrectionDocumentId,
	documentVoidReplacementRequired,
	setDocumentVoidReplacementRequired,
	documentVoidPatientOrPayerNotified,
	setDocumentVoidPatientOrPayerNotified,
	documentVoidArchivePreserved: _documentVoidArchivePreserved,
	setDocumentVoidArchivePreserved,
	documentVoidStatusReviewed: _documentVoidStatusReviewed,
	setDocumentVoidStatusReviewed,
	documentVoidConfirmationId: _documentVoidConfirmationId,
	setDocumentVoidConfirmationId,
	updateDocumentStatus,
	setError,
}: DocumentVoidProps) {
	function requestDocumentVoid(document: GeneratedDocument) {
		if (document.status === "voided") {
			setError("Документ уже аннулирован.");
			return;
		}
		setDocumentVoidReasonCode(
			document.status === "issued" ? "issued_in_error" : "draft_error",
		);
		setDocumentVoidReasonText("");
		if (!documentVoidStaffFullName.trim() && activeDoctor?.fullName) {
			setDocumentVoidStaffFullName(activeDoctor.fullName);
		}
		if (!documentVoidStaffRole.trim()) {
			setDocumentVoidStaffRole(
				activeDoctor
					? staffRoleLabels[activeDoctor.role]
					: "Врач/администратор",
			);
		}
		setDocumentVoidCorrectionDocumentId("");
		setDocumentVoidReplacementRequired(document.status === "issued");
		setDocumentVoidPatientOrPayerNotified(false);
		setDocumentVoidArchivePreserved(true);
		setDocumentVoidStatusReviewed(true);
		setDocumentVoidConfirmationId(document.id);
	}

	async function confirmDocumentVoid() {
		const documentId = documentVoidConfirmation?.id;
		if (!documentId) {
			setError("Выберите документ для аннулирования.");
			return;
		}
		const effectiveReasonText =
			documentVoidReasonText.trim() ||
			"Аннулирование по согласованию с пациентом / техническая ошибка ввода";
		const effectiveStaffFullName =
			documentVoidStaffFullName.trim() ||
			activeDoctor?.fullName ||
			"Администратор";
		const effectiveStaffRole =
			documentVoidStaffRole.trim() ||
			(activeDoctor
				? staffRoleLabels[activeDoctor.role]
				: "Врач/администратор");

		if (!documentVoidReasonText.trim()) {
			setDocumentVoidReasonText(effectiveReasonText);
		}
		if (!documentVoidStaffFullName.trim()) {
			setDocumentVoidStaffFullName(effectiveStaffFullName);
		}
		if (!documentVoidStaffRole.trim()) {
			setDocumentVoidStaffRole(effectiveStaffRole);
		}
		setDocumentVoidArchivePreserved(true);
		setDocumentVoidStatusReviewed(true);

		const payload = {
			voidAttestation: {
				reasonCode: documentVoidReasonCode,
				reasonText: effectiveReasonText,
				voidedAt: currentLocalDateTimeInputValue().replace("T", " "),
				staffFullName: effectiveStaffFullName,
				staffRole: effectiveStaffRole,
				correctionDocumentId: documentVoidCorrectionDocumentId.trim() || null,
				replacementRequired: documentVoidReplacementRequired,
				patientOrPayerNotified: documentVoidPatientOrPayerNotified,
				archivePreserved: true,
				statusReviewed: true,
			},
		} satisfies VoidDocumentInput;
		const updated = await updateDocumentStatus(documentId, "void", payload);
		if (updated) {
			setDocumentVoidConfirmationId(null);
		}
	}

	return {
		requestDocumentVoid,
		confirmDocumentVoid,
	};
}
