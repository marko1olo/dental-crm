import type { ToothData } from "../../../odontogram/ToothChart";

export interface LivePatientPlanInfo {
	readonly patientName: string;
	readonly patientId: string;
	readonly patientPhone: string;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly planId: string;
	readonly planCreatedAtIso?: string | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
}

export interface ClinicRequisites {
	readonly clinicName: string;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicLicense?: string;
}

export interface LiveTreatmentPlanPresenterLauncherProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly planId?: string | undefined;
}
