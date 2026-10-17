import type { Dashboard, Patient } from "@dental/shared";
import type { PatientCoreDraft } from "../PatientCoreEditorForm";
import type {
	PatientAdministrativeProfileDraft,
	PatientAdministrativeProfileSaveState,
	PatientCoreSaveState,
	WeekdayOption,
} from "../../../PatientsView";

export interface PatientDetailsPanelProps {
	readonly selectedPatient: Patient | null | undefined;
	readonly onBackToList: () => void;
	readonly onOpenVisit: () => void;
	readonly onOpenPatientCardModal: () => void;
	readonly onOpenLoyaltyModal: () => void;
	readonly patientCoreDraft: PatientCoreDraft;
	readonly updatePatientCoreDraft: (field: keyof PatientCoreDraft, value: string) => void;
	readonly patientCoreSaveState: PatientCoreSaveState;
	readonly patientCoreDirty: boolean;
	readonly savePatientCore: () => void;
	readonly patientCoreSaveGuidance: string | null;
	readonly patientCoreSaveGuidanceId: string;
	readonly patientAdministrativeProfileDraft: PatientAdministrativeProfileDraft;
	readonly updatePatientAdministrativeProfileDraft: (field: keyof PatientAdministrativeProfileDraft, value: string | number[]) => void;
	readonly patientAdministrativeProfileSaveState: PatientAdministrativeProfileSaveState;
	readonly patientAdministrativeProfileDirty: boolean;
	readonly patientAdministrativeProfileValidationMessage: string | null;
	readonly savePatientAdministrativeProfile: () => void;
	readonly patientAdministrativeSaveGuidance: string | null;
	readonly patientAdministrativeSaveGuidanceId: string;
	readonly weekdayOptions: WeekdayOption[];
	readonly normalizeOptionalWorkingDaysDraft: (days: number[]) => number[];
	readonly dashboard?: Dashboard | null | undefined;
	readonly executePatientSomaticNorm: () => void;
	readonly executeBookAppointment: () => void;
}
