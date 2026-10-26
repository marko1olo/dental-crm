import React, { useState } from 'react';
import { Brain, ChevronUp, ChevronDown } from 'lucide-react';
import type { CopilotUiMessage } from '../copilotTypes';

export interface CopilotThinkingMessageProps {
  message: Extract<CopilotUiMessage, { kind: 'thinking' }>;
}

export const CopilotThinkingMessage: React.FC<CopilotThinkingMessageProps> = ({ message }) => {
  const [expanded, setExpanded] = useState(true);
  const isStreaming = Boolean(message.streaming);

  return (
    <div
      className="copilot-thinking-box"
      style={{
        margin: '6px 0',
        padding: '8px 12px',
        borderRadius: '8px',
        backgroundColor: 'var(--paper-soft, rgba(15, 118, 110, 0.04))',
        border: '1px solid var(--line, rgba(15, 118, 110, 0.15))',
        fontSize: '12px',
        color: 'var(--ink, #0f172a)',
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--teal-dark, #0f766e)', fontWeight: 600 }}>
          <Brain size={14} className={isStreaming ? 'animate-pulse' : undefined} />
          <span>{isStreaming ? 'Рассуждение ИИ (в процессе)...' : 'Ход рассуждения ИИ'}</span>
        </div>
        <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>

      {expanded && (
        <div
          style={{
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px dashed var(--line, rgba(15, 118, 110, 0.15))',
            color: 'var(--muted, #64748b)',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
        >
          {message.text}
          {isStreaming && <span className="copilot-streaming-cursor" />}
        </div>
      )}
    </div>
  );
};
