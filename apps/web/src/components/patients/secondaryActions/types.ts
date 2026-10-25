import type { Patient } from "@dental/shared";

export interface PatientSecondaryActionsMenuProps {
	readonly selectedPatient: Patient | null | undefined;
	readonly patientBalance: number;
	readonly onOpenPatientCardModal: () => void;
	readonly onOpenLoyaltyModal: () => void;
	readonly executePatientSomaticNorm: () => void;
	readonly executeBookAppointment: () => void;
}
