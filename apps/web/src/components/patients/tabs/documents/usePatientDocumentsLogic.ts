import { useMemo, useState } from "react";
import type { GeneratedDocument, Patient } from "@dental/shared";
import { useOptionalAppLogicContext } from "../../../../contexts/AppLogicContext";
import { useDocumentStore } from "../../../../store/documentStore";
import type { FastPrintDocType } from "../../../documents/FastClinicalPrintEngine";

export interface TabletSignatureData {
	readonly signedAt?: string | undefined;
	readonly recipientFullName?: string | undefined;
	readonly recipientRole?: string | undefined;
	readonly sha256Fingerprint?: string | undefined;
	readonly signatureSvg?: string | undefined;
	readonly pepCode?: string | undefined;
}

interface StoreWithOptionalDocuments {
	readonly activeDocuments?: GeneratedDocument[] | undefined;
}

function extractActiveDocuments(store: unknown): GeneratedDocument[] | null {
	if (store && typeof store === "object" && "activeDocuments" in store && Array.isArray((store as StoreWithOptionalDocuments).activeDocuments)) {
		return (store as StoreWithOptionalDocuments).activeDocuments ?? null;
	}
	return null;
}

export function usePatientDocumentsLogic(patient: Patient) {
	const appLogic = useOptionalAppLogicContext();
	const docStore = useDocumentStore();

	const [isFastPrintOpen, setIsFastPrintOpen] = useState(false);
	const [fastPrintDocType, setFastPrintDocType] = useState<FastPrintDocType>("medical_card");
	const [tabletSignDoc, setTabletSignDoc] = useState<GeneratedDocument | null>(null);

	const handleTabletSignatureConfirm = async (sigData: TabletSignatureData) => {
		if (!tabletSignDoc) return;
		docStore.setDocumentIssueConfirmationId(tabletSignDoc.id);
		docStore.setDocumentIssueSignatureMode("simple_electronic_signature");
		docStore.setDocumentIssueSignedAt(sigData.signedAt ?? new Date().toISOString());
		docStore.setDocumentIssueRecipientFullName(sigData.recipientFullName ?? "");
		docStore.setDocumentIssueRecipientRole(sigData.recipientRole ?? "patient");
		docStore.setDocumentIssueIdentityChecked(true);
		docStore.setDocumentIssueDocumentOpenedAndChecked(true);
		docStore.setDocumentIssueRecipientSigned(true);
		docStore.setDocumentIssueClinicSigned(true);
		docStore.setDocumentIssueNote(`Подписано ПЭП на планшете. Хэш SHA-256: ${sigData.sha256Fingerprint?.slice(0, 16) ?? "N/A"}...`);
		await appLogic?.confirmDocumentIssue?.(true, sigData.signatureSvg, sigData.pepCode);
		setTabletSignDoc(null);
	};

	const allDocs = useMemo(() => {
		const fromStore = extractActiveDocuments(docStore);
		if (fromStore && fromStore.length > 0) return fromStore;
		return (appLogic?.dashboard?.documents ?? []) as GeneratedDocument[];
	}, [docStore, appLogic?.dashboard?.documents]);

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
