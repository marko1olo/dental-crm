import { useRef } from "react";
import { useAppStore } from "../../store/appStore";
import { useVisitStore } from "../../store/visitStore";
import { scrollToVisitArea } from "./helpers";
import type { UseVisitLogicParams, UseVisitLogicReturn } from "./types";
import { useVisitAutosave } from "./useVisitAutosave";
import { useVisitNotes } from "./useVisitNotes";
import { useVisitOfflineQueue } from "./useVisitOfflineQueue";
import { useVisitSpeech } from "./useVisitSpeech";

export function useVisitLogic({
	dashboard = null,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	query,
	setError,
	auth,
	setDashboard,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	setQuery,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	selectedPatientId,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	documentPatient,
	activePatient,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	activeAppointment,
	activeDoctor,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	activeChair,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	paymentPatientContextReady,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	paymentPatientContextMessage,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	loadDashboard,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	clinicProfileDraft,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	patientCoreDraft,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	documentPatientMatchesActiveVisit,
	activeOrganizationId = null,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	importSourceKind,
	setImportSourceKind,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved call-site signature
	importText,
	setImportText,
	setImportPreview,
	setImportCommit,
}: UseVisitLogicParams): UseVisitLogicReturn {
	const visitStore = useVisitStore();
	const appStore = useAppStore();

	const isDraftAcceptingLocalRef = useRef(false);

	const notes = useVisitNotes({
		auth,
		setError,
		dashboard,
		activePatient,
		activeDoctor,
		speechGatewayStatus: appStore.speechGatewayStatus,
		scrollToVisitArea,
	});

	const speech = useVisitSpeech({
		auth,
		setError,
		dashboard,
		activeOrganizationId,
		isOnline: appStore.isOnline,
		selectedSpecialty: visitStore.selectedSpecialty,
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
		isOnline: appStore.isOnline,
		transcript: visitStore.transcript,
		selectedSpecialty: visitStore.selectedSpecialty,
		visitNoteForm: visitStore.visitNoteForm,
		hasVisitNoteFormText: notes.hasVisitNoteFormText,
		lastServerDraftSignatureRef: visitStore.lastServerDraftSignatureRef,
		setServerDraftSyncState: visitStore.setServerDraftSyncState,
		setLastServerDraftSavedAt: visitStore.setLastServerDraftSavedAt,
	});

	const offlineQueue = useVisitOfflineQueue({
		auth,
		setError,
		dashboard,
		setDashboard,
		activeOrganizationId,
		setDraft: visitStore.setDraft,
		setVisitNoteForm: visitStore.setVisitNoteForm,
		setLastVisitSaveReceipt: visitStore.setLastVisitSaveReceipt,
		setPendingVisitSaveCount: visitStore.setPendingVisitSaveCount,
		setLastPendingVisitSaveAt: visitStore.setLastPendingVisitSaveAt,
		isPendingVisitSyncing: visitStore.isPendingVisitSyncing,
		setIsPendingVisitSyncing: visitStore.setIsPendingVisitSyncing,
		isDraftAccepting: visitStore.isDraftAccepting,
		setIsDraftAccepting: visitStore.setIsDraftAccepting,
		hasVisitNoteFormText: notes.hasVisitNoteFormText,
		visitNoteForm: visitStore.visitNoteForm,
		draft: visitStore.draft,
		transcript: visitStore.transcript,
		selectedSpecialty: visitStore.selectedSpecialty,
		visitNoteAcceptMissingSteps: notes.visitNoteAcceptMissingSteps,
		visitNoteReadyToAccept: notes.visitNoteReadyToAccept,
		scrollToVisitArea,
		isDraftAcceptingLocalRef,
	});

	return {
		...visitStore,
		isOnline: appStore.isOnline,
		speechGatewayHealthReport: appStore.speechGatewayHealthReport,
		speechGatewayStatus: appStore.speechGatewayStatus,
		speechProviderRuntimeStatuses: appStore.speechProviderRuntimeStatuses,
		speechRecordingStrategy: appStore.speechRecordingStrategy,
		speechRecordingRecovery: appStore.speechRecordingRecovery,
		pendingSpeechChunkCount: appStore.pendingSpeechChunkCount,
		speechStatusNote: appStore.speechStatusNote,
		isImportDictating: appStore.isImportDictating,
		...speech,
		...notes,
		...autosave,
		...offlineQueue,
		scrollToVisitArea,
	};
}
