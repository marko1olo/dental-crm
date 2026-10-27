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
}

export function PatientSectionHeader(props: PatientSectionHeaderProps) {
  const { showInlineNewPatient } = props;
  const { handleCitoClick, handlePrintBlank, handleNewPatientToggle } = usePatientSectionHeaderActions(props);

  return (
    <div className="flex justify-between items-center flex-wrap gap-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
        <User size={14} className="text-[var(--teal)]" />
        <span>Пациент *</span>
      </label>
      {!showInlineNewPatient && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCitoClick}
            className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 min-h-[44px] px-3 py-2 bg-rose-500/10 rounded-xl cursor-pointer transition-colors"
            title="Создать временную карту для пациента с острой болью"
            data-testid="quick-booking-cito-express-btn"
          >
            <Flame size={14} />
            <span>+ Срочный пациент (острая боль)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintBlank}
            className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--teal)] flex items-center gap-1 min-h-[44px] px-3 py-2 bg-[var(--paper-soft)] hover:bg-[var(--line)]/50 rounded-xl border border-[var(--line)] cursor-pointer transition-colors"
            title="Распечатать типовой медицинский договор со строками _______ для ручного заполнения"
            data-testid="quick-booking-print-blank-contract-btn"
          >
            <FileText size={14} className="text-[var(--teal)] shrink-0" />
            <span>Бланк договора (_______)</span>
          </button>
          <button
            type="button"
            onClick={handleNewPatientToggle}
            className="text-xs font-bold text-[var(--teal)] hover:underline flex items-center gap-1 min-h-[44px] px-3 py-2 bg-[var(--teal)]/10 rounded-xl cursor-pointer transition-colors"
            data-testid="quick-booking-new-patient-toggle"
          >
            <UserPlus size={14} />
            <span>+ Новый пациент</span>
          </button>
        </div>
      )}
    </div>
  );
}
