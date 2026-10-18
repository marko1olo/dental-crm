import type { Dashboard, Patient } from "@dental/shared";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";

export interface HeaderActionsParams {
  selectedPatient: Patient | null;
  newPatientFullName: string;
  setNewPatientFullName: (name: string) => void;
  newPatientPhone: string;
  setNewPatientPhone: (phone: string) => void;
  newPatientBirthDate: string;
  searchQuery: string;
  setShowInlineNewPatient: (show: boolean) => void;
  setAppointmentType: (t: any) => void;
  setReason: (r: string) => void;
  setComment: (c: string) => void;
  setDurationMinutes: (d: number) => void;
  doctors: Array<{ id: string; fullName: string }>;
  doctorUserId: string;
  dashboard?: Dashboard | undefined;
}

export function usePatientSectionHeaderActions(p: HeaderActionsParams) {
  const handleCitoClick = () => {
    p.setAppointmentType("emergency");
    p.setReason("Срочно: острая боль");
    p.setComment("Срочный приём по острой боли");
    p.setDurationMinutes(30);
    p.setShowInlineNewPatient(true);
    p.setNewPatientFullName("Пациент с острой болью (срочно)");
    p.setNewPatientPhone("");
  };

  const handlePrintBlank = () => {
    const candidate =
      p.selectedPatient ||
      (p.newPatientFullName.trim()
        ? {
            fullName: p.newPatientFullName.trim(),
            phone: p.newPatientPhone.trim() || undefined,
            birthDate: p.newPatientBirthDate.trim() || undefined,
          }
        : p.searchQuery.trim()
          ? { fullName: p.searchQuery.trim() }
          : null);
    void printBlankMedicalContract(candidate, {
      doctorName: p.doctors.find((d) => d.id === p.doctorUserId)?.fullName,
      clinicName: p.dashboard?.clinicSettings?.profile?.legalName,
    });
  };

  const handleNewPatientToggle = () => {
    p.setShowInlineNewPatient(true);
    const trimmed = p.searchQuery.trim();
    if (/\d/.test(trimmed) && !/[а-яёa-z]/i.test(trimmed)) {
      p.setNewPatientFullName("");
      p.setNewPatientPhone(trimmed);
    } else {
      p.setNewPatientFullName(trimmed);
      p.setNewPatientPhone("");
    }
  };

  return { handleCitoClick, handlePrintBlank, handleNewPatientToggle };
}
