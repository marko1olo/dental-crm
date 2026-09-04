/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Solo Visit Save & Autosave Hook (useVisitSave)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Автономия врача:
 * 1. Никаких проверок медсестры, ассистента или лотка при сохранении черновика.
 * 2. Debounced autosave (300-500мс) предотвращает потерю данных при наборе.
 * 3. Автоматический сброс (flush) при смене вкладок (visibilitychange) и закрытии (beforeunload).
 * 4. Оффлайн-очередь (IndexedDB queuePendingVisitSave) при сетевых сбоях — 0% потери текста.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	DentalSpecialty,
	VisitDraftAutosave,
	VisitDraftAutosaveResponse,
} from "@dental/shared";
import {
	queuePendingVisitSave,
	visitNoteDraftFromForm,
	type VisitNoteForm,
} from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { useAppStore } from "../../store/appStore";
import { fetchWithHandling } from "../../utils/networkUtils";
import { logger } from "../../utils/logger";

export type SaveSyncState = "idle" | "saving" | "saved" | "queued" | "error";

export interface UseVisitSaveOptions {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	organizationId?: string | null | undefined;
	visitNoteForm?: VisitNoteForm | undefined;
	transcript?: string | undefined;
	isLocked?: boolean | undefined;
	debounceMs?: number | undefined;
	onSaveSuccess?: ((savedDraft?: VisitDraftAutosave | null) => void) | undefined;
	onSaveError?: ((error: unknown) => void) | undefined;
	silent?: boolean | undefined;
}

export interface UseVisitSaveReturn {
	saveState: SaveSyncState;
	lastSavedAt: Date | null;
	hasUnsavedChanges: boolean;
	triggerSave: (options?: { silent?: boolean; force?: boolean }) => Promise<{ success: boolean; error?: string }>;
	flushPendingSave: () => Promise<void>;
	isSaving: boolean;
}

