import React from "react";
import { Clock, X, Armchair, User } from "lucide-react";
import { formatDoctorShortName } from "../appointmentCardHelpers";

export interface ScheduleInspectorHeaderAndChairProps {
  aStart: string;
  aEnd: string;
  durationMin: number;
  isCito: boolean;
  chairName: string;
  docName: string;
  docTheme?: { badgeClass: string; label: string } | null;
  onDeselect: () => void;
}

export const ScheduleInspectorHeaderAndChair: React.FC<ScheduleInspectorHeaderAndChairProps> = ({
  aStart,
  aEnd,
  durationMin,
  isCito,
  chairName,
  docName,
  docTheme,
  onDeselect,
}) => {
  return (
    <>
      <div className="flex items-center justify-between gap-1 border-b border-[var(--line)] pb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="font-extrabold text-[13px] text-[var(--ink)] font-mono flex items-center gap-1">
            <Clock size={13} className="text-sky-600 dark:text-sky-400 shrink-0" />
            <span>{`${aStart} – ${aEnd}`}</span>
          </span>
          <span className="text-[11px] font-medium text-[var(--muted)]">
            {`(${durationMin} мин)`}
          </span>
          {isCito && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-extrabold animate-pulse">
              СРОЧНО
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="w-6 h-6 rounded-md hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
          title="Закрыть карточку приёма"
          aria-label="Закрыть инспектор приёма"
          data-testid="schedule-inspector-close-btn"
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]/50 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <span className="text-[var(--muted)] flex items-center gap-1">
            <Armchair size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Кабинет / Кресло:</span>
          </span>
          <span className="font-bold text-[var(--ink)]">{chairName}</span>
        </div>
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <span className="text-[var(--muted)] flex items-center gap-1">
            <User size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Лечащий врач:</span>
          </span>
          <span className="font-bold text-[var(--ink)] truncate max-w-[170px]" title={docName}>
            {formatDoctorShortName(docName)}
          </span>
        </div>
        {docTheme && (
          <div className="self-end">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${docTheme.badgeClass}`}>
              {docTheme.label}
            </span>
          </div>
        )}
      </div>
    </>
  );
};
