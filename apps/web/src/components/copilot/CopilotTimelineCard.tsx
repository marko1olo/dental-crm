import React from 'react';
import { Calendar, Stethoscope, FileText, CreditCard, Package, ChevronRight, Activity, Clock } from 'lucide-react';
import type { TimelineEventItem, SelectIdHandler } from './copilotTypes';
import { formatDateTime } from './useCopilotFormat';

export interface CopilotTimelineCardProps {
  events: TimelineEventItem[];
  patientId?: string | undefined;
  onSelectEvent?: ((event: TimelineEventItem) => void) | undefined;
  onSelectPatient?: SelectIdHandler;
}

const TYPE_ICONS: Record<string, { icon: React.ReactNode; bg: string; fg: string }> = {
  visit: {
    icon: <Stethoscope className="w-3.5 h-3.5" />,
    bg: 'var(--teal-soft)',
    fg: 'var(--teal)',
  },
  diagnosis: {
    icon: <Activity className="w-3.5 h-3.5" />,
    bg: 'var(--warn-bg)',
    fg: 'var(--warn-fg)',
  },
  treatment_stage: {
    icon: <FileText className="w-3.5 h-3.5" />,
    bg: 'var(--ok-bg)',
    fg: 'var(--ok-fg)',
  },
  payment: {
    icon: <CreditCard className="w-3.5 h-3.5" />,
    bg: 'var(--paper-soft)',
    fg: 'var(--ink)',
  },
  lab_order: {
    icon: <Package className="w-3.5 h-3.5" />,
    bg: 'var(--warn-bg)',
    fg: 'var(--warn-fg)',
  },
};

export const CopilotTimelineCard: React.FC<CopilotTimelineCardProps> = ({
  events,
  patientId,
  onSelectEvent,
  onSelectPatient,
}) => {
  if (!events.length) {
    return (
      <div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)] text-center">
        Хронологическая история приёмов и лечения пуста
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-[var(--teal)]" />
          <span>Клиническая хронология ({events.length})</span>
        </span>
        {patientId && onSelectPatient && (
          <button
            type="button"
            onClick={() => onSelectPatient(patientId)}
            className="text-xs font-semibold text-[var(--teal)] hover:underline flex items-center gap-0.5 min-h-[32px] px-1.5 py-1 rounded transition-colors"
          >
            <span>Вся ЭМК</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--line)]">
        {events.map((ev) => {
          const typeConf = TYPE_ICONS[ev.type] || {
            icon: <Clock className="w-3.5 h-3.5" />,
            bg: 'var(--paper-soft)',
            fg: 'var(--muted)',
          };

          return (
            <div
              key={ev.id}
              onClick={() => onSelectEvent?.(ev)}
              className={`relative p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] transition-all shadow-2xs space-y-1.5 ${
                onSelectEvent ? 'cursor-pointer hover:border-[var(--teal)] hover:shadow-sm' : ''
              }`}
            >
              {/* Node dot */}
              <div
                className="absolute -left-[19px] top-3 w-5 h-5 rounded-full border-2 border-[var(--paper)] flex items-center justify-center shadow-xs"
                style={{ backgroundColor: typeConf.bg, color: typeConf.fg }}
              >
                {typeConf.icon}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-[var(--ink)] leading-snug">{ev.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{formatDateTime(ev.date)}</p>
                </div>

                {ev.icd10 || ev.diagnosis_code ? (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal-dark,#0f766e)] border border-[var(--teal-surface)] shrink-0">
                    МКБ {ev.icd10 || ev.diagnosis_code}
                  </span>
                ) : ev.amount_rub ? (
                  <span className="text-xs font-bold text-[var(--ok-fg)] shrink-0 tabular-nums">
                    {ev.amount_rub.toLocaleString('ru-RU')} ₽
                  </span>
                ) : null}
              </div>

              {ev.doctor_name && (
                <p className="text-xs text-[var(--muted)]">
                  Врач: <span className="text-[var(--ink)] font-medium">{ev.doctor_name}</span>
                  {ev.specialty && <span className="text-[var(--muted)]"> ({ev.specialty})</span>}
                </p>
              )}

              {ev.teeth && ev.teeth.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ev.teeth.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)]">
                      Зуб {t}
                    </span>
                  ))}
                </div>
              )}

              {ev.description && (
                <p className="text-xs text-[var(--muted)] leading-relaxed border-t border-[var(--line)] pt-1.5">
                  {ev.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
