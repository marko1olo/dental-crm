/**
 * useChairScheduleStudioState.ts — Канонический изолированный хук управления расписанием кресел
 * Мандат 8b / 8zi: эталонный Sweet Spot (170–230 строк).
 * Мандат 8e / 8n: автономия соло-врача, ноль блокировок, отсутствие обязательных ассистентов.
 */

import { useState, useMemo, useCallback } from "react";
import {
  CHAIR_PRESETS,
  checkSlotCollision,
  parseTimeToMinutes,
  type DentalChairPreset,
} from "../scheduleCatalogData";
import {
  type ScheduleStudioAppointment,
  type ChairShiftType,
  type QuickBookingSlotState,
  type QuickBookingFormState,
  CHAIR_SHIFT_OPTIONS,
} from "./chairStudioTypes";

export const INITIAL_DEMO_SLOTS: readonly ScheduleStudioAppointment[] = [
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

export interface UseChairScheduleStudioStateOptions {
  initialDate?: string;
  initialChairId?: string;
  onAppointmentCreate?: (appt: ScheduleStudioAppointment) => void;
  onAppointmentStatusChange?: (id: string, newStatus: ScheduleStudioAppointment["status"]) => void;
}

export function useChairScheduleStudioState({
  initialDate,
  initialChairId = "all",
  onAppointmentCreate,
  onAppointmentStatusChange,
}: UseChairScheduleStudioStateOptions = {}) {
  const [currentDate, setCurrentDate] = useState<string>(() => {
    return initialDate || new Date().toISOString().slice(0, 10);
  });
  const [selectedChairId, setSelectedChairId] = useState<string>(initialChairId);
  const [selectedShift, setSelectedShift] = useState<ChairShiftType>("full_day");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("Д-р Соколов А.В.");
  const [appointments, setAppointments] = useState<ScheduleStudioAppointment[]>(() => [...INITIAL_DEMO_SLOTS]);

  // Стейт экспресс-бронирования слота (1-клик шторка)
  const [bookingSlot, setBookingSlot] = useState<QuickBookingSlotState | null>(null);

  const [bookingForm, setBookingForm] = useState<QuickBookingFormState>({
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

  // Навигация по датам со сдвигом на delta дней
  const handleDateShift = useCallback((deltaDays: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + deltaDays);
      return d.toISOString().slice(0, 10);
    });
  }, []);

  // Фильтрация видимых кресел
  const visibleChairs = useMemo<readonly DentalChairPreset[]>(() => {
    if (selectedChairId === "all") return CHAIR_PRESETS;
    return CHAIR_PRESETS.filter((c) => c.id === selectedChairId);
  }, [selectedChairId]);

  // Сетка временных отметок в зависимости от выбранной смены (шаг 30 мин)
  const timeHours = useMemo<readonly string[]>(() => {
    const shift = CHAIR_SHIFT_OPTIONS.find((s) => s.id === selectedShift) || CHAIR_SHIFT_OPTIONS[2];
    const list: string[] = [];
    const start = shift.startHour;
    const end = shift.endHour;

    for (let h = start; h < end; h++) {
      list.push(`${String(h).padStart(2, "0")}:00`);
      list.push(`${String(h).padStart(2, "0")}:30`);
    }
    return list;
  }, [selectedShift]);

  // Клик по окну сетки для быстрой записи
  const handleSlotClick = useCallback((chairId: string, timeStr: string) => {
    setBookingSlot({ chairId, startTime: timeStr });
    setBookingForm((prev) => ({
      ...prev,
      patientName: "",
      patientPhone: "",
    }));
  }, []);

  const cancelBooking = useCallback(() => {
    setBookingSlot(null);
  }, []);

  // Мандат 8e: Кнопка подтверждения НИКОГДА не disabled!
  const handleQuickBookSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!bookingSlot) return;

      const startMin = parseTimeToMinutes(bookingSlot.startTime);
      const endMin = startMin + bookingForm.durationMinutes;

      // Zero Overlap Guard
      checkSlotCollision(
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
    },
    [bookingSlot, bookingForm, appointments, onAppointmentCreate],
  );

  const handleStatusChange = useCallback(
    (id: string, newStatus: ScheduleStudioAppointment["status"]) => {
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)),
      );
      if (onAppointmentStatusChange) {
        onAppointmentStatusChange(id, newStatus);
      }
    },
    [onAppointmentStatusChange],
  );

  return {
    currentDate,
    setCurrentDate,
    handleDateShift,
    selectedChairId,
    setSelectedChairId,
    selectedShift,
    setSelectedShift,
    selectedDoctor,
    setSelectedDoctor,
    appointments,
    visibleChairs,
    timeHours,
    bookingSlot,
    bookingForm,
    setBookingForm,
    activeTab,
    setActiveTab,
    handleSlotClick,
    cancelBooking,
    handleQuickBookSubmit,
    handleStatusChange,
  };
}

export type UseChairScheduleStudioStateReturn = ReturnType<typeof useChairScheduleStudioState>;
