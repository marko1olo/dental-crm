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
  <form onSubmit={onSubmit} className="chairside-hud-composer flex items-center gap-2 pt-1">
    <input
      type="text"
      value={promptInput}
      onChange={(e) => onPromptInputChange(e.target.value)}
      placeholder="Команда ассистенту..."
      className="input-chairside-prompt flex-1 h-9 max-sm:min-h-[44px] max-sm:h-11 px-3 text-sm rounded-lg max-sm:rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
    />
    <button
      type="button"
      onClick={onToggleVoice}
      className={`btn-chairside-mic h-9 w-9 min-w-[36px] max-sm:min-h-[44px] max-sm:min-w-[44px] max-sm:h-11 max-sm:w-11 rounded-lg max-sm:rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
        isListening
          ? "bg-[var(--danger)] text-white border-[var(--danger)] animate-pulse"
          : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
      }`}
      aria-label="Голос"
    >
      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
    <button
      type="submit"
      className="btn-chairside-send h-9 px-3.5 max-sm:min-h-[44px] max-sm:h-11 max-sm:px-4 rounded-lg max-sm:rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:text-[var(--primary)] hover:border-[var(--primary)] text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
      aria-label="Отправить"
    >
      <Send size={14} className="shrink-0" />
      <span className="hidden sm:inline">Отправить</span>
    </button>
  </form>
);
