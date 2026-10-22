/**
 * Telephony Resolver Domain Contracts & Interfaces
 */

export interface TelephonyPatientLike {
	id: string;
	fullName: string;
	phone?: string | null | undefined;
	balanceRub?: number | string | null | undefined;
	notes?: string | null | undefined;
	administrativeProfile?: {
		legalRepresentativePhone?: string | null | undefined;
		insurancePolicyNumber?: string | null | undefined;
	} | null | undefined;
}

export interface TelephonyPatientInsightLike {
	patientId: string;
	balanceDueRub?: number | string | null | undefined;
	clinicalFlags?: string[] | null | undefined;
	riskLevel?: "low" | "medium" | "high" | "watch" | string | null | undefined;
	riskReasons?: string[] | null | undefined;
}

export interface TelephonyInsuranceContractLike {
	companyName: string;
	isActive?: boolean | null | undefined;
}

export interface TelephonyAppointmentLike {
	id: string;
	patientId: string;
	startsAt: string;
	endsAt: string;
	status: "planned" | "confirmed" | "completed" | "cancelled";
	doctorUserId?: string | null | undefined;
	reason?: string | null | undefined;
	comment?: string | null | undefined;
}

export interface TelephonyStaffMemberLike {
	id: string;
	fullName: string;
	specialties?: string[] | null | undefined;
}
