import React from "react";
import { Check } from "lucide-react";

interface CopilotDictationBannerProps {
  dictationMode: string;
  isSpeaking: boolean;
  audioLevel: number;
  onStopVoice: () => void;
}

export const CopilotDictationBanner: React.FC<CopilotDictationBannerProps> = ({
  dictationMode,
  isSpeaking,
  audioLevel,
  onStopVoice,
}) => {
  const modeLabel =
    dictationMode === "gemini_live"
      ? "Gemini 3.5 Transcribe Live"
      : dictationMode === "server_whisper"
      ? "Server Whisper"
      : "Web Speech Live";

  return (
    <div className="copilot-dictation-banner" data-testid="copilot-dictation-banner">
      <div className="copilot-dictation-meta">
        <span className="copilot-recording-dot" />
        <span className="copilot-dictation-title">{modeLabel}</span>
        <span className="copilot-dictation-state">
          {isSpeaking ? "• Распознавание..." : "• Слушаю микрофон..."}
        </span>
      </div>

      <div className="copilot-vu-meter-bar-container" aria-label="VU-метр микрофона" title="Уровень звука">
        {[0.4, 0.8, 1.3, 0.9, 0.5].map((factor, idx) => {
          const heightPx = Math.max(4, Math.min(22, 4 + audioLevel * factor * 22));
          return (
            <span
              key={idx}
              className="copilot-vu-equalizer-bar"
              style={{
                height: `${heightPx}px`,
                backgroundColor: isSpeaking ? "var(--teal, #0d9488)" : "var(--muted, #6b7280)",
              }}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={onStopVoice}
        className="copilot-stop-dictation-btn"
        title="Завершить надиктовку и сохранить текст"
      >
        <Check size={14} />
        <span>Готово</span>
      </button>
    </div>
  );
};
