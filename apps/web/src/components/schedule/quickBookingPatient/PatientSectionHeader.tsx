import type { Dashboard, Patient } from "@dental/shared";
import { FileText, Flame, User, UserPlus } from "lucide-react";
import React from "react";
import { usePatientSectionHeaderActions } from "./usePatientSectionHeaderActions";

export interface PatientSectionHeaderProps {
  showInlineNewPatient: boolean;
  setShowInlineNewPatient: (show: boolean) => void;
  selectedPatient: Patient | null;
  newPatientFullName: string;
  setNewPatientFullName: (name: string) => void;
  newPatientPhone: string;
  setNewPatientPhone: (phone: string) => void;
  newPatientBirthDate: string;
  searchQuery: string;
  setAppointmentType: (t: any) => void;
  setReason: (r: string) => void;
  setComment: (c: string) => void;
  setDurationMinutes: (d: number) => void;
  doctors: Array<{ id: string; fullName: string }>;
  doctorUserId: string;
  dashboard?: Dashboard | undefined;
  isTechnicalBreak?: boolean | undefined;
}

export function PatientSectionHeader(props: PatientSectionHeaderProps) {
  const { showInlineNewPatient, isTechnicalBreak } = props;
  const { handleCitoClick, handlePrintBlank, handleNewPatientToggle } = usePatientSectionHeaderActions(props);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center w-full">
        <label className="text-xs font-bold text-[var(--muted)] flex items-center gap-1.5">
          <User size={14} className="text-[var(--teal)]" />
          <span>Пациент {isTechnicalBreak ? "(не требуется)" : "*"}</span>
        </label>
        {showInlineNewPatient && (
          <button
            type="button"
            onClick={() => setShowInlineNewPatient(false)}
            data-testid="appointment-patient-mode-select"
            className="text-xs font-semibold text-[var(--teal)] hover:underline min-h-[36px] px-2.5 py-1 bg-[var(--teal)]/10 rounded-lg cursor-pointer transition-colors"
          >
            ← Поиск в базе
          </button>
        )}
      </div>
      {!showInlineNewPatient && (
        <div className="grid grid-cols-2 gap-1.5 w-full">
          <button
            type="button"
            onClick={handleNewPatientToggle}
            className="text-xs font-bold text-[var(--teal)] flex items-center justify-center gap-1.5 min-h-[44px] px-2 py-1.5 bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 border border-[var(--teal)]/20 rounded-xl cursor-pointer transition-colors text-center"
            data-testid="quick-booking-new-patient-toggle"
            data-legacy-testid="appointment-patient-mode-create"
          >
            <UserPlus size={14} className="shrink-0" />
            <span className="leading-tight">+ Новый пациент</span>
          </button>
          <button
            type="button"
            onClick={handleCitoClick}
            className="text-xs font-extrabold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 min-h-[44px] px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl cursor-pointer transition-colors text-center"
            title="Создать временную карту для пациента с острой болью"
            data-testid="quick-booking-cito-express-btn"
          >
            <Flame size={14} className="shrink-0" />
            <span className="leading-tight">+ Срочный пациент (острая боль)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowInlineNewPatient(false)}
            data-testid="appointment-patient-mode-select"
            className="text-xs font-semibold px-2.5 py-1.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-center"
          >
            <User size={13} className="shrink-0 text-[var(--muted)]" />
            <span className="leading-tight">Поиск в базе</span>
          </button>
          <button
            type="button"
            onClick={handlePrintBlank}
            className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--teal)] flex items-center justify-center gap-1.5 min-h-[44px] px-2 py-1.5 bg-[var(--paper-soft)] hover:bg-[var(--line)]/50 rounded-xl border border-[var(--line)] cursor-pointer transition-colors text-center"
            title="Распечатать типовой медицинский договор со строками _______ для ручного заполнения"
            data-testid="quick-booking-print-blank-contract-btn"
          >
            <FileText size={13} className="text-[var(--teal)] shrink-0" />
            <span className="leading-tight">Бланк договора (_______)</span>
          </button>
        </div>
      )}
    </div>
  );
}
