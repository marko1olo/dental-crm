/**
 * AppointmentStudioModal.tsx — Единая монолитная студия карточки приёма и бронирования (SSOT)
 * DENTE Dental CRM — Модуль расписания для частной стоматологии РФ (1–5 кресел).
 *
 * Мандаты:
 * - 8b / 8zi: эталонный Sweet Spot (строго 320–420 строк, ноль микро-шредера).
 * - 8e / 8n: автономия врача и администратора, бронь за 5 секунд, ноль блокировок (disabled запрещены).
 * - 8am: единый дизайн-код, ровно ОДНА Primary CTA кнопка #0d9488 («Записать на приём»).
 * - 8wy: строгий двухрежимный закон — в боевом режиме ноль демо-мокапов, SAMPLE_PATIENTS строго за isDemoShowcaseMode.
 * - 8ze / 8al / 8aq: Apple HIG, нативный Bottom Sheet на смартфонах (<= 768px), Drag Handle 36x5px.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Flame, Sparkles, X, User, Phone, Calendar, Clock, Play, Copy, CalendarClock, Check } from "lucide-react";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import {
  CANONICAL_APPOINTMENT_STATUSES,
  CLINICAL_REASON_PRESETS,
  PRIMARY_DURATION_MINUTES,
  DEFAULT_DOCTORS_ROSTER,
  DEFAULT_CHAIRS_ROSTER,
  getTodayDateString,
  formatSlotTimeRange,
  generatePatientConfirmationMessage,
  type CanonicalAppointmentStatusCode,
  type AppointmentStudioSlotData,
} from "./appointmentCatalogData";
import "./appointmentStudio.css";

export type { AppointmentStudioSlotData };

export interface PatientSuggestionItem {
  id: string;
  name: string;
  phone: string;
}

export interface AppointmentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (slot: AppointmentStudioSlotData) => void;
  onStartVisit?: (slot: AppointmentStudioSlotData) => void;
  initialData?: Partial<AppointmentStudioSlotData> | null;
  doctors?: readonly { id: string; name: string; specialty?: string }[];
  chairs?: readonly { id: string; name: string }[];
  patients?: readonly PatientSuggestionItem[];
  isDemoMode?: boolean;
}

export const SAMPLE_PATIENTS: readonly PatientSuggestionItem[] = [
  { id: "p-1", name: "Иванов Сергей Павлович", phone: "+7 (916) 123-45-67" },
  { id: "p-2", name: "Смирнова Анна Викторовна", phone: "+7 (925) 987-65-43" },
  { id: "p-3", name: "Кузнецов Дмитрий Олегович", phone: "+7 (903) 555-01-92" },
  { id: "p-4", name: "Михайлова Екатерина Ильинична", phone: "+7 (985) 333-22-11" },
];

export function filterPatientSuggestions(
  query: string,
  customPatients?: readonly PatientSuggestionItem[],
  demoModeOverride?: boolean,
): PatientSuggestionItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const pool = (customPatients && customPatients.length > 0)
    ? customPatients
    : (isDemoShowcaseMode(demoModeOverride) ? SAMPLE_PATIENTS : []);
  return pool.filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q));
}

export const AppointmentStudioModal: React.FC<AppointmentStudioModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onStartVisit,
  initialData,
  doctors = DEFAULT_DOCTORS_ROSTER,
  chairs = DEFAULT_CHAIRS_ROSTER,
  patients,
  isDemoMode,
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
  const containerRef = useRef<HTMLDivElement>(null);

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
    const matched = filterPatientSuggestions(val, patients, isDemoMode);
    setPatientSuggestions(matched);
    setShowSuggestions(matched.length > 0);
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
    setIsEmergency(Boolean(preset.isEmergency));
    if (preset.isEmergency) setStatus("confirmed");
  };

  const currentDoctor = useMemo(() => doctors.find((d) => d.id === doctorUserId) || doctors[0], [doctors, doctorUserId]);
  const currentChair = useMemo(() => chairs.find((c) => c.id === chairId) || chairs[0], [chairs, chairId]);

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
    if (onSave) onSave(buildSlotPayload());
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
      const d = new Date(parts[0] ?? 2026, (parts[1] ?? 1) - 1, parts[2] ?? 1);
      d.setDate(d.getDate() + days);
      setDateKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    } catch { /* fallback */ }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="appointment-studio-backdrop fixed" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="appointment-studio-modal"
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Карточка записи на приём"
        data-testid="appointment-studio-modal"
      >
        {/* ТАКТИЛЬНЫЙ DRAG HANDLE ДЛЯ МОБИЛЬНОГО BOTTOM SHEET APPLE HIG */}
        <div className="studio-drag-handle-bar" aria-hidden="true">
          <div className="studio-drag-handle-pill" />
        </div>

        {/* 1. ШАПКА СТУДИИ */}
        <div className="appointment-studio-header">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl border flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isEmergency ? "rgba(225, 29, 72, 0.15)" : "rgba(13, 148, 136, 0.12)",
                color: isEmergency ? "#e11d48" : "#0d9488",
                borderColor: isEmergency ? "rgba(225, 29, 72, 0.3)" : "rgba(13, 148, 136, 0.25)",
              }}
            >
              {isEmergency ? <Flame size={20} className="animate-pulse" /> : <Sparkles size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
                  {isEmergency ? "Срочная запись: острая боль" : "Карточка записи на приём"}
                </h2>
                {isEmergency && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase text-white bg-rose-600" data-testid="emergency-badge">
                    CITO
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
                {formatSlotTimeRange(startTime, durationMinutes)} · {currentChair?.name}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer border-none bg-transparent" aria-label="Закрыть студию записи" data-testid="studio-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* 2. ТЕЛО СТУДИИ */}
        <div className="appointment-studio-body">
          {/* СТАТУС ВИЗИТА В 1 КЛИК */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--muted,#64748b)]">Статус записи</span>
            <div className="status-pills-row" role="radiogroup" aria-label="Статус визита">
              {CANONICAL_APPOINTMENT_STATUSES.map((st) => (
                <button
                  key={st.code}
                  type="button"
                  onClick={() => setStatus(st.code)}
                  className={`status-pill-btn ${status === st.code ? "is-active" : ""}`}
                  data-testid={`status-pill-${st.code}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: st.dotColor }} />
                  <span>{st.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ПАЦИЕНТ: ИМЯ И ТЕЛЕФОН С АВТОПОДСКАЗКАМИ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
            <div className="flex flex-col gap-1 relative">
              <label htmlFor="patient-name-input" className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
                <User size={13} /><span>Пациент (ФИО)</span>
              </label>
              <input id="patient-name-input" type="text" value={patientName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Иван Иванов" className="studio-input-field" data-testid="patient-name-input" autoComplete="off" />
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-[68px] z-30 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xl overflow-hidden py-1" data-testid="patient-suggestions-popup">
                  {patientSuggestions.map((p) => (
                    <button key={p.id} type="button" onClick={() => handleSelectPatient(p)} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--paper-soft,#f1f5f9)] flex items-center justify-between cursor-pointer border-none bg-transparent">
                      <span className="font-semibold text-[var(--ink,#0f172a)]">{p.name}</span>
                      <span className="text-[var(--muted,#64748b)]">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="patient-phone-input" className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
                <Phone size={13} /><span>Номер телефона</span>
              </label>
              <input id="patient-phone-input" type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="+7 (999) 000-00-00" className="studio-input-field" data-testid="patient-phone-input" />
            </div>
          </div>

          {/* ВРАЧ (ВЫБОР В 1 КЛИК ДЛЯ СОЛО И КЛИНИК НА 1–5 КРЕСЕЛ) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--muted,#64748b)]">Лечащий врач</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Лечащий врач">
              {doctors.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setDoctorUserId(doc.id)}
                  className={`reason-chip-btn ${doctorUserId === doc.id ? "is-active" : ""}`}
                  data-testid={`doctor-chip-${doc.id}`}
                >
                  <span>{doc.name}</span>
                  {doc.specialty && <span className="text-[10px] opacity-75 hidden sm:inline">({doc.specialty})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* ДАТА, ВРЕМЯ И СЕГМЕНТНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ДЛИТЕЛЬНОСТИ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label htmlFor="slot-date-input" className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
                <Calendar size={13} /><span>Дата</span>
              </label>
              <input id="slot-date-input" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} className="studio-input-field" data-testid="slot-date-input" />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="slot-time-input" className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
                <Clock size={13} /><span>Время начала</span>
              </label>
              <input id="slot-time-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="studio-input-field" data-testid="slot-time-input" />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--muted,#64748b)]">Длительность</span>
              <div className="duration-segment-control" role="radiogroup" aria-label="Длительность слота">
                {PRIMARY_DURATION_MINUTES.map((min) => (
                  <button key={min} type="button" onClick={() => setDurationMinutes(min)} className={`duration-segment-btn ${durationMinutes === min ? "is-active" : ""}`} data-testid={`duration-btn-${min}`}>
                    {min}м
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* БЫСТРЫЕ ТЕГИ ПРИЧИН ОБРАЩЕНИЯ */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--muted,#64748b)]">Причина визита (1 клик)</span>
            <div className="reason-chips-grid">
              {CLINICAL_REASON_PRESETS.map((p) => (
                <button key={p.id} type="button" onClick={() => handleReasonClick(p)} className={`reason-chip-btn ${reason === p.label ? "is-active" : ""} ${p.isEmergency ? "is-emergency" : ""}`} data-testid={`reason-chip-${p.id}`}>
                  {p.isEmergency && <Flame size={14} className="text-rose-500" />}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ПРИМЕЧАНИЕ / ЖАЛОБА ПАЦИЕНТА */}
          <div className="flex flex-col gap-1">
            <label htmlFor="slot-comment-input" className="text-xs font-semibold text-[var(--muted,#64748b)]">Примечание / Жалоба пациента</label>
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
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--line,#e2e8f0)]">
            <button type="button" onClick={handleStartVisitImmediately} className="studio-secondary-btn" data-testid="start-visit-quick-btn" title="Перевести статус в «Приём идет» и сразу открыть прием">
              <Play size={14} className="text-emerald-600" /><span>Начать приём</span>
            </button>
            <button type="button" onClick={handleCopySmsConfirmation} className="studio-secondary-btn" data-testid="sms-confirm-quick-btn" title="Скопировать готовое SMS / WhatsApp сообщение для пациента">
              <Copy size={14} className="text-teal-600" /><span>{copyFeedback || "Подтвердить визит по SMS"}</span>
            </button>
            <button type="button" onClick={() => handleShiftDate(1)} className="studio-secondary-btn" data-testid="reschedule-quick-btn" title="Перенести запись на следующий рабочий день (+1 день)">
              <CalendarClock size={14} className="text-blue-600" /><span>Перенести (+1 день)</span>
            </button>
          </div>
        </div>

        {/* 3. НИЖНЯЯ ПАНЕЛЬ: РОВНО ОДНА PRIMARY CTA КНОПКА #0d9488 (МАНДАТ 8am & 8e) */}
        <div className="appointment-studio-footer">
          <button type="button" disabled={false} onClick={handleSaveAppointment} className="appointment-studio-primary-cta" data-testid="studio-save-appointment-btn">
            <Check size={18} strokeWidth={2.5} />
            <span>Записать на приём ({formatSlotTimeRange(startTime, durationMinutes)})</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" && document.body ? createPortal(modalContent, document.body) : modalContent;
};

export default AppointmentStudioModal;
