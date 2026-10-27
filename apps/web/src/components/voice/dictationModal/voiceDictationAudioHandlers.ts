/**
 * voiceDictationAudioHandlers.ts — Callbacks for UnifiedAudioClient subscriptions.
 * Mandate 8b: strictly <= 120 lines.
 */

import { type ClinicalVoiceParseResult, parseClinicalVoiceSpeech } from "../voiceClinicalCommands";

export interface AudioSubscriptionDispatch {
	setIsListening: (val: boolean) => void;
	setIsProcessing: (val: boolean) => void;
	setInterimText: (val: string) => void;
	setFinalText: (val: string) => void;
	setTranscript: (val: string) => void;
	setParseResult: (val: ClinicalVoiceParseResult | null) => void;
	setAudioVolume: (val: number) => void;
	setErrorMessage: (val: string | null) => void;
	cleanupAudio: () => void;
}

export function createAudioSubscriptionHandlers(dispatch: AudioSubscriptionDispatch) {
	return {
		onStateChange: (state: string) => {
			dispatch.setIsListening(state === "listening" || state === "connecting");
			if (state === "idle" || state === "error") dispatch.setIsProcessing(false);
		},
		onInterimText: (interim: string) => dispatch.setInterimText(interim),
		onFinalText: (_final: string, acc?: string) => {
			const t = (acc || _final).trim();
			dispatch.setFinalText(t);
			dispatch.setTranscript(t);
			dispatch.setInterimText("");
			dispatch.setParseResult(parseClinicalVoiceSpeech(t));
		},
		onTwoLayerTranscript: (d: { interim: string; finalized: string; fullWithInterim?: string }) => {
			dispatch.setInterimText(d.interim);
			dispatch.setFinalText(d.finalized);
			const full = (d.fullWithInterim || d.finalized).trim();
			dispatch.setTranscript(full);
			dispatch.setParseResult(parseClinicalVoiceSpeech(full));
		},
		onRmsUpdate: (rms: number) => dispatch.setAudioVolume(Math.min(100, Math.round(rms * 250))),
		onError: (err: unknown) => {
			dispatch.setErrorMessage(typeof err === "string" ? err : (err as Error)?.message ?? "Audio error");
			dispatch.cleanupAudio();
		},
	};
}
