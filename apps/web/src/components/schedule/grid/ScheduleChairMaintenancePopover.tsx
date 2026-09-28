import React from "react";
import { Clock, X } from "lucide-react";

export interface ScheduleChairMaintenancePopoverProps {
  chair: any;
  onClose: () => void;
  handleAddMaintenance: (
    chairId: string,
    reason: string,
    durationMinutes: number,
    startTimeStr?: string,
  ) => void;
}

export function ScheduleChairMaintenancePopover({
  chair,
  onClose,
  handleAddMaintenance,
}: ScheduleChairMaintenancePopoverProps) {
  return (
    <div
      className="absolute top-full left-0 z-50 mt-1 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col gap-2 min-w-[270px] text-xs select-none"
      style={{
        boxShadow:
          "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        zIndex: 60,
      }}
      onClick={(e) => e.stopPropagation()}
      data-testid={`chair-maintenance-quick-popover-${chair.id}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
        <span className="text-xs font-bold text-[var(--ink)]">
          Перерыв: «{chair.name}»
        </span>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 p-0 rounded-md hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer flex items-center justify-center transition-colors"
          aria-label="Закрыть"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
          Санитарная обработка кабинета:
        </span>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => {
              handleAddMaintenance(
                chair.id,
                "sanitation",
                15,
                "13:00",
              );
              onClose();
            }}
            className="h-7 min-h-[28px] px-1.5 py-0.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 cursor-pointer transition-all shadow-2xs"
            title="Санитарная обработка кресла (15 мин)"
            data-testid={`btn-maintenance-sanpin-15-${chair.id}`}
          >
            <Clock size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>15м Санобработка</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleAddMaintenance(
                chair.id,
                "sanitation",
                30,
                "13:00",
              );
              onClose();
            }}
            className="h-7 min-h-[28px] px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1 text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-all"
            data-testid={`btn-maintenance-sanitation-30-${chair.id}`}
            title="Санитарная обработка (30 мин)"
          >
            <Clock size={11} className="text-amber-500 shrink-0" />
            <span>30 мин</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleAddMaintenance(
                chair.id,
                "sanitation",
                60,
                "13:00",
              );
              onClose();
            }}
            className="h-7 min-h-[28px] px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1 text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-all"
            data-testid={`btn-maintenance-sanitation-60-${chair.id}`}
            title="Генеральная дезинфекция (60 мин)"
          >
            <Clock size={11} className="text-amber-500 shrink-0" />
            <span>60 мин</span>
          </button>
        </div>

        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider pt-0.5">
          Технический перерыв (1 клик):
        </span>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => {
              handleAddMaintenance(
                chair.id,
                "tech_break",
                15,
                "14:00",
              );
              onClose();
            }}
            className="h-7 min-h-[28px] px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1 text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-all"
            data-testid={`btn-maintenance-tech-15-${chair.id}`}
            title="Короткий перерыв (15 мин)"
          >
            <Clock size={11} className="text-amber-500 shrink-0" />
            <span>15 мин</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleAddMaintenance(
                chair.id,
                "tech_break",
                30,
                "14:00",
              );
              onClose();
            }}
            className="h-7 min-h-[28px] px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1 text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-all"
            data-testid={`btn-maintenance-tech-30-${chair.id}`}
            title="Техперерыв (30 мин)"
          >
            <Clock size={11} className="text-amber-500 shrink-0" />
            <span>30 мин</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleAddMaintenance(
                chair.id,
                "tech_break",
                60,
                "14:00",
              );
              onClose();
            }}
            className="h-7 min-h-[28px] px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1 text-[11px] font-semibold text-[var(--ink)] cursor-pointer transition-all"
            data-testid={`btn-maintenance-tech-60-${chair.id}`}
            title="Техперерыв (60 мин)"
          >
            <Clock size={11} className="text-amber-500 shrink-0" />
            <span>60 мин</span>
          </button>
        </div>
      </div>
    </div>
  );
}
