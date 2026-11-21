import { useRef } from "react";
import { useAppStore } from "../../../store/appStore";
import { useVisitStore } from "../../../store/visitStore";
import { scrollToVisitArea } from "./helpers";
import type { UseVisitLogicParams, UseVisitLogicReturn } from "./types";
import { useVisitAutosave } from "./useVisitAutosave";
import { useVisitNotes } from "./useVisitNotes";
import { useVisitOfflineQueue } from "./useVisitOfflineQueue";
import { useVisitSpeech } from "./useVisitSpeech";

export function useVisitLogic({
	dashboard = null,
	query: _query,
	setError,
	auth,
	setDashboard,
	setQuery: _setQuery,
	selectedPatientId: _selectedPatientId,
	documentPatient: _documentPatient,
	activePatient,
	activeAppointment: _activeAppointment,
	activeDoctor,
	activeChair: _activeChair,
	paymentPatientContextReady: _paymentPatientContextReady,
	paymentPatientContextMessage: _paymentPatientContextMessage,
	loadDashboard: _loadDashboard,
	clinicProfileDraft: _clinicProfileDraft,
	patientCoreDraft: _patientCoreDraft,
	documentPatientMatchesActiveVisit: _documentPatientMatchesActiveVisit,
	activeOrganizationId = null,
	importSourceKind: _importSourceKind,
	setImportSourceKind,
	importText: _importText,
	setImportText,
	setImportPreview,
	setImportCommit,
}: UseVisitLogicParams): UseVisitLogicReturn {
	const selectedSpecialty = useVisitStore((s) => s.selectedSpecialty);
	const transcript = useVisitStore((s) => s.transcript);
	const draft = useVisitStore((s) => s.draft);
	const visitNoteForm = useVisitStore((s) => s.visitNoteForm);
	const lastServerDraftSignatureRef = useVisitStore(
		(s) => s.lastServerDraftSignatureRef,
	);
	const setServerDraftSyncState = useVisitStore(
		(s) => s.setServerDraftSyncState,
	);
	const setLastServerDraftSavedAt = useVisitStore(
		(s) => s.setLastServerDraftSavedAt,
	);
	const setLastPendingVisitSaveAt = useVisitStore(
		(s) => s.setLastPendingVisitSaveAt,
	);
	const isPendingVisitSyncing = useVisitStore((s) => s.isPendingVisitSyncing);
	const setIsPendingVisitSyncing = useVisitStore(
		(s) => s.setIsPendingVisitSyncing,
	);
	const isDraftAccepting = useVisitStore((s) => s.isDraftAccepting);
	const setIsDraftAccepting = useVisitStore((s) => s.setIsDraftAccepting);
	const setDraft = useVisitStore((s) => s.setDraft);
	const setVisitNoteForm = useVisitStore((s) => s.setVisitNoteForm);
	const setLastVisitSaveReceipt = useVisitStore(
		(s) => s.setLastVisitSaveReceipt,
	);
	const setPendingVisitSaveCount = useVisitStore(
		(s) => s.setPendingVisitSaveCount,
	);

	const isOnline = useAppStore((s) => s.isOnline);
	const speechGatewayHealthReport = useAppStore(
		(s) => s.speechGatewayHealthReport,
	);
	const speechGatewayStatus = useAppStore((s) => s.speechGatewayStatus);
	const speechProviderRuntimeStatuses = useAppStore(
		(s) => s.speechProviderRuntimeStatuses,
	);
	const speechRecordingStrategy = useAppStore(
		(s) => s.speechRecordingStrategy,
	);
	const speechRecordingRecovery = useAppStore(
		(s) => s.speechRecordingRecovery,
	);
	const pendingSpeechChunkCount = useAppStore(
		(s) => s.pendingSpeechChunkCount,
	);
	const speechStatusNote = useAppStore((s) => s.speechStatusNote);
	const isImportDictating = useAppStore((s) => s.isImportDictating);

	const isDraftAcceptingLocalRef = useRef(false);

	const notes = useVisitNotes({
		auth,
		setError,
		dashboard,
		activePatient,
		activeDoctor,
		speechGatewayStatus,
		scrollToVisitArea,
	});

	const speech = useVisitSpeech({
		auth,
		setError,
		dashboard,
		activeOrganizationId,
		isOnline,
		selectedSpecialty,
		appendVisitDictationText: notes.appendVisitDictationText,
		setImportSourceKind,
		setImportText,
		setImportPreview,
		setImportCommit,
	});

	const autosave = useVisitAutosave({
		auth,
		setError,
		dashboard,
		isOnline,
		transcript,
		selectedSpecialty,
		visitNoteForm,
		hasVisitNoteFormText: notes.hasVisitNoteFormText,
		lastServerDraftSignatureRef,
		setServerDraftSyncState,
		setLastServerDraftSavedAt,
	});

	const offlineQueue = useVisitOfflineQueue({
		auth,
		setError,
		dashboard,
		setDashboard,
		activeOrganizationId,
		setDraft,
		setVisitNoteForm,
		setLastVisitSaveReceipt,
		setPendingVisitSaveCount,
		setLastPendingVisitSaveAt,
		isPendingVisitSyncing,
		setIsPendingVisitSyncing,
		isDraftAccepting,
		setIsDraftAccepting,
		hasVisitNoteFormText: notes.hasVisitNoteFormText,
		visitNoteForm,
		draft,
		transcript,
		selectedSpecialty,
		visitNoteAcceptMissingSteps: notes.visitNoteAcceptMissingSteps,
		visitNoteReadyToAccept: notes.visitNoteReadyToAccept,
		scrollToVisitArea,
		isDraftAcceptingLocalRef,
	});

	return {
		...useVisitStore.getState(),
		selectedSpecialty,
		transcript,
		draft,
		visitNoteForm,
		isPendingVisitSyncing,
		isDraftAccepting,
		isOnline,
		speechGatewayHealthReport,
		speechGatewayStatus,
		speechProviderRuntimeStatuses,
		speechRecordingStrategy,
		speechRecordingRecovery,
		pendingSpeechChunkCount,
		speechStatusNote,
		isImportDictating,
		...speech,
		...notes,
		...autosave,
		...offlineQueue,
		scrollToVisitArea,
	};
}
