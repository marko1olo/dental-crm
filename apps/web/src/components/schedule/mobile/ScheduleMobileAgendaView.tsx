import React, { useMemo, useState, useCallback } from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  User,
  AlertTriangle,
  Armchair,
  ChevronRight as ChevronRightIcon,
  Users,
} from "lucide-react";
import { formatDoctorShortName } from "../GridAppointmentCard";
import { formatPatientDisplayFio } from "../appointmentCardHelpers";
import { ScheduleMobileBottomSheet } from "../grid/ScheduleMobileBottomSheet";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import { isNegativeAllergyStatement } from "../../../utils/somaticNorm";
import { useScheduleStore } from "../../../store/scheduleStore";
import "../scheduleMobileAgenda.css";

export interface ScheduleMobileAgendaViewProps {
  dashboard: Dashboard;
  dateKey: string;
  appointments: Appointment[];
  onDateChange: (newDateKey: string) => void;
  onSlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
  onAppointmentClick?: ((appointment: Appointment) => void) | undefined;
  onQuickStatusChange?: ((appointmentId: string, status: Appointment["status"]) => void) | undefined;
  onAppointmentMove?: ((appointmentId: string, updates: { startsAt?: string; endsAt?: string; chairId?: string; doctorUserId?: string; allowOverbooking?: boolean }) => void | Promise<any>) | undefined;
  patientName: (patients: any[], id: string | null) => string;
  formatTime: (iso: string) => string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  selectedChairId?: string | null | undefined;
  onSelectChair?: ((id: string | null) => void) | undefined;
  selectedDoctorId?: string | null | undefined;
  onSelectDoctor?: ((id: string | null) => void) | undefined;
  chairDoctorAssignments?: Record<string, any> | undefined;
  onQuickBooking?: (() => void) | undefined;
  timezone?: string | undefined;
}

