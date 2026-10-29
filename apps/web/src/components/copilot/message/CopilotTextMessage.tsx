import React from 'react';
import { User, Sparkles } from 'lucide-react';
import type { CopilotUiMessage } from '../copilotTypes';
import { CopilotMarkdown } from '../CopilotMarkdown';
import { parseCopilotUiContextHeader } from '../CopilotContextSync';

export interface CopilotTextMessageProps {
  message: Extract<CopilotUiMessage, { kind: 'text' }>;
}

export const CopilotTextMessage: React.FC<CopilotTextMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const parsed = isUser ? parseCopilotUiContextHeader(message.text) : null;
  const displayText = parsed?.context ? parsed.cleanText : message.text;
  const ctx = parsed?.context;

  if (!displayText?.trim() && !message.streaming) return null;

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
};
