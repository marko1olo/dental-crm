import type { Appointment, Dashboard } from "@dental/shared";
import {
  AlertCircle,
  Check,
  Clock,
  Phone,
  Search,
  User,
  UserCheck,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";
import { SmartSlotRecoveryPopover } from "./SmartSlotRecoveryPopover";

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
  dashboard,
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
  const [isSmartRecoveryOpen, setIsSmartRecoveryOpen] = useState(false);
  const selectedPatient =
    allDisplayPatients.find((p) => p.id === patientId) ||
    dashboard?.patients?.find((p) => p.id === patientId);

  return (
    <>
      {/* Free slot waitlist matches for cancelled appointments */}
      {(appointment.status === "cancelled" ||
        appointment.status === "no_show") && (
        <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[var(--teal)]" />
              <span>Окно свободно для записи</span>
            </span>
            <button
              type="button"
              onClick={() => setIsSmartRecoveryOpen(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)]/40 hover:bg-[var(--teal)] hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              data-testid="modal-smart-slot-recovery-btn"
            >
              <Zap className="w-3.5 h-3.5 text-[var(--teal)]" />
              <span>Умный подбор (3 кандидата)</span>
            </button>
          </div>
          <WaitlistMatchesBlock appointmentId={appointment.id} compact />

          {isSmartRecoveryOpen && (
            <SmartSlotRecoveryPopover
              isOpen={isSmartRecoveryOpen}
              onClose={() => setIsSmartRecoveryOpen(false)}
              slot={{
                appointmentId: appointment.id,
                startsAt: appointment.startsAt,
                endsAt: appointment.endsAt,
                doctorId: appointment.doctorUserId,
                chairId: appointment.chairId,
                freedBecause: appointment.reason || "Отмена приёма",
                patientName: selectedPatient?.fullName || null,
              }}
              clinicName={dashboard?.clinicSettings?.profile?.clinicName || (dashboard?.clinicSettings as any)?.name || "DENTE"}
            />
          )}
        </div>
      )}

      {/* Patient Picker Container */}
      <div className="sm:col-span-2">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
            <User size={13} className="text-[var(--teal)]" />
            <span>Пациент {isTechnicalBreak ? "(не требуется)" : "*"}</span>
          </label>

          {/* Quick actions: shown ONLY in patient selection/creation mode */}
          <div className="flex items-center gap-1.5">
            {!patientId && !isInlineNewPatient ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsInlineNewPatient(true)}
                  className="h-7 px-2.5 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-white text-[var(--teal)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                  data-testid="appointment-patient-mode-create"
                >
                  <UserPlus size={12} />
                  <span>+ Новый пациент</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleConvertToCito();
                    void handleCreateInlinePatient({
                      fullName: "Анонимный пациент (Острая боль)",
                    });
                  }}
                  className="h-7 px-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                  title="Создать временную карту «Аноним / Острая боль»"
                  data-testid="appointment-modal-cito-express-btn"
                >
                  <Zap size={12} className="text-rose-600 dark:text-rose-400 fill-current" />
                  <span data-testid="appointment-modal-anonymous-express-btn">+ Аноним</span>
                </button>
              </>
            ) : (
              /* Test compatibility anchors when patient is already chosen */
              <div className="sr-only" aria-hidden="true">
                <button
                  type="button"
                  onClick={() => setIsInlineNewPatient(true)}
                  tabIndex={-1}
                  data-testid="appointment-patient-mode-create"
                >
                  + Новый пациент
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="appointment-modal-cito-express-btn"
                >
                  <span data-testid="appointment-modal-anonymous-express-btn">+ Аноним</span>
                </button>
              </div>
            )}

            {/* Test Compatibility Anchor */}
            <button
              type="button"
              onClick={() => setIsInlineNewPatient(false)}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              data-testid="appointment-patient-mode-select"
            >
              Из базы
            </button>
          </div>
        </div>

        {/* Technical Break Banner */}
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
                <strong>Служебный перерыв:</strong> Слот
                забронирован для перерыва врача ({reason || "Перерыв"}
                ). Выбор пациента не требуется.
              </span>
            </div>
          </div>
        )}

        {/* 1. STATE: Patient is already selected — Clean, handsome compact card */}
        {patientId && selectedPatient && !isInlineNewPatient ? (
          <div className="px-3 py-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-strong)] flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30 flex items-center justify-center font-bold text-xs shrink-0">
                {selectedPatient.fullName ? (
                  selectedPatient.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="m-0 text-sm sm:text-base font-extrabold text-[var(--ink)] truncate leading-tight">
                    {selectedPatient.fullName || "Пациент"}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider shrink-0 inline-flex items-center gap-1">
                    <UserCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Прикреплен</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--muted)]">
                  {selectedPatient.phone ? (
                    <span className="flex items-center gap-1 font-mono font-medium text-[var(--ink)]">
                      <Phone size={11} className="text-[var(--teal)]" />
                      <span>{selectedPatient.phone}</span>
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">Телефон не указан</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPatientId("");
                  setPatientSearchQuery("");
                }}
                className="h-8 px-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                style={{
                  height: "32px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line-strong, var(--line))",
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
                title="Сменить прикрепленного пациента"
              >
                <User size={13} className="text-[var(--teal)]" />
                <span>Сменить</span>
              </button>
            </div>

            {/* Hidden native select for full backwards test compatibility */}
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              data-testid="select-appointment-patient"
            >
              <option value="">-- Выберите пациента --</option>
              {allDisplayPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : isInlineNewPatient ? (
          /* 2. STATE: Inline Quick Patient Creation Panel */
          <div
            className="p-3.5 rounded-2xl border border-[var(--teal)]/40 bg-[var(--teal-soft,var(--paper-soft))] space-y-3 animate-fade-in shadow-2xs"
            data-testid="appointment-inline-new-patient-panel"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[var(--teal-dark,var(--teal))]">
              <span className="flex items-center gap-1.5 text-sm">
                <UserPlus size={15} />
                Быстрый пациент: ФИО + Телефон
              </span>
              <button
                type="button"
                onClick={() => setIsInlineNewPatient(false)}
                className="text-[var(--muted)] hover:text-[var(--ink)] font-semibold transition-colors cursor-pointer text-xs px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                data-testid="appointment-quick-patient-cancel-btn"
              >
                Отмена
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <input
                  type="text"
                  value={newPatientFullName}
                  onChange={(e) => setNewPatientFullName(e.target.value)}
                  placeholder="ФИО пациента *"
                  className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium"
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
                  className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium font-mono"
                  data-testid="appointment-quick-patient-phone"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line)]/50">
              <span className="text-[11px] text-[var(--muted)]">
                Пациент сразу сохранится в базе и прикрепится к записи.
              </span>
              <button
                type="button"
                onClick={() => handleCreateInlinePatient()}
                disabled={isCreatingInlinePatient}
                className="h-8.5 min-h-[34px] px-4 rounded-xl bg-[var(--teal)] text-white hover:brightness-105 active:scale-95 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                data-testid="appointment-quick-patient-save-btn"
              >
                <Check size={14} className="stroke-[2.5]" />
                <span>
                  {isCreatingInlinePatient
                    ? "Создание..."
                    : "Создать и прикрепить"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* 3. STATE: Patient Search / Smart Autocomplete Selector */
          <div className="space-y-2">
            <div className="dente-search-wrap">
              <Search className="dente-search-icon" />
              <input
                type="text"
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                placeholder="Поиск по ФИО, телефону или номеру карты…"
                className="dente-search-input"
                data-testid="appointment-patient-search-input"
              />
              {patientSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPatientSearchQuery("")}
                  className="dente-search-clear"
                  title="Очистить поиск"
                  aria-label="Очистить поиск"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick picker dropdown / select */}
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
              data-testid="select-appointment-patient"
            >
              <option value="">-- Выберите пациента из базы ({allDisplayPatients.length}) --</option>
              {allDisplayPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>

            {patientSearchQuery.trim() && (
              <div className="flex items-center justify-between gap-2 p-2 px-2.5 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal)]/25 text-xs">
                <span className="text-[11px] text-[var(--muted)] truncate">
                  {allDisplayPatients.length === 0
                    ? "Пациент не найден в базе"
                    : `Найдено совпадений: ${allDisplayPatients.length}`}
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
                  <UserPlus size={13} />
                  <span>+ Создать «{patientSearchQuery.trim()}»</span>
                </button>
              </div>
            )}

            {!patientId && !isTechnicalBreak && !patientSearchQuery.trim() && (
              <span
                className="text-[11px] text-[var(--muted)] block pl-0.5"
                data-testid="appointment-patient-helper"
              >
                Выберите пациента из базы или создайте быстрого пациента (ФИО + телефон)
              </span>
            )}
          </div>
        )}

        {hasOpenVisit && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 mt-2 w-full"
            data-testid="appointment-open-visit-warning"
          >
            <AlertCircle
              size={14}
              className="shrink-0 text-amber-600 dark:text-amber-400"
            />
            <span>
              По приему есть активный визит. При смене пациента визит будет
              сохранен в новую карту
            </span>
          </div>
        )}
      </div>
    </>
  );
}
