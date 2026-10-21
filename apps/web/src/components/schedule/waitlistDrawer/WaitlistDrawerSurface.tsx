import React from "react";
import type { TargetSlotInfo } from "../waitlistCancellationEngine";
import type { useWaitlistDrawerOperations } from "../useWaitlistDrawerOperations";
import type { useWaitlistDrawerController } from "./useWaitlistDrawerController";
import { WaitlistDrawerHeader } from "./WaitlistDrawerHeader";
import { WaitlistTargetSlotBanner } from "./WaitlistTargetSlotBanner";
import { WaitlistDrawerFormSection } from "./WaitlistDrawerFormSection";
import { WaitlistToolbar } from "../WaitlistToolbar";
import { WaitlistDrawerList } from "./WaitlistDrawerList";

export interface WaitlistDrawerSurfaceProps {
  targetSlot?: TargetSlotInfo | null | undefined;
  ops: ReturnType<typeof useWaitlistDrawerOperations>;
  ctrl: ReturnType<typeof useWaitlistDrawerController>;
  onClose: () => void;
  updateNewAppointmentDraft?: ((key: any, value: any) => void) | undefined;
  focusNewAppointmentEditor?: (() => void) | undefined;
}

export function WaitlistDrawerSurface({
  targetSlot,
  ops,
  ctrl,
  onClose,
  updateNewAppointmentDraft,
  focusNewAppointmentEditor,
}: WaitlistDrawerSurfaceProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/25 transition-opacity max-sm:items-end max-sm:justify-center"
      data-testid="waitlist-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Лист ожидания и автозаполнение отмен"
    >
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Закрыть шторку листа ожидания" />

      <div
        className="relative w-full max-w-lg h-full max-sm:h-auto max-sm:max-h-[92vh] max-sm:rounded-t-[24px] bg-[var(--paper)] border-l max-sm:border-l-0 max-sm:border-t border-[var(--line)] shadow-2xl flex flex-col z-10 text-[var(--ink)] animate-slide-in overflow-hidden pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hidden max-sm:flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-[var(--line-strong)] opacity-60" />
        </div>

        <WaitlistDrawerHeader
          targetSlot={targetSlot}
          itemsCount={ops.items.length}
          isAddFormOpen={ops.isAddFormOpen}
          onToggleAddForm={() => ops.setIsAddFormOpen((prev) => !prev)}
          onMinimize={() => ctrl.setIsMinimized(true)}
          onClose={onClose}
        />

        {targetSlot && <WaitlistTargetSlotBanner targetSlot={targetSlot} />}

        <WaitlistDrawerFormSection ops={ops} ctrl={ctrl} />

        <WaitlistToolbar
          searchQuery={ctrl.searchQuery}
          onSearchChange={ctrl.setSearchQuery}
          selectedUrgency={ctrl.selectedUrgency}
          onSelectUrgency={ctrl.setSelectedUrgency}
          onlySameDoctor={ctrl.onlySameDoctor}
          onToggleOnlySameDoctor={() => ctrl.setOnlySameDoctor((prev) => !prev)}
          hasTargetDoctor={Boolean(targetSlot?.doctorUserId)}
          items={ops.items}
        />

        <WaitlistDrawerList
          ops={ops}
          ctrl={ctrl}
          targetSlot={targetSlot}
          updateNewAppointmentDraft={updateNewAppointmentDraft}
          focusNewAppointmentEditor={focusNewAppointmentEditor}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
