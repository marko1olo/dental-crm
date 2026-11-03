/**
 * @file CopilotThinkingMessage.tsx
 * @description In-feed Extended Thinking message with accordion & duration timer (Mandate 8b <= 90 lines).
 */

import React, { useState, useEffect } from 'react';
import { Brain, ChevronDown } from 'lucide-react';
import type { CopilotUiMessage } from '../copilotTypes';

export interface CopilotThinkingMessageProps {
  message: Extract<CopilotUiMessage, { kind: 'thinking' }>;
}

export const CopilotThinkingMessage: React.FC<CopilotThinkingMessageProps> = ({ message }) => {
  const [expanded, setExpanded] = useState(false);
  const isStreaming = Boolean(message.streaming);
  const [elapsed, setElapsed] = useState<number>(() => {
    if (message.durationMs) return Number((message.durationMs / 1000).toFixed(1));
    return 0;
  });

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setElapsed((prev) => Number((prev + 0.1).toFixed(1)));
    }, 100);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const durationText = message.durationMs
    ? (message.durationMs / 1000).toFixed(1)
    : elapsed.toFixed(1);

  return (
    <div className="copilot-thinking-box my-1.5 rounded-xl border border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper-soft,rgba(15,118,110,0.04))] text-xs overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2.5 px-3 flex items-center justify-between text-left cursor-pointer hover:bg-[var(--teal,#0d9488)]/5 transition-colors select-none"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 text-[var(--teal-dark,#0f766e)] font-semibold truncate">
          <Brain size={13} className={isStreaming ? 'animate-pulse text-[var(--teal,#0d9488)]' : ''} />
          <span>{`Мышление модели (${durationText}с) • ${expanded ? 'Свернуть' : 'Раскрыть'}`}</span>
        </div>
        <ChevronDown size={14} className={`text-[var(--muted,#64748b)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="p-3 pt-2 border-t border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper,#ffffff)]/80 text-[11px] font-mono leading-relaxed text-[var(--ink,#0f172a)] whitespace-pre-wrap">
          {message.text}
          {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-[var(--teal,#0d9488)] animate-pulse align-middle" />}
        </div>
      )}
    </div>
  );
};
