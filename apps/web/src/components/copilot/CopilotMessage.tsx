import React, { useState } from 'react';
import { User, Sparkles, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import type { CopilotUiMessage, SlotResult, SelectIdHandler, BookSlotHandler, ConfirmHandler } from './copilotTypes';
import { CopilotMarkdown } from './CopilotMarkdown';
import { CopilotConfirmCard } from './CopilotConfirmCard';
import { CopilotResultCard } from './CopilotResultCard';
import { parseCopilotUiContextHeader } from './CopilotContextSync';

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
    const parsed = isUser ? parseCopilotUiContextHeader(message.text) : null;
    const displayText = parsed?.context ? parsed.cleanText : message.text;
    const ctx = parsed?.context;

    return (
      <div className={`copilot-msg-row ${isUser ? 'user' : 'assistant'}`}>
        {!isUser && (
          <div className="copilot-msg-avatar assistant">
            <Sparkles size={16} />
          </div>
        )}
        <div className={`copilot-msg-bubble ${isUser ? 'user' : 'assistant'}`}>
          {isUser ? (
            <div>
              {ctx && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '4px',
                    fontSize: '10px',
                    opacity: 0.9,
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.25)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 600,
                    }}
                  >
                    {ctx.viewLabel || ctx.view}
                  </span>
                  {ctx.activeTooth !== null && ctx.activeTooth !== undefined && (
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.25)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 600,
                      }}
                    >
                      {`Зуб #${ctx.activeTooth}`}
                    </span>
                  )}
                  {ctx.patientId && (
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.25)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      #{ctx.patientId.slice(0, 6)}
                    </span>
                  )}
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap' }}>{displayText}</div>
            </div>
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
          resolved={message.resolved}
          nameCache={nameCache}
          onConfirm={onConfirm ? (id, dec, mod, reas) => onConfirm(id, dec, mod, reas) : undefined}
        />
      </div>
    );
  }

  return null;
};
