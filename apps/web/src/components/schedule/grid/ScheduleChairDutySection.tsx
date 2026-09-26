import React from "react";
import {
  Building2,
  ChevronDown,
  Clock,
  Moon,
  Plus,
  Sun,
  Zap,
} from "lucide-react";
import { formatDoctorShortName } from ".././GridAppointmentCard";
import type { ChairDoctorShiftAssignment } from "./gridTypes";

export interface ScheduleChairDutySectionProps {
  chair: any;
  assignment?: ChairDoctorShiftAssignment;
  hasDoctor: boolean;
  isToday: boolean;
  currentHour: number;
  doctors: Array<any>;
  suggestedDoctor: any | null;
  isSoloDoctor: boolean;
  dateKey?: string;
  openAssignModal: (chairId: string) => void;
  handleConfirmAssignDoctor: (
    chairId: string,
    docId: string,
    shiftPreset: any,
    eveningDocId?: string,
  ) => void;
}

export function ScheduleChairDutySection({
  chair,
  assignment,
  hasDoctor,
  isToday,
  currentHour,
  doctors,
  suggestedDoctor,
  isSoloDoctor,
  dateKey,
  openAssignModal,
  handleConfirmAssignDoctor,
}: ScheduleChairDutySectionProps) {
  if (hasDoctor && assignment) {
    const subShifts = assignment.subShifts;
    const isMultiShift = Boolean(
      (subShifts && subShifts.length > 1) ||
      assignment.shiftPreset === "two_shifts",
    );

    if (isMultiShift) {
      const mornSub = subShifts?.[0] || {
        doctorId: assignment.doctorId,
        doctorName: assignment.doctorName,
        startHour: 8,
        endHour: 14,
        shiftHours: "08:00–14:00",
      };
      const eveSub = subShifts?.[1] || {
        doctorId: assignment.doctorId,
        doctorName: assignment.doctorName,
        startHour: 14,
        endHour: 20,
        shiftHours: "14:00–20:00",
      };
      const mornStart = mornSub.startHour ?? 8;
      const mornEnd = mornSub.endHour ?? 14;
      const eveStart = eveSub.startHour ?? 14;
      const eveEnd = eveSub.endHour ?? 20;
      const isMornOnDuty =
        isToday &&
        currentHour >= mornStart &&
        currentHour < mornEnd;
      const isEveOnDuty =
        isToday &&
        currentHour >= eveStart &&
        (currentHour < eveEnd ||
          (eveEnd >= 20 && currentHour <= 20));

      return (
        <div
          className="w-full flex flex-col gap-1 text-left"
          data-testid={`chair-doctor-multishift-${chair.id}`}
        >
          <button
            type="button"
            onClick={() => openAssignModal(chair.id)}
            className="min-h-[44px] w-full p-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex flex-col gap-0.5 text-left text-xs cursor-pointer shadow-2xs hover:border-[var(--teal)] transition-all"
            style={{ minHeight: "44px" }}
            data-testid={`chair-doctor-duty-badge-${chair.id}`}
            title="Нажмите для настройки смены врачей на кресле"
            aria-label={`Дежурные врачи: Утро ${mornSub.doctorName}, Вечер ${eveSub.doctorName}`}
          >
            <div
              className={`flex items-center justify-between gap-1 w-full min-w-0 px-1 py-0.5 rounded-lg ${
                isMornOnDuty
                  ? "bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30 font-bold text-emerald-950 dark:text-emerald-100"
                  : ""
              }`}
              data-testid={`chair-shift-morning-${chair.id}`}
            >
              <span className="flex items-center gap-1 font-semibold truncate min-w-0">
                <Sun
                  size={13}
                  className="text-amber-500 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-amber-600 dark:text-amber-400 font-normal shrink-0">
                  08:00–14:00:
                </span>
                <span className="truncate">
                  {formatDoctorShortName(
                    mornSub?.doctorName || "",
                  )}
                </span>
              </span>
              {isMornOnDuty && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-1"
                  data-testid={`chair-duty-morning-badge-${chair.id}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>● На смене</span>
                </span>
              )}
            </div>
            <div
              className={`flex items-center justify-between gap-1 w-full min-w-0 px-1 py-0.5 rounded-lg ${
                isEveOnDuty
                  ? "bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30 font-bold text-emerald-950 dark:text-emerald-100"
                  : ""
              }`}
              data-testid={`chair-shift-evening-${chair.id}`}
            >
              <span className="flex items-center gap-1 font-semibold truncate min-w-0">
                <Moon
                  size={13}
                  className="text-indigo-400 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-indigo-500 dark:text-indigo-300 font-normal shrink-0">
                  14:00–20:00:
                </span>
                <span className="truncate">
                  {formatDoctorShortName(
                    eveSub?.doctorName || "",
                  )}
                </span>
              </span>
              {isEveOnDuty && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-1"
                  data-testid={`chair-duty-evening-badge-${chair.id}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>● На смене</span>
                </span>
              )}
            </div>
          </button>
          {/* 1-Click Shift Switcher Quick Pills */}
          <div className="flex items-center justify-between gap-1 w-full px-0.5">
            {mornSub && (
              <button
                type="button"
                onClick={() =>
                  handleConfirmAssignDoctor(
                    chair.id,
                    mornSub.doctorId,
                    "morning",
                  )
                }
                className="min-h-[44px] sm:min-h-[26px] sm:h-6.5 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-all flex-1 justify-center"
                style={{ minHeight: "44px" }}
                title="Переключить на утро только"
                data-testid={`chair-quick-morning-${chair.id}`}
              >
                <Sun
                  size={12}
                  className="shrink-0 text-amber-500"
                  aria-hidden="true"
                />
                <span>Утро</span>
              </button>
            )}
            {eveSub && (
              <button
                type="button"
                onClick={() =>
                  handleConfirmAssignDoctor(
                    chair.id,
                    eveSub.doctorId,
                    "evening",
                  )
                }
                className="min-h-[44px] sm:min-h-[26px] sm:h-6.5 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-all flex-1 justify-center"
                style={{ minHeight: "44px" }}
                title="Переключить на вечер только"
                data-testid={`chair-quick-evening-${chair.id}`}
              >
                <Moon
                  size={12}
                  className="shrink-0 text-indigo-400"
                  aria-hidden="true"
                />
                <span>Вечер</span>
              </button>
            )}
            {mornSub && (
              <button
                type="button"
                onClick={() =>
                  handleConfirmAssignDoctor(
                    chair.id,
                    mornSub.doctorId,
                    "full",
                  )
                }
                className="min-h-[44px] sm:min-h-[26px] sm:h-6.5 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-all flex-1 justify-center"
                style={{ minHeight: "44px" }}
                title="Переключить на весь день"
                data-testid={`chair-quick-full-${chair.id}`}
              >
                <Building2
                  size={12}
                  className="shrink-0 text-[var(--teal)]"
                  aria-hidden="true"
                />
                <span>Весь день</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    // Single shift assignment
    const sStart = assignment.startHour ?? 8;
    const sEnd = assignment.endHour ?? 20;
    const isOnDuty =
      isToday &&
      currentHour >= sStart &&
      (currentHour < sEnd || (sEnd >= 20 && currentHour <= 20));

    return (
      <div className="w-full flex flex-col gap-1 text-left">
        {(!doctors || doctors.length === 0) && (
          <button
            type="button"
            onClick={() => openAssignModal(chair.id)}
            className="min-h-[44px] w-full p-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex flex-col gap-0.5 text-left text-xs cursor-pointer shadow-2xs hover:border-[var(--teal)] transition-all"
            style={{ minHeight: "44px" }}
            data-testid={`chair-doctor-duty-badge-${chair.id}`}
            title="Нажмите для смены дежурного врача"
            aria-label={`Дежурный врач: ${assignment.doctorName}, ${assignment.shiftHours || "08:00–20:00"}`}
          >
            <div className="flex items-center justify-between gap-1 w-full min-w-0">
              <span className="font-bold text-[var(--ink)] truncate">
                {formatDoctorShortName(assignment.doctorName)}
              </span>
              {isOnDuty && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0"
                  data-testid={`chair-duty-now-badge-${chair.id}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>На смене</span>
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] w-full">
              <span className="truncate">
                {assignment.doctorSpecialty || "Врач"}
              </span>
              <span className="font-mono text-[10px] shrink-0 font-medium">
                {assignment.shiftHours || "08:00–20:00"}
              </span>
            </div>
          </button>
        )}
        {/* StomX / IDENT Shift Coverage Strip */}
        {assignment.shiftPreset !== "two_shifts" && (
          <div
            className="grid grid-cols-2 gap-1 w-full text-[10px] font-medium"
            data-testid={`chair-shift-strip-${chair.id}`}
          >
            <div
              className={`px-1.5 py-0.5 rounded-md border flex items-center gap-1 min-w-0 ${
                assignment.shiftPreset === "morning" ||
                (!assignment.shiftPreset && sStart <= 8)
                  ? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)] text-[var(--teal)] font-bold shadow-2xs"
                  : "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-60"
              }`}
              data-testid={`chair-status-morning-${chair.id}`}
              title={
                assignment.shiftPreset === "morning" ||
                (!assignment.shiftPreset && sStart <= 8)
                  ? `Утренняя смена (08:00–14:00): ${assignment.doctorName}`
                  : "Утренняя смена свободна"
              }
            >
              <Sun
                size={10}
                className="text-amber-500 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">
                <span className="font-bold">Утро: </span>
                {assignment.shiftPreset === "morning" ||
                (!assignment.shiftPreset && sStart <= 8)
                  ? formatDoctorShortName(
                      assignment.doctorName,
                    )
                  : "Свободно"}
              </span>
            </div>
            <div
              className={`px-1.5 py-0.5 rounded-md border flex items-center gap-1 min-w-0 ${
                assignment.shiftPreset === "evening" ||
                (!assignment.shiftPreset && sEnd >= 20)
                  ? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)] text-[var(--teal)] font-bold shadow-2xs"
                  : "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-60"
              }`}
              data-testid={`chair-status-evening-${chair.id}`}
              title={
                assignment.shiftPreset === "evening" ||
                (!assignment.shiftPreset && sEnd >= 20)
                  ? `Вечерняя смена (14:00–20:00): ${assignment.doctorName}`
                  : "Вечерняя смена свободна"
              }
            >
              <Moon
                size={10}
                className="text-indigo-400 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">
                <span className="font-bold">Вечер: </span>
                {assignment.shiftPreset === "evening" ||
                (!assignment.shiftPreset && sEnd >= 20)
                  ? formatDoctorShortName(
                      assignment.doctorName,
                    )
                  : "Свободно"}
              </span>
            </div>
          </div>
        )}
        {/* 1-Click Shift Segmented Control (StomX / DentalPRO parity & HIG >=44px) */}
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

  // Unassigned chair
  return (
    <div className="w-full flex flex-col gap-1">
      {/* StomX / IDENT Shift Coverage Strip (Both shifts unassigned/free) */}
      <div
        className="grid grid-cols-2 gap-1 w-full text-[10px] font-medium text-[var(--muted)]"
        data-testid={`chair-shift-strip-${chair.id}`}
      >
        <div
          className="px-1.5 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] opacity-60 flex items-center gap-1 min-w-0"
          data-testid={`chair-status-morning-${chair.id}`}
          title="Утренняя смена (08:00–14:00): Свободно"
        >
          <Sun
            size={10}
            className="text-amber-500 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">
            <span className="font-bold">Утро: </span>Свободно
          </span>
        </div>
        <div
          className="px-1.5 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper)] opacity-60 flex items-center gap-1 min-w-0"
          data-testid={`chair-status-evening-${chair.id}`}
          title="Вечерняя смена (14:00–20:00): Свободно"
        >
          <Moon
            size={10}
            className="text-indigo-400 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">
            <span className="font-bold">Вечер: </span>Свободно
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => openAssignModal(chair.id)}
        className="min-h-[44px] sm:min-h-[30px] sm:h-7.5 w-full px-2.5 py-1 rounded-xl border border-dashed border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft,var(--paper-soft))] text-[var(--muted)] hover:text-[var(--teal)] flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-all"
        title={`Назначить врача на кресло «${chair.name}»`}
        aria-label={`Назначить врача на кресло ${chair.name}`}
        data-testid={`btn-assign-doctor-${chair.id}`}
      >
        <Plus
          size={14}
          className="shrink-0 text-[var(--teal)]"
        />
        <span className="truncate font-bold">
          + Назначить врача
        </span>
      </button>
      {suggestedDoctor &&
        !isSoloDoctor &&
        doctors.length > 1 && (
          <button
            type="button"
            onClick={() =>
              handleConfirmAssignDoctor(
                chair.id,
                suggestedDoctor.id,
                "full",
              )
            }
            className="min-h-[32px] sm:min-h-[26px] sm:h-6.5 py-0.5 sm:py-0 px-2 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal)] text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--teal)] hover:text-white transition-all border border-[var(--teal)]/20 shadow-2xs"
            title={`Быстро назначить ${suggestedDoctor.fullName} (1 клик)`}
            data-testid={`btn-quick-assign-${chair.id}`}
          >
            <Zap
              size={11}
              className="text-[var(--teal)] shrink-0"
            />
            <span className="truncate">{`1 клик: ${formatDoctorShortName(suggestedDoctor.fullName)}`}</span>
          </button>
        )}
    </div>
  );
}
