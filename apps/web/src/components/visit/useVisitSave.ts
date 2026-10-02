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
	denteAdminSecretRequestHeaders,
	queuePendingVisitSave,
	visitNoteDraftFromForm,
	type VisitNoteForm,
} from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { useAppStore } from "../../store/appStore";
import { fetchWithHandling } from "../../utils/networkUtils";
import { logger } from "../../utils/logger";
import { getOptimizedTiming } from "../../utils/lowSpecHddOptimizer";
import {
	saveVisitDraftDebounced,
	saveVisitDraft,
	loadVisitDraftSync,
	loadVisitDraft,
	flushPendingOfflineDrafts,
} from "../../services/offline/offlineStorage";
import { flushPendingStorageWrites } from "../../lib/safeLocalStorage";
import { broadcastClinicalEntityChange } from "../../services/storage";

export type SaveSyncState = "idle" | "saving" | "saved" | "queued" | "error";

export interface UseVisitSaveOptions {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	organizationId?: string | null | undefined;
	visitNoteForm?: VisitNoteForm | undefined;
	transcript?: string | undefined;
	isLocked?: boolean | undefined;
	allowLockedRevision?: boolean | undefined;
	isRevising?: boolean | undefined;
	debounceMs?: number | undefined;
	onSaveSuccess?: ((savedDraft?: VisitDraftAutosave | null) => void) | undefined;
	onSaveError?: ((error: unknown) => void) | undefined;
	silent?: boolean | undefined;
	selectedSpecialty?: DentalSpecialty | string | null | undefined;
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
	const defaultDebounceMs = getOptimizedTiming().autosaveDebounceMs || 800;
	const {
		visitId,
		patientId,
		organizationId,
		visitNoteForm,
		transcript = "",
		isLocked = false,
		allowLockedRevision = false,
		isRevising = false,
		debounceMs = defaultDebounceMs,
		onSaveSuccess,
		onSaveError,
		silent = false,
	} = options;

	const canSave = !isLocked || allowLockedRevision || isRevising;

	const storeVisitNoteForm = useVisitStore((s) => s.visitNoteForm);
	const setVisitNoteForm = useVisitStore((s) => s.setVisitNoteForm);
	const effectiveVisitNoteForm = options.visitNoteForm ?? storeVisitNoteForm;

	const [saveState, setSaveState] = useState<SaveSyncState>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedSignatureRef = useRef<string>("");
	const isMountedRef = useRef<boolean>(true);
	const currentFormRef = useRef<VisitNoteForm>(effectiveVisitNoteForm);
	const currentTranscriptRef = useRef<string>(transcript);

	currentFormRef.current = effectiveVisitNoteForm;
	currentTranscriptRef.current = transcript;

	const setServerDraftSyncState = useVisitStore((s) => s.setServerDraftSyncState);
	const setLastServerDraftSavedAt = useVisitStore((s) => s.setLastServerDraftSavedAt);
	const storeSelectedSpecialty = useVisitStore((s) => s.selectedSpecialty);
	const selectedSpecialty = options.selectedSpecialty ?? storeSelectedSpecialty;
	const activeVisit = useAppStore((s) => s.dashboard?.activeVisit);
	const effectiveVisitId = visitId || activeVisit?.id;
	const previousVisitIdRef = useRef<string | null>(effectiveVisitId || null);

	// Изоляция параллельных визитов соло-врача (Zero Data Collisions):
	// при переключении между Креслом 1 и Креслом 2 немедленно сбрасываем
	// черновик предыдущего визита в его личный ключ, исключая перезапись данных
	useEffect(() => {
		if (
			previousVisitIdRef.current &&
			effectiveVisitId &&
			previousVisitIdRef.current !== effectiveVisitId &&
			previousVisitIdRef.current !== "no-active-visit"
		) {
			const oldVisitId = previousVisitIdRef.current;
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
			const formToSave = currentFormRef.current;
			if (formToSave) {
				const draftPayload = visitNoteDraftFromForm(formToSave, [
					"Автосохранение при переключении кресла соло-врача.",
				]);
				void saveVisitDraft(oldVisitId, draftPayload, organizationId || activeVisit?.organizationId, { immediate: true });
			}
			lastSavedSignatureRef.current = "";
			previousVisitIdRef.current = effectiveVisitId;
		} else if (effectiveVisitId && !previousVisitIdRef.current) {
			previousVisitIdRef.current = effectiveVisitId;
		}
	}, [effectiveVisitId, organizationId, activeVisit?.organizationId]);

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

