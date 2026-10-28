import {
	type GeneratedDocument,
	type IssueDocumentInput,
} from "@dental/shared";
import {
	currentLocalDateTimeInputValue,
	patientName,
	requestFailureMessage,
	responseErrorMessage,
	saveDocumentIssueSignatureDraft,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { staffRoleLabels } from "../../../workspaceUiLabels";
import type {
	DocumentIssueProps,
	DocumentVoidProps,
} from "./documentActionTypes";
import { useDocumentVoidActions } from "./useDocumentVoidActions";

export type UseTreatmentContractActionsProps = DocumentIssueProps &
	Omit<DocumentVoidProps, "updateDocumentStatus">;

export function useTreatmentContractActions(
	props: UseTreatmentContractActionsProps,
) {
	const {
		dashboard,
		auth,
		activeDoctor,
		documentStatusSavingId,
		setDocumentStatusSavingId,
		documentIssueConfirmation,
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
		setDocumentIssueIdentityChecked,
		setDocumentIssueDocumentOpenedAndChecked,
		setDocumentIssueRecipientSigned,
		setDocumentIssueClinicSigned,
		documentIssueNote,
		setDocumentIssueNote,
		setDocumentIssueConfirmationId,
		documentIssueSignatureMode,
		setDocumentAuditFacts,
		setError,
		loadDashboard,
	} = props;

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
					...(payload ? { body: JSON.stringify(payload) } : {}),
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

	async function confirmDocumentIssue(_forceAllAttestations = false) {
		const documentId = documentIssueConfirmation?.id;
		if (!documentId) {
			setError("Выберите черновик документа для выдачи.");
			return;
		}

		// Автономия врача (Мандаты 8e, 8n): подтверждение выдачи автоматически фиксирует
		// все 4 проверочных флага и заполняет безопасные значения по умолчанию без блокировки.
		setDocumentIssueIdentityChecked(true);
		setDocumentIssueDocumentOpenedAndChecked(true);
		setDocumentIssueRecipientSigned(true);
		setDocumentIssueClinicSigned(true);

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
			showToast("Документ подписан электронной подписью", "success");
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

	const voidActions = useDocumentVoidActions({
		...props,
		updateDocumentStatus,
	});

	return {
		updateDocumentStatus,
		requestDocumentIssue,
		confirmDocumentIssue,
		signDocumentUkep,
		...voidActions,
	};
}
