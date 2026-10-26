import React, { useState } from 'react';
import { AlertCircle, Pill, Check } from 'lucide-react';
import type { DrugInteractionItem } from './copilotTypes';

export interface CopilotDrugInteractionCardProps {
  interactions: DrugInteractionItem[];
  patientAllergies?: string[] | undefined;
  safeAlternatives?: string[] | undefined;
  onConfirm?: () => void;
  onApprove?: () => void;
}

export const CopilotDrugInteractionCard: React.FC<CopilotDrugInteractionCardProps> = ({
  interactions,
  patientAllergies,
  safeAlternatives,
  onConfirm,
  onApprove,
}) => {
  const [approved, setApproved] = useState(false);

  const handleApprove = () => {
    setApproved(true);
    onApprove?.();
    onConfirm?.();
  };

  if (!interactions.length && (!patientAllergies || !patientAllergies.length)) {
    return (
      <div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--muted)] flex items-center gap-2">
        <span>Лекарственные взаимодействия не выявлены.</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-3 shadow-xs space-y-2">
      {/* Passive unobtrusive bar (Mandates 8e, 8y) */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-[var(--ink)] font-medium">
          <span>⚠️</span>
          <span>Возможна чувствительность к препарату</span>
        </div>
        <button
          type="button"
          onClick={handleApprove}
          className="copilot-btn-primary px-3 py-1 rounded text-xs font-semibold text-white bg-[var(--primary)] flex items-center gap-1"
          title="Утвердить назначение врача в 1 клик"
        >
          <Check size={13} />
          <span>{approved ? 'Утверждено врачом' : 'Утвердить'}</span>
        </button>
      </div>

      <div className="space-y-1.5">
        {interactions.map((item, idx) => {
          const isCrit = ['contraindicated', 'high', 'critical'].includes((item.severity || '').toLowerCase());
          const drugTitle = item.drugs?.join(' + ') ||
            (item.medicationA && item.medicationB ? `${item.medicationA} ↔ ${item.medicationB}` : item.title || 'Препарат');

          return (
            <div key={item.id || idx} className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1">
                  <Pill className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
                  <span>{drugTitle}</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]">
                  {isCrit ? 'ПРОТИВОПОКАЗАНО' : 'Осторожно'}
                </span>
              </div>
              {item.description && <p className="text-[var(--ink-secondary)] leading-relaxed text-[11px]">{item.description}</p>}
              {(item.medical_advice || item.clinical_recommendation) && (
                <div className="p-1.5 rounded bg-[var(--paper-strong)] text-[11px] text-[var(--ink)]">
                  <strong className="text-[var(--teal)]">Клиническая рекомендация:</strong>{' '}
                  {item.medical_advice || item.clinical_recommendation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {patientAllergies && patientAllergies.length > 0 && (
        <div className="p-1.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--warn-fg,#d97706)] shrink-0" />
          <span>Аллергоанамнез: {patientAllergies.join(', ')}</span>
        </div>
      )}

      {safeAlternatives && safeAlternatives.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px]">
          <span className="text-[var(--muted)]">Безопасные аналоги:</span>
          {safeAlternatives.map((alt, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--ink)] font-medium">
              {alt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
