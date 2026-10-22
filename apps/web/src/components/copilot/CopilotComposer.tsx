import React, { useRef, useEffect } from "react";
import { Send, Mic, MicOff } from "lucide-react";
import { useAudioFeedback } from "../../hooks/useAudioFeedback";
import { showToast } from "../GlobalToast";
import { safeLocalStorageSetItem, safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import { CopilotDictationBanner } from "./composer/CopilotDictationBanner";
import { CopilotComposerFooter } from "./composer/CopilotComposerFooter";
import { useCopilotComposerDictation } from "./composer/useCopilotComposerDictation";
import type { CopilotComposerProps } from "./composer/composerTypes";

export type { CopilotComposerProps };

export const DEFAULT_CLINICAL_PROMPT = "Проанализируй состояние пациента и подготовь рекомендации для дневника приёма";

export const CopilotComposer: React.FC<CopilotComposerProps> = ({
  value, busy, onChange, onSubmit, onReset, organizationId, patientId, visitId,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { playActionSuccess } = useAudioFeedback();
  const dict = useCopilotComposerDictation({ value, onChange, organizationId, patientId, visitId });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleTextChange = (newText: string) => {
    dict.baseTextRef.current = newText;
    onChange(newText);
    dict.lastEmittedRef.current = newText;
    try {
      if (newText.trim()) safeLocalStorageSetItem("dente_copilot_draft_text", newText);
      else safeLocalStorageRemoveItem("dente_copilot_draft_text");
    } catch { /* ignore */ }
  };

  const handleSend = () => {
    if (busy) return;
    if (!value.trim()) {
      handleTextChange(DEFAULT_CLINICAL_PROMPT);
      showToast("Подставлен клинический запрос по умолчанию", "info");
      textareaRef.current?.focus();
      return;
    }
    if (dict.isRecording) void dict.stopDictation();
    void playActionSuccess();
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="copilot-composer">
      {dict.isRecording && (
        <CopilotDictationBanner
          dictationMode={dict.mode} isSpeaking={dict.isSpeaking} audioLevel={dict.audioLevel}
          onStopVoice={dict.handleStopVoice}
        />
      )}

      <div className="copilot-composer-box">
        {dict.isRecording ? (
          <div className="copilot-two-layer-display" data-testid="copilot-two-layer-stream" aria-live="polite">
            {dict.baseTextRef.current && <span className="copilot-stream-base">{dict.baseTextRef.current} </span>}
            <span className="copilot-stream-final">{dict.fullTranscript}</span>
            {dict.interimText.trim() && <span className="copilot-stream-interim">{dict.fullTranscript.trim() ? " " : ""}{dict.interimText.trim()}</span>}
            {!dict.baseTextRef.current && !dict.fullTranscript.trim() && !dict.interimText.trim() && (
              <span style={{ color: "var(--muted, #6b7280)" }}>
                <Mic size={14} className="inline mr-1 text-[var(--teal)] animate-pulse" /> Говорите... ДЕНТА слушает и транскрибирует в реальном времени...
              </span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef} value={value} onChange={(e) => handleTextChange(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Спросить ДЕНТУ или отдать команду врачебного протокола..." disabled={busy} rows={1}
            className="copilot-textarea" aria-label="Поле ввода запроса или голосовой надиктовки"
          />
        )}

        <button
          type="button" onClick={dict.handleToggleVoice}
          className={`copilot-icon-btn copilot-mic-btn ${dict.isRecording ? "active recording" : ""}`}
          title={dict.isRecording ? "Остановить надиктовку речи" : "Голосовая надиктовка ДЕНТА (Gemini 3.5 Transcribe Live)"}
          aria-label={dict.isRecording ? "Остановить запись речи" : "Голосовая надиктовка ДЕНТА"}
          data-testid="copilot-mic-btn"
        >
          {dict.isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button
          type="button" onClick={handleSend} disabled={busy} className="copilot-send-btn"
          title="Отправить (Enter)" aria-label="Отправить сообщение"
        >
          <Send size={16} />
        </button>
      </div>

      <CopilotComposerFooter onReset={onReset} />
    </div>
  );
};
export default CopilotComposer;
