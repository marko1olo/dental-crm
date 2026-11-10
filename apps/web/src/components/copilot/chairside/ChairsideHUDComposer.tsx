import React from "react";
import { Mic, MicOff, Send } from "lucide-react";

export interface ChairsideHUDComposerProps {
  promptInput: string;
  onPromptInputChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isListening: boolean;
  onToggleVoice: () => void;
}

export const ChairsideHUDComposer: React.FC<ChairsideHUDComposerProps> = ({
  promptInput,
  onPromptInputChange,
  onSubmit,
  isListening,
  onToggleVoice,
}) => (
  <form onSubmit={onSubmit} className="chairside-hud-composer flex gap-1.5 pt-1">
    <input
      type="text"
      value={promptInput}
      onChange={(e) => onPromptInputChange(e.target.value)}
      placeholder="Команда ассистенту..."
      className="input-chairside-prompt flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
    />
    <button
      type="button"
      onClick={onToggleVoice}
      className="btn-chairside-mic px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)]"
      aria-label="Голос"
    >
      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
    </button>
    <button
      type="submit"
      className="btn-chairside-send px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:text-[var(--teal)] hover:border-[var(--teal)] text-xs font-semibold flex items-center gap-1 transition-colors"
      aria-label="Отправить"
    >
      <Send size={12} />
    </button>
  </form>
);
