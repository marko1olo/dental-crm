import type { Patient } from "@dental/shared";

export interface PatientFamilyAndInsuranceWidgetProps {
	readonly patient: Patient;
	readonly patientBalance: number;
	readonly insurancePolicyNumber?: string | undefined;
	readonly onUpdateInsurancePolicy?: (policy: string) => void;
}

export interface FamilyGroupData {
	id: string;
	name: string;
	balance?: number | string;
	sharedBalanceRub?: number;
	headPatientId?: string | null;
	members: Array<{
		id?: string;
		patientId?: string;
		fullName?: string;
		patientName?: string;
		phone?: string | null;
		role?: string;
		individualBalanceRub?: number;
	}>;
}
