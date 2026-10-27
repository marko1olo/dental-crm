import type { PatientClinicalSafetyProfile } from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";

export type PatientDetailsTab = "general" | "anamnesis" | "family" | "finance";

export interface PatientDetailsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: PatientGeneralInfo | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly initialTab?: PatientDetailsTab | undefined;
	readonly safetyProfile?: Partial<PatientClinicalSafetyProfile> | undefined;
	readonly onSave?: ((patient: PatientGeneralInfo, safety: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
	readonly className?: string | undefined;
}
