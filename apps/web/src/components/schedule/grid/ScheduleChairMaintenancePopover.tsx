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
      className="absolute top-full left-0 z-50 mt-1 p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col gap-2 min-w-[260px] text-xs"
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
          className="p-1 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] cursor-pointer flex items-center justify-center"
          style={{ minHeight: "44px", minWidth: "44px" }}
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
          Санитарная обработка (1 клик):
        </span>
        <div className="grid grid-cols-2 gap-1.5">
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
            className="min-h-[44px] px-2 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            data-testid={`btn-maintenance-sanitation-30-${chair.id}`}
          >
            <Clock
              size={13}
              className="text-amber-500 shrink-0"
            />
            <span>Санобработка 30м</span>
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
            className="min-h-[44px] px-2 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            data-testid={`btn-maintenance-sanitation-60-${chair.id}`}
          >
            <Clock
              size={13}
              className="text-amber-500 shrink-0"
            />
            <span>Санобработка 60м</span>
          </button>
        </div>
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
          Технический перерыв (1 клик):
        </span>
        <div className="grid grid-cols-2 gap-1.5">
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
            className="min-h-[44px] px-2 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            data-testid={`btn-maintenance-tech-30-${chair.id}`}
          >
            <Clock
              size={13}
              className="text-amber-500 shrink-0"
            />
            <span>Техперерыв 30м</span>
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
            className="min-h-[44px] px-2 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            data-testid={`btn-maintenance-tech-60-${chair.id}`}
          >
            <Clock
              size={13}
              className="text-amber-500 shrink-0"
            />
            <span>Техперерыв 60м</span>
          </button>
        </div>
      </div>
    </div>
  );
}
