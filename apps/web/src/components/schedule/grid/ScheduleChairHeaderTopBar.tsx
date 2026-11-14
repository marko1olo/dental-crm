import React from "react";
import { Settings, UserCheck, UserPlus } from "lucide-react";
import { DEFAULT_SOLO_CHAIR } from "./gridConstants";
import type { QuickAddChairData } from "../QuickAddChairModal";
import type { ScheduleChairItem } from "./scheduleChairHeaderTypes";

export interface ScheduleChairHeaderTopBarProps {
  chair: ScheduleChairItem;
  chairAccentColor: string;
  chairPalette: any;
  doctors: Array<any>;
  hasDoctor: boolean;
  activeHeaderDoctorPopoverChairId: string | null;
  assignment?: any;
  setActiveHeaderMaintenanceChairId?: ((id: string | null | ((prev: string | null) => string | null)) => void) | undefined;
  setActiveHeaderDoctorPopoverChairId: (id: string | null) => void;
  onEditChair?: ((chairData: QuickAddChairData) => void) | undefined;
  handleConfirmAssignDoctor?: ((chairId: string, docId: string, shiftPreset: any) => void) | undefined;
}

export const ScheduleChairHeaderTopBar: React.FC<ScheduleChairHeaderTopBarProps> = (props) => {
  const {
    chair, chairAccentColor, chairPalette, doctors, hasDoctor,
    activeHeaderDoctorPopoverChairId, assignment,
    setActiveHeaderDoctorPopoverChairId, onEditChair, handleConfirmAssignDoctor,
  } = props;

  return (
    <div className="flex items-center justify-between gap-1 w-full min-w-0">
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
        <div className="w-[4px] h-5 rounded-full shrink-0" style={{ backgroundColor: chairAccentColor }} data-testid={`chair-accent-bar-${chair.id}`} />
        {(() => {
          const rawName = chair.name.replace(/^Кабинет\s*/i, "Кресло ");
          const match = rawName.match(/^(.*?)\s*\((.*?)\)$/);
          const baseTitle = match ? match[1] : rawName;
          const subTitle = match ? match[2] : null;
          return (
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden leading-tight">
              <span className="truncate text-xs sm:text-[13px] font-black text-[var(--ink)] tracking-tight" title={chair.name} data-testid={`chair-title-${chair.id}`}>
                {baseTitle}
              </span>
              {subTitle ? (
                <span className="truncate text-[10px] text-[var(--muted)] font-medium leading-none" title={subTitle}>
                  {subTitle}
                </span>
              ) : null}
            </div>
          );
        })()}
        <span className="hidden 2xl:inline text-[9px] px-1 py-0.2 rounded font-bold uppercase tracking-wider border shrink-0" data-chair-palette={chairPalette.nameRu}
          style={{ color: chairPalette.bright_code, borderColor: `${chairPalette.bright_code}50`, backgroundColor: "var(--paper)" }}
          title={`Рабочее место: ${chairPalette.nameRu}`} data-testid={`chair-palette-badge-${chair.id}`}>
          {chairPalette.nameRu}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Кнопка быстрого выбора врача (поповер) с тач-таргетом >=44x44px по Apple HIG */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveHeaderDoctorPopoverChairId(
              activeHeaderDoctorPopoverChairId === chair.id ? null : chair.id,
            );
          }}
          className="min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--primary)] text-[var(--ink)] flex items-center justify-center gap-1 text-[11px] font-medium cursor-pointer transition-colors touch-manipulation"
          title={`Быстрый выбор врача для ${chair.name}`}
          aria-label={`Быстрый выбор врача для ${chair.name}`}
          data-testid={`btn-chair-doctor-popover-${chair.id}`}
        >
          <UserPlus size={12} className="text-[var(--primary)] shrink-0" />
          {!hasDoctor && (
            <span
              className="text-[10px] font-bold text-[var(--primary)]"
              data-testid={`chair-grid-unstaffed-badge-${chair.id}`}
            >
              + Врач
            </span>
          )}
        </button>

        {onEditChair && chair.id !== DEFAULT_SOLO_CHAIR.id && (
          <button type="button" onClick={(e) => {
            e.stopPropagation();
            onEditChair({
              id: chair.id,
              name: chair.name,
              roomNumber: chair.roomNumber || chair.room || "",
              branchId: chair.branchId || undefined,
              color: chair.color || "var(--teal, #0d9488)",
              specialization: chair.specialization || undefined,
              isActive: chair.active ?? chair.isActive ?? true,
            });
          }} className="min-h-[22px] h-[22px] w-[22px] p-0 rounded hover:bg-[var(--line)]/50 text-[var(--muted)] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          title={`Редактировать параметры кресла «${chair.name}»`} aria-label={`Редактировать параметры кресла ${chair.name}`} data-testid={`btn-edit-chair-${chair.id}`}>
            <Settings size={12} className="opacity-70 hover:opacity-100" />
          </button>
        )}
      </div>
    </div>
  );
};
