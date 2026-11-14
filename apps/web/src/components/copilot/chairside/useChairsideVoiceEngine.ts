/**
 * useChairsideVoiceEngine.ts — Voice Dictation Engine & Intent Listener Hook.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 500 lines.
 * - Mandate 8l: 5-bar live VU-meter & voice intent parsing.
 */

import { useState, useCallback, useEffect } from "react";
import { showToast } from "../../GlobalToast";
import {
  UnifiedAudioClient,
  parseDentalVoiceSpeech,
  type DentalVoiceIntent,
} from "../../../services/voice";

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
    const client = UnifiedAudioClient.getInstance();
    const unsub = client.subscribe({
      onStateChange: (state) => {
        setIsListening(state === "listening" || state === "connecting");
      },
      onRmsUpdate: (rms) => {
        setAudioVolume(Math.min(100, Math.round(rms * 250)));
      },
      onFinalText: (_final, accumulated) => {
        const text = (accumulated || _final || "").trim();
        if (text) {
          onTranscriptFinal(text);
          const intent = parseDentalVoiceSpeech(text);
          if (intent) onIntentParsed(intent);
        }
      },
      onInterimText: (interim) => {
        if (interim.trim()) {
          const intent = parseDentalVoiceSpeech(interim.trim());
          if (intent) onIntentParsed(intent);
        }
      },
    });
    return () => unsub();
  }, [onTranscriptFinal, onIntentParsed]);

  const handleToggleVoice = useCallback(async () => {
    const client = UnifiedAudioClient.getInstance();
    if (isListening) {
      await client.stop();
      setIsListening(false);
    } else {
      try {
        await client.start();
        setIsListening(true);
        showToast("Диктовка включена: говорите в микрофон", "info");
      } catch {
        showToast("Не удалось запустить микрофон", "warning");
      }
    }
  }, [isListening]);

  return {
    isListening,
    audioVolume,
    handleToggleVoice,
  };
}
