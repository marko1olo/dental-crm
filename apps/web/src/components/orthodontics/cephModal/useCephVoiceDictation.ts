import { useState, useEffect, useCallback } from "react";
import { showToast } from "../../GlobalToast";
import { SoundFeedbackService } from "../../../services/audio/SoundFeedbackService";
import { globalDentalVoiceEngine } from "../../../services/voice";
import { CEPHALOMETRIC_LANDMARKS, type LandmarkKey } from "../cephalometricMath";

export interface UseCephVoiceDictationProps {
	readonly isOpen: boolean;
	readonly setActiveTargetKey: (key: LandmarkKey | null) => void;
	readonly handleRemoveLandmark: (key: LandmarkKey) => void;
}

export function useCephVoiceDictation({
	isOpen,
	setActiveTargetKey,
	handleRemoveLandmark,
}: UseCephVoiceDictationProps) {
	const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
	const [voiceInterimText, setVoiceInterimText] = useState<string>("");

	useEffect(() => {
		if (!isOpen) return;
		const unsub = globalDentalVoiceEngine.addListener({
			onListeningChange: (isL) => {
				setIsVoiceListening(isL);
				if (!isL) setVoiceInterimText("");
			},
			onTranscriptChange: (interim, final) => setVoiceInterimText(interim || final || ""),
			onIntentParsed: (intent) => {
				if (intent.cephLandmarks && intent.cephLandmarks.length > 0) {
					const firstL = intent.cephLandmarks[0];
					if (firstL) {
						const matchedDef = CEPHALOMETRIC_LANDMARKS.find((l) => l.key.toLowerCase() === firstL.landmarkKey.toLowerCase());
						if (matchedDef) {
							if (firstL.action === "clear") {
								handleRemoveLandmark(matchedDef.key);
								showToast(`Голос: Сброшена ${matchedDef.nameRu}`, "info");
							} else {
								setActiveTargetKey(matchedDef.key);
								void SoundFeedbackService.getInstance().playActionSuccess();
								showToast(`Голос: Выбран ориентир ${matchedDef.nameRu}`, "success");
							}
						}
					}
				}
			},
		});
		return () => unsub();
	}, [isOpen, handleRemoveLandmark, setActiveTargetKey]);

	const toggleVoiceListening = useCallback(async () => {
		if (isVoiceListening) {
			globalDentalVoiceEngine.stop();
		} else {
			const started = await globalDentalVoiceEngine.start();
			if (!started) showToast("Не удалось запустить микрофон", "warning");
		}
	}, [isVoiceListening]);

	return {
		isVoiceListening,
		voiceInterimText,
		toggleVoiceListening,
	};
}
