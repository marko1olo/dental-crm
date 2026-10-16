import type { Dashboard, Patient, PatientAdministrativeProfile } from "@dental/shared";
import type {
	PatientCoreDraft,
	TextFieldChangeEvent,
} from "../PatientCoreEditorForm";

export type PatientInsight = Dashboard["patientInsights"][number];
export type PatientCoreSaveState = "idle" | "saving" | "saved" | "error";
export type PatientAdministrativeProfileSaveState =
	| "idle"
	| "saving"
	| "saved"
	| "error";

import type { PatientAdministrativeProfileDraft } from "../../../constants/onboardingConstants";

export type { PatientCoreDraft, TextFieldChangeEvent, PatientAdministrativeProfileDraft };

export type WeekdayOption = {
	label: string;
	value: number;
};

export type PatientsViewProps = {
	createPatient: () => void | Promise<void>;
	filteredPatients: Patient[];
	money: (amountRub: number) => string;
	normalizeOptionalWorkingDaysDraft: (days: number[]) => number[];
	patientAdministrativeProfileValidationMessage: string | null;
	patientInsightById: Map<string, PatientInsight>;
	patientInsightRiskLabels: Record<PatientInsight["riskLevel"], string>;
	query: string;
	savePatientAdministrativeProfile: () =>
		| undefined
		| Promise<undefined | boolean>;
	savePatientCore: () => undefined | Promise<undefined | boolean>;
	selectedPatient: Patient | null | undefined;
	setQuery: (value: string) => void;
	updatePatientAdministrativeProfileDraft: (
		field: keyof PatientAdministrativeProfileDraft,
		value: string | number[],
	) => void;
	updatePatientCoreDraft: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	weekdayOptions: WeekdayOption[];
	dashboard?: Dashboard | null;
	showToast?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
};
