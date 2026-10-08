import type { VisitDraftAutosaveResponse } from "@dental/shared";
import { useCallback } from "react";
import {
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	visitNoteDraftFromForm,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { visitDraftSignature } from "./helpers";
import type { UseVisitAutosaveParams, UseVisitAutosaveReturn } from "./types";

export function useVisitAutosave({
	auth,
	setError,
	dashboard,
	isOnline,
	transcript,
	selectedSpecialty,
	visitNoteForm,
	hasVisitNoteFormText,
	lastServerDraftSignatureRef,
	setServerDraftSyncState,
	setLastServerDraftSavedAt,
}: UseVisitAutosaveParams): UseVisitAutosaveReturn {
	const loadServerVisitDraft = useCallback(
		async (
			visitId: string | null | undefined,
		): Promise<VisitDraftAutosaveResponse> => {
			if (!visitId) return { serverDraft: null };
			const response = await fetchWithHandling(
				`/api/visits/${visitId}/draft/autosave`,
				{
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Серверный черновик не загружен",
					),
				);
			return (await response.json()) as VisitDraftAutosaveResponse;
		},
		[auth.denteClinicalReadHeaders],
	);

	const syncVisitDraftAutosave = useCallback(
		async (clientSavedAt: string, options: { silent?: boolean } = {}) => {
			if (!dashboard?.activeVisit?.id) return;
			const signature = visitDraftSignature(
				transcript,
				selectedSpecialty,
				visitNoteForm,
			);
			if (lastServerDraftSignatureRef.current === signature) return;
			if (!transcript.trim() && !hasVisitNoteFormText) return;

			if (!isOnline) {
				setServerDraftSyncState("queued");
				return;
			}

			setServerDraftSyncState("saving");
			try {
				const response = await fetchWithHandling(
					`/api/visits/${dashboard?.activeVisit?.id}/draft/autosave`,
					{
						method: "PUT",
						headers: auth.denteClinicalMutationHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							patientId: dashboard?.activeVisit?.patientId,
							selectedSpecialty,
							transcript,
							draft: visitNoteDraftFromForm(visitNoteForm, [
								"Серверный снимок автосохранения. Перед принятием черновика ЭМК врач все равно проверяет текст.",
							]),
							baseRevision: dashboard?.activeVisit?.revision ?? null,
							clientDraftId: `visit-draft-${dashboard?.activeVisit?.id}`,
							clientSavedAt,
						}),
					},
				);
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Серверный черновик не сохранен",
						),
					);
				const result = (await response.json()) as VisitDraftAutosaveResponse;
				lastServerDraftSignatureRef.current = signature;
				setLastServerDraftSavedAt(
					result.serverDraft?.serverSavedAt ?? clientSavedAt,
				);
				setServerDraftSyncState("saved");
			} catch (syncError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Серверный черновик не сохранен",
							(syncError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Серверный черновик не сохранен",
							syncError,
						),
					);
				}
				setServerDraftSyncState("error");
			}
		},
		[
			dashboard?.activeVisit?.patientId,
			transcript,
			dashboard?.activeVisit?.id,
			setError,
			visitNoteForm,
			setServerDraftSyncState,
			hasVisitNoteFormText,
			dashboard?.activeVisit?.revision,
			selectedSpecialty,
			auth.denteClinicalMutationHeaders,
			setLastServerDraftSavedAt,
			isOnline,
			lastServerDraftSignatureRef,
		],
	);

	return {
		visitDraftSignature,
		loadServerVisitDraft,
		syncVisitDraftAutosave,
	};
}