const RUSSIAN_MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const RUSSIAN_DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export const ScheduleMobileAgendaView: React.FC<ScheduleMobileAgendaViewProps> = React.memo(
  function ScheduleMobileAgendaView({
    dashboard,
    dateKey,
    appointments = [],
    onDateChange,
    onSlotClick,
    onAppointmentClick,
    onQuickStatusChange,
    onAppointmentMove,
    patientName,
    formatTime,
    toDateTimeLocalValue,
    appointmentLabels,
    selectedChairId = null,
    onSelectChair,
    selectedDoctorId = null,
    onSelectDoctor,
    onQuickBooking,
    timezone = "Europe/Moscow",
  }) {
    const [selectedMobileAppt, setSelectedMobileAppt] = useState<Appointment | null>(null);

    const todayKey = useMemo(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }, []);

    const effectiveDateKey = dateKey || todayKey;

    const weekDays = useMemo(() => {
      const parts = effectiveDateKey.split("-").map(Number);
      const year = parts[0] ?? 2026;
      const month = parts[1] ?? 1;
      const day = parts[2] ?? 1;
      const targetDate = new Date(year, month - 1, day);
      
      const currentDayOfWeek = targetDate.getDay();
      const distanceToMonday = (currentDayOfWeek + 6) % 7;
      const monday = new Date(targetDate);
      monday.setDate(targetDate.getDate() - distanceToMonday);

      const days: Array<{
        dateIso: string;
        dayLabel: string;
        dayNumber: number;
        isToday: boolean;
        isSelected: boolean;
        hasAppointments: boolean;
        appointmentCount: number;
      }> = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayNum = String(d.getDate()).padStart(2, "0");
        const iso = `${y}-${m}-${dayNum}`;
        const dayOfWeekIndex = d.getDay();
        const dayLabel = RUSSIAN_DAY_NAMES[dayOfWeekIndex] ?? "Пн";

        const dayAppointments = appointments.filter((a) => {
          if (!a.startsAt) return false;
          const localIso = toDateTimeLocalValue(a.startsAt, timezone);
          return localIso.startsWith(iso);
        });

        days.push({
          dateIso: iso,
          dayLabel,
          dayNumber: d.getDate(),
          isToday: iso === todayKey,
          isSelected: iso === effectiveDateKey,
          hasAppointments: dayAppointments.length > 0,
          appointmentCount: dayAppointments.length,
        });
      }
      return days;
    }, [effectiveDateKey, todayKey, appointments, toDateTimeLocalValue, timezone]);

    const monthHeaderTitle = useMemo(() => {
      const parts = effectiveDateKey.split("-").map(Number);
      const year = parts[0] ?? 2026;
      const month = parts[1] ?? 1;
      return `${RUSSIAN_MONTHS[month - 1] ?? ""} ${year}`;
    }, [effectiveDateKey]);

    const handleShiftWeek = useCallback((deltaDays: number) => {
      const parts = effectiveDateKey.split("-").map(Number);
      const year = parts[0] ?? 2026;
      const month = parts[1] ?? 1;
      const day = parts[2] ?? 1;
      const d = new Date(year, month - 1, day + deltaDays);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      onDateChange(`${y}-${m}-${dayNum}`);
    }, [effectiveDateKey, onDateChange]);

    const doctors = useMemo(() => {
      return (dashboard?.clinicSettings?.staff ?? []).filter(
        (s: any) => s.active !== false && (s.role === "doctor" || s.specialties?.length || s.specialty)
      );
    }, [dashboard?.clinicSettings?.staff]);

    const chairs = useMemo(() => {
      return (dashboard?.clinicSettings?.chairs ?? []).filter((c: any) => c.active !== false);
    }, [dashboard?.clinicSettings?.chairs]);

    const filteredDayAppointments = useMemo(() => {
      return appointments
        .filter((appt) => {
          if (!appt.startsAt) return false;
          const localIso = toDateTimeLocalValue(appt.startsAt, timezone);
          if (!localIso.startsWith(effectiveDateKey)) return false;

          if (selectedDoctorId && appt.doctorUserId !== selectedDoctorId) {
            return false;
          }
          if (selectedChairId && appt.chairId !== selectedChairId) {
            return false;
          }
          return true;
        })
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }, [appointments, effectiveDateKey, selectedDoctorId, selectedChairId, toDateTimeLocalValue, timezone]);

    const timelineItems = useMemo(() => {
      const items: Array<
        | { type: "appointment"; appointment: Appointment; startsAtLocal: string; endsAtLocal: string; durationMinutes: number }
        | { type: "gap"; startsAt: string; endsAt: string; durationMinutes: number; startsAtLocal: string; endsAtLocal: string }
      > = [];

      if (filteredDayAppointments.length === 0) {
        return items;
      }

      let prev: Appointment | undefined;
      for (const current of filteredDayAppointments) {
        const currentStartLocal = toDateTimeLocalValue(current.startsAt, timezone);
        const currentEndLocal = toDateTimeLocalValue(current.endsAt, timezone);
        const currentStartDate = new Date(current.startsAt);
        const currentEndDate = new Date(current.endsAt);
        const durationMinutes = Math.max(15, Math.round((currentEndDate.getTime() - currentStartDate.getTime()) / 60000));

        if (prev) {
          const prevEndDate = new Date(prev.endsAt);
          const gapMinutes = Math.round((currentStartDate.getTime() - prevEndDate.getTime()) / 60000);

          if (gapMinutes >= 15) {
            const prevEndLocal = toDateTimeLocalValue(prev.endsAt, timezone);
            items.push({
              type: "gap",
              startsAt: prev.endsAt,
              endsAt: current.startsAt,
              durationMinutes: gapMinutes,
              startsAtLocal: prevEndLocal.slice(11, 16),
              endsAtLocal: currentStartLocal.slice(11, 16),
            });
          }
        }

        items.push({
          type: "appointment",
          appointment: current,
          startsAtLocal: currentStartLocal.slice(11, 16),
          endsAtLocal: currentEndLocal.slice(11, 16),
          durationMinutes,
        });

        prev = current;
      }

      return items;
    }, [filteredDayAppointments, toDateTimeLocalValue, timezone]);

    const getStatusTheme = (status: Appointment["status"]) => {
      switch (status) {
        case "in_treatment":
          return {
            stripe: "bg-[var(--teal,#0d9488)]",
            badgeBg: "bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40",
            label: appointmentLabels[status] || "В кресле",
          };
        case "confirmed":
          return {
            stripe: "bg-emerald-500",
            badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40",
            label: appointmentLabels[status] || "Подтвержден",
          };
        case "arrived":
          return {
            stripe: "bg-amber-500",
            badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40",
            label: "В холле",
          };
        case "completed":
          return {
            stripe: "bg-slate-400 dark:bg-slate-600",
            badgeBg: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30",
            label: appointmentLabels[status] || "Завершен",
          };
        case "cancelled":
        case "no_show":
          return {
            stripe: "bg-rose-500",
            badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40",
            label: appointmentLabels[status] || "Отменен",
          };
        default:
          return {
            stripe: "bg-sky-500",
            badgeBg: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
            label: appointmentLabels[status] || "Запланирован",
          };
      }
    };

    const handleAdjustDuration = async (appt: Appointment, delta: number) => {
      if (!onAppointmentMove) return;
      const start = new Date(appt.startsAt);
      const end = new Date(appt.endsAt);
      const newEnd = new Date(end.getTime() + delta * 60000);
      if (newEnd <= start) return;
      await onAppointmentMove(appt.id, {
        endsAt: newEnd.toISOString(),
      });
    };

    const handleShiftLateness = async (appt: Appointment, shift: number) => {
      if (!onAppointmentMove) return;
      const start = new Date(appt.startsAt);
      const end = new Date(appt.endsAt);
      const newStart = new Date(start.getTime() + shift * 60000);
      const newEnd = new Date(end.getTime() + shift * 60000);
      await onAppointmentMove(appt.id, {
        startsAt: newStart.toISOString(),
        endsAt: newEnd.toISOString(),
      });
    };

    const handleReassignChair = async (appt: Appointment, chairId: string | null) => {
      if (!onAppointmentMove) return;
      await onAppointmentMove(appt.id, {
        ...(chairId ? { chairId } : {}),
      });
    };

    const handleReassignDoctor = async (appt: Appointment, doctorUserId: string) => {
      if (!onAppointmentMove) return;
      await onAppointmentMove(appt.id, {
        doctorUserId,
      });
    };

    return (
      <div
        className="schedule-mobile-agenda"
        data-testid="schedule-mobile-agenda-view"
        role="region"
        aria-label="Расписание: мобильная повестка дня (Agenda View)"
      >
        {/* 1. Weekly Month Navigation & Quick Today Button */}
        <div className="schedule-mobile-month-nav">
          <div className="schedule-mobile-month-title">{monthHeaderTitle}</div>
          <div className="schedule-mobile-nav-buttons">
            {effectiveDateKey !== todayKey && (
              <button
                type="button"
                className="schedule-mobile-today-chip"
                onClick={() => onDateChange(todayKey)}
                aria-label="Перейти на сегодня"
              >
                Сегодня
              </button>
            )}
            <button
              type="button"
              className="schedule-mobile-nav-btn"
              onClick={() => handleShiftWeek(-7)}
              aria-label="Предыдущая неделя"
              title="Неделя назад"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="schedule-mobile-nav-btn"
              onClick={() => handleShiftWeek(7)}
              aria-label="Следующая неделя"
              title="Неделя вперёд"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* 2. 7-Day Week Strip (Apple iOS Calendar Style) */}
        <div
          className="schedule-mobile-day-strip"
          role="tablist"
          aria-label="Выбор дня недели"
        >
          {weekDays.map((day) => (
            <button
              key={day.dateIso}
              type="button"
              role="tab"
              aria-selected={day.isSelected}
              className={`schedule-mobile-day-cell ${day.isSelected ? "is-selected" : ""} ${day.isToday ? "is-today" : ""}`}
              onClick={() => {
                useScheduleStore.getState().setScheduleDateFilter(day.dateIso);
                onDateChange(day.dateIso);
              }}
            >
              <span className="schedule-mobile-day-label">{day.dayLabel}</span>
              <span className="schedule-mobile-day-num">{day.dayNumber}</span>
              {day.hasAppointments ? (
                <span
                  className="schedule-mobile-day-dot"
                  title={`Записей: ${day.appointmentCount}`}
                />
              ) : (
                <span className="schedule-mobile-day-dot-empty" />
              )}
            </button>
          ))}
        </div>

        {/* 3. Horizontal Doctor & Chair Chips Scroller */}
        <div className="schedule-mobile-chips-wrapper">
          <div className="schedule-mobile-chips-scroller">
            <button
              type="button"
              className={`schedule-mobile-filter-chip ${!selectedDoctorId && !selectedChairId ? "active" : ""}`}
              onClick={() => {
                useScheduleStore.getState().setScheduleDoctorFilterId(null);
                useScheduleStore.getState().setScheduleChairFilterId(null);
                if (onSelectDoctor) onSelectDoctor(null);
                if (onSelectChair) onSelectChair(null);
              }}
            >
              <Users size={13} className="shrink-0" />
              <span>Все врачи и кабинеты</span>
            </button>

            {doctors.map((doc: any) => {
              const isSelected = selectedDoctorId === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  className={`schedule-mobile-filter-chip ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    const nextVal = isSelected ? null : doc.id;
                    useScheduleStore.getState().setScheduleDoctorFilterId(nextVal);
                    if (onSelectDoctor) {
                      onSelectDoctor(nextVal);
                    }
                  }}
                >
                  <User size={13} />
                  <span>{formatDoctorShortName(doc.fullName)}</span>
                </button>
              );
            })}

            {chairs.map((chair: any) => {
              const isSelected = selectedChairId === chair.id;
              return (
                <button
                  key={chair.id}
                  type="button"
                  className={`schedule-mobile-filter-chip ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    const nextVal = isSelected ? null : chair.id;
                    useScheduleStore.getState().setScheduleChairFilterId(nextVal);
                    if (onSelectChair) {
                      onSelectChair(nextVal);
                    }
                  }}
                >
                  <Armchair size={13} className="shrink-0" />
                  <span>{chair.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Agenda Timeline List */}
        <div className="schedule-mobile-timeline">
          {timelineItems.length === 0 ? (
            <div className="schedule-mobile-empty-day">
              <div className="schedule-mobile-empty-icon">
                <Calendar size={28} />
              </div>
              <div className="schedule-mobile-empty-title">На этот день записей нет</div>
              <div className="schedule-mobile-empty-subtitle">
                Выберите другой день на полосе недели или создайте новую запись
              </div>
              <button
                type="button"
                className="schedule-mobile-empty-btn"
                onClick={() => {
                  if (onSlotClick) {
                    onSlotClick({
                      dateKey: effectiveDateKey,
                      doctorUserId: selectedDoctorId || null,
                      chairId: selectedChairId || null,
                      durationMinutes: 30,
                    });
                  } else if (onQuickBooking) {
                    onQuickBooking();
                  }
                }}
              >
                <Plus size={16} />
                <span>Записать пациента</span>
              </button>
            </div>
          ) : (
            timelineItems.map((item, index) => {
              if (item.type === "gap") {
                return (
                  <div
                    key={`gap-${item.startsAt}-${index}`}
                    className="schedule-mobile-gap-row"
                    onClick={() => {
                      if (onSlotClick) {
                        onSlotClick({
                          dateKey: effectiveDateKey,
                          startsAt: item.startsAt,
                          endsAt: item.endsAt,
                          doctorUserId: selectedDoctorId || null,
                          chairId: selectedChairId || null,
                          durationMinutes: item.durationMinutes,
                        });
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Свободное окно: ${item.durationMinutes} мин с ${item.startsAtLocal} до ${item.endsAtLocal}`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[var(--teal,#0d9488)]" />
                      <span>
                        Свободно ({item.durationMinutes} мин) · {item.startsAtLocal} – {item.endsAtLocal}
                      </span>
                    </div>
                    <span className="text-[var(--teal,#0d9488)] font-bold text-xs flex items-center gap-1">
                      <Plus size={14} /> Записать
                    </span>
                  </div>
                );
              }

              const appt = item.appointment;
              const pat = dashboard?.patients?.find((p: any) => p.id === appt.patientId);
              const fullPatientName = patientName(dashboard?.patients ?? [], appt.patientId);
              const pName = formatPatientDisplayFio(fullPatientName);
              const doc = dashboard?.clinicSettings?.staff?.find((s: any) => s.id === appt.doctorUserId);
              const chair = dashboard?.clinicSettings?.chairs?.find((c: any) => c.id === appt.chairId);
              const statusTheme = getStatusTheme(appt.status);

              const rawBal = pat?.balanceRub ?? (pat as any)?.balance;
              const balance =
                rawBal !== undefined && rawBal !== null && rawBal !== "" && Number.isFinite(Number(rawBal))
                  ? Number(rawBal)
                  : null;

              const allergyText = (() => {
                const rawAllergies =
                  (pat as any)?.allergies ||
                  (pat as any)?.anamnesis?.allergies;
                if (
                  rawAllergies &&
                  typeof rawAllergies === "string" &&
                  rawAllergies.trim() &&
                  !isNegativeAllergyStatement(rawAllergies)
                ) {
                  return rawAllergies.trim();
                }
                const reason = appt.reason || "";
                if ((/лидокаин/i.test(reason) || /аллерги/i.test(reason)) && !isNegativeAllergyStatement(reason)) {
                  return "Аллергия на лидокаин";
                }
                return null;
              })();

              return (
                <div key={appt.id} className="schedule-mobile-appt-row">
                  <div className="schedule-mobile-time-col">
                    <span className="schedule-mobile-time-start">{item.startsAtLocal}</span>
                    <span className="schedule-mobile-time-end">– {item.endsAtLocal}</span>
                    <span className="schedule-mobile-time-duration">{item.durationMinutes} мин</span>
                  </div>

                  <div
                    className="schedule-mobile-card"
                    data-testid="schedule-mobile-appt-card"
                    onClick={() => {
                      setSelectedMobileAppt(appt);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Приём: ${fullPatientName}, ${item.startsAtLocal}, статус: ${statusTheme.label}`}
                  >
                    <div className={`schedule-mobile-status-stripe ${statusTheme.stripe}`} />

                    <div className="schedule-mobile-card-content">
                      <div className="schedule-mobile-card-header">
                        <span className="schedule-mobile-patient-name" title={fullPatientName}>{pName}</span>
                        <span className={`schedule-mobile-status-badge ${statusTheme.badgeBg}`}>
                          {statusTheme.label}
                        </span>
                      </div>

                      <div className="schedule-mobile-procedure-row">
                        <span className="schedule-mobile-procedure-text">
                          {appt.reason || "Первичный осмотр / консультация"}
                        </span>
                      </div>

                      <div className="schedule-mobile-meta-row">
                        {(chair || doc) && (
                          <span className="schedule-mobile-doctor-chair-chip">
                            {chair?.name || "Кабинет"}
                            {doc ? ` · ${formatDoctorShortName(doc.fullName)}` : ""}
                          </span>
                        )}

                        {balance !== null && (
                          <span
                            className={`schedule-mobile-balance-chip ${
                              balance > 0
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : balance < 0
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {balance > 0
                              ? `+${balance.toLocaleString("ru-RU")} ₽`
                              : balance < 0
                                ? `Долг: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`
                                : "Оплачено"}
                          </span>
                        )}

                        {allergyText && (
                          <span className="schedule-mobile-allergy-chip" title={allergyText}>
                            <AlertTriangle size={10} className="shrink-0" />
                            <span>
                              {(() => {
                                const c = allergyText.replace(/^аллерги[яи][: \t-]*/i, "").replace(/^на\s+/i, "").trim();
                                return c ? c.charAt(0).toUpperCase() + c.slice(1) : allergyText;
                              })()}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center pl-1 text-[var(--muted,#64748b)]">
                      <ChevronRightIcon size={18} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Floating Bottom Bar (Natural Thumb Zone CTA) */}
        {!selectedMobileAppt && (
          <div className="schedule-mobile-bottom-bar">
            <button
              type="button"
              className="schedule-mobile-primary-action-btn"
              onClick={() => {
                if (onSlotClick) {
                  onSlotClick({
                    dateKey: effectiveDateKey,
                    doctorUserId: selectedDoctorId || null,
                    chairId: selectedChairId || null,
                    durationMinutes: 30,
                  });
                } else if (onQuickBooking) {
                  onQuickBooking();
                }
              }}
            >
              <Plus size={18} />
              <span>Новая запись</span>
            </button>
          </div>
        )}

        {/* 6. Native iOS Bottom Sheet Drawer for Appointment Details & Actions */}
        <ScheduleMobileBottomSheet
          selectedMobileAppt={selectedMobileAppt}
          onClose={() => setSelectedMobileAppt(null)}
          patientName={patientName}
          dashboard={dashboard}
          timezone={timezone}
          toDateTimeLocalValue={toDateTimeLocalValue}
          appointmentLabels={appointmentLabels}
          effectiveChairs={chairs}
          doctors={doctors}
          onAppointmentClick={(appointment) => {
            setSelectedMobileAppt(null);
            if (onAppointmentClick) onAppointmentClick(appointment);
          }}
          onQuickStatusChange={(appointmentId, status) => {
            if (onQuickStatusChange) onQuickStatusChange(appointmentId, status);
            setSelectedMobileAppt(null);
          }}
          handleAdjustAppointmentDuration={handleAdjustDuration}
          handleShiftAppointmentLateness={handleShiftLateness}
          handleReassignAppointmentChair={handleReassignChair}
          handleReassignAppointmentDoctor={handleReassignDoctor}
          handleFreeSlotToWaitlist={() => {
            setSelectedMobileAppt(null);
          }}
        />
      </div>
    );
  }
);
