import React from 'react';
import type { CopilotUiMessage, SelectIdHandler, BookSlotHandler, ConfirmHandler } from './copilotTypes';
import { CopilotActionConfirm } from './CopilotActionConfirm';
import { CopilotReactTracker } from './CopilotGenerativeCards';
import { CopilotTextMessage } from './message/CopilotTextMessage';
import { CopilotToolMessage } from './message/CopilotToolMessage';
import { CopilotThinkingMessage } from './message/CopilotThinkingMessage';

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
  if (message.kind === 'text') {
    return <CopilotTextMessage message={message} />;
  }

  if (message.kind === 'tool') {
    return (
      <CopilotToolMessage
        message={message}
        onSelectPatient={onSelectPatient}
        onSelectAppointment={onSelectAppointment}
        onBookSlot={onBookSlot}
      />
    );
  }

  if (message.kind === 'thinking') {
    return <CopilotThinkingMessage message={message} />;
  }

  if (message.kind === 'confirmation') {
    return (
      <div style={{ margin: '8px 0' }}>
        <CopilotActionConfirm
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
