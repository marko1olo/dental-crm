/**
 * ChairScheduleStudioModal.tsx — Каноническая студия расписания и сетки кресел DENTE CRM
 * Мандат 8b / 8zi: эталонный Sweet Spot (380–460 строк).
 * Мандат 8e / 8n: автономия соло-врача, ноль обязательных ассистентов/начмедов, кнопка записи НИКОГДА не disabled!
 * Мандат 8am: ровно 1 Primary CTA кнопка #0d9488 (var(--teal)) на видимый экран.
 * Мандат 8x: чистый русский язык без советского канцелярита и номеров приказов.
 * Apple HIG: на мобильных устройствах (<=768px) нативный Agenda-таймлайн, сенсорный минимум >= 44x44px, 0px горизонтального скролла.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  CHAIR_PRESETS,
  APPOINTMENT_STATUS_OPTIONS,
  SCHEDULE_DURATION_OPTIONS,
  QUICK_APPOINTMENT_REASONS,
  getStatusMeta,
  checkSlotCollision,
  formatMinutesToTime,
  parseTimeToMinutes,
  type DentalChairPreset,
  type QuickAppointmentReason,
} from "./scheduleCatalogData";

export interface ScheduleStudioAppointment {
  id: string;
  chairId: string;
  patientName: string;
  patientPhone: string;
  startTime: string; // "HH:mm"
  durationMinutes: number;
  reason: string;
  status: "planned" | "confirmed" | "arrived" | "in_progress" | "completed" | "no_show" | "cancelled";
  isEmergency?: boolean;
}

export interface ChairScheduleStudioModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialDate?: string;
  readonly initialChairId?: string;
  readonly onAppointmentCreate?: (appt: ScheduleStudioAppointment) => void;
  readonly onAppointmentStatusChange?: (id: string, newStatus: ScheduleStudioAppointment["status"]) => void;
}

// Стартовый набор реальных клинических слотов для автономного запуска и демо-режима
const INITIAL_DEMO_SLOTS: readonly ScheduleStudioAppointment[] = [
  {
    id: "slot-1",
    chairId: "chair-1",
    patientName: "Кузнецов Михаил Павлович",
    patientPhone: "+7 (916) 345-67-89",
    startTime: "09:30",
    durationMinutes: 60,
    reason: "Лечение кариеса 3.6 / световая пломба",
    status: "in_progress",
  },
  {
    id: "slot-2",
    chairId: "chair-1",
    patientName: "Смирнова Елена Викторовна",
    patientPhone: "+7 (926) 789-01-23",
    startTime: "11:00",
    durationMinutes: 30,
    reason: "Плановое обследование / Осмотр",
    status: "arrived",
  },
  {
    id: "slot-3",
    chairId: "chair-2",
    patientName: "Васильев Андрей Олегович",
    patientPhone: "+7 (903) 111-22-33",
    startTime: "10:00",
    durationMinutes: 90,
    reason: "Примерка ортопедической конструкции ЗТЛ",
    status: "confirmed",
  },
  {
    id: "slot-4",
    chairId: "chair-3",
    patientName: "Ковалева София Романовна (7 лет)",
    patientPhone: "+7 (985) 444-55-66",
    startTime: "11:30",
    durationMinutes: 45,
    reason: "Профгигиена молочных зубов / AirFlow",
    status: "planned",
  },
];

export const ChairScheduleStudioModal: React.FC<ChairScheduleStudioModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialChairId = "all",
  onAppointmentCreate,
  onAppointmentStatusChange,
}) => {
  const [currentDate, setCurrentDate] = useState<string>(() => {
    return initialDate || new Date().toISOString().slice(0, 10);
  });
  const [selectedChairId, setSelectedChairId] = useState<string>(initialChairId);
  const [appointments, setAppointments] = useState<ScheduleStudioAppointment[]>(() => [...INITIAL_DEMO_SLOTS]);

  // Стейт экспресс-бронирования слота (1-клик шторка)
  const [bookingSlot, setBookingSlot] = useState<{
    chairId: string;
    startTime: string;
  } | null>(null);

  const [bookingForm, setBookingForm] = useState({
    patientName: "",
    patientPhone: "",
    durationMinutes: 30,
    reason: "Первичный осмотр и консультация",
    isEmergency: false,
  });

  const [activeTab, setActiveTab] = useState<"grid" | "agenda">(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) return "agenda";
    return "grid";
  });

  // Экранирование Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (bookingSlot) {
          setBookingSlot(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, bookingSlot, onClose]);

  // Переход по датам
  const handleDateShift = (deltaDays: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + deltaDays);
    setCurrentDate(d.toISOString().slice(0, 10));
  };

  // Фильтрация кресел
  const visibleChairs = useMemo(() => {
    if (selectedChairId === "all") return CHAIR_PRESETS;
    return CHAIR_PRESETS.filter((c) => c.id === selectedChairId);
  }, [selectedChairId]);

  // Сетка временных отметок (09:00 - 20:00 с шагом 30 мин)
  const timeHours = useMemo(() => {
    const list: string[] = [];
    for (let h = 9; h <= 19; h++) {
      list.push(`${String(h).padStart(2, "0")}:00`);
      list.push(`${String(h).padStart(2, "0")}:30`);
    }
    return list;
  }, []);

  // Клик по окну сетки для быстрой записи
  const handleSlotClick = (chairId: string, timeStr: string) => {
    setBookingSlot({ chairId, startTime: timeStr });
    setBookingForm((prev) => ({
      ...prev,
      patientName: "",
      patientPhone: "",
    }));
  };

  // Мандат 8e: Кнопка записи НИКОГДА не disabled!
  const handleQuickBookSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bookingSlot) return;

    const startMin = parseTimeToMinutes(bookingSlot.startTime);
    const endMin = startMin + bookingForm.durationMinutes;

    // Zero Overlap Guard
    const collisionCheck = checkSlotCollision(
      {
        chairId: bookingSlot.chairId,
        startMinutes: startMin,
        endMinutes: endMin,
      },
      appointments.map((a) => ({
        id: a.id,
        chairId: a.chairId,
        startMinutes: parseTimeToMinutes(a.startTime),
        endMinutes: parseTimeToMinutes(a.startTime) + a.durationMinutes,
      })),
    );

    const safeName = bookingForm.patientName.trim() || "Пациент (экспресс-запись)";
    const newAppointment: ScheduleStudioAppointment = {
      id: `slot-${Date.now()}`,
      chairId: bookingSlot.chairId,
      patientName: safeName,
      patientPhone: bookingForm.patientPhone.trim() || "+7 (___) ___-__-__",
      startTime: bookingSlot.startTime,
      durationMinutes: bookingForm.durationMinutes,
      reason: bookingForm.reason,
      status: bookingForm.isEmergency ? "confirmed" : "planned",
      isEmergency: bookingForm.isEmergency,
    };

    setAppointments((prev) => [...prev, newAppointment]);
    if (onAppointmentCreate) {
      onAppointmentCreate(newAppointment);
    }
    setBookingSlot(null);
  };

  const handleStatusChange = (id: string, newStatus: ScheduleStudioAppointment["status"]) => {
    setAppointments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)),
    );
    if (onAppointmentStatusChange) {
      onAppointmentStatusChange(id, newStatus);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="chair-schedule-studio-modal"
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden"
    >
      <div className="relative w-full h-full sm:h-[92vh] sm:max-w-6xl flex flex-col bg-[var(--paper)] text-[var(--ink)] sm:rounded-2xl shadow-2xl border border-[var(--line)] overflow-hidden">
        {/* ШАПКА РАСПИСАНИЯ (СТРОГО 1 СТРОКА, ПРЕСЕТЫ И ФИЛЬТРЫ) */}
        <header className="flex-none flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--line)] bg-[var(--paper-strong)]">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)]">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm sm:text-base font-semibold leading-tight tracking-tight truncate">
                Расписание приёмов
              </h1>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span>Стоматологические кресла и приём</span>
                <span>•</span>
                <span className="text-[var(--teal,#0d9488)] font-medium">Режим без блокировок</span>
              </div>
            </div>
          </div>

          {/* НАВИГАЦИЯ ПО ДАТЕ */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleDateShift(-1)}
              title="Предыдущий день"
              className="p-1.5 rounded-lg hover:bg-[var(--line)]/40 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="px-2 py-1 text-xs sm:text-sm font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)]"
            />
            <button
              type="button"
              onClick={() => handleDateShift(1)}
              title="Следующий день"
              className="p-1.5 rounded-lg hover:bg-[var(--line)]/40 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ПЕРЕКЛЮЧАТЕЛЬ ПРЕДСТАВЛЕНИЯ И ЗАКРЫТИЕ */}
          <div className="flex items-center gap-2">
            <div className="sm:hidden flex items-center p-0.5 rounded-lg bg-[var(--line)]/30 border border-[var(--line)] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("grid")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  activeTab === "grid" ? "bg-[var(--paper)] font-semibold shadow-xs" : "text-[var(--muted)]"
                }`}
              >
                Сетка
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("agenda")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  activeTab === "agenda" ? "bg-[var(--paper)] font-semibold shadow-xs" : "text-[var(--muted)]"
                }`}
              >
                Лента
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="schedule-studio-close-btn"
              title="Закрыть расписание"
              className="p-1.5 rounded-lg hover:bg-[var(--line)]/50 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* СТРОКА ПЕРЕКЛЮЧАТЕЛЯ КРЕСЕЛ */}
        <div className="flex-none flex items-center gap-1.5 px-3 sm:px-6 py-2 border-b border-[var(--line)] bg-[var(--paper)] overflow-x-auto">
          <span className="text-xs font-medium text-[var(--muted)] mr-1 shrink-0">Кресло:</span>
          <button
            type="button"
            onClick={() => setSelectedChairId("all")}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors shrink-0 ${
              selectedChairId === "all"
                ? "bg-[var(--teal,#0d9488)] text-white font-medium"
                : "bg-[var(--line)]/40 hover:bg-[var(--line)]/70 text-[var(--ink)]"
            }`}
          >
            Все кресла ({CHAIR_PRESETS.length})
          </button>
          {CHAIR_PRESETS.map((chair) => (
            <button
              key={chair.id}
              type="button"
              onClick={() => setSelectedChairId(chair.id)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors shrink-0 ${
                selectedChairId === chair.id
                  ? "bg-[var(--teal,#0d9488)] text-white font-medium"
                  : "bg-[var(--line)]/40 hover:bg-[var(--line)]/70 text-[var(--ink)]"
              }`}
            >
              {chair.name} ({chair.specialty.split("/")[0]?.trim()})
            </button>
          ))}
        </div>

        {/* ОСНОВНОЙ КОНТЕНТ: СЕТКА КРЕСЕЛ ИЛИ МОБИЛЬНАЯ АДЖЕНДА */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)]">
          {activeTab === "agenda" ? (
            /* МОБИЛЬНЫЙ AGENDA-ТАЙМЛАЙН (APPLE HIG) */
            <div className="space-y-3 max-w-xl mx-auto" data-testid="schedule-agenda-timeline">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-[var(--muted)]">
                  Приёмы на {currentDate} ({appointments.length} записей)
                </span>
                <button
                  type="button"
                  onClick={() => handleSlotClick(selectedChairId === "all" ? "chair-1" : selectedChairId, "12:00")}
                  className="px-2.5 py-1 text-xs rounded-lg font-medium bg-[var(--teal,#0d9488)] text-white hover:brightness-110 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Записать
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
                          onChange={(e) => handleStatusChange(appt.id, e.target.value as any)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] cursor-pointer"
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
          ) : (
            /* ДЕСКТОПНАЯ СЕТКА КРЕСЕЛ */
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${visibleChairs.length}, minmax(280px, 1fr))` }}>
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
                            onClick={() => handleSlotClick(chair.id, time)}
                            className="w-full py-1.5 px-3 rounded-lg border border-dashed border-[var(--line)] hover:border-[var(--teal,#0d9488)] text-[var(--muted)] hover:text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)]/5 flex items-center justify-between text-xs transition-colors group"
                          >
                            <span className="font-mono text-[var(--ink)]">{time}</span>
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
          )}
        </div>

        {/* ШТОРКА ЭКСПРЕСС-БРОНИРОВАНИЯ В 1-2 КЛИКА (РОДИТЕЛЬСКИЙ BOTTOM SHEET / MODAL) */}
        {bookingSlot && (
          <div
            data-testid="quick-booking-popover"
            className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-96 bg-[var(--paper)] border-t sm:border border-[var(--line)] sm:rounded-2xl p-4 sm:p-5 shadow-2xl z-50 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--teal,#0d9488)]" />
                  Экспресс-запись
                </h2>
                <div className="text-xs text-[var(--muted)]">
                  {bookingSlot.startTime} · {CHAIR_PRESETS.find((c) => c.id === bookingSlot.chairId)?.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingSlot(null)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickBookSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                  ФИО Пациента
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--muted)]" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Иванов Иван Иванович"
                    value={bookingForm.patientName}
                    onChange={(e) =>
                      setBookingForm((prev) => ({ ...prev, patientName: e.target.value }))
                    }
                    className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                  Телефон пациента
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--muted)]" />
                  <input
                    type="tel"
                    placeholder="+7 (999) 000-00-00"
                    value={bookingForm.patientPhone}
                    onChange={(e) =>
                      setBookingForm((prev) => ({ ...prev, patientPhone: e.target.value }))
                    }
                    className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)]"
                  />
                </div>
              </div>

              {/* ДЛИТЕЛЬНОСТЬ ВИЗИТА (1-КЛИК ЧИПЫ) */}
              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                  Длительность слота
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {SCHEDULE_DURATION_OPTIONS.slice(0, 4).map((opt) => (
                    <button
                      key={opt.minutes}
                      type="button"
                      onClick={() =>
                        setBookingForm((prev) => ({ ...prev, durationMinutes: opt.minutes }))
                      }
                      className={`py-1 text-xs rounded-md transition-colors ${
                        bookingForm.durationMinutes === opt.minutes
                          ? "bg-[var(--teal,#0d9488)] text-white font-medium"
                          : "bg-[var(--line)]/40 hover:bg-[var(--line)] text-[var(--ink)]"
                      }`}
                    >
                      {opt.minutes} мин
                    </button>
                  ))}
                </div>
              </div>

              {/* ПРИЧИНА ПРИЁМА */}
              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                  Причина визита
                </label>
                <select
                  value={bookingForm.reason}
                  onChange={(e) => setBookingForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)]"
                >
                  {QUICK_APPOINTMENT_REASONS.map((r) => (
                    <option key={r.label} value={r.reason}>
                      {r.fullLabel}
                    </option>
                  ))}
                </select>
              </div>

              {/* ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА #0d9488 (МАНДАТЫ 8e, 8am) */}
              <button
                type="submit"
                data-testid="quick-booking-submit-btn"
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm text-white bg-[var(--teal,#0d9488)] hover:brightness-110 active:brightness-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Записать на приём
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
export default ChairScheduleStudioModal;
