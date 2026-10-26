import React, { useState } from 'react';
import type { CopilotNudge } from './copilotTypes';
import { useVisitStore } from '../../store/visitStore';
import { CopilotNudgeCard } from './nudges/CopilotNudgeCard';

export interface CopilotNudgesProps {
  nudges: CopilotNudge[];
  onAct?: ((prompt: string) => void) | undefined;
  onAction?: ((nudge: CopilotNudge) => void) | undefined;
  onApply043?: ((nudge: CopilotNudge) => void) | undefined;
  onDismiss: (id: string) => void;
}

export const CopilotNudges: React.FC<CopilotNudgesProps> = ({
  nudges,
  onAct,
  onAction,
  onApply043,
  onDismiss,
}) => {
  const [appliedId, setAppliedId] = useState<string | null>(null);

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

  const handleApply043 = (nudge: CopilotNudge) => {
    const f043 = nudge.payload?.form043 as
      | {
          tooth?: number | string;
          diagnosis?: string;
          complaint?: string;
          anamnesis?: string;
          objectiveStatus?: string;
          treatmentPlan?: string;
        }
      | undefined;

    if (f043) {
      useVisitStore.getState().setVisitNoteForm({
        complaint: f043.complaint || '',
        anamnesis: f043.anamnesis || '',
        objectiveStatus: f043.objectiveStatus || '',
        diagnosis: f043.diagnosis || '',
        treatmentPlan: f043.treatmentPlan || '',
      });
    }

    if (onApply043) {
      onApply043(nudge);
    }

    setAppliedId(nudge.id);
    setTimeout(() => {
      onDismiss(nudge.id);
    }, 1200);
  };

  return (
    <div style={{ padding: '8px 12px 0 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {nudges.map((nudge) => (
        <CopilotNudgeCard
          key={nudge.id}
          nudge={nudge}
          isApplied={appliedId === nudge.id}
          onApply043={handleApply043}
          onTrigger={handleTrigger}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};
