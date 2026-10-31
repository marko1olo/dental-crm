import type { UseVisitNotesParams, UseVisitNotesReturn } from "./types";
import { useVisitNoteSync } from "./visitNotesLogic/useVisitNoteSync";
import { useVisitSoapDraft } from "./visitNotesLogic/useVisitSoapDraft";
import { useVisitSpeechDictation } from "./visitNotesLogic/useVisitSpeechDictation";

/**
 * useVisitNotes (Thin Coordinator Facade)
 *
 * Coordinates clinical visit notes, speech dictation, SOAP drafts, and autosave sync.
 * Target size <= 120 lines (Sweet-spot coordinator complying with Mandate 8b/8zi).
 *
 * Submodules:
 * - useVisitSpeechDictation: Web Speech / gateway dictation & transcript buffer.
 * - useVisitSoapDraft: Clinical SOAP draft engine & zero-blocking doctor autonomy.
 * - useVisitNoteSync: Form state dirty-tracking, field mutation & transcript polish.
 */
export function useVisitNotes({
	auth,
	setError,
	dashboard,
	activePatient,
	activeDoctor,
	speechGatewayStatus,
	scrollToVisitArea,
}: UseVisitNotesParams): UseVisitNotesReturn {
	const speech = useVisitSpeechDictation({
		speechGatewayStatus,
	});

	const sync = useVisitNoteSync({
		auth,
		setError,
		dashboard,
		hasVisitTranscriptText: speech.hasVisitTranscriptText,
	});

	const draft = useVisitSoapDraft({
		auth,
		setError,
		dashboard,
		activePatient,
		activeDoctor,
		scrollToVisitArea,
		hasVisitTranscriptText: speech.hasVisitTranscriptText,
		hasVisitNoteFormText: sync.hasVisitNoteFormText,
		isVisitNoteDirty: sync.isVisitNoteDirty,
	});

	return {
		visitCloseChecklist: draft.visitCloseChecklist,
		visitWarnings: draft.visitWarnings,
		primaryVisitWarning: draft.primaryVisitWarning,
		savedVisitNoteForm: sync.savedVisitNoteForm,
		isVisitNoteDirty: sync.isVisitNoteDirty,
		hasVisitNoteFormText: sync.hasVisitNoteFormText,
		hasVisitTranscriptText: speech.hasVisitTranscriptText,
		visitDraftBuildMissingSteps: draft.visitDraftBuildMissingSteps,
		visitDraftReadyToBuild: draft.visitDraftReadyToBuild,
		visitNoteAcceptMissingSteps: draft.visitNoteAcceptMissingSteps,
		visitNoteReadyToAccept: draft.visitNoteReadyToAccept,
		visitNoteActionLabel: sync.visitNoteActionLabel,
		visitNoteStatusLabel: sync.visitNoteStatusLabel,
		visitHasSavedNote: sync.visitHasSavedNote,
		appendToTranscript: speech.appendToTranscript,
		appendVisitDictationText: speech.appendVisitDictationText,
		updateVisitNoteField: sync.updateVisitNoteField,
		buildOfflineDraft: draft.buildOfflineDraft,
		openVisitWarningAction: draft.openVisitWarningAction,
		polishTranscript: sync.polishTranscript,
		buildDraft: draft.buildDraft,
		clearTranscriptWithUndo: speech.clearTranscriptWithUndo,
		undoTranscriptClear: speech.undoTranscriptClear,
	};
}
