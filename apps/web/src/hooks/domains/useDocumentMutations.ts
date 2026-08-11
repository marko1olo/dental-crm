import { useMemo, useEffect, useCallback, useRef } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { fetchWithHandling } from "../../utils/networkUtils";
import {
    responseErrorMessage,
    requestFailureMessage,
    saveDocumentIssueSignatureDraft,
    currentLocalDateTimeInputValue
} from "../../AppHelpers";
import { actionFailureToast } from "../../lib/panelStateText";
import { IssueDocumentInput, VoidDocumentInput, DocumentAuditFacts } from "@dental/shared";

export interface DocumentMutationsProps {
    auth: any;
    dashboard: any;
    setError: any;
    showToast: any;
    activeDocuments: any[];
    clinicalAdminSecretSession: string;
    loadDashboard: (options?: { adminSecret?: string }) => Promise<void>;
}

export function useDocumentMutations(props: DocumentMutationsProps) {
    const { 
        auth, 
        dashboard,
        setError, 
        showToast, 
        activeDocuments,
        clinicalAdminSecretSession,
        loadDashboard
    } = props;
    
    const documentState = useDocumentStore();
    const {
        documentIssueConfirmationId,
        setDocumentIssueConfirmationId,
        documentIssueSignatureMode,
        setDocumentIssueSignatureMode,
        documentIssueSignedAt,
        setDocumentIssueSignedAt,
        documentIssueRecipientFullName,
        setDocumentIssueRecipientFullName,
        documentIssueRecipientRole,
        setDocumentIssueRecipientRole,
        documentIssueStaffFullName,
        setDocumentIssueStaffFullName,
        documentIssueStaffRole,
        setDocumentIssueStaffRole,
        documentIssueNote,
        setDocumentIssueNote,
        documentIssueIdentityChecked,
        setDocumentIssueIdentityChecked,
        documentIssueDocumentOpenedAndChecked,
        setDocumentIssueDocumentOpenedAndChecked,
        documentIssueRecipientSigned,
        setDocumentIssueRecipientSigned,
        documentIssueClinicSigned,
        setDocumentIssueClinicSigned,
        documentVoidConfirmationId,
        setDocumentVoidConfirmationId,
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
        documentVoidArchivePreserved,
        setDocumentVoidArchivePreserved,
        documentVoidStatusReviewed,
        setDocumentVoidStatusReviewed,
        documentAuditFacts,
        setDocumentAuditFacts,
        documentAuditFactsLoadingId,
        setDocumentAuditFactsLoadingId,
        isDocumentIngesting,
        setIsDocumentIngesting,
        taxDocumentYear,
        selectedDocumentKind,
        documentStatusSavingId,
        setDocumentStatusSavingId
    } = documentState;

    const documentIssueConfirmation = useMemo(() => {
		if (!documentIssueConfirmationId) return null;
		return (
			activeDocuments?.find(
				(document) =>
					document.id === documentIssueConfirmationId &&
					document.status === "draft",
			) ?? null
		);
	}, [activeDocuments, documentIssueConfirmationId]);

    const documentVoidConfirmation = useMemo(() => {
		if (!documentVoidConfirmationId) return null;
		return (
			activeDocuments?.find(
				(document) =>
					document.id === documentVoidConfirmationId &&
					document.status !== "voided",
			) ?? null
		);
	}, [activeDocuments, documentVoidConfirmationId]);

    const documentIssueAttestationReady = useMemo(() => {
		return Boolean(
			documentIssueConfirmation &&
				documentIssueSignedAt.trim() &&
				documentIssueRecipientFullName.trim() &&
				documentIssueRecipientRole.trim() &&
				documentIssueStaffFullName.trim() &&
				documentIssueStaffRole.trim() &&
				documentIssueIdentityChecked &&
				documentIssueDocumentOpenedAndChecked &&
				documentIssueRecipientSigned &&
				documentIssueClinicSigned,
		);
	}, [
		documentIssueClinicSigned,
		documentIssueConfirmation,
		documentIssueDocumentOpenedAndChecked,
		documentIssueIdentityChecked,
		documentIssueRecipientFullName,
		documentIssueRecipientRole,
		documentIssueRecipientSigned,
		documentIssueSignedAt,
		documentIssueStaffFullName,
		documentIssueStaffRole,
	]);

    const documentVoidReady = useMemo(() => {
		return Boolean(
			documentVoidConfirmation &&
				documentVoidReasonText.trim().length >= 12 &&
				documentVoidStaffFullName.trim() &&
				documentVoidStaffRole.trim() &&
				documentVoidArchivePreserved &&
				documentVoidStatusReviewed,
		);
	}, [
		documentVoidArchivePreserved,
		documentVoidConfirmation,
		documentVoidReasonText,
		documentVoidStaffFullName,
		documentVoidStaffRole,
		documentVoidStatusReviewed,
	]);

    async function updateDocumentStatus(
		documentId: string,
		action: "issue" | "void",
		payload?: unknown,
	): Promise<boolean> {
		if (documentStatusSavingId) {
			setError("Дождитесь завершения текущего действия с документом.");
			return false;
		}
		setDocumentStatusSavingId(documentId);
		try {
			const headers = auth.denteClinicalMutationHeaders(
				payload ? { "Content-Type": "application/json" } : {},
			);
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/${action}`,
				{
					method: "POST",
					headers,
					...(payload
						? {
								body: JSON.stringify(payload),
							}
						: {}),
				},
			);
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Статус документа не обновлен"),
				);
				return false;
			}
			setDocumentAuditFacts(null);
			try {
				await loadDashboard();
				setError(null);
			} catch (error) {
				showToast(
					actionFailureToast(
						"Статус документа обновлен, но список документов не перезагружен",
						(error as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError(
					requestFailureMessage(
						"Статус документа обновлен, но список документов не перезагружен",
						error,
					),
				);
			}
			return true;
		} catch (error) {
			showToast(
				actionFailureToast(
					"Статус документа не обновлен",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("Статус документа не обновлен", error));
			return false;
		} finally {
			setDocumentStatusSavingId(null);
		}
	}

    async function confirmDocumentIssue() {
		const documentId = documentIssueConfirmation?.id;
		if (!documentId) {
			setError("Выберите черновик документа для выдачи.");
			return;
		}
		if (!documentIssueAttestationReady) {
			setError(
				"Перед выдачей отметьте проверку личности, просмотр документа и подписи пациента/клиники.",
			);
			return;
		}
		const payload = {
			signatureAttestation: {
				mode: documentIssueSignatureMode,
				signedAt: documentIssueSignedAt.trim().replace("T", " "),
				recipientFullName: documentIssueRecipientFullName.trim(),
				recipientRole: documentIssueRecipientRole.trim(),
				staffFullName: documentIssueStaffFullName.trim(),
				staffRole: documentIssueStaffRole.trim(),
				identityChecked: true,
				documentOpenedAndChecked: true,
				recipientSigned: true,
				clinicRepresentativeSigned: true,
				note: documentIssueNote.trim() || null,
			},
		} satisfies IssueDocumentInput;
		saveDocumentIssueSignatureDraft(
			dashboard?.clinicSettings?.profile?.organizationId ?? null,
			documentIssueSignatureMode,
			documentIssueStaffFullName,
			documentIssueStaffRole,
		);
		const updated = await updateDocumentStatus(documentId, "issue", payload);
		if (updated) {
			setDocumentIssueConfirmationId(null);
		}
	}

    async function confirmDocumentVoid() {
		const documentId = documentVoidConfirmation?.id;
		if (!documentId) {
			setError("Выберите документ для аннулирования.");
			return;
		}
		if (!documentVoidReady) {
			setError(
				"Перед аннулированием укажите причину, ответственного сотрудника, сохранение архива и проверку статуса.",
			);
			return;
		}
		const payload = {
			voidAttestation: {
				reasonCode: documentVoidReasonCode,
				reasonText: documentVoidReasonText.trim(),
				voidedAt: currentLocalDateTimeInputValue().replace("T", " "),
				staffFullName: documentVoidStaffFullName.trim(),
				staffRole: documentVoidStaffRole.trim(),
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

    async function downloadTaxDocumentXml(documentId: string) {
		try {
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/tax-xml`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(await responseErrorMessage(response, "XML ФНС не выгружен"));
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") ?? "";
			const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
			const fileName = quotedFileName?.trim() || `dente-tax-${documentId}.xml`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"XML ФНС не выгружен",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("XML ФНС не выгружен", error));
		}
	}

    async function loadDocumentAuditFacts(documentId: string) {
		setDocumentAuditFactsLoadingId(documentId);
		try {
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/audit-facts`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Паспорт выдачи не загружен"),
				);
				return;
			}
			setDocumentAuditFacts((await response.json()) as DocumentAuditFacts);
			setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Паспорт выдачи не загружен",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("Паспорт выдачи не загружен", error));
		} finally {
			setDocumentAuditFactsLoadingId(null);
		}
	}

    function issuedDocumentHtmlPreviewUrl(documentId: string): string {
		return `/api/documents/${encodeURIComponent(documentId)}/html`;
	}

    function issuedDocumentHtmlDownloadUrl(documentId: string): string {
		return `${issuedDocumentHtmlPreviewUrl(documentId)}?download=1`;
	}

    async function downloadIssuedDocumentHtml(
		documentId: string,
		options: { preserveError?: boolean } = {},
	) {
		try {
			const response = await fetchWithHandling(
				issuedDocumentHtmlDownloadUrl(documentId),
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Архивный HTML не скачан"),
				);
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") ?? "";
			const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
			const fileName =
				quotedFileName?.trim() || `dente-document-${documentId}.html`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			if (!options.preserveError) setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Архивный HTML не скачан",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("Архивный HTML не скачан", error));
		}
	}

    async function openIssuedDocumentHtml(documentId: string) {
		try {
			const previewUrl = issuedDocumentHtmlPreviewUrl(documentId);
			if (clinicalAdminSecretSession.trim()) {
				setError(
					"HTML-предпросмотр в новом окне не может передать секрет администратора клиники. CRM запускает защищенное скачиИвание архивного HTML.",
				);
				await downloadIssuedDocumentHtml(documentId, { preserveError: true });
				return;
			}

			const opened = window.open(previewUrl, "_blank", "noopener,noreferrer");
			if (opened) {
				setError(null);
				return;
			}

			setError(
				'Браузер заблокировал новое окно документа. CRM запускает скачиИвание архивного HTML; если мобильный браузер его отклонит, нажмите "Скачать HTML" в строке документа.',
			);
			await downloadIssuedDocumentHtml(documentId, { preserveError: true });
		} catch (error) {
			showToast(
				actionFailureToast(
					"HTML документа не открыт",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("HTML документа не открыт", error));
		}
	}

    async function downloadIssuedDocumentPdf(documentId: string) {
		try {
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/pdf`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok) {
				setError(await responseErrorMessage(response, "PDF не сформирован"));
				return;
			}

			const blob = await response.blob();
			const disposition = response.headers.get("Content-Disposition") ?? "";
			const quotedFileName = /filename="([^"]+)"/.exec(disposition)?.[1];
			const fileName =
				quotedFileName?.trim() || `dente-document-${documentId}.pdf`;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			setError(null);
		} catch (error) {
			showToast(
				actionFailureToast(
					"PDF не сформирован",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(requestFailureMessage("PDF не сформирован", error));
		}
	}


    return {
        updateDocumentStatus,
        confirmDocumentIssue,
        confirmDocumentVoid,
        downloadTaxDocumentXml,
        loadDocumentAuditFacts,
        downloadIssuedDocumentHtml,
        openIssuedDocumentHtml,
        downloadIssuedDocumentPdf,
        documentIssueConfirmation,
        documentIssueAttestationReady,
        documentVoidConfirmation,
        documentVoidReady
    };
}
