import { useEffect, type MutableRefObject } from "react";
import type { DentalSpecialty } from "@dental/shared";
import type { VisitNoteForm } from "../../../AppHelpers";
import { queuePendingVisitSave, visitNoteDraftFromForm } from "../../../AppHelpers";
import { flushPendingStorageWrites } from "../../../lib/safeLocalStorage";
import {
	flushPendingOfflineDrafts,
	saveVisitDraft,
} from "../../../services/offline/offlineStorage";

interface UseVisitSaveUnloadFlushParams {
	isMountedRef: MutableRefObject<boolean>;
	debounceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
	currentFormRef: MutableRefObject<VisitNoteForm>;
	currentTranscriptRef: MutableRefObject<string>;
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	organizationId?: string | null | undefined;
	activeVisitId?: string | null | undefined;
	activeVisitPatientId?: string | null | undefined;
	activeVisitOrgId?: string | null | undefined;
	activeVisitRevision?: number | null | undefined;
	selectedSpecialty?: DentalSpecialty | string | null | undefined;
	executeSave: (opts?: { silent?: boolean; force?: boolean }) => Promise<{ success: boolean; error?: string }>;
}

export function useVisitSaveUnloadFlush(params: UseVisitSaveUnloadFlushParams): void {
	const {
		isMountedRef, debounceTimerRef, currentFormRef, currentTranscriptRef,
		visitId, patientId, organizationId, activeVisitId, activeVisitPatientId,
		activeVisitOrgId, activeVisitRevision, selectedSpecialty, executeSave,
	} = params;

	useEffect(() => {
		isMountedRef.current = true;

		const flushOnExit = () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}

			flushPendingStorageWrites();
			void flushPendingOfflineDrafts();

			const form = currentFormRef.current;
			const effVisitId = visitId || activeVisitId;
			const effPatientId = patientId || activeVisitPatientId;
			const effOrgId = organizationId || activeVisitOrgId;

			if (form && effVisitId && effVisitId !== "no-active-visit") {
				const draftPayload = visitNoteDraftFromForm(form, [
					"Автосохранение врача solo при закрытии вкладки. Дневник зафиксирован.",
				]);
				void saveVisitDraft(effVisitId, draftPayload, effOrgId, { immediate: true });
				void queuePendingVisitSave(
					{
						visitId: effVisitId,
						clientMutationId: `save-unload-${Date.now()}`,
						baseRevision: activeVisitRevision ?? null,
						draft: draftPayload,
						doctorSummary: null,
						transcript: currentTranscriptRef.current,
						selectedSpecialty: (selectedSpecialty as DentalSpecialty) || "universal",
					},
					effOrgId,
				);

				if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
					try {
						const beaconPayload = JSON.stringify({
							patientId: effPatientId,
							selectedSpecialty,
							transcript: currentTranscriptRef.current,
							draft: draftPayload,
							baseRevision: activeVisitRevision ?? null,
							clientDraftId: `visit-draft-${effVisitId}`,
							clientSavedAt: new Date().toISOString(),
						});
						navigator.sendBeacon(`/api/visits/${effVisitId}/draft/autosave`, new Blob([beaconPayload], { type: "application/json" }));
					} catch {
						// Ignored safely
					}
				}
			}

			void executeSave({ silent: true, force: true });
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") flushOnExit();
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("beforeunload", flushOnExit);
		window.addEventListener("pagehide", flushOnExit);

		return () => {
			isMountedRef.current = false;
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("beforeunload", flushOnExit);
			window.removeEventListener("pagehide", flushOnExit);
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
		};
	}, [executeSave, visitId, activeVisitId, patientId, activeVisitPatientId, organizationId, activeVisitOrgId, activeVisitRevision, selectedSpecialty, isMountedRef, debounceTimerRef, currentFormRef, currentTranscriptRef]);
}
