import type { Appointment, Dashboard } from "@dental/shared";
import {
  AlertCircle,
  Check,
  Clock,
  Search,
  User,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import React from "react";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";

export interface AppointmentModalPatientSectionProps {
  appointment: Appointment;
  dashboard: Dashboard;
  patientId: string;
  setPatientId: (id: string) => void;
  patientSearchQuery: string;
  setPatientSearchQuery: (q: string) => void;
  isInlineNewPatient: boolean;
  setIsInlineNewPatient: (val: boolean) => void;
  newPatientFullName: string;
  setNewPatientFullName: (val: string) => void;
  newPatientPhone: string;
  setNewPatientPhone: (val: string) => void;
  isCreatingInlinePatient: boolean;
  handleCreateInlinePatient: (override?: {
    fullName?: string;
    phone?: string | null;
  }) => Promise<{ id: string; fullName: string; phone?: string | null } | null>;
  allDisplayPatients: Array<{ id: string; fullName: string; phone?: string | null }>;
  isTechnicalBreak: boolean;
  reason: string;
  hasOpenVisit: boolean;
  activeLabOrders: any[];
  startsAtLocal: string;
  setStartsAtLocal: (val: string) => void;
  setEndsAtLocal: (val: string) => void;
  handleConvertToCito: () => void;
}

export function AppointmentModalPatientSection({
  appointment,
  patientId,
  setPatientId,
  patientSearchQuery,
  setPatientSearchQuery,
  isInlineNewPatient,
  setIsInlineNewPatient,
  newPatientFullName,
  setNewPatientFullName,
  newPatientPhone,
  setNewPatientPhone,
  isCreatingInlinePatient,
  handleCreateInlinePatient,
  allDisplayPatients,
  isTechnicalBreak,
  reason,
  hasOpenVisit,
  activeLabOrders,
  startsAtLocal,
  setStartsAtLocal,
  setEndsAtLocal,
  handleConvertToCito,
}: AppointmentModalPatientSectionProps) {
  return (
    <>
      {/* Free slot waitlist matches for cancelled appointments */}
      {(appointment.status === "cancelled" ||
        appointment.status === "no_show") && (
        <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
          <WaitlistMatchesBlock appointmentId={appointment.id} compact />
        </div>
      )}

      {/* Patient Picker Container */}
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
            <User size={13} className="text-[var(--teal)]" />
            <span>Пациент {isTechnicalBreak ? "(не требуется)" : "*"}</span>
          </label>
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-medium">
            <button
              type="button"
              onClick={() => setIsInlineNewPatient(false)}
              className={`h-7 px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs ${
                !isInlineNewPatient
                  ? "bg-[var(--paper)] text-[var(--teal)] font-bold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              data-testid="appointment-patient-mode-select"
            >
              Из базы
            </button>
            <button
              type="button"
              onClick={() => setIsInlineNewPatient(true)}
              className={`h-7 px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-xs ${
                isInlineNewPatient
                  ? "bg-[var(--teal)] text-white font-bold shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              data-testid="appointment-patient-mode-create"
            >
              <UserPlus size={13} />
              <span>+ Новый пациент</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleConvertToCito();
                void handleCreateInlinePatient({
                  fullName: "Пациент с острой болью (CITO)",
                });
              }}
              className="h-7 px-2.5 py-1 rounded-md text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 font-bold transition-all cursor-pointer flex items-center gap-1 text-xs"
              title="Создать временную карту CITO за 1 клик (Мандат 8e)"
              data-testid="appointment-modal-cito-express-btn"
            >
              <Zap size={12} className="text-rose-600 dark:text-rose-400" />
              <span>+ CITO</span>
            </button>
          </div>
        </div>

        {isTechnicalBreak && !patientId && (
          <div
            className="mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2"
            data-testid="technical-break-patient-free-banner"
          >
            <div className="flex items-center gap-2">
              <Clock
                size={15}
                className="text-amber-600 dark:text-amber-400 shrink-0"
              />
              <span>
                <strong>Режим технической блокировки:</strong> Слот
                забронирован для служебного перерыва врача ({reason || "Перерыв"}
                ). Выбор пациента не требуется.
              </span>
            </div>
          </div>
        )}

        {isInlineNewPatient ? (
          <div
            className="p-3 rounded-xl border border-[var(--teal)]/30 bg-[var(--teal-soft,var(--paper-soft))] space-y-2.5 animate-fade-in"
            data-testid="appointment-inline-new-patient-panel"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[var(--teal-dark,var(--teal))]">
              <span className="flex items-center gap-1.5">
                <UserPlus size={13} />
                Быстрый пациент: ФИО + Телефон
              </span>
              <button
                type="button"
                onClick={() => setIsInlineNewPatient(false)}
                className="text-[var(--muted)] hover:text-[var(--ink)] font-normal transition-colors cursor-pointer text-xs"
                data-testid="appointment-quick-patient-cancel-btn"
              >
                Отмена
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  value={newPatientFullName}
                  onChange={(e) => setNewPatientFullName(e.target.value)}
                  placeholder="ФИО пациента *"
                  className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
                  data-testid="appointment-quick-patient-name"
                  autoFocus
                />
              </div>
              <div>
                <input
                  type="tel"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
                  data-testid="appointment-quick-patient-phone"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] text-[var(--muted)]">
                Пациент сохранится в базу клиники и сразу прикрепится к записи.
              </span>
              <button
                type="button"
                onClick={() => handleCreateInlinePatient()}
                disabled={isCreatingInlinePatient}
                className="h-8 min-h-[32px] px-3 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all disabled:opacity-50"
                data-testid="appointment-quick-patient-save-btn"
              >
                <Check size={13} />
                {isCreatingInlinePatient
                  ? "Создание..."
                  : "Создать и прикрепить"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mb-1.5">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
              />
              <input
                type="text"
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                placeholder="Быстрый поиск пациента: ФИО, телефон, карта…"
                className="w-full pl-8 pr-7 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs outline-none focus:ring-2 focus:ring-[var(--teal)] transition-all"
                data-testid="appointment-patient-search-input"
              />
              {patientSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPatientSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer p-0.5"
                  title="Очистить поиск"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
              data-testid="select-appointment-patient"
            >
              <option value="">-- Выберите пациента --</option>
              {allDisplayPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>
            {patientSearchQuery.trim() && (
              <div className="mt-1.5 flex items-center justify-between gap-2 p-1.5 px-2 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal)]/20 text-xs">
                <span className="text-[11px] text-[var(--muted)] truncate">
                  {allDisplayPatients.length === 0
                    ? "Пациент не найден в базе"
                    : `Найдено: ${allDisplayPatients.length}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const q = patientSearchQuery.trim();
                    const isPhone = /^[0-9+()-\s]+$/.test(q);
                    if (isPhone) {
                      setNewPatientPhone(q);
                      setNewPatientFullName("");
                    } else {
                      setNewPatientFullName(q);
                      setNewPatientPhone("");
                    }
                    setIsInlineNewPatient(true);
                  }}
                  className="text-xs font-bold text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                  data-testid="appointment-quick-create-from-search-btn"
                >
                  <UserPlus size={12} />
                  <span>+ Создать «{patientSearchQuery.trim()}»</span>
                </button>
              </div>
            )}
            {!patientId &&
              !isTechnicalBreak &&
              !patientSearchQuery.trim() && (
                <span
                  className="text-[11px] text-[var(--muted)] block mt-1"
                  data-testid="appointment-patient-helper"
                >
                  Для записи выберите пациента из списка или создайте быстрого
                  пациента (ФИО + телефон)
                </span>
              )}
            {hasOpenVisit && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 mt-1.5 w-full"
                data-testid="appointment-open-visit-warning"
              >
                <AlertCircle
                  size={13}
                  className="shrink-0 text-amber-600 dark:text-amber-400"
                />
                <span>
                  По приему есть активный визит. При смене пациента визит будет
                  сохранен в новую карту
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
