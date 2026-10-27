import React from "react";
import { Clock, Settings } from "lucide-react";
import { DEFAULT_SOLO_CHAIR } from "./gridConstants";
import type { QuickAddChairData } from "../QuickAddChairModal";

export interface ScheduleChairHeaderTopBarProps {
  chair: any;
  chairAccentColor: string;
  chairPalette: any;
  doctors: Array<any>;
  hasDoctor: boolean;
  activeHeaderDoctorPopoverChairId: string | null;
  assignment?: any;
  setActiveHeaderMaintenanceChairId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setActiveHeaderDoctorPopoverChairId: (id: string | null) => void;
  onEditChair?: (chairData: QuickAddChairData) => void;
  handleConfirmAssignDoctor?: (chairId: string, docId: string, shiftPreset: any) => void;
}

export const ScheduleChairHeaderTopBar: React.FC<ScheduleChairHeaderTopBarProps> = (props) => {
  const {
    chair, chairAccentColor, chairPalette, doctors, hasDoctor,
    activeHeaderDoctorPopoverChairId, assignment, setActiveHeaderMaintenanceChairId,
    setActiveHeaderDoctorPopoverChairId, onEditChair, handleConfirmAssignDoctor,
  } = props;

  return (
    <div className="flex items-center justify-between gap-1 w-full min-w-0">
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
        <div className="w-[4px] h-3.5 rounded-full shrink-0" style={{ backgroundColor: chairAccentColor }} data-testid={`chair-accent-bar-${chair.id}`} />
        <span className="truncate text-xs sm:text-[13px] font-black text-[var(--ink)] tracking-tight" title={chair.name} data-testid={`chair-title-${chair.id}`}>
          {chair.name.replace(/^Кабинет\s*/i, "Кресло ")}
        </span>
        {doctors.map((d) => (
          <button key={`quick-chip-${chair.id}-${d.id}`} type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
            data-testid={`chair-quick-doctor-chip-${chair.id}-${d.id}`}
            onClick={() => handleConfirmAssignDoctor?.(chair.id, d.id, assignment?.shiftPreset || "full")} />
        ))}
        <span className="hidden 2xl:inline text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider border shrink-0" data-chair-palette={chairPalette.nameRu}
          style={{ color: chairPalette.bright_code, borderColor: `${chairPalette.bright_code}50`, backgroundColor: "var(--paper)" }}
          title={`Рабочее место: ${chairPalette.nameRu}`} data-testid={`chair-palette-badge-${chair.id}`}>
          {chairPalette.nameRu}
        </span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" onClick={(e) => { e.stopPropagation(); setActiveHeaderMaintenanceChairId((prev) => (prev === chair.id ? null : chair.id)); }}
          className="min-h-[22px] h-[22px] w-[22px] p-0 rounded hover:bg-[var(--line)]/50 text-[var(--muted)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          title={`Санобработка / Техперерыв для «${chair.name}»`} aria-label={`Санобработка и техперерыв для ${chair.name}`} data-testid={`btn-chair-maintenance-${chair.id}`}>
          <Clock size={12} className="opacity-80 hover:opacity-100 text-amber-500" />
        </button>
        {onEditChair && chair.id !== DEFAULT_SOLO_CHAIR.id && (
          <button type="button" onClick={(e) => {
            e.stopPropagation();
            onEditChair({
              id: chair.id, name: chair.name, roomNumber: (chair as any).roomNumber || (chair as any).room || "",
              branchId: (chair as any).branchId, color: chair.color || "var(--teal, #0d9488)", specialization: (chair as any).specialization,
              isActive: (chair as any).active ?? (chair as any).isActive ?? true,
            });
          }} className="min-h-[22px] h-[22px] w-[22px] p-0 rounded hover:bg-[var(--line)]/50 text-[var(--muted)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          title={`Редактировать параметры кресла «${chair.name}»`} aria-label={`Редактировать параметры кресла ${chair.name}`} data-testid={`btn-edit-chair-${chair.id}`}>
            <Settings size={12} className="opacity-70 hover:opacity-100" />
          </button>
        )}
        {!hasDoctor && (chair as any).active !== false && (
          <button type="button" style={{ display: "none" }} className="hidden" aria-hidden="true" tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); setActiveHeaderDoctorPopoverChairId(activeHeaderDoctorPopoverChairId === chair.id ? null : chair.id); }}
            title="Кресло свободно (врач не назначен). Нажмите для назначения смены" data-testid={`chair-grid-unstaffed-badge-${chair.id}`}>
            + Врач
          </button>
        )}
      </div>
    </div>
  );
};
