import { useRef, useEffect, useCallback } from "react";
import { useUnifiedDictation } from "../../../hooks/useUnifiedDictation";
import { safeLocalStorageSetItem, safeLocalStorageRemoveItem } from "../../../lib/safeLocalStorage";

interface UseCopilotComposerDictationParams {
  value: string;
  onChange: (text: string) => void;
  organizationId?: string | null | undefined;
  patientId?: string | null | undefined;
  visitId?: string | null | undefined;
}

export function useCopilotComposerDictation({
  value,
  onChange,
  organizationId,
  patientId,
  visitId,
}: UseCopilotComposerDictationParams) {
  const baseTextRef = useRef<string>("");
  const lastEmittedRef = useRef<string>("");

  const dictation = useUnifiedDictation({
    preferredMode: "gemini_live",
    context: "chat",
    specialty: "therapy",
    organizationId,
    patientId,
    visitId,
  });

  const syncLiveText = useCallback(
    (accumulated: string, interim: string) => {
      const base = baseTextRef.current.trim();
      const spoken = `${accumulated || ""} ${interim || ""}`.trim();
      const combined = base ? (spoken ? `${base} ${spoken}` : base) : spoken;
      if (combined !== lastEmittedRef.current) {
        lastEmittedRef.current = combined;
        onChange(combined);
        try {
          if (combined.trim()) {
            safeLocalStorageSetItem("dente_copilot_draft_text", combined);
          } else {
            safeLocalStorageRemoveItem("dente_copilot_draft_text");
          }
        } catch {
          // ignore storage access errors
        }
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (dictation.isRecording) {
      syncLiveText(dictation.fullTranscript, dictation.interimText);
    }
  }, [dictation.isRecording, dictation.fullTranscript, dictation.interimText, syncLiveText]);

  const handleToggleVoice = async () => {
    if (dictation.isRecording) {
      await dictation.stopDictation();
    } else {
      baseTextRef.current = value || "";
      dictation.clearTranscript();
      await dictation.startDictation("gemini_live");
    }
  };

  const handleStopVoice = async () => {
    if (dictation.isRecording) {
      await dictation.stopDictation();
    }
  };

  return {
    ...dictation,
    baseTextRef,
    lastEmittedRef,
    handleToggleVoice,
    handleStopVoice,
  };
}
