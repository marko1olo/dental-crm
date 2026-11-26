/**
 * CopilotVoiceDock.tsx — Smart Replies, live Gemini-first voice banner with real
 * AnalyserNode / RMS visualizer, and composer row with single Primary CTA.
 */

import React from "react";
import { Mic, MicOff, Send, Sparkles } from "lucide-react";
import type { AudioStreamManager } from "../../audio/AudioStreamManager";
import { CanvasWaveform } from "../../audio/CanvasWaveform";
import type { SpeechGatewayHealthSummary } from "../../../hooks/useUnifiedDictation";
import type { UnifiedAudioMode } from "../../../services/voice/UnifiedAudioClient";
import type { CopilotChatMessage } from "./copilotStudioHelpers";

export interface CopilotVoiceDockProps {
  messages: CopilotChatMessage[];
  isStreaming: boolean;
  isListening: boolean;
  audioLevel: number;
  audioMode: UnifiedAudioMode;
  speechHealth: SpeechGatewayHealthSummary;
  streamManager: AudioStreamManager | null;
  inputText: string;
  onInputChange: (val: string) => void;
  onToggleListening: () => void;
  onStopListening: () => void;
  onSendMessage: (text?: string) => void;
}

export const CopilotVoiceDock: React.FC<CopilotVoiceDockProps> = ({
  messages,
  isStreaming,
  isListening,
  audioLevel,
  audioMode,
  speechHealth,
  streamManager,
  inputText,
  onInputChange,
  onToggleListening,
  onStopListening,
  onSendMessage,
}) => {
  const replies = [...messages].reverse().find((m) => m.role === "assistant")?.suggestedReplies;
  const analyserNode = streamManager?.getAnalyserNode() ?? null;
  const isFallback =
    audioMode === "browser_speech" || (speechHealth.checked && !speechHealth.cloudReady);
  const engineLabel = isFallback
    ? "Браузерный резерв (Web Speech)"
    : speechHealth.activeProviderLabel || "Gemini Live";

  return (
    <>
      {isListening && (
        <div
          className="copilot-voice-banner mx-5 mt-2.5 p-2.5 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary)]/30 flex items-center justify-between gap-2 text-xs shrink-0"
          data-testid="copilot-voice-listening-banner"
        >
          <div className="copilot-voice-status flex items-center gap-2.5 text-[var(--primary)] font-semibold min-w-0">
            <Mic size={15} className="shrink-0" />
            <div className="min-w-0">
              <div className="truncate">Идёт распознавание речи ({engineLabel})</div>
              {speechHealth.fallbackReason && (
                <div className="text-[10px] font-normal text-[var(--muted)] truncate">
                  {speechHealth.fallbackReason}
                </div>
              )}
            </div>
            {analyserNode && (
              <CanvasWaveform
                analyserNode={analyserNode}
                isRecording={isListening}
                width={84}
                height={22}
                mode="bars"
                barCount={10}
                showStatusBadge={false}
              />
            )}
          </div>
          <button
            type="button"
            onClick={onStopListening}
            className={[
              "h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] min-w-[44px] px-3.5 rounded-xl sm:rounded-lg",
              "bg-[var(--paper)] text-xs font-medium border border-[var(--line)] cursor-pointer",
              "flex items-center justify-center hover:bg-[var(--paper-soft)] shrink-0",
            ].join(" ")}
          >
            Стоп
          </button>
        </div>
      )}

      {replies?.length && !isStreaming ? (
        <div
          className="copilot-smart-replies-track px-3 sm:px-5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0"
          data-testid="copilot-smart-replies"
        >
          <span className="hidden sm:flex text-[11px] text-[var(--primary)] font-semibold shrink-0 items-center gap-1">
            <Sparkles size={12} className="text-[var(--primary)] shrink-0" />
            <span>Подсказки:</span>
          </span>
          {replies.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSendMessage(reply)}
              className={[
                "copilot-smart-reply-chip shrink-0 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-lg",
                "border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)]",
                "hover:border-[var(--primary)] text-[var(--ink)] text-xs font-medium",
                "whitespace-nowrap cursor-pointer transition-all shadow-2xs flex items-center",
              ].join(" ")}
            >
              {reply}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={[
          "copilot-bottom-composer px-3 sm:px-5 pt-2 pb-5",
          "max-md:pb-[calc(16px+env(safe-area-inset-bottom,0px))]",
          "border-t border-[var(--line)] bg-[var(--paper)] shrink-0 space-y-1.5",
        ].join(" ")}
      >
        <div className="copilot-input-row flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleListening}
            aria-label="Голосовой ввод"
            title={
              isFallback
                ? "Голосовой ввод (крайний браузерный резерв)"
                : `Голосовой ввод (${engineLabel})`
            }
            className={`copilot-icon-btn w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
              isListening
                ? "recording bg-[var(--danger)] text-white border-[var(--danger)]"
                : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            {isListening && (
              <div className="copilot-vu-meter flex items-end gap-0.5 h-3.5 px-0.5" aria-label="Индикатор звука">
                {[0.6, 1.0, 0.7].map((scale, idx) => (
                  <span
                    key={idx}
                    className="w-0.5 rounded-full bg-white transition-all duration-75"
                    style={{
                      height: `${Math.max(4, Math.min(14, Math.round(4 + audioLevel * 10 * scale)))}px`,
                    }}
                  />
                ))}
              </div>
            )}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSendMessage();
              }
            }}
            placeholder="Запрос или диктовка..."
            className={[
              "copilot-text-input flex-1 h-11 min-h-[44px] px-3.5 rounded-xl",
              "border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)]",
              "placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]",
            ].join(" ")}
          />

          <button
            type="button"
            onClick={() => onSendMessage()}
            className={[
              "copilot-icon-btn w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border",
              "border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
              "flex items-center justify-center cursor-pointer shadow-sm shrink-0",
            ].join(" ")}
            aria-label="Отправить запрос"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
};
