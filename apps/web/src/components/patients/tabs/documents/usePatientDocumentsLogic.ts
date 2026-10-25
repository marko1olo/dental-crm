import { useMemo, useState } from "react";
import type { GeneratedDocument, Patient } from "@dental/shared";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";
import { useDocumentStore } from "../../../../store/documentStore";
import type { FastPrintDocType } from "../../../documents/FastClinicalPrintEngine";

export function usePatientDocumentsLogic(patient: Patient) {
	const appLogic = useAppLogicContext();
	const docStore = useDocumentStore();

	const [isFastPrintOpen, setIsFastPrintOpen] = useState(false);
	const [fastPrintDocType, setFastPrintDocType] = useState<FastPrintDocType>("form043u");
	const [tabletSignDoc, setTabletSignDoc] = useState<GeneratedDocument | null>(null);

	const handleTabletSignatureConfirm = async (sigData: any) => {
		if (!tabletSignDoc) return;
		docStore.setDocumentIssueConfirmationId(tabletSignDoc.id);
		docStore.setDocumentIssueSignatureMode("simple_electronic_signature");
		docStore.setDocumentIssueSignedAt(sigData.signedAt);
		docStore.setDocumentIssueRecipientFullName(sigData.recipientFullName);
		docStore.setDocumentIssueRecipientRole(sigData.recipientRole);
		docStore.setDocumentIssueIdentityChecked(true);
		docStore.setDocumentIssueDocumentOpenedAndChecked(true);
		docStore.setDocumentIssueRecipientSigned(true);
		docStore.setDocumentIssueClinicSigned(true);
		docStore.setDocumentIssueNote(`Подписано ПЭП на планшете. Хэш SHA-256: ${sigData.sha256Fingerprint?.slice(0, 16)}...`);
		await appLogic.confirmDocumentIssue(true);
		setTabletSignDoc(null);
	};

	const allDocs = useMemo(() => {
		const fromStore = ((docStore as unknown as { activeDocuments?: GeneratedDocument[] }).activeDocuments ?? []) as GeneratedDocument[];
		if (fromStore.length > 0) return fromStore;
		return (appLogic.dashboard?.documents ?? []) as GeneratedDocument[];
	}, [(docStore as unknown as { activeDocuments?: GeneratedDocument[] }).activeDocuments, appLogic.dashboard?.documents]);

	const patientDocs = useMemo(() => {
		return allDocs.filter((doc: GeneratedDocument) => doc && doc.patientId === patient.id);
	}, [allDocs, patient.id]);

	const activeIssueDoc = useMemo(() => {
		if (!docStore.documentIssueConfirmationId) return null;
		return allDocs.find((doc: GeneratedDocument) => doc.id === docStore.documentIssueConfirmationId) ?? null;
	}, [allDocs, docStore.documentIssueConfirmationId]);

	return {
		appLogic,
		docStore,
		isFastPrintOpen,
		setIsFastPrintOpen,
		fastPrintDocType,
		setFastPrintDocType,
		tabletSignDoc,
		setTabletSignDoc,
		handleTabletSignatureConfirm,
		patientDocs,
		activeIssueDoc,
	};
}
