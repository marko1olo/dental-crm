import { Clock } from "lucide-react";
import React from "react";

export const QUICK_APPOINTMENT_REASONS = [
  {
    label: "Острая боль",
    fullLabel: "Острая боль (30 мин)",
    reason: "Острая боль (неотложная помощь)",
    durationMinutes: 30,
    comment: "Экстренно: обращение с острой болью",
    status: "confirmed" as const,
    tone: "emergency" as const,
  },
  {
    label: "Плановое обследование",
    fullLabel: "Плановое обследование (30 мин)",
    reason: "Плановое обследование полости рта",
    durationMinutes: 30,
    tone: "standard" as const,
  },
  {
    label: "Повторно",
    fullLabel: "Повторно (30 мин)",
    reason: "Повторный приём / продолжение лечения",
    durationMinutes: 30,
    tone: "standard" as const,
  },
  {
    label: "Лечение",
    fullLabel: "Лечение (60 мин)",
    reason: "Лечение кариеса / терапия / эстетическая реставрация",
    durationMinutes: 60,
    tone: "standard" as const,
  },
  {
    label: "Консультация",
    fullLabel: "Консультация (30 мин)",
    reason: "Первичный осмотр и составление плана лечения",
    durationMinutes: 30,
    tone: "standard" as const,
  },
  {
    label: "Профгигиена",
    fullLabel: "Профгигиена / AirFlow (60 мин)",
    reason: "Комплексная гигиена полости рта (AirFlow + УЗ)",
    durationMinutes: 60,
    tone: "standard" as const,
  },
  {
    label: "Удаление зуба",
    fullLabel: "Удаление зуба (45 мин)",
    reason: "Хирургический прием: удаление зуба / анестезия",
    durationMinutes: 45,
    tone: "standard" as const,
  },
  {
    label: "Примерка / ЗТЛ",
    fullLabel: "Примерка / ЗТЛ (30 мин)",
    reason: "Ортопедический прием: примерка / фиксация конструкции ЗТЛ",
    durationMinutes: 30,
    tone: "standard" as const,
  },
] as const;

export const TECHNICAL_BREAK_PRESETS = [
  {
    label: "Обед (60 мин)",
    shortLabel: "Обед",
    reason: "Служебный перерыв: Обед",
    durationMinutes: 60,
    comment: "Служебная бронь: Обед врача / персонала",
  },
  {
    label: "Перерыв (30 мин)",
    shortLabel: "Перерыв",
    reason: "Технический перерыв: Перерыв",
    durationMinutes: 30,
    comment: "Служебная бронь: Перерыв врача",
  },
  {
    label: "Отпуск",
    shortLabel: "Отпуск",
    reason: "Служебный перерыв: Отпуск",
    durationMinutes: 480,
    comment: "Служебная бронь: Отпуск врача",
  },
  {
    label: "Учеба / Консилиум (120 мин)",
    shortLabel: "Учеба",
    reason: "Служебный перерыв: Учеба / Консилиум",
    durationMinutes: 120,
    comment: "Служебная бронь: Клинический консилиум / Обучение",
  },
  {
    label: "Отсутствует",
    shortLabel: "Отсутствует",
    reason: "Служебный перерыв: Отсутствует",
    durationMinutes: 120,
    comment: "Служебная бронь: Врач отсутствует",
  },
  {
    label: "Другое (служебное)",
    shortLabel: "Другое",
    reason: "Служебный перерыв: Другое",
    durationMinutes: 30,
    comment: "Служебная бронь: Другое (служебное)",
  },
  {
    label: "Санобработка (30 мин)",
    shortLabel: "Санобработка",
    reason: "Технический перерыв: Санобработка",
    durationMinutes: 30,
    comment: "Служебная бронь: Текущая дезинфекция и санобработка кабинета",
  },
] as const;

export function isTechnicalBreakAppointment(
  item: { reason?: string | null; comment?: string | null } | null | undefined,
): boolean {
  if (!item) return false;
  const r = String(item.reason || "").toLowerCase();
  const c = String(item.comment || "").toLowerCase();
  return (
    r.includes("служебный перерыв") ||
    r.includes("технический перерыв") ||
    r.includes("служебная бронь") ||
    r.includes("служебная блокировка") ||
    r.includes("санобработка") ||
    r.includes("обед") ||
    r.includes("перерыв") ||
    r.includes("отпуск") ||
    r.includes("учеба") ||
    r.includes("учёба") ||
    r.includes("отсутствует") ||
    r.includes("консилиум") ||
    r.includes("другое (блокировка)") ||
    r.includes("другое (служебное)") ||
    r.includes("блокировка") ||
    c.includes("служебная бронь") ||
    c.includes("служебная блокировка") ||
    c.includes("технический интервал") ||
    c.includes("блокировка")
  );
}

export interface AppointmentModalQuickReasonsProps {
  onApplyReasonPreset: (preset: (typeof QUICK_APPOINTMENT_REASONS)[number]) => void;
  onApplyTechnicalBreakPreset: (preset: (typeof TECHNICAL_BREAK_PRESETS)[number]) => void;
}

export function AppointmentModalQuickReasons({
  onApplyReasonPreset,
  onApplyTechnicalBreakPreset,
}: AppointmentModalQuickReasonsProps) {
  return (
    <div
      className="space-y-2 mt-2"
      data-testid="appointment-quick-reasons"
    >
      <div className="text-[11px] font-bold text-[var(--muted)]">
        <span>Причины визита:</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {QUICK_APPOINTMENT_REASONS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            data-testid={`chip-reason-${(preset as any).shortLabel || preset.label}`}
            onClick={() => onApplyReasonPreset(preset)}
            className="appointment-modal-reason-chip inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all"
            style={{
              height: "28px",
              minHeight: "28px",
              padding: "0 10px",
              borderRadius: "14px",
              border:
                preset.tone === "emergency"
                  ? "1px solid rgba(244, 63, 94, 0.45)"
                  : "1px solid var(--line-strong)",
              backgroundColor:
                preset.tone === "emergency"
                  ? "rgba(244, 63, 94, 0.1)"
                  : "var(--paper-soft)",
              color:
                preset.tone === "emergency"
                  ? "#e11d48"
                  : "var(--ink)",
            }}
            title={preset.reason}
          >
            <span>{preset.label}</span>
            {preset.tone === "emergency" && (
              <span
                style={{
                  padding: "1px 5px",
                  borderRadius: "6px",
                  backgroundColor: "#e11d48",
                  color: "#ffffff",
                  fontSize: "9px",
                  fontWeight: 800,
                }}
              >
                СРОЧНО
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="text-[11px] font-bold text-[var(--muted)] pt-1.5 border-t border-[var(--line)]/50">
        <span>
          Служебные перерывы в расписании (без пациента):
        </span>
      </div>
      <div
        className="flex items-center gap-1.5 flex-wrap"
        data-testid="appointment-doctor-blocks"
      >
        {TECHNICAL_BREAK_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            data-testid={`chip-block-${(preset as any).shortLabel || preset.label}`}
            onClick={() => onApplyTechnicalBreakPreset(preset)}
            className="appointment-modal-break-chip inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all"
            style={{
              height: "28px",
              minHeight: "28px",
              padding: "0 10px",
              borderRadius: "14px",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              color: "var(--ink)",
            }}
            title={preset.comment}
          >
            <Clock
              size={11}
              className="text-amber-600 dark:text-amber-400 shrink-0"
            />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