	// Восстановление локального черновика при монтировании/перезагрузке,
	// если форма пустая, а в L1 RAM или IndexedDB есть несохраненные данные
	useEffect(() => {
		const effectiveVisitId = visitId || activeVisit?.id;
		if (!effectiveVisitId || effectiveVisitId === "no-active-visit") return;

		const isBlank =
			!effectiveVisitNoteForm.complaint &&
			!effectiveVisitNoteForm.anamnesis &&
			!effectiveVisitNoteForm.objectiveStatus &&
			!effectiveVisitNoteForm.diagnosis &&
			!effectiveVisitNoteForm.treatmentPlan;

		if (isBlank) {
			const syncDraft = loadVisitDraftSync<VisitNoteForm>(effectiveVisitId);
			if (syncDraft?.data && typeof syncDraft.data === "object") {
				const d = syncDraft.data as Partial<VisitNoteForm>;
				if (d.complaint || d.anamnesis || d.objectiveStatus || d.diagnosis || d.treatmentPlan) {
					setVisitNoteForm((prev) => ({
						complaint: d.complaint ?? prev.complaint,
						anamnesis: d.anamnesis ?? prev.anamnesis,
						objectiveStatus: d.objectiveStatus ?? prev.objectiveStatus,
						diagnosis: d.diagnosis ?? prev.diagnosis,
						treatmentPlan: d.treatmentPlan ?? prev.treatmentPlan,
					}));
				}
			} else {
				void loadVisitDraft<VisitNoteForm>(effectiveVisitId).then((asyncDraft) => {
					if (!isMountedRef.current || !asyncDraft?.data || typeof asyncDraft.data !== "object") return;
					const d = asyncDraft.data as Partial<VisitNoteForm>;
					if (d.complaint || d.anamnesis || d.objectiveStatus || d.diagnosis || d.treatmentPlan) {
						setVisitNoteForm((prev) => {
							const stillBlank =
								!prev.complaint &&
								!prev.anamnesis &&
								!prev.objectiveStatus &&
								!prev.diagnosis &&
								!prev.treatmentPlan;
							if (!stillBlank) return prev;
							return {
								complaint: d.complaint ?? prev.complaint,
								anamnesis: d.anamnesis ?? prev.anamnesis,
								objectiveStatus: d.objectiveStatus ?? prev.objectiveStatus,
								diagnosis: d.diagnosis ?? prev.diagnosis,
								treatmentPlan: d.treatmentPlan ?? prev.treatmentPlan,
							};
						});
					}
				});
			}
		}
	}, [visitId, activeVisit?.id, setVisitNoteForm]);

