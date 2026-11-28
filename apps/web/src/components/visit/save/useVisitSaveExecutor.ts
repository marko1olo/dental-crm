import { useCallback, type MutableRefObject } from "react";
import type { DentalSpecialty, VisitDraftAutosave, VisitDraftAutosaveResponse } from "@dental/shared";
import type { VisitNoteForm } from "../../../AppHelpers";
import { queuePendingVisitSave, visitNoteDraftFromForm } from "../../../AppHelpers";
import { enqueueOfflineMutation } from "../../../services/offline/offlineStorage";
import { mergeClinical043DiariesNonDestructive } from "../../../services/sync/conflictResolver";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { broadcastClinicalEntityChange } from "../../../services/storage";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { logger } from "../../../utils/logger";
import type { SaveSyncState } from "./visitSaveTypes.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
	activeVisit?: { id?: string; patientId?: string; organizationId?: string; revision?: number | null; [key: string]: unknown } | null | undefined;
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
		async (opts?: { silent?: boolean; force?: boolean }): Promise<{ success: boolean; error?: string; reason?: string }> => {
			const form = currentFormRef.current;
			const tr = currentTranscriptRef.current;
			if (!canSave) return { success: false, reason: "locked", error: "Сохранение заблокировано" };

			const signature = computeSignature(form, tr);
			if (!opts?.force && signature === lastSavedSignatureRef.current) return { success: true };

			const effectiveVisitId = visitId || activeVisit?.id;
			const effectivePatientId = patientId || activeVisit?.patientId;
			const effectiveOrgId = organizationId || activeVisit?.organizationId;
			if (!effectiveVisitId || effectiveVisitId === "no-active-visit") return { success: true };

			const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
			const hasValidVisitUuid = typeof effectiveVisitId === "string" && UUID_PATTERN.test(effectiveVisitId.trim());
			const hasValidPatientUuid = typeof effectivePatientId === "string" && UUID_PATTERN.test(effectivePatientId.trim());
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

					// Канонический Outbox для syncGateway и CRDT 3-Way merge
					await enqueueOfflineMutation({
						entityType: "visit_diary",
						entityId: effectiveVisitId,
						action: "update",
						payload: {
							visitId: effectiveVisitId,
							patientId: effectivePatientId,
							draft: draftPayload,
							transcript: tr,
							baseRevision: activeVisit?.revision ?? null,
							selectedSpecialty: (selectedSpecialty as DentalSpecialty) || "universal",
							updatedAt: clientSavedAt,
						},
						organizationId: effectiveOrgId || undefined,
					});
				}
				lastSavedSignatureRef.current = signature;
				setSaveState("queued");
				setServerDraftSyncState("queued");
				if (isMountedRef.current) setHasUnsavedChanges(computeSignature(currentFormRef.current, currentTranscriptRef.current) !== signature);
			};

			if (!isOnline || !hasValidPatientUuid || !hasValidVisitUuid) {
				try { await queueSave(); return { success: true }; }
				catch (e) { setSaveState("error"); setServerDraftSyncState("error"); return { success: false, error: "Не удалось сохранить локально" }; }
			}

			try {
				const idempotencyKey =
					typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
						? crypto.randomUUID()
						: `draft-save-${effectiveVisitId}-${Date.now()}`;
				const response = await fetchWithHandling(`/api/visits/${effectiveVisitId}/draft/autosave`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
						...getDenteAuthHeaders(),
					},
					body: JSON.stringify({
						patientId: effectivePatientId,
						selectedSpecialty: (selectedSpecialty as DentalSpecialty) || "universal",
						transcript: tr,
						draft: draftPayload,
						baseRevision: activeVisit?.revision ?? null,
						clientDraftId: `visit-draft-${effectiveVisitId}`,
						clientSavedAt,
					}),
				});

				if (response.status === 409) {
					let conflictJson: {
						conflict?: boolean;
						serverDraft?: VisitDraftAutosave;
						message?: string;
					} | null = null;
					try {
						conflictJson = (await response.json()) as typeof conflictJson;
					} catch (parseErr) {
						logger.warn("[useVisitSaveExecutor] Failed to parse 409 conflict JSON:", parseErr);
					}

					if (conflictJson?.serverDraft?.draft && draftPayload) {
						const serverDraft = conflictJson.serverDraft.draft;
						// CRDT 3-Way Merge: объединяем локальный дневник врача и серверную версию без потери данных
						const mergedDiary = mergeClinical043DiariesNonDestructive(
							{
								complaints: draftPayload.complaint ?? "",
								anamnesis: draftPayload.anamnesis ?? "",
								objective: draftPayload.objectiveStatus ?? "",
								diagnosis: draftPayload.diagnosis ?? "",
								treatment: draftPayload.treatmentPlan ?? "",
								authorName: "Врач (локально)",
							},
							{
								complaints: serverDraft.complaint ?? "",
								anamnesis: serverDraft.anamnesis ?? "",
								objective: serverDraft.objectiveStatus ?? "",
								diagnosis: serverDraft.diagnosis ?? "",
								treatment: serverDraft.treatmentPlan ?? "",
								authorName: "Сервер",
							},
						);

						currentFormRef.current = {
							...currentFormRef.current,
							complaint: String(mergedDiary.complaints || currentFormRef.current.complaint || ""),
							anamnesis: String(mergedDiary.anamnesis || currentFormRef.current.anamnesis || ""),
							objectiveStatus: String(mergedDiary.objective || currentFormRef.current.objectiveStatus || ""),
							diagnosis: String(mergedDiary.diagnosis || currentFormRef.current.diagnosis || ""),
							treatmentPlan: String(mergedDiary.treatment || currentFormRef.current.treatmentPlan || ""),
						};

						showToast("Черновик объединён с серверной версией (3-Way Merge)", "info", 3500);
						return { success: true };
					}
				}

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
				try {
					broadcastClinicalEntityChange({
						entityType: "visit_draft",
						entityId: effectiveVisitId,
						patientId: effectivePatientId || undefined,
						updatedAt: savedAtIso,
					});
				} catch (broadcastErr) {
					logger.warn("[useVisitSaveExecutor] Failed to broadcast clinical entity change:", broadcastErr);
				}
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
