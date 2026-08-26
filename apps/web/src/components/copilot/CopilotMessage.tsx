import React, { useState } from 'react';
import { User, Sparkles, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import type { CopilotUiMessage, SlotResult, SelectIdHandler, BookSlotHandler, ConfirmHandler } from './copilotTypes';
import { CopilotMarkdown } from './CopilotMarkdown';
import { CopilotConfirmCard } from './CopilotConfirmCard';
import { CopilotResultCard } from './CopilotResultCard';

export interface CopilotMessageProps {
  message: CopilotUiMessage;
  nameCache?: Record<string, string> | undefined;
  onConfirm?: ConfirmHandler;
  onSelectPatient?: SelectIdHandler;
  onSelectAppointment?: SelectIdHandler;
  onBookSlot?: BookSlotHandler;
}

export const CopilotMessage: React.FC<CopilotMessageProps> = ({
  message,
  nameCache,
  onConfirm,
  onSelectPatient,
  onSelectAppointment,
  onBookSlot,
}) => {
  const [expanded, setExpanded] = useState(true);

  if (message.kind === 'text') {
    const isUser = message.role === 'user';
    return (
      <div className={`copilot-msg-row ${isUser ? 'user' : 'assistant'}`}>
        {!isUser && (
          <div className="copilot-msg-avatar assistant">
            <Sparkles size={16} />
          </div>
        )}
        <div className={`copilot-msg-bubble ${isUser ? 'user' : 'assistant'}`}>
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
          ) : (
            <CopilotMarkdown text={message.text} />
          )}
          {message.streaming && <span className="copilot-streaming-cursor" />}
        </div>
        {isUser && (
          <div className="copilot-msg-avatar user">
            <User size={16} />
          </div>
        )}
      </div>
    );
  }

  if (message.kind === 'tool') {
    const isRunning = message.status === 'running';
    const isDone = message.status === 'done';
    const hasCard = Boolean(isDone && message.result !== undefined && message.result !== null);
    const shortName = message.name.split('.').pop() || message.name;

    return (
      <div className="copilot-tool-box">
        <div
          onClick={() => {
            if (hasCard) setExpanded(!expanded);
          }}
          className="copilot-tool-top"
          style={{ cursor: hasCard ? 'pointer' : 'default' }}
        >
          <div className="copilot-tool-name">
            {isRunning ? (
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--teal)' }} />
            ) : isDone ? (
              <CheckCircle2 size={14} style={{ color: 'var(--green, #15803d)' }} />
            ) : (
              <XCircle size={14} style={{ color: 'var(--rust, #b91c1c)' }} />
            )}
            <span>
              {isRunning
                ? `Выполняется ${shortName}...`
                : isDone
                ? `Инструмент ${shortName} выполнен`
                : `Ошибка выполнения ${shortName}`}
            </span>
          </div>

          {hasCard && (
            <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
        </div>

        {hasCard && expanded && (
          <div style={{ marginTop: '6px' }}>
            <CopilotResultCard
              toolName={message.name}
              result={message.result}
              onSelectPatient={onSelectPatient}
              onSelectAppointment={onSelectAppointment}
              onBookSlot={onBookSlot}
            />
          </div>
        )}
      </div>
    );
  }

  if (message.kind === 'confirmation') {
    return (
      <div style={{ margin: '8px 0' }}>
        <CopilotConfirmCard
          callId={message.callId}
          name={message.name}
          args={message.args}
          nameCache={nameCache}
          onConfirm={onConfirm}
        />
      </div>
    );
  }

  return null;
};
