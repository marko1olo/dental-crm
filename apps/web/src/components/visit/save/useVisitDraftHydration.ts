import { useEffect, useRef, type MutableRefObject } from "react";
import type { VisitNoteForm } from "../../../AppHelpers";
import { visitNoteDraftFromForm } from "../../../AppHelpers";
import {
	loadVisitDraft,
	loadVisitDraftSync,
	saveVisitDraft,
} from "../../../services/offline/offlineStorage";

interface UseVisitDraftHydrationParams {
	effectiveVisitId: string | null | undefined;
	organizationId?: string | null | undefined;
	activeVisitOrgId?: string | null | undefined;
	effectiveVisitNoteForm: VisitNoteForm;
	setVisitNoteForm: (updater: (prev: VisitNoteForm) => VisitNoteForm) => void;
	currentFormRef: MutableRefObject<VisitNoteForm>;
	debounceTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
	lastSavedSignatureRef: MutableRefObject<string>;
	isMountedRef: MutableRefObject<boolean>;
}

export function useVisitDraftHydration(params: UseVisitDraftHydrationParams): void {
	const {
		effectiveVisitId,
		organizationId,
		activeVisitOrgId,
		effectiveVisitNoteForm,
		setVisitNoteForm,
		currentFormRef,
		debounceTimerRef,
		lastSavedSignatureRef,
		isMountedRef,
	} = params;

	const previousVisitIdRef = useRef<string | null>(effectiveVisitId || null);

	// Chair isolation: flush previous chair's draft upon switching
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
				void saveVisitDraft(oldVisitId, draftPayload, organizationId || activeVisitOrgId, { immediate: true });
			}
			lastSavedSignatureRef.current = "";
			previousVisitIdRef.current = effectiveVisitId;
		} else if (effectiveVisitId && !previousVisitIdRef.current) {
			previousVisitIdRef.current = effectiveVisitId;
		}
	}, [effectiveVisitId, organizationId, activeVisitOrgId, currentFormRef, debounceTimerRef, lastSavedSignatureRef]);

	// Hydration from offline storage if blank
	useEffect(() => {
		if (!effectiveVisitId || effectiveVisitId === "no-active-visit") return;

		const isBlank =
			!effectiveVisitNoteForm.complaint &&
			!effectiveVisitNoteForm.anamnesis &&
			!effectiveVisitNoteForm.objectiveStatus &&
			!effectiveVisitNoteForm.diagnosis &&
			!effectiveVisitNoteForm.treatmentPlan;

		if (!isBlank) return;

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
							!prev.complaint && !prev.anamnesis && !prev.objectiveStatus && !prev.diagnosis && !prev.treatmentPlan;
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
	}, [effectiveVisitId, effectiveVisitNoteForm, setVisitNoteForm, isMountedRef]);
}
