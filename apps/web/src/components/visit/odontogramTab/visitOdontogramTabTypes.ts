export interface VisitOdontogramTabPatient {
	id: string;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	birthDate?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitOdontogramTabAppointment {
	id?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitOdontogramTabDashboard {
	activeVisit?: {
		id?: string | null | undefined;
		appointmentId?: string | null | undefined;
		patientId?: string | null | undefined;
		[key: string]: unknown;
	} | null | undefined;
	clinicSettings?: {
		profile?: {
			hasPediatricMode?: boolean | undefined;
			[key: string]: unknown;
		} | undefined;
		[key: string]: unknown;
	} | undefined;
	[key: string]: unknown;
}

export interface VisitOdontogramTabProps {
	readonly activePatient?: VisitOdontogramTabPatient | null | undefined;
	readonly activeAppointment?: VisitOdontogramTabAppointment | null | undefined;
	readonly dashboard?: VisitOdontogramTabDashboard | null | undefined;
}

export interface DentitionPhaseBadge {
	label: string;
	hint: string;
}
