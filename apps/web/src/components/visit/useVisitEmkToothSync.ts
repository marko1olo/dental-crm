import { useRef } from "react";
import type { UseVisitEmkToothSyncParams } from "./toothSync/toothStateConverters.js";
import { useOdontogramHydration } from "./toothSync/useOdontogramHydration.js";
import { useOdontogramEventsListener } from "./toothSync/useOdontogramEventsListener.js";
import { useSoapProtocolEventListener } from "./toothSync/useSoapProtocolEventListener.js";

export * from "./toothSync/toothStateConverters.js";

export function useVisitEmkToothSync({
	patientId,
	visitNoteForm,
	updateVisitNoteField,
}: UseVisitEmkToothSyncParams): void {
	const visitNoteFormRef = useRef(visitNoteForm);
	visitNoteFormRef.current = visitNoteForm;
	const updateVisitNoteFieldRef = useRef(updateVisitNoteField);
	updateVisitNoteFieldRef.current = updateVisitNoteField;

	useOdontogramHydration({ patientId, visitNoteFormRef, updateVisitNoteFieldRef });
	useOdontogramEventsListener(patientId);
	useSoapProtocolEventListener({ visitNoteFormRef, updateVisitNoteFieldRef });
}
