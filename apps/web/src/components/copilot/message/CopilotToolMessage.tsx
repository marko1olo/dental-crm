import React, { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown } from 'lucide-react';
import type { CopilotUiMessage, SelectIdHandler, BookSlotHandler } from '../copilotTypes';
import { CopilotResultCard } from '../CopilotResultCard';

export interface CopilotToolMessageProps {
  message: Extract<CopilotUiMessage, { kind: 'tool' }>;
  onSelectPatient?: SelectIdHandler;
  onSelectAppointment?: SelectIdHandler;
  onBookSlot?: BookSlotHandler;
}

export const CopilotToolMessage: React.FC<CopilotToolMessageProps> = ({
  message,
  onSelectPatient,
  onSelectAppointment,
  onBookSlot,
}) => {
  const [expanded, setExpanded] = useState(true);
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
};
