import { useEffect, useCallback } from "react";
import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";
import { safeLocalStorageSetItem } from "../../../../lib/safeLocalStorage";
import { generateSha256 } from "../../../consents/consentIntegrityHash";
import { showToast } from "../../../GlobalToast";
import { clientLogger } from "../../../../services/logging/clientLogger";
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
					headers: getDenteAuthHeaders(),
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
			const methodToVerification: Record<string, "paper_signed" | "tablet_stylus" | "sms_otp" | "patient_portal"> = {
				paper: "paper_signed",
				tablet: "tablet_stylus",
				sms: "sms_otp",
				portal: "patient_portal",
			};
			const methodKey = record.method || "paper";
			const verificationMethod = methodToVerification[methodKey] || "paper_signed";
			const signatureType = methodKey === "tablet" ? "tablet_stylus" : "paper_signed";

			const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/consents`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": crypto.randomUUID(),
					...getDenteAuthHeaders(),
				},
				body: JSON.stringify({
					kind,
					consentType: key,
					title: itemTitle,
					isSigned: true,
					signedAt: new Date().toISOString(),
					signatureType,
					verificationMethod,
					doctorFullName: record.doctorName || substitutionContext.doctorName || "Врач-стоматолог",
					visitId: activeAppointment?.id || undefined,
					integrityHash: record.integrityHash,
					notes: record.notes || "Подписано и зафиксировано в медицинской карте",
					payload: {
						consentKey: key,
						patientName: substitutionContext.patientName,
						doctorName: record.doctorName,
						signedAt: record.signedAt,
						integrityHash: record.integrityHash,
						method: record.method,
						notes: record.notes,
					},
				}),
			});

			if (!res.ok) {
				let errData: unknown = {};
				try {
					errData = await res.json();
				} catch (parseErr) {
					clientLogger.warn("Failed to parse consent error JSON", parseErr, { module: "useConsentBackendSync" });
				}
				clientLogger.warn("Failed to persist consent to backend", { status: res.status, errData }, { module: "useConsentBackendSync" });
				showToast(`Согласие сохранено локально. Ошибка синхронизации с сервером (${res.status}).`, "warning");
				return;
			}

			showToast(`Согласие «${itemTitle}» успешно сохранено в базу данных клиники.`, "success");
		} catch (err) {
			clientLogger.error("Network error persisting consent", err, { module: "useConsentBackendSync" });
			showToast("Согласие сохранено локально (автономный режим).", "warning");
		}
	}, [activeAppointment?.id, patientId, substitutionContext.doctorName, substitutionContext.patientName]);

	return { persistConsentToBackend };
}
