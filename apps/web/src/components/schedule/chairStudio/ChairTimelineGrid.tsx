/**
 * ChairTimelineGrid.tsx — Визуальный таймлайн слотов и сетка кресел
 * Мандат 8b / 8zi: эталонный Sweet Spot (160–210 строк).
 * Apple HIG: на мобильных устройствах нативный Agenda-список карточек, тач-таргеты >= 44x44px.
 * Мандат 8e / 8n: экспресс-запись в 1 клик по свободному окну.
 */

import React from "react";
import { Clock, Plus } from "lucide-react";
import {
  CHAIR_PRESETS,
  APPOINTMENT_STATUS_OPTIONS,
  getStatusMeta,
  type DentalChairPreset,
} from "../scheduleCatalogData";
import { type ScheduleStudioAppointment } from "./chairStudioTypes";

export interface ChairTimelineGridProps {
  readonly activeTab: "grid" | "agenda";
  readonly currentDate: string;
  readonly visibleChairs: readonly DentalChairPreset[];
  readonly timeHours: readonly string[];
  readonly appointments: readonly ScheduleStudioAppointment[];
  readonly selectedChairId: string;
  readonly onSlotClick: (chairId: string, timeStr: string) => void;
  readonly onStatusChange: (id: string, newStatus: ScheduleStudioAppointment["status"]) => void;
}

export const ChairTimelineGrid: React.FC<ChairTimelineGridProps> = ({
  activeTab,
  currentDate,
  visibleChairs,
  timeHours,
  appointments,
  selectedChairId,
  onSlotClick,
  onStatusChange,
}) => {
  if (activeTab === "agenda") {
    /* МОБИЛЬНЫЙ AGENDA-ТАЙМЛАЙН (APPLE HIG) */
    return (
      <div className="space-y-3 max-w-xl mx-auto" data-testid="schedule-agenda-timeline">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-[var(--muted)]">
            Приёмы на {currentDate} ({appointments.length} записей)
          </span>
          <button
            type="button"
            onClick={() => onSlotClick(selectedChairId === "all" ? "chair-1" : selectedChairId, "12:00")}
            className="min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs rounded-lg font-medium bg-[var(--teal,#0d9488)] text-white hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Записать
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted)] bg-[var(--paper)] rounded-xl border border-[var(--line)]">
            На выбранную дату записей нет. Нажмите «Свободное окно», чтобы записать пациента.
          </div>
        ) : (
          appointments.map((appt) => {
            const chair = CHAIR_PRESETS.find((c) => c.id === appt.chairId);
            const statusMeta = getStatusMeta(appt.status);
            return (
              <div
                key={appt.id}
                className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs flex flex-col gap-2 min-h-[52px]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--ink)]">
                      {appt.startTime}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      ({appt.durationMinutes} мин)
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--line)]/50 text-[var(--ink)]">
                      {chair?.name || "Кресло"}
                    </span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${statusMeta.dotColor}1a`,
                      color: statusMeta.dotColor,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: statusMeta.dotColor }}
                    />
                    {statusMeta.label}
                  </span>
                </div>
                <div className="text-sm font-medium text-[var(--ink)] leading-snug">
                  {appt.patientName}
                </div>
                <div className="text-xs text-[var(--muted)] flex items-center justify-between">
                  <span>{appt.reason}</span>
                  <span>{appt.patientPhone}</span>
                </div>

                {/* БЫСТРОЕ ПЕРЕКЛЮЧЕНИЕ СТАТУСА (СЕНСОРНЫЙ ВЫБОР APPLE HIG) */}
                <div className="pt-2 border-t border-[var(--line)]/60 flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--muted)]">Статус:</span>
                  <select
                    value={appt.status}
                    onChange={(e) => onStatusChange(appt.id, e.target.value as ScheduleStudioAppointment["status"])}
                    className="min-h-[44px] sm:min-h-0 px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] cursor-pointer"
                  >
                    {APPOINTMENT_STATUS_OPTIONS.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  /* ДЕСКТОПНАЯ СЕТКА КРЕСЕЛ */
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${visibleChairs.length}, minmax(280px, 1fr))` }}
    >
      {visibleChairs.map((chair) => {
        const chairAppointments = appointments.filter((a) => a.chairId === chair.id);
        return (
          <div
            key={chair.id}
            className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs overflow-hidden"
          >
            <div className="px-4 py-2.5 bg-[var(--paper-strong)] border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-[var(--ink)]">{chair.name}</div>
                <div className="text-[11px] text-[var(--muted)]">{chair.specialty}</div>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)]">
                {chair.roomNumber}
              </span>
            </div>

            <div className="p-3 space-y-2 flex-1">
              {timeHours.slice(0, 10).map((time) => {
                const appt = chairAppointments.find((a) => a.startTime === time);
                if (appt) {
                  const statusMeta = getStatusMeta(appt.status);
                  return (
                    <div
                      key={appt.id}
                      className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] shadow-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--ink)] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[var(--muted)]" />
                          {appt.startTime} ({appt.durationMinutes} мин)
                        </span>
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{
                            backgroundColor: `${statusMeta.dotColor}1a`,
                            color: statusMeta.dotColor,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: statusMeta.dotColor }}
                          />
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-[var(--ink)] leading-tight">
                        {appt.patientName}
                      </div>
                      <div className="text-xs text-[var(--muted)] flex items-center justify-between">
                        <span className="truncate">{appt.reason}</span>
                        <span className="shrink-0">{appt.patientPhone}</span>
                      </div>
                    </div>
                  );
                }

                // Свободное окно: клик для экспресс-записи
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => onSlotClick(chair.id, time)}
                    className="w-full py-2 px-3 rounded-lg border border-dashed border-[var(--line)] hover:border-[var(--teal,#0d9488)] text-[var(--muted)] hover:text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)]/5 flex items-center justify-between text-xs transition-colors group cursor-pointer"
                  >
                    <span className="font-mono text-[var(--ink)] font-medium">{time}</span>
                    <span className="flex items-center gap-1 group-hover:underline">
                      <Plus className="w-3.5 h-3.5" /> Свободное окно
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChairTimelineGrid;
