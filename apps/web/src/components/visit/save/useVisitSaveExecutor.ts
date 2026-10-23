import { useCallback, type MutableRefObject } from "react";
import type { DentalSpecialty, VisitDraftAutosave, VisitDraftAutosaveResponse } from "@dental/shared";
import type { VisitNoteForm } from "../../../AppHelpers";
import { denteAdminSecretRequestHeaders, queuePendingVisitSave, visitNoteDraftFromForm } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import { broadcastClinicalEntityChange } from "../../../services/storage";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { logger } from "../../../utils/logger";
import type { SaveSyncState } from "./visitSaveTypes.js";

interface UseVisitSaveExecutorParams {
	canSave: boolean;
	computeSignature: (form?: VisitNoteForm, tr?: string) => string;
	lastSavedSignatureRef: MutableRefObject<string>;
	currentFormRef: MutableRefObject<VisitNoteForm>;
	currentTranscriptRef: MutableRefObject<string>;
	isMountedRef: MutableRefObject<boolean>;
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	organizationId?: string | null | undefined;
	activeVisit?: { id: string; patientId?: string; organizationId?: string; revision?: number | null } | null;
	selectedSpecialty?: DentalSpecialty | string | null | undefined;
	silent?: boolean | undefined;
	setSaveState: (state: SaveSyncState) => void;
	setLastSavedAt: (d: Date | null) => void;
	setHasUnsavedChanges: (val: boolean) => void;
	setServerDraftSyncState: (state: SaveSyncState) => void;
	setLastServerDraftSavedAt: (iso: string) => void;
	onSaveSuccess?: ((savedDraft?: VisitDraftAutosave | null) => void) | undefined;
	onSaveError?: ((error: unknown) => void) | undefined;
}

export function useVisitSaveExecutor(params: UseVisitSaveExecutorParams) {
	const {
		canSave, computeSignature, lastSavedSignatureRef, currentFormRef, currentTranscriptRef,
		isMountedRef, visitId, patientId, organizationId, activeVisit, selectedSpecialty,
		silent, setSaveState, setLastSavedAt, setHasUnsavedChanges, setServerDraftSyncState,
		setLastServerDraftSavedAt, onSaveSuccess, onSaveError,
	} = params;

	return useCallback(
		async (opts?: { silent?: boolean; force?: boolean }): Promise<{ success: boolean; error?: string }> => {
			const form = currentFormRef.current;
			const tr = currentTranscriptRef.current;
			if (!canSave) return { success: true };

			const signature = computeSignature(form, tr);
			if (!opts?.force && signature === lastSavedSignatureRef.current) return { success: true };

			const effectiveVisitId = visitId || activeVisit?.id;
			const effectivePatientId = patientId || activeVisit?.patientId;
			const effectiveOrgId = organizationId || activeVisit?.organizationId;
			if (!effectiveVisitId || effectiveVisitId === "no-active-visit") return { success: true };

			const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
			const clientSavedAt = new Date().toISOString();
			const draftPayload = form ? visitNoteDraftFromForm(form, ["Автосохранение врача solo. Дневник приёма зафиксирован."]) : null;

			setSaveState("saving");
			setServerDraftSyncState("saving");

			const queueSave = async () => {
				if (draftPayload) {
					await queuePendingVisitSave({
						visitId: effectiveVisitId, clientMutationId: `save-${Date.now()}`,
						baseRevision: activeVisit?.revision ?? null, draft: draftPayload,
						doctorSummary: null, transcript: tr,
						selectedSpecialty: (selectedSpecialty as DentalSpecialty) || "universal",
					}, effectiveOrgId);
				}
				lastSavedSignatureRef.current = signature;
				setSaveState("queued");
				setServerDraftSyncState("queued");
				if (isMountedRef.current) setHasUnsavedChanges(computeSignature(currentFormRef.current, currentTranscriptRef.current) !== signature);
			};

			if (!isOnline) {
				try { await queueSave(); return { success: true }; }
				catch (e) { setSaveState("error"); setServerDraftSyncState("error"); return { success: false, error: "Не удалось сохранить локально" }; }
			}

			try {
				const response = await fetchWithHandling(`/api/visits/${effectiveVisitId}/draft/autosave`, {
					method: "PUT", headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({ patientId: effectivePatientId, selectedSpecialty, transcript: tr, draft: draftPayload, baseRevision: activeVisit?.revision ?? null, clientDraftId: `visit-draft-${effectiveVisitId}`, clientSavedAt }),
				});
				if (!response.ok) throw new Error(`HTTP ${response.status}`);

				const result = (await response.json()) as VisitDraftAutosaveResponse;
				const savedAtIso = result.serverDraft?.serverSavedAt ?? clientSavedAt;
				lastSavedSignatureRef.current = signature;
				if (isMountedRef.current) {
					setSaveState("saved"); setLastSavedAt(new Date(savedAtIso));
					setHasUnsavedChanges(computeSignature(currentFormRef.current, currentTranscriptRef.current) !== signature);
				}
				setServerDraftSyncState("saved"); setLastServerDraftSavedAt(savedAtIso);
				onSaveSuccess?.(result.serverDraft);
				try { broadcastClinicalEntityChange({ entityType: "visit_draft", entityId: effectiveVisitId, patientId: effectivePatientId || undefined, updatedAt: savedAtIso }); } catch {}
				return { success: true };
			} catch (syncError) {
				try { await queueSave(); return { success: true }; }
				catch (queueErr) {
					if (isMountedRef.current) setSaveState("error");
					setServerDraftSyncState("error"); onSaveError?.(syncError);
					if (!opts?.silent && !silent) showToast("Не удалось сохранить черновик визита. Проверьте соединение.", "error", 4000);
					return { success: false, error: "Ошибка сохранения" };
				}
			}
		},
		[canSave, computeSignature, visitId, activeVisit, patientId, organizationId, selectedSpecialty, setSaveState, setLastSavedAt, setHasUnsavedChanges, setServerDraftSyncState, setLastServerDraftSavedAt, onSaveSuccess, onSaveError, silent, currentFormRef, currentTranscriptRef, lastSavedSignatureRef, isMountedRef],
	);
}
