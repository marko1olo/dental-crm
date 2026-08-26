import React from 'react';
import { AlertTriangle, ShieldAlert, AlertCircle, Info, Pill, CheckCircle2 } from 'lucide-react';
import type { DrugInteractionItem } from './copilotTypes';

export interface CopilotDrugInteractionCardProps {
  interactions: DrugInteractionItem[];
  patientAllergies?: string[] | undefined;
  safeAlternatives?: string[] | undefined;
}

export const CopilotDrugInteractionCard: React.FC<CopilotDrugInteractionCardProps> = ({
  interactions,
  patientAllergies,
  safeAlternatives,
}) => {
  if (!interactions.length && (!patientAllergies || !patientAllergies.length)) {
    return (
      <div className="p-3 rounded-lg border border-[var(--ok-fg)]/30 bg-[var(--ok-bg)] text-xs text-[var(--ok-fg)] flex items-center gap-2 font-medium">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Лекарственные взаимодействия и аллергические риски не выявлены. Назначение безопасно.</span>
      </div>
    );
  }

  const hasCritical = interactions.some((i) =>
    ['contraindicated', 'high', 'critical'].includes((i.severity || '').toLowerCase())
  );

  return (
    <div
      className={`rounded-lg border p-3.5 shadow-sm space-y-2.5 transition-all ${
        hasCritical
          ? 'border-[var(--bad-fg)] bg-[var(--bad-bg)] ring-1 ring-[var(--bad-fg)]/20'
          : 'border-[var(--warn-fg)] bg-[var(--warn-bg)] ring-1 ring-[var(--warn-fg)]/20'
      }`}
    >
      <div className="flex items-center gap-2 font-bold text-xs">
        {hasCritical ? (
          <ShieldAlert className="w-4 h-4 text-[var(--bad-fg)] shrink-0 animate-bounce" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-[var(--warn-fg)] shrink-0" />
        )}
        <span className={hasCritical ? 'text-[var(--bad-fg)]' : 'text-[var(--warn-fg)]'}>
          {hasCritical ? 'КАТЕГОРИЧЕСКИ ПРОТИВОПОКАЗАНО' : 'ВНИМАНИЕ: ФАРМАКОЛОГИЧЕСКИЙ РИСК'}
        </span>
      </div>

      {/* Interactions list */}
      <div className="space-y-2">
        {interactions.map((item, idx) => {
          const isCrit = ['contraindicated', 'high', 'critical'].includes((item.severity || '').toLowerCase());
          const collidingDrugs = item.drugs
            ? item.drugs.join(' + ')
            : item.medicationA && item.medicationB
            ? `${item.medicationA} ↔ ${item.medicationB}`
            : item.title || 'Комбинация препаратов';

          return (
            <div
              key={item.id || idx}
              className="p-2.5 rounded-md bg-[var(--paper-strong)] border border-[var(--line)] text-xs space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
                  <span>{collidingDrugs}</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    isCrit ? 'bg-[var(--bad-bg)] text-[var(--bad-fg)]' : 'bg-[var(--warn-bg)] text-[var(--warn-fg)]'
                  }`}
                >
                  {isCrit ? 'Противопоказано' : 'Осторожно'}
                </span>
              </div>

              <p className="text-[var(--ink)] leading-relaxed">{item.description}</p>

              {(item.medical_advice || item.clinical_recommendation) && (
                <div className="p-2 rounded bg-[var(--paper-soft)] border-l-2 border-[var(--teal)] text-[11px] text-[var(--ink)]">
                  <strong className="text-[var(--teal)]">Клиническая рекомендация:</strong>{' '}
                  {item.medical_advice || item.clinical_recommendation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Allergies banner if any */}
      {patientAllergies && patientAllergies.length > 0 && (
        <div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--bad-fg)]/40 text-xs text-[var(--bad-fg)] flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            <strong>Аллергический анамнез пациента:</strong> {patientAllergies.join(', ')}
          </div>
        </div>
      )}

      {/* Safe alternatives if any */}
      {safeAlternatives && safeAlternatives.length > 0 && (
        <div className="p-2 rounded bg-[var(--paper-strong)] border border-[var(--teal)]/40 text-xs text-[var(--ink)] space-y-1">
          <span className="text-[11px] font-semibold text-[var(--teal)] flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Рекомендуемые безопасные альтернативы:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {safeAlternatives.map((alt, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] font-medium text-[11px]">
                {alt}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
