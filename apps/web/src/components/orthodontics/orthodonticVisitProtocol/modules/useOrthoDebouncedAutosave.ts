import { useEffect, useRef } from "react";
import { useVisitStore } from "../../../../store/visitStore";

export function useOrthoDebouncedAutosave(isOpen: boolean, notes: string) {
	const isMountedRef = useRef(false);
	useEffect(() => {
		if (!isOpen) return;
		if (!isMountedRef.current) {
			isMountedRef.current = true;
			return;
		}
		const timer = setTimeout(() => {
			try {
				const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
				if (setVisitNoteForm && notes) {
					setVisitNoteForm((prev) => ({
						...prev,
						treatmentPlan: prev.treatmentPlan?.includes(notes) ? prev.treatmentPlan : prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] ${notes}` : `[Ортодонтия] ${notes}`,
					}));
				}
			} catch {}
		}, 800);
		return () => clearTimeout(timer);
	}, [isOpen, notes]);
}
