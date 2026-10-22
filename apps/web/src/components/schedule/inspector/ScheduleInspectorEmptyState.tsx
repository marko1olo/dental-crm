import React from "react";
import { Clock, CheckCircle2, Armchair, Users, Calendar } from "lucide-react";
import type { Appointment, Dashboard, Patient, StaffMember } from "@dental/shared";
import {
  formatDoctorShortName,
  formatPatientDisplayFio,
  getNormalizedAppointmentStatusLabel,
  getAppointmentStatusBadgeClasses,
} from "../appointmentCardHelpers";

export interface ScheduleInspectorEmptyStateProps {
  appointments?: Appointment[];
  dateKey: string;
  patientLookupMap: Map<string, Patient>;
  staffLookupMap: Map<string, StaffMember>;
  toDateTimeLocalValue: (iso: string, tz?: string | null) => string;
  timezone?: string;
  appointmentLabels?: Record<string, string>;
  onSelectAppointment: (appointment: Appointment) => void;
}

export const ScheduleInspectorEmptyState: React.FC<ScheduleInspectorEmptyStateProps> = ({
  appointments = [],
  dateKey,
  patientLookupMap,
  staffLookupMap,
  toDateTimeLocalValue,
  timezone = "Europe/Moscow",
  appointmentLabels,
  onSelectAppointment,
}) => {
  // Filter appointments for the active dateKey
  const dayAppointments = appointments.filter((a) => {
    if (!a.startsAt) return false;
    const apptDate = toDateTimeLocalValue(a.startsAt, timezone).slice(0, 10);
    return apptDate === dateKey;
  });

  const totalCount = dayAppointments.length;
  const confirmedCount = dayAppointments.filter((a) => a.status === "confirmed").length;
  const inTreatmentCount = dayAppointments.filter(
    (a) => a.status === "in_treatment" || a.status === "in_progress" || a.status === "arrived",
  ).length;
  const completedCount = dayAppointments.filter((a) => a.status === "completed").length;

  return (
    <div
      className="schedule-inspector-empty flex flex-col gap-3 text-xs select-none"
      data-testid="schedule-inspector-empty-state"
    >
      {/* 1. Daily Summary Cards */}
      <div className="flex flex-col gap-1.5">
        <span className="font-extrabold text-[12px] text-[var(--ink)] tracking-tight">
          Сводка дня
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-between">
            <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
              <Users size={12} className="text-sky-600 shrink-0" />
              <span>Всего записей:</span>
            </span>
            <span className="font-bold text-[13px] text-[var(--ink)]">{totalCount}</span>
          </div>
          <div className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-between">
            <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
              <CheckCircle2 size={12} className="text-teal-600 shrink-0" />
              <span>Подтверждено:</span>
            </span>
            <span className="font-bold text-[13px] text-teal-600">{confirmedCount}</span>
          </div>
          <div className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-between">
            <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
              <Armchair size={12} className="text-emerald-600 shrink-0" />
              <span>В клинике:</span>
            </span>
            <span className="font-bold text-[13px] text-emerald-600">{inTreatmentCount}</span>
          </div>
          <div className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-between">
            <span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
              <Clock size={12} className="text-violet-600 shrink-0" />
              <span>Завершено:</span>
            </span>
            <span className="font-bold text-[13px] text-violet-600">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Today's Appointments List */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-extrabold text-[var(--ink)] tracking-tight">
            Приёмы на дату ({totalCount})
          </span>
          <span className="text-[10px] text-[var(--muted)]">клик для выбора</span>
        </div>

        {dayAppointments.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)]/30 text-center flex flex-col items-center justify-center gap-1.5 text-[var(--muted)]">
            <Calendar size={18} className="opacity-40" />
            <p className="text-[11px]">На выбранный день записей нет</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-0.5">
            {dayAppointments.map((a) => {
              const aTime = toDateTimeLocalValue(a.startsAt, timezone).slice(11, 16);
              const patObj = a.patientId ? patientLookupMap.get(a.patientId) : undefined;
              const pName = patObj?.fullName || (a as any).patient?.fullName || "Пациент";
              const docObj = a.doctorUserId ? staffLookupMap.get(a.doctorUserId) : undefined;
              const docName = docObj?.fullName || "";
              const statusLabel = getNormalizedAppointmentStatusLabel(a.status, appointmentLabels);

              return (
                <div
                  key={a.id}
                  onClick={() => onSelectAppointment(a)}
                  className="p-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-sky-500/[0.06] hover:border-sky-400/50 cursor-pointer transition-all flex items-center justify-between gap-1.5 text-xs shadow-2xs"
                  title="Выбрать приём для детального просмотра"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono font-bold text-[11px] text-[var(--ink)] shrink-0">
                      {aTime}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[12px] text-[var(--ink)] truncate">
                        {formatPatientDisplayFio(pName)}
                      </span>
                      {docName && (
                        <span className="text-[10px] text-[var(--muted)] truncate">
                          {formatDoctorShortName(docName)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${getAppointmentStatusBadgeClasses(
                      a.status,
                    )}`}
                  >
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-2 rounded-lg bg-[var(--paper-soft)]/50 border border-[var(--line)] text-center text-[10px] text-[var(--muted)]">
        Кликните по любому приёму на сетке для мгновенного просмотра телефона, звонка и смены статуса.
      </div>
    </div>
  );
};
