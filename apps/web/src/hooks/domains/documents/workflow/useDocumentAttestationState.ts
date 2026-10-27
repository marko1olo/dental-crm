import { useEffect, useMemo } from "react";
import type { Dashboard, GeneratedDocument } from "@dental/shared";
import { saveDocumentIssueSignatureDraft } from "../../../../AppHelpers";

export interface UseDocumentAttestationStateProps {
	dashboard: Dashboard | null;
	activeDocuments: GeneratedDocument[];
	documentState: any;
}

export function useDocumentAttestationState({
	dashboard,
	activeDocuments,
	documentState,
}: UseDocumentAttestationStateProps) {
	const documentIssueConfirmation = useMemo(() => {
		if (!documentState.documentIssueConfirmationId) return null;
		return (
			activeDocuments?.find(
				(document) =>
					document.id === documentState.documentIssueConfirmationId &&
					document.status === "draft",
			) ?? null
		);
	}, [activeDocuments, documentState.documentIssueConfirmationId]);

	const documentVoidConfirmation = useMemo(() => {
		if (!documentState.documentVoidConfirmationId) return null;
		return (
			activeDocuments?.find(
				(document) =>
					document.id === documentState.documentVoidConfirmationId &&
					document.status !== "voided",
			) ?? null
		);
	}, [activeDocuments, documentState.documentVoidConfirmationId]);

	// Мандат 8e (Автономия врача): готовность к выдаче/подписанию всегда доступна в 1 клик,
	// если выбран черновик. Система подставит безопасные дефолты врача при подтверждении.
	const documentIssueAttestationReady = useMemo(() => {
		return Boolean(documentIssueConfirmation);
	}, [documentIssueConfirmation]);

	const documentVoidReady = useMemo(() => {
		return Boolean(
			documentVoidConfirmation &&
				documentState.documentVoidReasonText.trim().length >= 3 &&
				documentState.documentVoidStaffFullName.trim(),
		);
	}, [
		documentVoidConfirmation,
		documentState.documentVoidReasonText,
		documentState.documentVoidStaffFullName,
	]);

	useEffect(() => {
		saveDocumentIssueSignatureDraft(
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
			documentState.documentIssueSignatureMode,
			documentState.documentIssueStaffFullName,
			documentState.documentIssueStaffRole,
		);
	}, [
		dashboard?.clinicSettings?.profile?.organizationId,
		documentState.documentIssueSignatureMode,
		documentState.documentIssueStaffFullName,
		documentState.documentIssueStaffRole,
	]);

	return {
		documentIssueConfirmation,
		documentVoidConfirmation,
		documentIssueAttestationReady,
		documentVoidReady,
	};
}
