import { useCallback, useEffect, useRef, useState } from "react";
import { visitNoteDraftFromForm, type VisitNoteForm } from "../../AppHelpers";
import { useVisitStore } from "../../store/visitStore";
import { useAppStore } from "../../store/appStore";
import { getOptimizedTiming } from "../../utils/lowSpecHddOptimizer";
import { saveVisitDraftDebounced } from "../../services/offline/offlineStorage";
import type { SaveSyncState, UseVisitSaveOptions, UseVisitSaveReturn } from "./save/visitSaveTypes.js";
import { useVisitDraftHydration } from "./save/useVisitDraftHydration.js";
import { useVisitSaveUnloadFlush } from "./save/useVisitSaveUnloadFlush.js";
import { useVisitSaveExecutor } from "./save/useVisitSaveExecutor.js";

export * from "./save/visitSaveTypes.js";
export * from "./save/visitDraftStorage.js";

export function useVisitSave(options: UseVisitSaveOptions): UseVisitSaveReturn {
	const debounceMs = options.debounceMs ?? (getOptimizedTiming().autosaveDebounceMs || 800);
	const { visitId, patientId, organizationId, transcript = "", isLocked = false, allowLockedRevision = false, isRevising = false, onSaveSuccess, onSaveError, silent = false } = options;
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
	currentFormRef.current = effectiveVisitNoteForm; currentTranscriptRef.current = transcript;
	const setServerDraftSyncState = useVisitStore((s) => s.setServerDraftSyncState);
	const setLastServerDraftSavedAt = useVisitStore((s) => s.setLastServerDraftSavedAt);
	const selectedSpecialty = options.selectedSpecialty ?? useVisitStore((s) => s.selectedSpecialty);
	const activeVisit = useAppStore((s) => s.dashboard?.activeVisit);
	const effectiveVisitId = visitId || activeVisit?.id;

	useVisitDraftHydration({ effectiveVisitId, organizationId, activeVisitOrgId: activeVisit?.organizationId, effectiveVisitNoteForm, setVisitNoteForm, currentFormRef, debounceTimerRef, lastSavedSignatureRef, isMountedRef });

	const computeSignature = useCallback((form?: VisitNoteForm, tr?: string): string => {
		if (!form && !tr) return "";
		return JSON.stringify({ complaint: form?.complaint || "", anamnesis: form?.anamnesis || "", objectiveStatus: form?.objectiveStatus || "", diagnosis: form?.diagnosis || "", treatmentPlan: form?.treatmentPlan || "", transcript: tr || "" });
	}, []);

	const executeSave = useVisitSaveExecutor({ canSave, computeSignature, lastSavedSignatureRef, currentFormRef, currentTranscriptRef, isMountedRef, visitId, patientId, organizationId, activeVisit, selectedSpecialty, silent, setSaveState, setLastSavedAt, setHasUnsavedChanges, setServerDraftSyncState, setLastServerDraftSavedAt, onSaveSuccess, onSaveError });

	useEffect(() => {
		if (!canSave) return;
		const signature = computeSignature(effectiveVisitNoteForm, transcript);
		if (!signature) return;
		const effVisitId = visitId || activeVisit?.id;
		if (effVisitId && effVisitId !== "no-active-visit") {
			saveVisitDraftDebounced(effVisitId, visitNoteDraftFromForm(effectiveVisitNoteForm, ["Автосохранение врача solo. Дневник приёма зафиксирован."]), organizationId || activeVisit?.organizationId, debounceMs);
		}
		if (signature !== lastSavedSignatureRef.current) {
			setHasUnsavedChanges(true);
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = setTimeout(() => { void executeSave({ silent: true }); }, debounceMs);
		}
		return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
	}, [effectiveVisitNoteForm, transcript, debounceMs, canSave, computeSignature, executeSave, visitId, activeVisit, organizationId]);

	// Mandate 8e emergency unload flush: useVisitSaveUnloadFlush performs flushPendingStorageWrites(), flushPendingOfflineDrafts(), and navigator.sendBeacon
	useVisitSaveUnloadFlush({ isMountedRef, debounceTimerRef, currentFormRef, currentTranscriptRef, visitId, patientId, organizationId, activeVisitId: activeVisit?.id, activeVisitPatientId: activeVisit?.patientId, activeVisitOrgId: activeVisit?.organizationId, activeVisitRevision: activeVisit?.revision, selectedSpecialty, executeSave });

	const flushPendingSave = useCallback(async () => {
		if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
		await executeSave({ silent: true, force: true });
	}, [executeSave]);

	return { saveState, lastSavedAt, hasUnsavedChanges, triggerSave: executeSave, flushPendingSave, isSaving: saveState === "saving" };
}
