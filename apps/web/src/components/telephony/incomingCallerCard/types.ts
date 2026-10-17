import type {
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
	PatientActiveTreatmentPlanSummary,
	TelephonyPatientCategory,
} from "../../../store/telephonyTypes";
import type { CallAttribution } from "../telephonyAttribution";

export interface IncomingCallerCardProps {
	callerName: string;
	formattedPhone: string;
	rawPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string; border?: string | undefined };
	isKnownPatient: boolean;
	patientCategory?: TelephonyPatientCategory | undefined;
	birthDate?: string | null | undefined;
	financialSummary: PatientFinancialSummary;
	somaticAlerts: PatientSomaticAlert[];
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	lastVisitSummary?: PatientLastVisitSummary | null | undefined;
	activeTreatmentPlan?: PatientActiveTreatmentPlanSummary | null | undefined;
	callAttribution?: CallAttribution | null | undefined;
	isLeadCaptured?: boolean | undefined;
	isCapturingLead?: boolean | undefined;
	onCopyPhone?: (() => void) | undefined;
	onSendWhatsApp?: (() => void) | undefined;
	onCopySms?: (() => void) | undefined;
	onCaptureLead?: (() => void) | undefined;
	smsCopied?: boolean | undefined;
	compact?: boolean | undefined;
	className?: string | undefined;
}
