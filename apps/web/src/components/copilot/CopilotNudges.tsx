import React, { useState, useCallback } from 'react';
import { X, Sparkles, ArrowRight, Check, FileText, Stethoscope, Syringe } from 'lucide-react';
import type { CopilotNudge } from './copilotTypes';
import { useVisitStore } from '../../store/visitStore';

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
      {nudges.map((nudge) => {
        const isCancelled = nudge.kind === 'appointment_cancelled';
        const isClinical = nudge.kind === 'clinical_tooth_protocol' || Boolean(nudge.payload?.form043);
        const isApplied = appliedId === nudge.id;

        const title = (nudge.payload?.title as string) || (isClinical ? 'КЛИНИЧЕСКИЙ ПРОТОКОЛ СТАР' : 'УМНАЯ ПОДСКАЗКА DENTE');
        const description =
          (nudge.payload?.description as string) ||
          (nudge.payload?.text as string) ||
          (isCancelled
            ? 'Приём на сегодня отменён — освободилось окно в расписании. Предложить пациенту из листа ожидания?'
            : '');

        const tooth = nudge.payload?.tooth as number | string | undefined;
        const icd10 = nudge.payload?.icd10 as string | undefined;
        const anesthesia = nudge.payload?.anesthesia as string | undefined;

        return (
          <div
            key={nudge.id}
            className="copilot-nudge-card"
            style={{
              borderColor: isApplied ? 'var(--teal, #0d9488)' : isClinical ? 'var(--teal-surface, rgba(13, 148, 136, 0.35))' : undefined,
              backgroundColor: isApplied ? 'var(--teal-soft, rgba(13, 148, 136, 0.08))' : undefined,
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <div className="copilot-nudge-icon" style={{ color: isClinical ? 'var(--teal, #0d9488)' : undefined }}>
              {isApplied ? <Check size={16} /> : isClinical ? <Stethoscope size={16} /> : <Sparkles size={16} />}
            </div>
            <div className="copilot-nudge-content">
              <div className="copilot-nudge-header">
                <span className="copilot-nudge-title" style={{ color: isClinical ? 'var(--teal-strong, #0f766e)' : undefined }}>
                  {title}
                </span>
                <button
                  type="button"
                  onClick={() => onDismiss(nudge.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  title="Скрыть подсказку"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Clinical Chips for Active Tooth, ICD-10 and Anesthesia */}
              {isClinical && (tooth !== undefined || icd10 || anesthesia) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                  {tooth !== undefined && (
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'var(--paper-strong, #fff)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                      {`Зуб #${tooth}`}
                    </span>
                  )}
                  {icd10 && (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'var(--teal-soft, #ccfbf1)', color: 'var(--teal-strong, #0f766e)' }}>
                      {`МКБ-10: ${icd10}`}
                    </span>
                  )}
                  {anesthesia && (
                    <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '4px', background: 'var(--paper-soft, #f1f5f9)', color: 'var(--muted, #64748b)' }}>
                      <Syringe size={10} />
                      <span>{anesthesia}</span>
                    </span>
                  )}
                </div>
              )}

              {description && <p className="copilot-nudge-text">{description}</p>}

              <div className="copilot-nudge-actions" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {isClinical && (
                  <button
                    type="button"
                    onClick={() => handleApply043(nudge)}
                    className="copilot-nudge-btn"
                    style={{
                      backgroundColor: isApplied ? 'var(--teal, #0d9488)' : 'var(--teal, #0d9488)',
                      color: 'var(--on-teal, #ffffff)',
                      border: 'none',
                      fontWeight: 600,
                    }}
                    disabled={isApplied}
                  >
                    {isApplied ? (
                      <>
                        <Check size={14} />
                        <span>Внесено в 043/у!</span>
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        <span>1 клик в 043/у</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleTrigger(nudge)}
                  className="copilot-nudge-btn"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line, rgba(15, 118, 110, 0.2))',
                    color: 'var(--ink)',
                  }}
                >
                  <span>Обсудить</span>
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
