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

	// Chair isolation: flush previous chair's draft upon switching and purge stale form
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
				void saveVisitDraft(oldVisitId, draftPayload, (organizationId || activeVisitOrgId) ?? undefined, { immediate: true });
			}
			lastSavedSignatureRef.current = "";
			previousVisitIdRef.current = effectiveVisitId;

			// Zero-Leak Draft: Purge Patient A's text and load Patient B's draft immediately
			const emptyForm: VisitNoteForm = {
				complaint: "",
				anamnesis: "",
				objectiveStatus: "",
				diagnosis: "",
				treatmentPlan: "",
			};

			const syncDraft = loadVisitDraftSync<VisitNoteForm>(effectiveVisitId);
			if (syncDraft?.data && typeof syncDraft.data === "object") {
				const d = syncDraft.data as Partial<VisitNoteForm>;
				const loaded: VisitNoteForm = {
					complaint: d.complaint ?? "",
					anamnesis: d.anamnesis ?? "",
					objectiveStatus: d.objectiveStatus ?? "",
					diagnosis: d.diagnosis ?? "",
					treatmentPlan: d.treatmentPlan ?? "",
				};
				currentFormRef.current = loaded;
				setVisitNoteForm(() => loaded);
			} else {
				currentFormRef.current = emptyForm;
				setVisitNoteForm(() => emptyForm);
				void loadVisitDraft<VisitNoteForm>(effectiveVisitId).then((asyncDraft) => {
					if (!isMountedRef.current || !asyncDraft?.data || typeof asyncDraft.data !== "object") return;
					const ad = asyncDraft.data as Partial<VisitNoteForm>;
					if (ad.complaint || ad.anamnesis || ad.objectiveStatus || ad.diagnosis || ad.treatmentPlan) {
						const loaded: VisitNoteForm = {
							complaint: ad.complaint ?? "",
							anamnesis: ad.anamnesis ?? "",
							objectiveStatus: ad.objectiveStatus ?? "",
							diagnosis: ad.diagnosis ?? "",
							treatmentPlan: ad.treatmentPlan ?? "",
						};
						currentFormRef.current = loaded;
						setVisitNoteForm(() => loaded);
					}
				});
			}
		} else if (effectiveVisitId && !previousVisitIdRef.current) {
			previousVisitIdRef.current = effectiveVisitId;
		}
	}, [effectiveVisitId, organizationId, activeVisitOrgId, currentFormRef, debounceTimerRef, lastSavedSignatureRef, setVisitNoteForm, isMountedRef]);

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
				const hydrated: VisitNoteForm = {
					complaint: d.complaint ?? effectiveVisitNoteForm.complaint,
					anamnesis: d.anamnesis ?? effectiveVisitNoteForm.anamnesis,
					objectiveStatus: d.objectiveStatus ?? effectiveVisitNoteForm.objectiveStatus,
					diagnosis: d.diagnosis ?? effectiveVisitNoteForm.diagnosis,
					treatmentPlan: d.treatmentPlan ?? effectiveVisitNoteForm.treatmentPlan,
				};
				currentFormRef.current = hydrated;
				setVisitNoteForm(() => hydrated);
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
						const nextForm: VisitNoteForm = {
							complaint: d.complaint ?? prev.complaint,
							anamnesis: d.anamnesis ?? prev.anamnesis,
							objectiveStatus: d.objectiveStatus ?? prev.objectiveStatus,
							diagnosis: d.diagnosis ?? prev.diagnosis,
							treatmentPlan: d.treatmentPlan ?? prev.treatmentPlan,
						};
						currentFormRef.current = nextForm;
						return nextForm;
					});
				}
			});
		}
	}, [effectiveVisitId, effectiveVisitNoteForm, setVisitNoteForm, isMountedRef, currentFormRef]);
}
