import React from "react";
import {
  Calendar,
  Clock,
  Copy,
  Moon,
  Sun,
  UserCheck,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { ScheduleChair } from "./ScheduleFilterStrip";
import {
  formatDoctorShortName,
  type ChairDoctorShiftAssignment,
} from "./ScheduleGrid";
import { showToast } from "../GlobalToast";
import {
  safeLocalStorageGetJson,
  safeLocalStorageSetJson,
} from "../../lib/safeLocalStorage";

export interface ChairShiftPopoverProps {
  chair: ScheduleChair;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  doctors: Array<{ id: string; fullName: string; specialty?: any }>;
  popoverSelectedDocId: Record<string, string>;
  setPopoverSelectedDocId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  dateKey: string;
  onAssignChairDoctor?:
    | ((
        chairId: string,
        assignment: ChairDoctorShiftAssignment | null,
      ) => void)
    | undefined;
  handleAssignShift: (
    chair: ScheduleChair,
    preset:
      | "morning"
      | "morning_9"
      | "evening"
      | "evening_15"
      | "full"
      | "full_9_21"
      | "2x2"
      | "even_odd",
  ) => void;
  handleUnassignShift: (chair: ScheduleChair) => void;
  handleDuplicateChair: (chair: ScheduleChair) => void;
  isSubstituteOpen: Record<string, boolean>;
  setIsSubstituteOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleQuickSubstituteDoctor: (chair: ScheduleChair, substituteDocId: string) => void;
}

export function ChairShiftPopover({
  chair,
  popoverRef,
  onClose,
  doctors,
  popoverSelectedDocId,
  setPopoverSelectedDocId,
  chairDoctorAssignments,
  dateKey,
  onAssignChairDoctor,
  handleAssignShift,
  handleUnassignShift,
  handleDuplicateChair,
  isSubstituteOpen,
  setIsSubstituteOpen,
  handleQuickSubstituteDoctor,
}: ChairShiftPopoverProps) {
  return (
    <div
      ref={popoverRef}
      className="absolute top-full mt-1.5 left-0 z-50 w-72 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl text-[var(--ink)] flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100 cursor-default"
      data-testid={`chair-view-shift-popover-${chair.id}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <UserCheck size={14} className="text-[var(--teal)]" />
          <span>Врач на кресле «{chair.name}»</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Doctor select list */}
      <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
          Выберите врача:
        </span>
        {doctors.map((doc) => {
          const currentDocId =
            popoverSelectedDocId[chair.id] ||
            chairDoctorAssignments?.[chair.id]?.doctorId ||
            (chair as any).defaultDoctorId ||
            doctors[0]?.id;
          const isDocSelected = currentDocId === doc.id;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => {
                setPopoverSelectedDocId((prev) => ({
                  ...prev,
                  [chair.id]: doc.id,
                }));
                if (chairDoctorAssignments?.[chair.id]) {
                  const cur = chairDoctorAssignments[chair.id]!;
                  const updated: ChairDoctorShiftAssignment = {
                    ...cur,
                    doctorId: doc.id,
                    doctorName: doc.fullName,
                    doctorSpecialty: (doc as any).specialty ? String((doc as any).specialty) : undefined,
                  };
                  if (typeof window !== "undefined" && dateKey) {
                    const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
                    const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
                    existing[chair.id] = updated;
                    safeLocalStorageSetJson(storageKey, existing);
                  }
                  if (onAssignChairDoctor) {
                    onAssignChairDoctor(chair.id, updated);
                  }
                  showToast(
                    `Дежурный врач кресла «${chair.name}» переключен на: ${formatDoctorShortName(doc.fullName)}`,
                    "success",
                  );
                } else {
                  const initialAssignment: ChairDoctorShiftAssignment = {
                    chairId: chair.id,
                    chairName: chair.name,
                    doctorId: doc.id,
                    doctorName: doc.fullName,
                    doctorSpecialty: (doc as any).specialty ? String((doc as any).specialty) : undefined,
                    shiftPreset: "full",
                    shiftLabel: "Весь день (08:00–20:00)",
                    shiftHours: "08:00–20:00",
                    startHour: 8,
                    endHour: 20,
                    subShifts: [
                      {
                        doctorId: doc.id,
                        doctorName: doc.fullName,
                        doctorSpecialty: (doc as any).specialty ? String((doc as any).specialty) : undefined,
                        startHour: 8,
                        endHour: 20,
                        shiftHours: "08:00–20:00",
                      },
                    ],
                  };
                  if (typeof window !== "undefined" && dateKey) {
                    const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
                    const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
                    existing[chair.id] = initialAssignment;
                    safeLocalStorageSetJson(storageKey, existing);
                  }
                  if (onAssignChairDoctor) {
                    onAssignChairDoctor(chair.id, initialAssignment);
                  }
                  showToast(
                    `Врач ${formatDoctorShortName(doc.fullName)} назначен на кресло «${chair.name}» (Весь день 08-20)`,
                    "success",
                  );
                }
              }}
              className={`px-2 py-1 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors min-h-[30px] cursor-pointer ${
                isDocSelected
                  ? "bg-[var(--teal-soft)] text-[var(--teal-dark)] font-bold border border-[var(--teal)]/30"
                  : "hover:bg-[var(--paper-soft)] text-[var(--ink)]"
              }`}
              data-testid={`chair-view-doc-option-${chair.id}-${doc.id}`}
            >
              <span className="truncate" title={doc.fullName}>{doc.fullName}</span>
              {(doc as any).specialty && (
                <span className="text-xs text-[var(--muted)] truncate ml-1 font-normal" title={String((doc as any).specialty)}>
                  {String((doc as any).specialty)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Shift Presets */}
      <div className="flex flex-col gap-1 border-t border-[var(--line)] pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
          Шаблоны смен:
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleAssignShift(chair, "morning")}
            className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            data-testid={`chair-view-shift-morning-${chair.id}`}
          >
            <Sun size={12} className="text-amber-500 shrink-0" />
            <span>Утро 08-14</span>
          </button>
          <button
            type="button"
            onClick={() => handleAssignShift(chair, "morning_9")}
            className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            data-testid={`chair-view-shift-morning-9-${chair.id}`}
          >
            <Sun size={12} className="text-amber-500 shrink-0" />
            <span>1 см. 09-15</span>
          </button>
          <button
            type="button"
            onClick={() => handleAssignShift(chair, "evening")}
            className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            data-testid={`chair-view-shift-evening-${chair.id}`}
          >
            <Moon size={12} className="text-indigo-400 shrink-0" />
            <span>Вечер 14-20</span>
          </button>
          <button
            type="button"
            onClick={() => handleAssignShift(chair, "evening_15")}
            className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            data-testid={`chair-view-shift-evening-15-${chair.id}`}
          >
            <Moon size={12} className="text-indigo-400 shrink-0" />
            <span>2 см. 15-21</span>
          </button>
          <button
            type="button"
            onClick={() => handleAssignShift(chair, "full")}
            className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            data-testid={`chair-view-shift-full-${chair.id}`}
          >
            <Clock size={12} className="text-[var(--teal)] shrink-0" />
            <span>Весь день 08-20</span>
          </button>
          <button
            type="button"
            onClick={() => handleAssignShift(chair, "full_9_21")}
            className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            data-testid={`chair-view-shift-full-9-21-${chair.id}`}
          >
            <Clock size={12} className="text-[var(--teal)] shrink-0" />
            <span>Весь день 09-21</span>
          </button>
          <button
            type="button"
            onClick={() => handleAssignShift(chair, "2x2")}
            className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            data-testid={`chair-view-shift-2x2-${chair.id}`}
          >
            <Calendar size={12} className="text-emerald-500 shrink-0" />
            <span>2 через 2</span>
          </button>
          <button
            type="button"
            onClick={() => handleAssignShift(chair, "even_odd")}
            className="px-2 py-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer col-span-2"
            data-testid={`chair-view-shift-even-odd-${chair.id}`}
            title="Чётные/Нечётные дни месяца"
          >
            <Zap size={12} className="text-amber-500 shrink-0" />
            <span>Чет/Нечет</span>
          </button>
        </div>
      </div>

      {/* Unassign action */}
      {chairDoctorAssignments?.[chair.id] && (
        <button
          type="button"
          onClick={() => handleUnassignShift(chair)}
          className="mt-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-1 transition-colors cursor-pointer"
          data-testid={`chair-view-unassign-${chair.id}`}
        >
          <XCircle size={12} />
          <span>Снять врача</span>
        </button>
      )}

      {/* Duplicate chair action */}
      <button
        type="button"
        onClick={() => handleDuplicateChair(chair)}
        className="mt-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] border border-[var(--line)] flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[44px]"
        data-testid={`chair-view-duplicate-${chair.id}`}
        title={`Клонировать параметры кресла «${chair.name}»`}
        style={{ minHeight: "44px" }}
      >
        <Copy size={12} className="text-[var(--teal)] shrink-0" />
        <span>Клонировать кресло</span>
      </button>

      {/* Быстрая замена дежурного врача */}
      <button
        type="button"
        onClick={() =>
          setIsSubstituteOpen((prev) => ({
            ...prev,
            [chair.id]: !prev[chair.id],
          }))
        }
        className="mt-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
        style={{ minHeight: "44px" }}
        data-testid={`chair-view-substitute-btn-${chair.id}`}
        title="Быстрая подмена дежурного врача на кресле"
      >
        <UserCheck size={14} className="text-amber-500 shrink-0" />
        <span>Подменить врача...</span>
      </button>

      {isSubstituteOpen[chair.id] && (
        <div
          className="flex flex-col gap-1 p-2 rounded-lg bg-[var(--paper-soft)] border border-amber-500/30 max-h-40 overflow-y-auto"
          data-testid={`chair-view-substitute-picker-${chair.id}`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Выберите врача для подмены:
          </span>
          {doctors.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => handleQuickSubstituteDoctor(chair, doc.id)}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between hover:bg-[var(--teal-soft)] transition-colors cursor-pointer min-h-[44px]"
              style={{ minHeight: "44px" }}
              data-testid={`chair-view-substitute-option-${chair.id}-${doc.id}`}
            >
              <span className="truncate" title={doc.fullName}>{doc.fullName}</span>
              <span className="text-[10px] text-[var(--muted)] shrink-0 ml-1">
                Подменить
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
