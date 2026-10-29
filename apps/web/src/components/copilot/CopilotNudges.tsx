import React, { useState } from 'react';
import type { CopilotNudge } from './copilotTypes';
import { useVisitStore } from '../../store/visitStore';
import { CopilotNudgeCard } from './nudges/CopilotNudgeCard';

export interface CopilotNudgesProps {
  nudges: CopilotNudge[];
  onAct?: ((prompt: string) => void) | undefined;
  onAction?: ((nudge: CopilotNudge) => void) | undefined;
  onApplyClinicalDiary?: ((nudge: CopilotNudge) => void) | undefined;
  onApply043?: ((nudge: CopilotNudge) => void) | undefined;
  onDismiss: (id: string) => void;
}

export const CopilotNudges: React.FC<CopilotNudgesProps> = ({
  nudges,
  onAct,
  onAction,
  onApplyClinicalDiary,
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

  const handleApplyDiary = (nudge: CopilotNudge) => {
    const note = (nudge.payload?.clinicalDiary || nudge.payload?.form043) as
      | {
          tooth?: number | string;
          diagnosis?: string;
          complaint?: string;
          anamnesis?: string;
          objectiveStatus?: string;
          treatmentPlan?: string;
        }
      | undefined;

    if (note) {
      useVisitStore.getState().setVisitNoteForm({
        complaint: note.complaint || '',
        anamnesis: note.anamnesis || '',
        objectiveStatus: note.objectiveStatus || '',
        diagnosis: note.diagnosis || '',
        treatmentPlan: note.treatmentPlan || '',
      });
    }

    if (onApplyClinicalDiary) {
      onApplyClinicalDiary(nudge);
    } else if (onApply043) {
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
          onApplyClinicalDiary={handleApplyDiary}
          onApply043={handleApplyDiary}
          onTrigger={handleTrigger}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};
