import React from "react";
import { Plus, Stethoscope } from "lucide-react";
import { QuickAddChairModal, type QuickAddChairData } from "../QuickAddChairModal";
import type { Dashboard } from "@dental/shared";

export interface ScheduleZeroChairsEmptyStateProps {
  onOpenAddChair?: (() => void) | undefined;
  isInternalAddChairModalOpen: boolean;
  setIsInternalAddChairModalOpen: (open: boolean) => void;
  doctors: Array<any>;
  onAddChair?: ((chairData: QuickAddChairData) => Promise<any> | any) | undefined;
  dashboard: Dashboard;
  handleConfirmAssignDoctor: (
    chairId: string,
    docId: string,
    shiftPreset: "full",
  ) => void;
  handleOpenAddChair: () => void;
}

export function ScheduleZeroChairsEmptyState({
  onOpenAddChair,
  isInternalAddChairModalOpen,
  setIsInternalAddChairModalOpen,
  doctors,
  onAddChair,
  dashboard,
  handleConfirmAssignDoctor,
  handleOpenAddChair,
}: ScheduleZeroChairsEmptyStateProps) {
  return (
    <div
      className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-[var(--line)] bg-[var(--paper-soft)] flex flex-col items-center justify-center text-center gap-4 my-6"
      data-testid="schedule-zero-chairs-empty-state"
    >
      <div className="w-16 h-16 rounded-3xl bg-[var(--teal-soft,var(--paper))] border border-[var(--line)] flex items-center justify-center text-[var(--teal)] shadow-sm">
        <Stethoscope size={32} />
      </div>
      <div className="max-w-md space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
          В клинике пока нет настроенных кресел
        </h3>
        <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
          Для отображения сетки расписания и записи пациентов создайте первое
          кресло клиники.
        </p>
      </div>
      <button
        type="button"
        onClick={handleOpenAddChair}
        className="primary-button min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
        data-testid="btn-create-first-chair"
        style={{ minHeight: "44px" }}
      >
        <Plus size={18} />
        <span>+ Создать первое кресло</span>
      </button>
      {!onOpenAddChair && isInternalAddChairModalOpen && (
        <QuickAddChairModal
          isOpen={isInternalAddChairModalOpen}
          onClose={() => setIsInternalAddChairModalOpen(false)}
          existingChairsCount={0}
          doctors={doctors}
          onAddChair={
            onAddChair ||
            (async (chairData) => {
              const newChair = {
                id: chairData.id || `chair-${Date.now()}`,
                name: chairData.name,
                room: chairData.room || chairData.roomNumber || "",
                color: chairData.color || "#0d9488",
                specialization: chairData.specialization,
                active: chairData.isActive ?? true,
                branchId: chairData.branchId,
              };
              if (dashboard?.clinicSettings?.chairs) {
                dashboard.clinicSettings.chairs.push(newChair as any);
              }
              if (chairData.defaultDoctorId) {
                handleConfirmAssignDoctor(
                  newChair.id,
                  chairData.defaultDoctorId,
                  "full",
                );
              }
              setIsInternalAddChairModalOpen(false);
            })
          }
        />
      )}
    </div>
  );
}
