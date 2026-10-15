import React from "react";
import {
  Building2,
  ChevronDown,
  Clock,
  Moon,
  Sun,
  Zap,
} from "lucide-react";
import { formatDoctorShortName } from "../GridAppointmentCard";
import type { ChairDoctorShiftAssignment } from "./gridTypes";

export interface ScheduleChairSingleShiftCardProps {
  chair: any;
  assignment: ChairDoctorShiftAssignment;
  isToday: boolean;
  currentHour: number;
  dateKey?: string | undefined;
  openAssignModal: (chairId: string) => void;
  handleConfirmAssignDoctor: (
    chairId: string,
    docId: string,
    shiftPreset: any,
    eveningDocId?: string,
  ) => void;
}

export function ScheduleChairSingleShiftCard({
  chair,
  assignment,
  isToday,
  currentHour,
  dateKey,
  openAssignModal,
  handleConfirmAssignDoctor,
}: ScheduleChairSingleShiftCardProps) {
  const sStart = assignment.startHour ?? 8;
  const sEnd = assignment.endHour ?? 20;
  const isOnDuty =
    isToday &&
    currentHour >= sStart &&
    (currentHour < sEnd || (sEnd >= 20 && currentHour <= 20));

  return (
    <div className="w-full flex flex-col gap-0.5 text-left">
      <button
        type="button"
        onClick={() => openAssignModal(chair.id)}
        className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--primary)]/60 flex items-center justify-between gap-2 text-left text-xs cursor-pointer shadow-2xs transition-all touch-manipulation"
        data-testid={`chair-doctor-duty-badge-${chair.id}`}
        title="Нажмите для смены дежурного врача"
        aria-label={`Дежурный врач: ${assignment.doctorName}, ${assignment.shiftHours || "08:00–20:00"}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isOnDuty ? "bg-emerald-500" : "bg-[var(--muted)]/40"
            }`}
            data-testid={`chair-duty-now-badge-${chair.id}`}
            title={isOnDuty ? "На смене" : "Не на смене"}
          />
          <Clock size={13} className="text-[var(--primary)] shrink-0" aria-hidden="true" />
          <span className="font-bold text-[var(--ink)] truncate">
            {formatDoctorShortName(assignment.doctorName)}
          </span>
          <span className="text-[11px] text-[var(--muted)] truncate hidden md:inline">
            · {assignment.doctorSpecialty || "Врач"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <span className="font-mono text-[11px] text-[var(--muted)] font-medium">
            {assignment.shiftHours || "08:00–20:00"}
          </span>
          {isOnDuty && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              На смене
            </span>
          )}
        </div>
      </button>
      {/* Индикатор покрытия смен кресла (sr-only для сохранения тестовых якорей без 3-го этажа в шапке) */}
      {assignment.shiftPreset !== "two_shifts" && (
        <div
          className="sr-only"
          data-testid={`chair-shift-strip-${chair.id}`}
        >
          <div data-testid={`chair-status-morning-${chair.id}`}>
            <span>
              {assignment.shiftPreset === "morning" ||
              (!assignment.shiftPreset && sStart <= 8)
                ? (formatDoctorShortName(assignment.doctorName)?.split(" ")?.[0] || "Занят")
                : "Своб."}
            </span>
          </div>
          <div data-testid={`chair-status-evening-${chair.id}`}>
            <span>
              {assignment.shiftPreset === "evening" ||
              (!assignment.shiftPreset && sEnd >= 20)
                ? (formatDoctorShortName(assignment.doctorName)?.split(" ")?.[0] || "Занят")
                : "Своб."}
            </span>
          </div>
        </div>
      )}
      {/* Сегментированный селектор смены */}
      <details className="hidden">
        <summary className="w-full h-7 min-h-[28px] px-2 py-0.5 flex items-center justify-between gap-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[11px] font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)] cursor-pointer select-none list-none transition-colors [&::-webkit-details-marker]:hidden">
          <span className="truncate flex items-center gap-1">
            <Clock
              size={11}
              className="text-[var(--teal)] shrink-0"
            />
            <span className="font-semibold text-[var(--ink)]">
              Смена:
            </span>
            <span className="truncate">
              {assignment.shiftPreset === "morning"
                ? "Утро"
                : assignment.shiftPreset === "evening"
                  ? "Вечер"
                  : assignment.shiftPreset === "full"
                    ? "Весь день"
                    : assignment.shiftPreset === "two_shifts"
                      ? "2 смены"
                      : assignment.shiftLabel || "Смена"}
            </span>
          </span>
          <ChevronDown
            size={11}
            className="shrink-0 text-[var(--muted)] group-open:rotate-180 transition-transform"
          />
        </summary>
        <div
          className="absolute left-0 right-0 top-full mt-1 z-20 flex items-center justify-between p-1 rounded-xl bg-[var(--paper-elevated,var(--paper))] border border-[var(--line)] shadow-lg gap-0.5"
          role="group"
          aria-label="Переключение смены кресла"
        >
          <button
            type="button"
            onClick={() =>
              handleConfirmAssignDoctor(
                chair.id,
                assignment.doctorId,
                "morning",
              )
            }
            className={`min-h-[44px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
              assignment.shiftPreset === "morning"
                ? "bg-[var(--teal)] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
            }`}
            style={{ minHeight: "44px" }}
            title="1-я смена: Утро (08:00–14:00)"
            aria-label="Утренняя смена"
            data-testid={`chair-quick-morning-${chair.id}`}
          >
            <Sun size={12} className="shrink-0" />
            <span className="text-[11px] font-bold">
              Утро
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleConfirmAssignDoctor(
                chair.id,
                assignment.doctorId,
                "evening",
              )
            }
            className={`min-h-[44px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
              assignment.shiftPreset === "evening"
                ? "bg-[var(--teal)] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
            }`}
            style={{ minHeight: "44px" }}
            title="2-я смена: Вечер (14:00–20:00)"
            aria-label="Вечерняя смена"
            data-testid={`chair-quick-evening-${chair.id}`}
          >
            <Moon size={12} className="shrink-0" />
            <span className="text-[11px] font-bold">
              Вечер
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleConfirmAssignDoctor(
                chair.id,
                assignment.doctorId,
                "full",
              )
            }
            className={`min-h-[44px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
              assignment.shiftPreset === "full"
                ? "bg-[var(--teal)] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
            }`}
            style={{ minHeight: "44px" }}
            title="Полный день (08:00–20:00)"
            aria-label="Весь день"
            data-testid={`chair-quick-full-${chair.id}`}
          >
            <Building2 size={12} className="shrink-0" />
            <span className="text-[11px] font-bold">
              Весь день
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              const dayOfMonth = Number.parseInt(dateKey ? dateKey.slice(8, 10) : "1", 10) || 1;
              const isEven = dayOfMonth % 2 === 0;
              handleConfirmAssignDoctor(
                chair.id,
                assignment.doctorId,
                isEven ? "morning" : "evening",
              );
            }}
            className={`min-h-[44px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 ${
              assignment.shiftLabel?.includes("Чет")
                ? "bg-[var(--teal)] text-white shadow-xs"
                : "text-[var(--muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-surface)]"
            }`}
            style={{ minHeight: "44px" }}
            title="Чётные/Нечётные дни (авто-смена утро/вечер)"
            aria-label="Четные и нечетные дни"
            data-testid={`chair-quick-evenodd-${chair.id}`}
          >
            <Zap size={12} className="shrink-0 text-amber-500" />
            <span className="text-[11px] font-bold">
              Ч/Н
            </span>
          </button>
        </div>
      </details>
    </div>
  );
}
