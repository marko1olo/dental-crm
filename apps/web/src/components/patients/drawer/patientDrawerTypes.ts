/**
 * apps/web/src/components/patients/drawer/patientDrawerTypes.ts
 * Types and interfaces for PatientDrawer. Mandate 8b: <= 120 lines.
 */
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { PatientDrawerFamilySummary } from "./PatientDrawerFinanceCard";

export interface PatientDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: PatientGeneralInfo | null | undefined;
	readonly safetyProfile?: PatientClinicalSafetyProfile | null | undefined;
	readonly familyData?: PatientDrawerFamilySummary | null | undefined;
	readonly onOpenAnamnesis?: (() => void) | undefined;
	readonly onOpenFamilyWallet?: (() => void) | undefined;
	readonly onOpenFullCard?: (() => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
	readonly className?: string | undefined;
}
