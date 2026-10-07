/**
 * useChairsideVoiceEngine.ts — Voice Dictation Engine & Intent Listener Hook.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 500 lines.
 * - Mandate 8l: 5-bar live VU-meter & voice intent parsing.
 */

import { useState, useCallback, useEffect } from "react";
import { showToast } from "../../GlobalToast";
import { globalDentalVoiceEngine, type DentalVoiceIntent } from "../../../services/voice";

export interface UseChairsideVoiceEngineOptions {
  onTranscriptFinal: (text: string) => void;
  onIntentParsed: (intent: DentalVoiceIntent) => void;
}

export function useChairsideVoiceEngine({
  onTranscriptFinal,
  onIntentParsed,
}: UseChairsideVoiceEngineOptions) {
  const [isListening, setIsListening] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);

  useEffect(() => {
    const unsub = globalDentalVoiceEngine.addListener({
      onListeningChange: (isL) => setIsListening(isL),
      onVolumeChange: (vol) => setAudioVolume(vol),
      onTranscriptChange: (_interim, final) => {
        if (final) {
          onTranscriptFinal(final);
        }
      },
      onIntentParsed: (intent) => {
        if (intent) {
          onIntentParsed(intent);
        }
      },
    });
    return () => unsub();
  }, [onTranscriptFinal, onIntentParsed]);

  const handleToggleVoice = useCallback(() => {
    if (isListening) {
      globalDentalVoiceEngine.stopListening();
      setIsListening(false);
    } else {
      globalDentalVoiceEngine.startListening();
      setIsListening(true);
      showToast("Диктовка включена: говорите в микрофон", "info");
    }
  }, [isListening]);

  return {
    isListening,
    audioVolume,
    handleToggleVoice,
  };
}
