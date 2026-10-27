import { speechChunkApplyKey, speechTranscriptionMatchesActiveVisit } from "./helpers";
import type { UseVisitSpeechParams, UseVisitSpeechReturn } from "./types";
import { useVisitSpeechGateway } from "./useVisitSpeechGateway";
import { useVisitSpeechRecording } from "./useVisitSpeechRecording";
import { useVisitSpeechTextInsertion } from "./useVisitSpeechTextInsertion";
import { useVisitSpeechTranscription } from "./useVisitSpeechTranscription";

export function useVisitSpeech(params: UseVisitSpeechParams): UseVisitSpeechReturn {
	const { auth, setError, dashboard, activeOrganizationId, isOnline, selectedSpecialty, appendVisitDictationText, setImportSourceKind, setImportText, setImportPreview, setImportCommit } = params;

	const gateway = useVisitSpeechGateway({ auth, setError, dashboard, activeOrganizationId, isOnline, selectedSpecialty });
	const textInsertion = useVisitSpeechTextInsertion({ appendVisitDictationText, loadSpeechRecordingRecovery: gateway.loadSpeechRecordingRecovery });
	const transcription = useVisitSpeechTranscription({
		auth, setError, dashboard, activeOrganizationId, isOnline,
		loadSpeechGatewayStatus: gateway.loadSpeechGatewayStatus,
		loadSpeechRecordingRecovery: gateway.loadSpeechRecordingRecovery,
		applySpeechTranscription: textInsertion.applySpeechTranscription,
		refreshPendingSpeechChunkState: gateway.refreshPendingSpeechChunkState,
	});

	const recording = useVisitSpeechRecording({
		dashboard, activeOrganizationId, isOnline, selectedSpecialty,
		speechGatewayStatus: null,
		setError,
		setSpeechStatusNote: () => {},
		appendVisitDictationText,
		submitSpeechChunk: transcription.submitSpeechChunk,
		applySpeechTranscription: textInsertion.applySpeechTranscription,
		refreshPendingSpeechChunkState: gateway.refreshPendingSpeechChunkState,
		setImportSourceKind, setImportText, setImportPreview, setImportCommit,
	});

	return {
		...recording,
		...gateway,
		...textInsertion,
		...transcription,
		speechChunkApplyKey,
		speechTranscriptionMatchesActiveVisit,
	};
}
