import type { Dashboard } from "@dental/shared";
import { Check, FileText } from "lucide-react";
import React from "react";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";

export interface InlinePatientFormInputsProps {
  newPatientFullName: string;
  setNewPatientFullName: (name: string) => void;
  newPatientPhone: string;
  setNewPatientPhone: (phone: string) => void;
  newPatientBirthDate: string;
  setNewPatientBirthDate: (bd: string) => void;
  newPatientFullNameInputRef: React.RefObject<HTMLInputElement | null>;
  isCreatingPatient: boolean;
  doctors: Array<{ id: string; fullName: string }>;
  doctorUserId: string;
  dashboard?: Dashboard | undefined;
}

export function InlinePatientFormInputs({
  newPatientFullName,
  setNewPatientFullName,
  newPatientPhone,
  setNewPatientPhone,
  newPatientBirthDate,
  setNewPatientBirthDate,
  newPatientFullNameInputRef,
  isCreatingPatient,
  doctors,
  doctorUserId,
  dashboard,
}: InlinePatientFormInputsProps) {
  const handlePrintContract = () => {
    void printBlankMedicalContract(
      newPatientFullName.trim()
        ? {
            fullName: newPatientFullName.trim(),
            phone: newPatientPhone.trim() || undefined,
            birthDate: newPatientBirthDate.trim() || undefined,
          }
        : null,
      {
        doctorName: doctors.find((d) => d.id === doctorUserId)?.fullName,
        clinicName: dashboard?.clinicSettings?.profile?.legalName,
      },
    );
  };

  return (
    <>
      <div className="space-y-2">
        <div>
          <label className="text-xs font-semibold text-[var(--muted)] block mb-1">ФИО пациента</label>
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
            <label className="text-xs font-semibold text-[var(--muted)] block mb-1">Телефон</label>
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
            <label className="text-xs font-semibold text-[var(--muted)] block mb-1">Дата рождения</label>
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
          onClick={handlePrintContract}
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
          <span>{isCreatingPatient ? "Создаю пациента…" : "Создать и выбрать"}</span>
        </button>
      </div>
    </>
  );
}
