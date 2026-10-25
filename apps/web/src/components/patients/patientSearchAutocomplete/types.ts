import type { Patient } from "@dental/shared";
import type { QuickPatientPrefill } from "../../schedule/patientSearchEngine";

export interface PatientSearchAutocompleteProps {
	readonly patients: readonly Patient[];
	readonly onSelectPatient: (patient: Patient) => void;
	readonly onCreatePatientQuick?: (prefill: QuickPatientPrefill) => void;
	readonly placeholder?: string;
	readonly autoFocus?: boolean;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly initialQuery?: string;
	readonly clearOnSelect?: boolean;
	readonly allowQuickCreate?: boolean;
	readonly maxResults?: number;
}

export interface SomaticBadgeInfo {
	readonly label: string;
	readonly isCritical: boolean;
}
