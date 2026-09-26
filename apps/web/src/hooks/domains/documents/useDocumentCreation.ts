import {
	type Dashboard,
	type DocumentKind,
	type GeneratedDocument,
	type Patient,
	type StaffMember,
} from "@dental/shared";
import { patientName, requestFailureMessage, responseErrorMessage } from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import {
	documentPayloadForKind,
	withDocumentCreationTimestamps,
} from "../../../documentLogic";
import { validateDocumentPayloadForKind } from "../../../documentValidators";
import type { useAuthLogic } from "../../../hooks/domains/useAuthLogic";
import { actionFailureToast } from "../../../lib/panelStateText";
import { type DocumentPackageId } from "../../../utils/documentPackages";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { documentLabels } from "../../../workspaceUiLabels";

export interface UseDocumentCreationProps {
	dashboard: Dashboard | null;
	auth: ReturnType<typeof useAuthLogic>;
	activeDoctor: StaffMember | null;
	documentPatient: Patient | null;
	documentPatientMatchesActiveVisit: boolean;
	documentState: any;
	documentCreateSavingKind: DocumentKind | null;
	setDocumentCreateSavingKind: (kind: DocumentKind | null) => void;
	setError: (err: string | null) => void;
	loadDashboard: (options?: { adminSecret?: string }) => Promise<void>;
}

export function useDocumentCreation({
	dashboard,
	auth,
	activeDoctor,
	documentPatient,
	documentPatientMatchesActiveVisit,
	documentState,
	documentCreateSavingKind,
	setDocumentCreateSavingKind,
	setError,
	loadDashboard,
}: UseDocumentCreationProps) {
	function applyQuickDocumentPackage(packageId: DocumentPackageId) {
		const patientNameStr =
			dashboard && documentPatient
				? patientName(dashboard.patients, documentPatient.id)
				: "";
		documentState.applyDocumentPackage(packageId, {
			doctorFullName: activeDoctor?.fullName || "",
			patientFullName: patientNameStr,
			taxYear: documentState.taxDocumentYear,
		});
	}

	async function createDocument(
		kindOrInput:
			| DocumentKind
			| { kind: DocumentKind; payload?: any; visitId?: string | null },
	): Promise<GeneratedDocument | null> {
		if (!documentPatient) {
			const msg = "Выберите пациента для создания документа.";
			setError(msg);
			showToast(msg, "error");
			return null;
		}

		const kind: DocumentKind =
			typeof kindOrInput === "string" ? kindOrInput : kindOrInput.kind;

		if (documentCreateSavingKind) {
			setError("Дождитесь завершения создания текущего документа.");
			return null;
		}

		setDocumentCreateSavingKind(kind);
		try {
			// Подставляем временные метки создания документа
			const preparedState = withDocumentCreationTimestamps(documentState);

			let payload =
				typeof kindOrInput === "object" && kindOrInput.payload
					? kindOrInput.payload
					: null;
			if (!payload) {
				payload = documentPayloadForKind(kind, preparedState);
			}

			// Валидация специфичных полей документа
			const validation = validateDocumentPayloadForKind(kind, payload);
			if (!validation.valid) {
				const errorMsg =
					validation.error || "Ошибка заполнения обязательных полей документа.";
				setError(errorMsg);
				showToast(errorMsg, "error");
				return null;
			}

			const visitId =
				typeof kindOrInput === "object" && kindOrInput.visitId !== undefined
					? kindOrInput.visitId
					: documentPatientMatchesActiveVisit
						? dashboard?.activeVisit?.id ?? null
						: null;

			const headers = auth.denteClinicalMutationHeaders({
				"Content-Type": "application/json",
			});

			const response = await fetchWithHandling("/api/documents", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: documentPatient.id,
					kind,
					payload,
					visitId,
				}),
			});

			if (!response.ok) {
				const errorMsg = await responseErrorMessage(
					response,
					"Ошибка при создании документа",
				);
				setError(errorMsg);
				showToast(errorMsg, "error");
				return null;
			}

			const created = (await response.json()) as GeneratedDocument;
			showToast(
				`Документ «${documentLabels[kind] || kind}» успешно создан`,
				"success",
			);
			setError(null);

			try {
				await loadDashboard();
			} catch (reloadErr) {
				showToast(
					actionFailureToast(
						"Документ создан, но список не обновился",
						(reloadErr as { status?: number })?.status ?? null,
					),
					"error",
				);
			}

			return created;
		} catch (error) {
			const errorMsg = requestFailureMessage(
				"Не удалось создать документ",
				error,
			);
			showToast(errorMsg, "error");
			setError(errorMsg);
			return null;
		} finally {
			setDocumentCreateSavingKind(null);
		}
	}

	return {
		applyQuickDocumentPackage,
		createDocument,
	};
}
