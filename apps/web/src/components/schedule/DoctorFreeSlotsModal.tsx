import React from "react";
import { Search, X } from "lucide-react";
import type { Dashboard } from "@dental/shared";
import type { DoctorFreeSlot } from "./doctorFreeSlotsEngine";
import { useDoctorFreeSlotsController } from "./doctorFreeSlots/useDoctorFreeSlotsController";
import { DoctorFreeSlotsFilters } from "./doctorFreeSlots/DoctorFreeSlotsFilters";
import { DoctorFreeSlotsResults } from "./doctorFreeSlots/DoctorFreeSlotsResults";

export interface DoctorFreeSlotsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly dashboard: Dashboard;
  readonly initialDoctorId?: string | null | undefined;
  readonly onSelectSlot: (slot: DoctorFreeSlot) => void;
}

export const DoctorFreeSlotsModal: React.FC<DoctorFreeSlotsModalProps> = ({
  isOpen,
  onClose,
  dashboard,
  initialDoctorId,
  onSelectSlot,
}) => {
  const ctrl = useDoctorFreeSlotsController({ dashboard, initialDoctorId });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
      data-testid="doctor-free-slots-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Подбор свободных окон расписания"
    >
      <div className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] flex items-center justify-center border border-[var(--teal,var(--brand-primary))]/30 shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold m-0 flex items-center gap-2">
                Умный подбор времени и свободных окон
              </h2>
              <p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
                {ctrl.activeRangeLabel} ({ctrl.horizonDays} дн.) • Найдено вариантов: <strong>{ctrl.totalSlotsCount}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="secondary-button h-8 w-8 min-h-[32px] !p-0 rounded-lg flex items-center justify-center cursor-pointer"
            aria-label="Закрыть окно подбора окон"
            data-testid="btn-close-free-slots-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Section */}
        <DoctorFreeSlotsFilters ctrl={ctrl} />

        {/* Results Body */}
        <DoctorFreeSlotsResults
          ctrl={ctrl}
          onSelectSlot={onSelectSlot}
          onClose={onClose}
        />

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between text-xs">
          <div className="text-[var(--muted,#64748b)]">
            Врач: <strong>{ctrl.selectedDoctor?.fullName || "Любой врач"}</strong> • Кресло: <strong>{ctrl.selectedChair?.name || "Любое кресло"}</strong> • Длительность: <strong>{ctrl.durationMinutes} мин</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="secondary-button h-9 min-h-[36px] px-4 rounded-xl cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorFreeSlotsModal;
