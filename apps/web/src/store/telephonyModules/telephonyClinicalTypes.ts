import type { TelephonyPatientCategory } from "@dental/shared";
import type {
	PatientActiveTreatmentPlanSummary,
	PatientCategory,
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientNextVisitSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
} from "../telephonyTypes";

export interface AppointmentConfirmationParams {
	patientName: string;
	doctorName?: string | null | undefined;
	appointmentStartsAt: string;
	clinicName?: string | undefined;
	clinicAddress?: string | null | undefined;
	templateType?: "confirmation" | "reminder" | "urgent" | undefined;
}

export interface OrthopedicReadyMessageParams {
	patientName: string;
	orderNumber?: string | undefined;
	toothFdi?: string | number | readonly (string | number)[] | undefined;
	material?: string | undefined;
	doctorName?: string | null | undefined;
	clinicName?: string | undefined;
	clinicPhone?: string | undefined;
	bookingUrl?: string | undefined;
	channel?: "sms" | "whatsapp" | undefined;
}

/**
 * WebRTC and SIP Audio Track state representation.
 */
export interface WebRtcAudioTrackState {
	trackId: string;
	kind: "audio";
	enabled: boolean;
	muted: boolean;
	readyState: "live" | "ended";
	label?: string | undefined;
}

/**
 * Configuration options for WebRTC audio session streams.
 */
export interface TelephonyAudioStreamConfig {
	autoGainControl?: boolean;
	echoCancellation?: boolean;
	noiseSuppression?: boolean;
	sampleRate?: number;
	channelCount?: number;
}

/**
 * Real-time audio stream metrics (jitter, packet loss, volume level).
 */
export interface TelephonyAudioStreamStats {
	inputLevel: number;
	outputLevel: number;
	packetsLost?: number;
	jitterMs?: number;
	roundTripTimeMs?: number;
	codecName?: string;
}

/**
 * Clinical Caller context card extracted from matching telephone number.
 */
export interface TelephonyCallerCard {
	patientId: string | null;
	patientName: string;
	phone: string;
	category: "vip" | "primary" | "regular" | "debtor" | "risk" | TelephonyPatientCategory;
	financial: PatientFinancialSummary;
	lastVisit: PatientLastVisitSummary;
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	nextVisit: PatientNextVisitSummary;
	activePlan: PatientActiveTreatmentPlanSummary;
	somaticAlerts: PatientSomaticAlert[];
}
