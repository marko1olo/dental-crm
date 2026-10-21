import type { Dashboard, Patient } from "@dental/shared";

export type PatientInsight = Dashboard["patientInsights"][number];

export type MobilePatientFilter = "all" | "allergy" | "debt";

export interface MobilePatientsGroupedListProps {
	readonly patients: Patient[];
	readonly selectedPatientId: string | null;
	readonly onSelectPatient: (patientId: string) => void;
	readonly onCreatePatient: () => void;
	readonly onOpenTactileSearch: () => void;
	readonly patientInsightById?: Map<string, PatientInsight> | undefined;
	readonly query: string;
	readonly onQueryChange: (query: string) => void;
	readonly onClearQuery: () => void;
	readonly showLostPatientsOnly?: boolean | undefined;
	readonly onToggleLostPatients?: (() => void) | undefined;
	readonly isLoadingLost?: boolean | undefined;
	readonly money: (amountRub: number) => string;
}
