import React, { useState } from 'react';
import { User, Sparkles, CheckCircle2, AlertTriangle, Loader2, ChevronDown, ChevronUp, XCircle, Brain } from 'lucide-react';
import type { CopilotUiMessage, SlotResult, SelectIdHandler, BookSlotHandler, ConfirmHandler } from './copilotTypes';
import { CopilotMarkdown } from './CopilotMarkdown';
import { CopilotConfirmCard } from './CopilotConfirmCard';
import { CopilotResultCard } from './CopilotResultCard';
import { CopilotReactTracker } from './CopilotGenerativeCards';
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

  if (message.kind === 'thinking') {
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

  if (message.kind === 'react_steps') {
    return (
      <div style={{ margin: '8px 0' }}>
        <CopilotReactTracker
          title={message.title}
          steps={message.steps}
          currentStepIndex={message.currentStepIndex}
          isComplete={message.isComplete}
          totalDurationMs={message.totalDurationMs}
        />
      </div>
    );
  }

  return null;
};
