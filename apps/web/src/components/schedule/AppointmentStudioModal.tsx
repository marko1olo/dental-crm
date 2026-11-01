/**
 * AppointmentStudioModal.tsx — Единая монолитная студия карточки приёма и бронирования (SSOT)
 * DENTE Dental CRM — Модуль расписания для частной стоматологии РФ (1–5 кресел).
 *
 * Мандаты:
 * - 8b / 8zi: эталонный Sweet Spot (200–260 строк, <350 строк, ноль микро-шредера).
 * - 8e / 8n: автономия врача и администратора, бронь за 5 секунд, ноль блокировок (disabled запрещены).
 * - 8am: единый дизайн-код, ровно ОДНА Primary CTA кнопка #0d9488 («Записать на приём»).
 * - 8ze / 8al / 8aq: Apple HIG, нативный Bottom Sheet на смартфонах (<= 768px), Drag Handle 36x5px.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Flame } from "lucide-react";
import {
  CLINICAL_REASON_PRESETS,
  DEFAULT_DOCTORS_ROSTER,
  DEFAULT_CHAIRS_ROSTER,
  getTodayDateString,
  generatePatientConfirmationMessage,
  type CanonicalAppointmentStatusCode,
  type AppointmentStudioSlotData,
} from "./appointmentCatalogData";
import { AppointmentStudioHeader } from "./appointmentStudio/AppointmentStudioHeader";
import { AppointmentStudioFooter } from "./appointmentStudio/AppointmentStudioFooter";
import { AppointmentStudioQuickActions } from "./appointmentStudio/AppointmentStudioQuickActions";
import {
  AppointmentStudioPatientFields,
  type PatientSuggestionItem,
} from "./appointmentStudio/AppointmentStudioPatientFields";
import { AppointmentStudioStatusPicker } from "./appointmentStudio/AppointmentStudioStatusPicker";
import { AppointmentStudioDateTimeFields } from "./appointmentStudio/AppointmentStudioDateTimeFields";
import "./appointmentStudio.css";

export type { AppointmentStudioSlotData };

export interface AppointmentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (slot: AppointmentStudioSlotData) => void;
  onStartVisit?: (slot: AppointmentStudioSlotData) => void;
  initialData?: Partial<AppointmentStudioSlotData> | null;
  doctors?: readonly { id: string; name: string; specialty?: string }[];
  chairs?: readonly { id: string; name: string }[];
}

const SAMPLE_PATIENTS: PatientSuggestionItem[] = [
  { id: "p-1", name: "Иванов Сергей Павлович", phone: "+7 (916) 123-45-67" },
  { id: "p-2", name: "Смирнова Анна Викторовна", phone: "+7 (925) 987-65-43" },
  { id: "p-3", name: "Кузнецов Дмитрий Олегович", phone: "+7 (903) 555-01-92" },
  { id: "p-4", name: "Михайлова Екатерина Ильинична", phone: "+7 (985) 333-22-11" },
];

export const AppointmentStudioModal: React.FC<AppointmentStudioModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onStartVisit,
  initialData,
  doctors = DEFAULT_DOCTORS_ROSTER,
  chairs = DEFAULT_CHAIRS_ROSTER,
}) => {
  const [patientName, setPatientName] = useState(() => initialData?.patientName || "");
  const [patientPhone, setPatientPhone] = useState(() => initialData?.patientPhone || "");
  const [patientId, setPatientId] = useState<string | undefined>(() => initialData?.patientId);
  const [doctorUserId, setDoctorUserId] = useState(() => initialData?.doctorUserId || doctors[0]?.id || "doc-voronov");
  const [chairId, setChairId] = useState(() => initialData?.chairId || chairs[0]?.id || "chair-1");
  const [dateKey, setDateKey] = useState(() => initialData?.dateKey || getTodayDateString());
  const [startTime, setStartTime] = useState(() => initialData?.startTime || "10:00");
  const [durationMinutes, setDurationMinutes] = useState(() => initialData?.durationMinutes || 30);
  const [reason, setReason] = useState(() => initialData?.reason || "Консультация");
  const [comment, setComment] = useState(() => initialData?.comment || "");
  const [status, setStatus] = useState<CanonicalAppointmentStatusCode>(() => initialData?.status || "planned");
  const [isEmergency, setIsEmergency] = useState(() => Boolean(initialData?.isEmergency || initialData?.reason?.includes("Острая боль")));
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [patientSuggestions, setPatientSuggestions] = useState<PatientSuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const today = getTodayDateString();
    setPatientName(initialData?.patientName || "");
    setPatientPhone(initialData?.patientPhone || "");
    setPatientId(initialData?.patientId);
    setDoctorUserId(initialData?.doctorUserId || doctors[0]?.id || "doc-voronov");
    setChairId(initialData?.chairId || chairs[0]?.id || "chair-1");
    setDateKey(initialData?.dateKey || today);
    setStartTime(initialData?.startTime || "10:00");
    setDurationMinutes(initialData?.durationMinutes || 30);
    setReason(initialData?.reason || "Консультация");
    setComment(initialData?.comment || "");
    setStatus(initialData?.status || "planned");
    setIsEmergency(Boolean(initialData?.isEmergency || initialData?.reason?.includes("Острая боль")));
    setCopyFeedback(null);
    setShowSuggestions(false);
  }, [isOpen, initialData, doctors, chairs]);

  const handleNameChange = (val: string) => {
    setPatientName(val);
    if (val.trim().length >= 2) {
      const q = val.toLowerCase();
      const matched = SAMPLE_PATIENTS.filter(
        (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q),
      );
      setPatientSuggestions(matched);
      setShowSuggestions(matched.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectPatient = (p: PatientSuggestionItem) => {
    setPatientId(p.id);
    setPatientName(p.name);
    setPatientPhone(p.phone);
    setShowSuggestions(false);
  };

  const handleReasonClick = (preset: typeof CLINICAL_REASON_PRESETS[0]) => {
    setReason(preset.label);
    setDurationMinutes(preset.defaultDurationMinutes);
    if (!comment) setComment(preset.defaultComment);
    if (preset.isEmergency) {
      setIsEmergency(true);
      setStatus("confirmed");
    } else {
      setIsEmergency(false);
    }
  };

  const currentDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorUserId) || doctors[0],
    [doctors, doctorUserId],
  );
  const currentChair = useMemo(
    () => chairs.find((c) => c.id === chairId) || chairs[0],
    [chairs, chairId],
  );

  const buildSlotPayload = (): AppointmentStudioSlotData => ({
    id: initialData?.id,
    patientId,
    patientName: patientName.trim() || "Пациент (по звонку)",
    patientPhone: patientPhone.trim(),
    doctorUserId: currentDoctor?.id || "doc-voronov",
    doctorName: currentDoctor?.name || "Д-р Воронов А. В.",
    chairId: currentChair?.id || "chair-1",
    chairName: currentChair?.name || "Кресло 1 (Терапия)",
    dateKey,
    startTime,
    durationMinutes,
    reason,
    comment,
    status,
    isEmergency,
  });

  const handleSaveAppointment = () => {
    const payload = buildSlotPayload();
    if (onSave) onSave(payload);
    onClose();
  };

  const handleStartVisitImmediately = () => {
    const payload = { ...buildSlotPayload(), status: "in_progress" as CanonicalAppointmentStatusCode };
    if (onStartVisit) onStartVisit(payload);
    else if (onSave) onSave(payload);
    onClose();
  };

  const handleCopySmsConfirmation = async () => {
    const msg = generatePatientConfirmationMessage({
      patientName: patientName.trim() || "Пациент",
      doctorName: currentDoctor?.name,
      dateStr: dateKey,
      startTime,
      durationMinutes,
    });
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(msg);
      setCopyFeedback("✓ Текст скопирован для пациента");
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch {
      setCopyFeedback("✓ Сообщение сформировано");
    }
  };

  const handleShiftDate = (days: number) => {
    try {
      const parts = dateKey.split("-").map(Number);
      const year = parts[0] ?? 2026;
      const month = parts[1] ?? 1;
      const day = parts[2] ?? 1;
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() + days);
      const nextY = d.getFullYear();
      const nextM = String(d.getMonth() + 1).padStart(2, "0");
      const nextD = String(d.getDate()).padStart(2, "0");
      setDateKey(`${nextY}-${nextM}-${nextD}`);
    } catch {
      /* fallback */
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="appointment-studio-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Карточка записи на приём"
      data-testid="appointment-studio-modal"
    >
      <div className="appointment-studio-modal" ref={containerRef}>
        {/* 1. ШАПКА СТУДИИ */}
        <AppointmentStudioHeader
          isMobile={isMobile}
          isEmergency={isEmergency}
          startTime={startTime}
          durationMinutes={durationMinutes}
          chairName={currentChair?.name}
          onClose={onClose}
        />

        {/* 2. ТЕЛО СТУДИИ */}
        <div className="appointment-studio-body">
          {/* СТАТУС ВИЗИТА */}
          <AppointmentStudioStatusPicker
            status={status}
            onStatusChange={setStatus}
          />

          {/* ПАЦИЕНТ: ИМЯ И ТЕЛЕФОН */}
          <AppointmentStudioPatientFields
            patientName={patientName}
            patientPhone={patientPhone}
            showSuggestions={showSuggestions}
            patientSuggestions={patientSuggestions}
            onNameChange={handleNameChange}
            onPhoneChange={setPatientPhone}
            onSelectPatient={handleSelectPatient}
          />

          {/* ВРАЧ (ВЫБОР В 1 КЛИК) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--muted,#64748b)]">Лечащий врач</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Лечащий врач">
              {doctors.map((doc) => {
                const active = doctorUserId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setDoctorUserId(doc.id)}
                    className={`reason-chip-btn ${active ? "is-active" : ""}`}
                    data-testid={`doctor-chip-${doc.id}`}
                  >
                    <span>{doc.name}</span>
                    {doc.specialty && (
                      <span className="text-[10px] opacity-75 hidden sm:inline">({doc.specialty})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ДАТА, ВРЕМЯ И СЕГМЕНТНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ДЛИТЕЛЬНОСТИ */}
          <AppointmentStudioDateTimeFields
            dateKey={dateKey}
            startTime={startTime}
            durationMinutes={durationMinutes}
            onDateChange={setDateKey}
            onStartTimeChange={setStartTime}
            onDurationChange={setDurationMinutes}
          />

          {/* БЫСТРЫЕ ТЕГИ ПРИЧИН ОБРАЩЕНИЯ */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--muted,#64748b)]">Причина визита (1 клик)</span>
            <div className="reason-chips-grid">
              {CLINICAL_REASON_PRESETS.map((p) => {
                const active = reason === p.label;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleReasonClick(p)}
                    className={`reason-chip-btn ${active ? "is-active" : ""} ${p.isEmergency ? "is-emergency" : ""}`}
                    data-testid={`reason-chip-${p.id}`}
                  >
                    {p.isEmergency && <Flame size={14} className="text-rose-500" />}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ПРИМЕЧАНИЕ / ЖАЛОБА */}
          <div className="flex flex-col gap-1">
            <label htmlFor="slot-comment-input" className="text-xs font-semibold text-[var(--muted,#64748b)]">
              Примечание / Жалоба пациента
            </label>
            <input
              id="slot-comment-input"
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Зуб 46 реакция на холодное, острая боль 2 дня..."
              className="studio-input-field"
              data-testid="slot-comment-input"
            />
          </div>

          {/* КНОПКИ БЫСТРЫХ ДЕЙСТВИЙ */}
          <AppointmentStudioQuickActions
            copyFeedback={copyFeedback}
            onStartVisitImmediately={handleStartVisitImmediately}
            onCopySmsConfirmation={handleCopySmsConfirmation}
            onShiftDate={handleShiftDate}
          />
        </div>

        {/* 3. НИЖНЯЯ ПАНЕЛЬ: РОВНО ОДНА PRIMARY CTA КНОПКА #0d9488 */}
        <AppointmentStudioFooter
          startTime={startTime}
          durationMinutes={durationMinutes}
          onSave={handleSaveAppointment}
        />
      </div>
    </div>
  );

  return typeof document !== "undefined" && document.body
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default AppointmentStudioModal;