	const executeSave = useCallback(
		async (opts?: { silent?: boolean; force?: boolean }): Promise<{ success: boolean; error?: string }> => {
			const form = currentFormRef.current;
			const tr = currentTranscriptRef.current;
			if (!canSave) {
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
						"Автосохранение врача solo. Дневник приёма зафиксирован.",
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
					if (isMountedRef.current) {
						const currentSig = computeSignature(currentFormRef.current, currentTranscriptRef.current);
						setHasUnsavedChanges(currentSig !== signature);
					}
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
							...denteAdminSecretRequestHeaders(),
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
					// Проверяем: не напечатал ли врач новые символы, пока шел сетевой запрос
					const currentSig = computeSignature(currentFormRef.current, currentTranscriptRef.current);
					setHasUnsavedChanges(currentSig !== signature);
				}
				setServerDraftSyncState("saved");
				setLastServerDraftSavedAt(savedAtIso);

				onSaveSuccess?.(result.serverDraft);

				try {
					broadcastClinicalEntityChange({
						entityType: "visit_draft",
						entityId: effectiveVisitId,
						patientId: effectivePatientId || undefined,
						updatedAt: savedAtIso,
					});
				} catch (broadcastErr) {
					logger.debug("[useVisitSave] Broadcast clinical entity failed:", broadcastErr);
				}

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
						const currentSig = computeSignature(currentFormRef.current, currentTranscriptRef.current);
						setHasUnsavedChanges(currentSig !== signature);
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
			canSave,
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

	// Debounced change listener & instant L1 RAM + debounced disk draft mirror
	useEffect(() => {
		if (!canSave) return;
		const signature = computeSignature(effectiveVisitNoteForm, transcript);
		if (!signature) return;

		const effVisitId = visitId || activeVisit?.id;
		const effOrgId = organizationId || activeVisit?.organizationId;

		if (effVisitId && effVisitId !== "no-active-visit") {
			// Мгновенная фиксация в L1 RAM (0 мс) + отложенная запись в IndexedDB/диск
			const draftPayload = visitNoteDraftFromForm(effectiveVisitNoteForm, [
				"Автосохранение врача solo. Дневник приёма зафиксирован.",
			]);
			saveVisitDraftDebounced(effVisitId, draftPayload, effOrgId, debounceMs);
		}

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
	}, [effectiveVisitNoteForm, transcript, debounceMs, canSave, computeSignature, executeSave, visitId, activeVisit, organizationId]);

	// Auto-flush on tab switch / window unload / pagehide to guarantee 0 data loss (Mandate 8e)
	useEffect(() => {
		isMountedRef.current = true;

		const flushOnExit = () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}

			// 1. Принудительный сброс низкоуровневых очередей на диск
			flushPendingStorageWrites();
			void flushPendingOfflineDrafts();

			// 2. Синхронное сохранение локального черновика и постановка в очередь отправки
			const form = currentFormRef.current;
			const effVisitId = visitId || activeVisit?.id;
			const effPatientId = patientId || activeVisit?.patientId;
			const effOrgId = organizationId || activeVisit?.organizationId;

			if (form && effVisitId && effVisitId !== "no-active-visit") {
				const draftPayload = visitNoteDraftFromForm(form, [
					"Автосохранение врача solo при закрытии вкладки. Дневник зафиксирован.",
				]);
				void saveVisitDraft(effVisitId, draftPayload, effOrgId, { immediate: true });
				void queuePendingVisitSave(
					{
						visitId: effVisitId,
						clientMutationId: `save-unload-${Date.now()}`,
						baseRevision: activeVisit?.revision ?? null,
						draft: draftPayload,
						doctorSummary: null,
						transcript: currentTranscriptRef.current,
						selectedSpecialty: (selectedSpecialty as DentalSpecialty) || "universal",
					},
					effOrgId,
				);

				// 3. Отправка beacon в фоновый поток браузера
				if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
					try {
						const beaconPayload = JSON.stringify({
							patientId: effPatientId,
							selectedSpecialty,
							transcript: currentTranscriptRef.current,
							draft: draftPayload,
							baseRevision: activeVisit?.revision ?? null,
							clientDraftId: `visit-draft-${effVisitId}`,
							clientSavedAt: new Date().toISOString(),
						});
						const blob = new Blob([beaconPayload], { type: "application/json" });
						navigator.sendBeacon(`/api/visits/${effVisitId}/draft/autosave`, blob);
					} catch {
						// Ошибка sendBeacon не критична — черновик уже надежно сохранен в IndexedDB
					}
				}
			}

			void executeSave({ silent: true, force: true });
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushOnExit();
			}
		};

		const handleBeforeUnload = () => {
			flushOnExit();
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("beforeunload", handleBeforeUnload);
		window.addEventListener("pagehide", handleBeforeUnload);

		return () => {
			isMountedRef.current = false;
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("beforeunload", handleBeforeUnload);
			window.removeEventListener("pagehide", handleBeforeUnload);
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
		};
	}, [executeSave, visitId, activeVisit, patientId, organizationId, selectedSpecialty]);

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

/**
 * Изолированный ключ локального хранилища для черновика визита.
 * Исключает коллизии между параллельными визитами на соседних креслах (Мандаты 8e, 8n).
 */
export function getIsolatedVisitDraftKey(visitId: string): string {
	const sanitized = (visitId || "anonymous").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
	return `dente_visit_draft_${sanitized}`;
}

export function loadIsolatedVisitDraft<T = VisitNoteForm>(visitId: string): T | null {
	if (!visitId || visitId === "no-active-visit") return null;
	try {
		const syncDraft = loadVisitDraftSync<T>(visitId);
		if (syncDraft?.data && typeof syncDraft.data === "object") {
			return syncDraft.data as T;
		}
		if (typeof localStorage !== "undefined") {
			const raw = localStorage.getItem(getIsolatedVisitDraftKey(visitId));
			if (raw) {
				const parsed = JSON.parse(raw);
				return (parsed?.data ?? parsed) as T;
			}
		}
	} catch {
		// Non-blocking parse error fallback
	}
	return null;
}

export function saveIsolatedVisitDraft<T = VisitNoteForm>(
	visitId: string,
	data: T,
	organizationId?: string,
): void {
	if (!visitId || visitId === "no-active-visit") return;
	try {
		void saveVisitDraft(visitId, data, organizationId, { immediate: true });
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(
				getIsolatedVisitDraftKey(visitId),
				JSON.stringify({
					visitId,
					data,
					savedAt: new Date().toISOString(),
				}),
			);
		}
	} catch {
		// Ignore storage quota errors
	}
}

export function verifyZeroDraftCollision(visitIdA: string, visitIdB: string): boolean {
	const keyA = getIsolatedVisitDraftKey(visitIdA);
	const keyB = getIsolatedVisitDraftKey(visitIdB);
	return keyA !== keyB;
}

