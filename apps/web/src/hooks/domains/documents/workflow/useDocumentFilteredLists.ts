import { useEffect, useMemo, useRef } from "react";
import type { Dashboard, Patient } from "@dental/shared";
import { completedActContractReferenceForUi } from "../../../../workspaceUiLabels";

export interface UseDocumentFilteredListsProps {
	dashboard: Dashboard | null;
	documentPatient: Patient | null;
	documentState: any;
	documentPatientMatchesActiveVisit: boolean;
}

export function useDocumentFilteredLists({
	dashboard,
	documentPatient,
	documentState,
	documentPatientMatchesActiveVisit,
}: UseDocumentFilteredListsProps) {
	const releaseSourceRequestAutofillRef = useRef<string | null>(null);

	const activeDocuments = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		return (dashboard.documents || []).filter(
			(document) =>
				document.patientId === documentPatient.id &&
				(!documentPatientMatchesActiveVisit ||
					document.visitId === null ||
					document.visitId === dashboard?.activeVisit?.id),
		);
	}, [dashboard, documentPatient, documentPatientMatchesActiveVisit]);

	const activeUsableDocuments = useMemo(() => {
		return activeDocuments.filter((document) => document.status !== "voided");
	}, [activeDocuments]);

	const activeIssuedPaidContracts = useMemo(() => {
		return activeDocuments
			.filter(
				(document) =>
					document.kind === "paid_medical_services_contract" &&
					document.status === "issued" &&
					document.visitId !== null,
			)
			.sort((left, right) => (right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""));
	}, [activeDocuments]);

	const selectedCompletedActContractDocumentId = useMemo(() => {
		if (activeIssuedPaidContracts.some((d) => d.id === documentState.completedActLinkedContractDocumentId)) {
			return documentState.completedActLinkedContractDocumentId;
		}
		return activeIssuedPaidContracts.length === 1 ? (activeIssuedPaidContracts[0]?.id ?? "") : "";
	}, [activeIssuedPaidContracts, documentState.completedActLinkedContractDocumentId]);

	useEffect(() => {
		if (documentState.completedActContractNumber.trim() || !selectedCompletedActContractDocumentId) return;
		const contract = activeIssuedPaidContracts.find((d) => d.id === selectedCompletedActContractDocumentId);
		if (contract) documentState.setCompletedActContractNumber(completedActContractReferenceForUi(contract));
	}, [activeIssuedPaidContracts, documentState.completedActContractNumber, selectedCompletedActContractDocumentId, documentState.setCompletedActContractNumber]);

	const issuedMedicalCopyRequestDocuments = useMemo(() => {
		return activeUsableDocuments
			.filter((document) => document.kind === "medical_record_copy_request" && document.status === "issued")
			.sort((left, right) => (right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""));
	}, [activeUsableDocuments]);

	const selectedReleaseSourceRequestDocumentId = useMemo(() => {
		if (issuedMedicalCopyRequestDocuments.some((d) => d.id === documentState.releaseSourceRequestDocumentId)) {
			return documentState.releaseSourceRequestDocumentId;
		}
		return issuedMedicalCopyRequestDocuments.length === 1 ? (issuedMedicalCopyRequestDocuments[0]?.id ?? "") : "";
	}, [issuedMedicalCopyRequestDocuments, documentState.releaseSourceRequestDocumentId]);

	useEffect(() => {
		if (!selectedReleaseSourceRequestDocumentId) {
			releaseSourceRequestAutofillRef.current = null;
			return;
		}
		if (releaseSourceRequestAutofillRef.current === selectedReleaseSourceRequestDocumentId) return;
		const src = issuedMedicalCopyRequestDocuments.find((d) => d.id === selectedReleaseSourceRequestDocumentId);
		const request = src?.chainSummary?.medicalRecordCopyRequest;
		if (!request) return;

		releaseSourceRequestAutofillRef.current = selectedReleaseSourceRequestDocumentId;
		documentState.setReleaseSourceRequestDocumentId(selectedReleaseSourceRequestDocumentId);
		documentState.setReleaseRecipientFullName(request.recipientFullName);
		documentState.setReleaseRecipientIdentityDocument(request.recipientIdentityDocument);
		documentState.setReleaseRecipientAuthority(request.recipientAuthority);
		documentState.setReleaseChannel(request.requestedFormat);
		documentState.setReleaseDocumentTypes(request.requestedDocumentTypes.join("\n"));
		documentState.setReleasePeriodStart(request.periodStart ?? "");
		documentState.setReleasePeriodEnd(request.periodEnd ?? "");
	}, [issuedMedicalCopyRequestDocuments, selectedReleaseSourceRequestDocumentId, documentState]);

	return {
		activeDocuments,
		activeUsableDocuments,
		activeIssuedPaidContracts,
		selectedCompletedActContractDocumentId,
		issuedMedicalCopyRequestDocuments,
		selectedReleaseSourceRequestDocumentId,
	};
}
