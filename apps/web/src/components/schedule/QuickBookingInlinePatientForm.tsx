import type { Dashboard, Patient } from "@dental/shared";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileText,
  Phone,
  UserPlus,
} from "lucide-react";
import React from "react";
import { printBlankMedicalContract } from "../patients/blankContractPrint";
import type { PotentialDuplicateItem } from "./patientSearchEngine";

export interface QuickBookingInlinePatientFormProps {
  dashboard?: Dashboard | undefined;
  showInlineNewPatient: boolean;
  setShowInlineNewPatient: (show: boolean) => void;
  newPatientFullName: string;
  setNewPatientFullName: (name: string) => void;
  newPatientPhone: string;
  setNewPatientPhone: (phone: string) => void;
  newPatientBirthDate: string;
  setNewPatientBirthDate: (bd: string) => void;
  isCreatingPatient: boolean;
  handleCreateInlinePatient: (e: React.FormEvent) => Promise<void>;
  newPatientFullNameInputRef: React.RefObject<HTMLInputElement | null>;
  potentialDuplicates: PotentialDuplicateItem[];
  selectPatient: (p: Patient) => void;
  doctorUserId: string;
  doctors: Array<{ id: string; fullName: string }>;
}

export function QuickBookingInlinePatientForm({
  dashboard,
  showInlineNewPatient,
  setShowInlineNewPatient,
  newPatientFullName,
  setNewPatientFullName,
  newPatientPhone,
  setNewPatientPhone,
  newPatientBirthDate,
  setNewPatientBirthDate,
  isCreatingPatient,
  handleCreateInlinePatient,
  newPatientFullNameInputRef,
  potentialDuplicates,
  selectPatient,
  doctorUserId,
  doctors,
}: QuickBookingInlinePatientFormProps) {
  if (!showInlineNewPatient) return null;

  return (
    <form
      onSubmit={handleCreateInlinePatient}
      className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/40 space-y-3 mt-2"
    >
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5 m-0">
          <UserPlus size={14} />
          <span>Создание нового пациента</span>
        </h4>
        <button
          type="button"
          onClick={() => setShowInlineNewPatient(false)}
          className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px] px-3 py-2 rounded-lg hover:bg-[var(--paper)] transition-colors cursor-pointer flex items-center justify-center"
        >
          Отмена
        </button>
      </div>

      {/* Anti-Duplicate Warning if similar patient exists */}
      {potentialDuplicates.length > 0 && (
        <div
          className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-xs space-y-2"
          data-testid="inline-patient-duplicate-warning"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={16}
              className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
            />
            <div className="space-y-0.5">
              <p className="font-bold m-0">
                Похожий пациент уже есть в базе:
              </p>
              <p className="m-0 text-[var(--muted)]">
                Во избежание дублирования карт выберите существующего пациента:
              </p>
            </div>
          </div>
          <div className="space-y-1.5 pl-6">
            {potentialDuplicates.map((item) => {
              const p = item.patient;
              const reasonLabel =
                item.duplicateReason === "both"
                  ? "ФИО и Телефон"
                  : item.duplicateReason === "phone"
                    ? "Совпадение по телефону"
                    : item.duplicateReason === "fuzzy_name"
                      ? `Похожее ФИО (${item.score}%)`
                      : "Совпадение по ФИО";

              return (
                <div
                  key={p.id}
                  className="w-full min-h-[44px] p-2.5 rounded-lg bg-[var(--paper)] border border-amber-500/30 hover:border-amber-500/60 transition-colors flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[var(--ink)] truncate text-xs">
                        {item.fullNameHighlights.map((part, pIdx) =>
                          part.isMatch ? (
                            <mark
                              key={pIdx}
                              className="bg-amber-300/60 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold"
                            >
                              {part.text}
                            </mark>
                          ) : (
                            <span key={pIdx}>{part.text}</span>
                          ),
                        )}
                      </span>
                      <span
                        className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shrink-0"
                        data-testid="duplicate-reason-badge"
                      >
                        {reasonLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5 flex-wrap">
                      {p.phone && (
                        <span className="font-mono flex items-center gap-1">
                          <Phone size={10} className="shrink-0 opacity-70" />
                          <span>
                            {item.phoneHighlights.map((part, pIdx) =>
                              part.isMatch ? (
                                <mark
                                  key={pIdx}
                                  className="bg-amber-300/60 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded px-0.5 font-extrabold"
                                >
                                  {part.text}
                                </mark>
                              ) : (
                                <span key={pIdx}>{part.text}</span>
                              ),
                            )}
                          </span>
                        </span>
                      )}
                      {p.birthDate && <span>д.р. {p.birthDate}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--teal)] text-white hover:brightness-110 transition-all cursor-pointer shadow-xs min-h-[32px]"
                      data-testid="quick-booking-select-duplicate-btn"
                      title="Выбрать эту карту для быстрой записи"
                    >
                      Выбрать карту
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(
                          `/patients?id=${p.id}`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                      className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--glass-border)] transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Открыть карту в новом окне"
                      aria-label="Открыть карту в новом окне"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div>
          <label className="text-xs font-semibold text-[var(--muted)] block mb-1">
            ФИО пациента
          </label>
          <input
            ref={newPatientFullNameInputRef}
            type="text"
            data-testid="quick-booking-new-patient-name-input"
            value={newPatientFullName}
            onChange={(e) => setNewPatientFullName(e.target.value)}
            placeholder="Фамилия Имя Отчество"
            className="w-full p-2 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] block mb-1">
              Телефон
            </label>
            <input
              type="tel"
              data-testid="quick-booking-new-patient-phone-input"
              value={newPatientPhone}
              onChange={(e) => setNewPatientPhone(e.target.value)}
              placeholder="+7 999 123-45-67"
              className="w-full p-2 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] block mb-1">
              Дата рождения
            </label>
            <input
              type="date"
              value={newPatientBirthDate}
              onChange={(e) => setNewPatientBirthDate(e.target.value)}
              className="w-full p-2 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            void printBlankMedicalContract(
              newPatientFullName.trim()
                ? {
                    fullName: newPatientFullName.trim(),
                    phone: newPatientPhone.trim() || undefined,
                    birthDate: newPatientBirthDate.trim() || undefined,
                  }
                : null,
              {
                doctorName: doctors.find((d) => d.id === doctorUserId)
                  ?.fullName,
                clinicName: dashboard?.clinicSettings?.profile?.legalName,
              },
            );
          }}
          className="flex-1 min-h-[44px] py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          data-testid="quick-booking-inline-print-contract-btn"
          title="Распечатать типовой медицинский договор со строками _______ для ручного заполнения"
        >
          <FileText size={14} className="text-amber-600" />
          <span>Печать договора (_______)</span>
        </button>
        <button
          type="submit"
          aria-busy={isCreatingPatient}
          data-testid="quick-booking-create-inline-patient-btn"
          className="flex-1 min-h-[44px] py-2 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Check size={14} />
          <span>
            {isCreatingPatient ? "Создаю пациента…" : "Создать и выбрать"}
          </span>
        </button>
      </div>
    </form>
  );
}
