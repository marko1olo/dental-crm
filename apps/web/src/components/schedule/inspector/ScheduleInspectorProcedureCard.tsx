import React from "react";
import { DentalToothIcon } from "../DentalToothIcon";

export interface ScheduleInspectorProcedureCardProps {
  procedureLabel: string;
  cleanComment?: string;
  teethList: (string | number)[];
}

export const ScheduleInspectorProcedureCard: React.FC<ScheduleInspectorProcedureCardProps> = ({
  procedureLabel,
  cleanComment,
  teethList,
}) => {
  return (
    <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/40 flex flex-col gap-1.5">
      <div className="flex items-start gap-1.5">
        <DentalToothIcon size={14} className="text-sky-600 shrink-0 mt-0.5" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-bold text-[12px] text-[var(--ink)] leading-snug">
            {procedureLabel}
          </span>
          {cleanComment && (
            <p className="text-[11px] text-[var(--muted)] mt-1 whitespace-pre-wrap leading-relaxed">
              {cleanComment}
            </p>
          )}
        </div>
      </div>

      {teethList.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-[var(--line)]">
          <span className="text-[10px] text-[var(--muted)] font-medium">Зубы FDI:</span>
          {teethList.map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
