import type { Patient } from "@dental/shared";
import type { QuickPatientPrefill } from "../patientSearchEngine";
import type { ToastType } from "../../GlobalToast";

export interface PatientSearchModalProps {
	readonly isOpen: boolean;
	readonly patients: readonly Patient[];
	readonly onClose: () => void;
	readonly onSelectPatientForBooking?: ((patient: Patient) => void) | undefined;
	readonly onOpenPatientCard?: ((patientId: string) => void) | undefined;
	readonly onQuickCreatePatient?: ((prefilled: QuickPatientPrefill) => void) | undefined;
	readonly onQuickBookNewPatient?: ((patient: Patient) => void) | undefined;
	readonly showToastFn?: ((message: string, type?: ToastType) => void) | undefined;
}
