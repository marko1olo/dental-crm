import { useEffect, useCallback } from "react";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { safeLocalStorageSetItem } from "../../../../lib/safeLocalStorage";
import { generateSha256 } from "../../../consents/consentIntegrityHash";
import type { ConsentTemplateKey, ConsentSubstitutionContext } from "../../../consents/consentTemplates";
import {
	CONSENT_KEY_TO_DOCUMENT_KIND,
	resolveConsentKeyFromDocument,
	type ConsentRecordState,
	type VisitConsentsTabAppointment,
} from "../visitConsentTypes";

interface UseConsentBackendSyncParams {
	patientId: string;
	storageKey: string;
	substitutionContext: ConsentSubstitutionContext;
	activeAppointment?: VisitConsentsTabAppointment | null | undefined;
	setConsentRecords: React.Dispatch<React.SetStateAction<Record<string, ConsentRecordState>>>;
}

export function useConsentBackendSync({
	patientId, storageKey, substitutionContext, activeAppointment, setConsentRecords,
}: UseConsentBackendSyncParams) {
	useEffect(() => {
		if (!patientId) return;
		let isSubscribed = true;

		async function loadExistingDocuments() {
			try {
				const res = await fetch(`/api/documents?patientId=${encodeURIComponent(patientId)}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = (await res.json()) as {
					documents?: Array<{
						id?: string; kind?: string; title?: string; status?: string; hash?: string;
						signatureAttestation?: { signedAt?: string; staffFullName?: string; mode?: string; note?: string };
						payload?: Record<string, unknown>; createdAt?: string;
					}>;
				};
				const docs = data?.documents;
				if (!isSubscribed || !docs || !Array.isArray(docs)) return;

				setConsentRecords((prev) => {
					const next = { ...prev };
					let hasUpdates = false;

					for (const doc of docs) {
						const isDocSigned = doc.status === "issued" || doc.status === "signed" || Boolean(doc.signatureAttestation);
						if (!isDocSigned) continue;
						const consentKey = resolveConsentKeyFromDocument(doc);
						if (consentKey && !next[consentKey]?.isSigned) {
							const signedDateStr = doc.signatureAttestation?.signedAt
								? `${new Date(doc.signatureAttestation.signedAt).toLocaleDateString("ru-RU")}, ${new Date(doc.signatureAttestation.signedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
								: doc.createdAt
									? `${new Date(doc.createdAt).toLocaleDateString("ru-RU")}, ${new Date(doc.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
									: `${new Date().toLocaleDateString("ru-RU")}, 09:00`;

							next[consentKey] = {
								isSigned: true, signedAt: signedDateStr,
								method: doc.signatureAttestation?.mode === "ukep" ? "tablet" : "paper",
								doctorName: doc.signatureAttestation?.staffFullName || substitutionContext.doctorName || "Врач-стоматолог",
								notes: doc.signatureAttestation?.note || "Подписано и зафиксировано в реестре документов клиники",
								integrityHash: doc.hash || generateSha256(`${consentKey}_${patientId}_${signedDateStr}`),
							};
							hasUpdates = true;
						}
					}
					if (hasUpdates) {
						try { safeLocalStorageSetItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
						return next;
					}
					return prev;
				});
			} catch { /* offline fallback */ }
		}
		void loadExistingDocuments();
		return () => { isSubscribed = false; };
	}, [patientId, storageKey, substitutionContext.doctorName, setConsentRecords]);

	const persistConsentToBackend = useCallback(async (key: ConsentTemplateKey, itemTitle: string, record: ConsentRecordState) => {
		if (!patientId) return;
		try {
			const kind = CONSENT_KEY_TO_DOCUMENT_KIND[key] || "informed_consent";
			const createRes = await fetch("/api/documents", {
				method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					patientId, visitId: activeAppointment?.id || undefined, kind, title: itemTitle,
					payload: {
						consentKey: key, patientName: substitutionContext.patientName,
						doctorName: record.doctorName, signedAt: record.signedAt,
						integrityHash: record.integrityHash, method: record.method, notes: record.notes,
					},
				}),
			});
			if (!createRes.ok) return;
			const createData = (await createRes.json()) as { document?: { id?: string }; id?: string };
			const docId = createData?.document?.id || createData?.id;
			if (!docId) return;

			const nowIso = new Date().toISOString();
			await fetch(`/api/documents/${encodeURIComponent(docId)}/issue`, {
				method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					signatureAttestation: {
						mode: "paper_signed", signedAt: nowIso,
						recipientFullName: substitutionContext.patientName || "Пациент",
						recipientRole: "patient", staffFullName: record.doctorName || "Врач-стоматолог", staffRole: "doctor",
						identityChecked: true, documentOpenedAndChecked: true, recipientSigned: true, clinicRepresentativeSigned: true,
						note: record.notes || "Подписано на бумаге и подшито в медицинскую карту",
					},
				}),
			});
		} catch { /* offline fallback */ }
	}, [activeAppointment?.id, patientId, substitutionContext.doctorName, substitutionContext.patientName]);

	return { persistConsentToBackend };
}
