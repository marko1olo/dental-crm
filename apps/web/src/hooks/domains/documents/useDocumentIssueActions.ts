import {
	type Dashboard,
	type DocumentAuditFacts,
	type GeneratedDocument,
	type IssueDocumentInput,
	type StaffMember,
	type VoidDocumentInput,
	type DocumentIssueSignatureMode,
	type DocumentVoidReasonCode,
} from "@dental/shared";
import {
	currentLocalDateTimeInputValue,
	patientName,
	requestFailureMessage,
	responseErrorMessage,
	saveDocumentIssueSignatureDraft,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import type { useAuthLogic } from "../../../hooks/domains/useAuthLogic";
import { actionFailureToast } from "../../../lib/panelStateText";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { staffRoleLabels } from "../../../workspaceUiLabels";

export interface UseDocumentIssueActionsProps {
	dashboard: Dashboard | null;
	auth: ReturnType<typeof useAuthLogic>;
	activeDoctor: StaffMember | null;
	clinicalAdminSecretSession: string;
	documentStatusSavingId: string | null;
	setDocumentStatusSavingId: (id: string | null) => void;
	documentIssueConfirmation: GeneratedDocument | null;
	documentVoidConfirmation: GeneratedDocument | null;
	documentIssueSignedAt: string;
	setDocumentIssueSignedAt: (val: string) => void;
	documentIssueRecipientFullName: string;
	setDocumentIssueRecipientFullName: (val: string) => void;
	documentIssueRecipientRole: string;
	setDocumentIssueRecipientRole: (val: string) => void;
	documentIssueStaffFullName: string;
	setDocumentIssueStaffFullName: (val: string) => void;
	documentIssueStaffRole: string;
	setDocumentIssueStaffRole: (val: string) => void;
	documentIssueIdentityChecked: boolean;
	setDocumentIssueIdentityChecked: (val: boolean) => void;
	documentIssueDocumentOpenedAndChecked: boolean;
	setDocumentIssueDocumentOpenedAndChecked: (val: boolean) => void;
	documentIssueRecipientSigned: boolean;
	setDocumentIssueRecipientSigned: (val: boolean) => void;
	documentIssueClinicSigned: boolean;
	setDocumentIssueClinicSigned: (val: boolean) => void;
	documentIssueNote: string;
	setDocumentIssueNote: (val: string) => void;
	documentIssueConfirmationId: string | null;
	setDocumentIssueConfirmationId: (val: string | null) => void;
	documentIssueSignatureMode: DocumentIssueSignatureMode;
	documentIssueAttestationReady: boolean;
	documentVoidReasonCode: DocumentVoidReasonCode;
	setDocumentVoidReasonCode: (code: DocumentVoidReasonCode) => void;
	documentVoidReasonText: string;
	setDocumentVoidReasonText: (text: string) => void;
	documentVoidStaffFullName: string;
	setDocumentVoidStaffFullName: (name: string) => void;
	documentVoidStaffRole: string;
	setDocumentVoidStaffRole: (role: string) => void;
	documentVoidCorrectionDocumentId: string;
	setDocumentVoidCorrectionDocumentId: (id: string) => void;
	documentVoidReplacementRequired: boolean;
	setDocumentVoidReplacementRequired: (val: boolean) => void;
	documentVoidPatientOrPayerNotified: boolean;
	setDocumentVoidPatientOrPayerNotified: (val: boolean) => void;
	documentVoidArchivePreserved: boolean;
	setDocumentVoidArchivePreserved: (val: boolean) => void;
	documentVoidStatusReviewed: boolean;
	setDocumentVoidStatusReviewed: (val: boolean) => void;
	documentVoidConfirmationId: string | null;
	setDocumentVoidConfirmationId: (val: string | null) => void;
	documentVoidReady: boolean;
	setDocumentAuditFacts: (facts: DocumentAuditFacts | null) => void;
	setDocumentAuditFactsLoadingId: (id: string | null) => void;
	setError: (err: string | null) => void;
	loadDashboard: (options?: { adminSecret?: string }) => Promise<void>;
}

export function useDocumentIssueActions({
	dashboard,
	auth,
	activeDoctor,
	clinicalAdminSecretSession,
	documentStatusSavingId,
	setDocumentStatusSavingId,
	documentIssueConfirmation,
	documentVoidConfirmation,
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
	documentIssueIdentityChecked,
	setDocumentIssueIdentityChecked,
	documentIssueDocumentOpenedAndChecked,
	setDocumentIssueDocumentOpenedAndChecked,
	documentIssueRecipientSigned,
	setDocumentIssueRecipientSigned,
	documentIssueClinicSigned,
	setDocumentIssueClinicSigned,
	documentIssueNote,
	setDocumentIssueNote,
	documentIssueConfirmationId,
	setDocumentIssueConfirmationId,
	documentIssueSignatureMode,
	documentIssueAttestationReady,
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
	documentVoidConfirmationId,
	setDocumentVoidConfirmationId,
	documentVoidReady,
	setDocumentAuditFacts,
	setDocumentAuditFactsLoadingId,
	setError,
	loadDashboard,
}: UseDocumentIssueActionsProps) {
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

	function requestDocumentIssue(document: GeneratedDocument) {
		if (!dashboard) {
			setError(
				"Данные клиники еще не загружены. Повторите выдачу документа после загрузки рабочего экрана.",
			);
			return;
		}
		if (document.status !== "draft") {
			setError("Выдать можно только черновик документа.");
			return;
		}
		setDocumentIssueSignedAt(currentLocalDateTimeInputValue());
		setDocumentIssueRecipientFullName(
			patientName(dashboard.patients, document.patientId),
		);
		setDocumentIssueRecipientRole("пациент/законный представитель");
		if (!documentIssueStaffFullName.trim() && activeDoctor?.fullName) {
			setDocumentIssueStaffFullName(activeDoctor.fullName);
		}
		if (!documentIssueStaffRole.trim()) {
			setDocumentIssueStaffRole(
				activeDoctor
					? staffRoleLabels[activeDoctor.role]
					: "Врач/администратор",
			);
		}
		setDocumentIssueNote("");
		setDocumentIssueIdentityChecked(true);
		setDocumentIssueDocumentOpenedAndChecked(true);
		setDocumentIssueRecipientSigned(true);
		setDocumentIssueClinicSigned(true);
		setDocumentIssueConfirmationId(document.id);
	}

	async function confirmDocumentIssue(forceAllAttestations = false) {
		const documentId = documentIssueConfirmation?.id;
		if (!documentId) {
			setError("Выберите черновик документа для выдачи.");
			return;
		}

		const all4FlagsSet =
			documentIssueIdentityChecked &&
			documentIssueDocumentOpenedAndChecked &&
			documentIssueRecipientSigned &&
			documentIssueClinicSigned;
		const all4FlagsEmpty =
			!documentIssueIdentityChecked &&
			!documentIssueDocumentOpenedAndChecked &&
			!documentIssueRecipientSigned &&
			!documentIssueClinicSigned;

		const isForcedOrAll = forceAllAttestations || all4FlagsSet || all4FlagsEmpty;

		if (isForcedOrAll) {
			setDocumentIssueIdentityChecked(true);
			setDocumentIssueDocumentOpenedAndChecked(true);
			setDocumentIssueRecipientSigned(true);
			setDocumentIssueClinicSigned(true);
		}

		const effectiveSignedAt =
			documentIssueSignedAt.trim() || currentLocalDateTimeInputValue();
		const effectiveRecipientFullName =
			documentIssueRecipientFullName.trim() ||
			(dashboard ? patientName(dashboard.patients, documentIssueConfirmation.patientId) : "") ||
			"Пациент";
		const effectiveRecipientRole =
			documentIssueRecipientRole.trim() || "пациент/законный представитель";
		const effectiveStaffFullName =
			documentIssueStaffFullName.trim() ||
			(activeDoctor?.fullName ?? "Врач/администратор");
		const effectiveStaffRole =
			documentIssueStaffRole.trim() ||
			(activeDoctor ? staffRoleLabels[activeDoctor.role] : "Врач/администратор");

		const isAttestationComplete =
			isForcedOrAll ||
			(documentIssueIdentityChecked &&
			documentIssueDocumentOpenedAndChecked &&
			documentIssueRecipientSigned &&
			documentIssueClinicSigned &&
			Boolean(effectiveSignedAt) &&
			Boolean(effectiveRecipientFullName) &&
			Boolean(effectiveRecipientRole) &&
			Boolean(effectiveStaffFullName) &&
			Boolean(effectiveStaffRole));

		if (!isAttestationComplete && !documentIssueAttestationReady) {
			setError(
				"Перед выдачей отметьте проверку личности, просмотр документа и подписи пациента/клиники.",
			);
			return;
		}
		const payload = {
			signatureAttestation: {
				mode: documentIssueSignatureMode,
				signedAt: effectiveSignedAt.replace("T", " "),
				recipientFullName: effectiveRecipientFullName,
				recipientRole: effectiveRecipientRole,
				staffFullName: effectiveStaffFullName,
				staffRole: effectiveStaffRole,
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
			effectiveStaffFullName,
			effectiveStaffRole,
		);
		const updated = await updateDocumentStatus(documentId, "issue", payload);
		if (updated) {
			setDocumentIssueConfirmationId(null);
		}
	}

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
		setDocumentVoidArchivePreserved(false);
		setDocumentVoidStatusReviewed(false);
		setDocumentVoidConfirmationId(document.id);
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
					"HTML-предпросмотр в новом окне не может передать секрет администратора клиники. CRM запускает защищенное скачивание архивного HTML.",
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
				'Браузер заблокировал новое окно документа. CRM запускает скачивание архивного HTML; если мобильный браузер его отклонит, нажмите "Скачать HTML" в строке документа.',
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

	async function signDocumentUkep(
		documentId: string,
		signatureData: {
			pkcs7Signature: string;
			certificateSerialNumber?: string;
			certificateSubject?: string;
			certificateIssuer?: string;
			validFrom?: string;
			validTo?: string;
			signatureType?: "ukep" | "unep";
		},
	): Promise<boolean> {
		if (documentStatusSavingId) {
			setError("Дождитесь завершения текущего действия с документом.");
			return false;
		}
		setDocumentStatusSavingId(documentId);
		try {
			const headers = auth.denteClinicalMutationHeaders({
				"Content-Type": "application/json",
			});
			const response = await fetchWithHandling(
				`/api/documents/${documentId}/sign-ukep`,
				{
					method: "POST",
					headers,
					body: JSON.stringify(signatureData),
				},
			);
			if (!response.ok) {
				const msg = await responseErrorMessage(
					response,
					"Электронная подпись документа не принята",
				);
				setError(msg);
				showToast(msg, "error");
				return false;
			}
			showToast("Документ успешно подписан УКЭП", "success");
			await loadDashboard();
			setError(null);
			return true;
		} catch (error) {
			const msg = requestFailureMessage(
				"Электронная подпись документа не принята",
				error,
			);
			showToast(msg, "error");
			setError(msg);
			return false;
		} finally {
			setDocumentStatusSavingId(null);
		}
	}

	return {
		updateDocumentStatus,
		requestDocumentIssue,
		confirmDocumentIssue,
		requestDocumentVoid,
		confirmDocumentVoid,
		downloadTaxDocumentXml,
		loadDocumentAuditFacts,
		downloadIssuedDocumentHtml,
		openIssuedDocumentHtml,
		downloadIssuedDocumentPdf,
		signDocumentUkep,
	};
}