export function useVisitSave(options: UseVisitSaveOptions): UseVisitSaveReturn {
	const {
		visitId,
		patientId,
		organizationId,
		visitNoteForm,
		transcript = "",
		isLocked = false,
		debounceMs = 400,
		onSaveSuccess,
		onSaveError,
		silent = false,
	} = options;

	const [saveState, setSaveState] = useState<SaveSyncState>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedSignatureRef = useRef<string>("");
	const isMountedRef = useRef<boolean>(true);
	const currentFormRef = useRef<VisitNoteForm | undefined>(visitNoteForm);
	const currentTranscriptRef = useRef<string>(transcript);

	currentFormRef.current = visitNoteForm;
	currentTranscriptRef.current = transcript;

	const setServerDraftSyncState = useVisitStore((s) => s.setServerDraftSyncState);
	const setLastServerDraftSavedAt = useVisitStore((s) => s.setLastServerDraftSavedAt);
	const selectedSpecialty = useVisitStore((s) => s.selectedSpecialty);
	const activeVisit = useAppStore((s) => s.dashboard?.activeVisit);

	const computeSignature = useCallback((form?: VisitNoteForm, tr?: string): string => {
		if (!form && !tr) return "";
		return JSON.stringify({
			complaint: form?.complaint || "",
			anamnesis: form?.anamnesis || "",
			objectiveStatus: form?.objectiveStatus || "",
			diagnosis: form?.diagnosis || "",
			treatmentPlan: form?.treatmentPlan || "",
			transcript: tr || "",
		});
	}, []);

	const executeSave = useCallback(
		async (opts?: { silent?: boolean; force?: boolean }): Promise<{ success: boolean; error?: string }> => {
			const form = currentFormRef.current;
			const tr = currentTranscriptRef.current;
			if (isLocked) {
				return { success: true };
			}

			const signature = computeSignature(form, tr);
			if (!opts?.force && signature === lastSavedSignatureRef.current) {
				return { success: true };
			}

			const effectiveVisitId = visitId || activeVisit?.id;
			const effectivePatientId = patientId || activeVisit?.patientId;
			const effectiveOrgId = organizationId || activeVisit?.organizationId;

			if (!effectiveVisitId || effectiveVisitId === "no-active-visit") {
				return { success: true };
			}

			const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
			const clientSavedAt = new Date().toISOString();

			const draftPayload = form
				? visitNoteDraftFromForm(form, [
						"Автосохранение врача solo. Протокол 043/у зафиксирован.",
					])
				: null;

			setSaveState("saving");
			setServerDraftSyncState("saving");

			if (!isOnline) {
				try {
					if (draftPayload) {
						await queuePendingVisitSave(
							{
								visitId: effectiveVisitId,
								clientMutationId: `save-${Date.now()}`,
								baseRevision: activeVisit?.revision ?? null,
								draft: draftPayload,
								doctorSummary: null,
								transcript: tr,
								selectedSpecialty: (selectedSpecialty as DentalSpecialty) || "universal",
							},
							effectiveOrgId,
						);
					}
					lastSavedSignatureRef.current = signature;
					setSaveState("queued");
					setServerDraftSyncState("queued");
					setHasUnsavedChanges(false);
					return { success: true };
				} catch (queueErr) {
					logger.error("[useVisitSave] Ошибка оффлайн-сохранения:", queueErr);
					setSaveState("error");
					setServerDraftSyncState("error");
					return { success: false, error: "Не удалось сохранить локально" };
				}
			}

			try {
				const response = await fetchWithHandling(
					`/api/visits/${effectiveVisitId}/draft/autosave`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							patientId: effectivePatientId,
							selectedSpecialty,
							transcript: tr,
							draft: draftPayload,
							baseRevision: activeVisit?.revision ?? null,
							clientDraftId: `visit-draft-${effectiveVisitId}`,
							clientSavedAt,
						}),
					},
				);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}

				const result = (await response.json()) as VisitDraftAutosaveResponse;
				const savedAtIso = result.serverDraft?.serverSavedAt ?? clientSavedAt;
				const savedAtDate = new Date(savedAtIso);

				lastSavedSignatureRef.current = signature;
				if (isMountedRef.current) {
					setSaveState("saved");
					setLastSavedAt(savedAtDate);
					setHasUnsavedChanges(false);
				}
				setServerDraftSyncState("saved");
				setLastServerDraftSavedAt(savedAtIso);

				onSaveSuccess?.(result.serverDraft);

				return { success: true };
			} catch (syncError) {
				logger.warn("[useVisitSave] Ошибка сервера, сохраняем в локальную очередь:", syncError);
				try {
					if (draftPayload) {
						await queuePendingVisitSave(
							{
								visitId: effectiveVisitId,
								clientMutationId: `save-${Date.now()}`,
								baseRevision: activeVisit?.revision ?? null,
								draft: draftPayload,
								doctorSummary: null,
								transcript: tr,
								selectedSpecialty: (selectedSpecialty as DentalSpecialty) || "universal",
							},
							effectiveOrgId,
						);
					}
					lastSavedSignatureRef.current = signature;
					if (isMountedRef.current) {
						setSaveState("queued");
						setHasUnsavedChanges(false);
					}
					setServerDraftSyncState("queued");
					return { success: true };
				} catch (queueErr) {
					logger.error("[useVisitSave] Критическая ошибка очереди:", queueErr);
					if (isMountedRef.current) {
						setSaveState("error");
					}
					setServerDraftSyncState("error");
					onSaveError?.(syncError);
					if (!opts?.silent && !silent) {
						showToast("Не удалось сохранить черновик визита. Проверьте соединение.", "error", 4000);
					}
					return { success: false, error: "Ошибка сохранения" };
				}
			}
		},
		[
			isLocked,
			computeSignature,
			visitId,
			activeVisit,
			patientId,
			organizationId,
			selectedSpecialty,
			setServerDraftSyncState,
			setLastServerDraftSavedAt,
			onSaveSuccess,
			onSaveError,
			silent,
		],
	);

	// Debounced change listener
	useEffect(() => {
		if (isLocked) return;
		const signature = computeSignature(visitNoteForm, transcript);
		if (!signature) return;

		if (signature !== lastSavedSignatureRef.current) {
			setHasUnsavedChanges(true);

			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			debounceTimerRef.current = setTimeout(() => {
				void executeSave({ silent: true });
			}, debounceMs);
		}

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [visitNoteForm, transcript, debounceMs, isLocked, computeSignature, executeSave]);

	// Auto-flush on tab switch / window unload to guarantee 0 data loss
	useEffect(() => {
		isMountedRef.current = true;

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				void executeSave({ silent: true });
			}
		};

		const handleBeforeUnload = () => {
			void executeSave({ silent: true });
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			isMountedRef.current = false;
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("beforeunload", handleBeforeUnload);
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [executeSave]);

	const flushPendingSave = useCallback(async () => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		await executeSave({ silent: true, force: true });
	}, [executeSave]);

	return {
		saveState,
		lastSavedAt,
		hasUnsavedChanges,
		triggerSave: executeSave,
		flushPendingSave,
		isSaving: saveState === "saving",
	};
}
