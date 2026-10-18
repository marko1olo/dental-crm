import type { Dashboard, Patient } from "@dental/shared";
import { UserPlus } from "lucide-react";
import React from "react";
import type { PotentialDuplicateItem } from "./patientSearchEngine";
import { InlinePatientDuplicatesAlert } from "./quickBookingPatient/InlinePatientDuplicatesAlert";
import { InlinePatientFormInputs } from "./quickBookingPatient/InlinePatientFormInputs";

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

export function QuickBookingInlinePatientForm(props: QuickBookingInlinePatientFormProps) {
  const {
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
  } = props;

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

      <InlinePatientDuplicatesAlert
        potentialDuplicates={potentialDuplicates}
        selectPatient={selectPatient}
      />

      <InlinePatientFormInputs
        newPatientFullName={newPatientFullName}
        setNewPatientFullName={setNewPatientFullName}
        newPatientPhone={newPatientPhone}
        setNewPatientPhone={setNewPatientPhone}
        newPatientBirthDate={newPatientBirthDate}
        setNewPatientBirthDate={setNewPatientBirthDate}
        newPatientFullNameInputRef={newPatientFullNameInputRef}
        isCreatingPatient={isCreatingPatient}
        doctors={doctors}
        doctorUserId={doctorUserId}
        dashboard={dashboard}
      />
    </form>
  );
}
