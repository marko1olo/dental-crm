/**
 * ChairsideVoiceAssistant.tsx — Chairside Voice Dictation & Input Assistant Subcomponent.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent strictly <= 500 lines.
 * - Mandate 8e: Doctor Autonomy (send button NEVER disabled, instant access).
 * - Mandate 8l: 44px capsule ergonomics, acoustic VU-meter with 5 equalizer bars.
 * - 0% emojis, strictly Lucide vector icons.
 */

import React, { type RefObject } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { voiceMeterHeights } from "../../workspaceActions/voiceMeter";

export interface ChairsideVoiceAssistantProps {
  readonly isListening: boolean;
  readonly audioVolume: number;
  readonly inputText: string;
  readonly onInputChange: (val: string) => void;
  readonly onSubmit: (e?: React.FormEvent) => void;
  readonly onToggleVoice: () => void;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
}

export interface ChairsideCapsuleVoiceProps {
  readonly isListening: boolean;
  readonly audioVolume: number;
  readonly onToggleVoice: () => void;
}

/**
 * Capsule Microphone Button + 5-bar live VU-meter for the HUD header bar.
 */
export const ChairsideCapsuleVoiceControls: React.FC<ChairsideCapsuleVoiceProps> = ({
  isListening,
  audioVolume,
  onToggleVoice,
}) => {
  const vu = voiceMeterHeights(audioVolume, 5);

  return (
    <>
      <button
        type="button"
        className={`chairside-hud-btn-mic-capsule ${isListening ? "chairside-hud-btn-mic-capsule--active" : ""}`}
        onClick={onToggleVoice}
        title={isListening ? "Остановить запись микрофона" : "Включить голосовой ассистент у кресла"}
        data-testid="btn-capsule-mic"
        aria-label="Микрофон у кресла"
      >
        {isListening ? <MicOff size={13} /> : <Mic size={13} />}
      </button>

      <div
        className={`chairside-vu-meter ${isListening ? "chairside-vu-meter--active" : ""}`}
        aria-label="Индикатор звука микрофона"
        data-testid="chairside-vu-meter"
        title={isListening ? "Микрофон активен: идёт приём звука" : "Микрофон ожидает активации"}
      >
        {[0, 1, 2, 3, 4].map((idx) => {
          const maxH = [18, 20, 22, 20, 18][idx] ?? 20;
          const minH = [4, 6, 5, 6, 4][idx] ?? 4;
          const h = isListening && audioVolume > 0 ? `${Math.max(minH, Math.round(((vu[idx] ?? 0) / 100) * maxH))}px` : undefined;
          return <span key={idx} className={`chairside-vu-bar chairside-vu-bar--${idx + 1}`} style={h ? { height: h } : undefined} />;
        })}
      </div>
    </>
  );
};

/**
 * Footer Voice Dictation Bar & Text Form.
 */
export const ChairsideVoiceAssistant: React.FC<ChairsideVoiceAssistantProps> = ({
  isListening,
  inputText,
  onInputChange,
  onSubmit,
  onToggleVoice,
  inputRef,
}) => {
  return (
    <form className="chairside-hud-input-row" onSubmit={onSubmit}>
      <button
        type="button"
        className={`chairside-hud-btn-mic ${isListening ? "chairside-hud-btn-mic--active" : ""}`}
        onClick={onToggleVoice}
        title={isListening ? "Остановить запись" : "Включить голосовую надиктовку"}
        data-testid="btn-chairside-mic"
        aria-label="Микрофон"
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
      <input
        ref={inputRef}
        type="text"
        className="chairside-hud-input"
        placeholder="Продиктуйте или введите: зуб, манипуляции, диагноз..."
        value={inputText}
        onChange={(e) => onInputChange(e.target.value)}
        data-testid="input-chairside-prompt"
        aria-label="Запрос к копилоту"
      />
      <button
        type="submit"
        className="chairside-hud-btn-send"
        title="Отправить запрос ИИ-копилоту"
        data-testid="btn-chairside-send"
        aria-label="Отправить"
      >
        <Send size={15} />
      </button>
    </form>
  );
};
