import React from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import type { CopilotNudge } from './copilotTypes';

export interface CopilotNudgesProps {
  nudges: CopilotNudge[];
  onAct?: ((prompt: string) => void) | undefined;
  onAction?: ((nudge: CopilotNudge) => void) | undefined;
  onDismiss: (id: string) => void;
}

export const CopilotNudges: React.FC<CopilotNudgesProps> = ({
  nudges,
  onAct,
  onAction,
  onDismiss,
}) => {
  if (!nudges || nudges.length === 0) return null;

  const handleTrigger = (nudge: CopilotNudge) => {
    if (onAction) {
      onAction(nudge);
    } else if (onAct) {
      const promptText =
        (nudge.payload?.actionPrompt as string) ||
        (nudge.payload?.description as string) ||
        (nudge.payload?.text as string) ||
        'Помоги обработать рекомендацию клиники';
      onAct(promptText);
    }
  };

  return (
    <div style={{ padding: '8px 12px 0 12px', boxSizing: 'border-box' }}>
      {nudges.map((nudge) => {
        const isCancelled = nudge.kind === 'appointment_cancelled';
        const title = (nudge.payload?.title as string) || 'УМНАЯ ПОДСКАЗКА DENTE';
        const description =
          (nudge.payload?.description as string) ||
          (nudge.payload?.text as string) ||
          (isCancelled
            ? 'Приём на сегодня отменён — освободилось окно в расписании. Предложить пациенту из листа ожидания?'
            : '');

        return (
          <div key={nudge.id} className="copilot-nudge-card">
            <div className="copilot-nudge-icon">
              <Sparkles size={16} />
            </div>
            <div className="copilot-nudge-content">
              <div className="copilot-nudge-header">
                <span className="copilot-nudge-title">{title}</span>
                <button
                  type="button"
                  onClick={() => onDismiss(nudge.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  title="Скрыть подсказку"
                >
                  <X size={14} />
                </button>
              </div>
              {description && <p className="copilot-nudge-text">{description}</p>}
              <div className="copilot-nudge-actions">
                <button
                  type="button"
                  onClick={() => handleTrigger(nudge)}
                  className="copilot-nudge-btn"
                >
                  <span>Разобраться</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
