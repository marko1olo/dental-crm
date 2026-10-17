import { useEffect, useRef } from "react";
import type { Dashboard } from "@dental/shared";
import type {
	IncomingCallPayload,
	PatientFinancialSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
	PatientLastVisitSummary,
	PatientActiveTreatmentPlanSummary,
	TelephonyPatientCategory,
} from "../../store/telephonyTypes";
import type { CallAttribution } from "./telephonyAttribution";
import { useCallDurationTimer } from "./incomingCallDataModules/useCallDurationTimer";
import { useServerCallerLookup } from "./incomingCallDataModules/useServerCallerLookup";
import { useResolvedPatient } from "./incomingCallDataModules/useResolvedPatient";
import { useResolvedClinicalSummaries } from "./incomingCallDataModules/useResolvedClinicalSummaries";
import { useResolvedPatientAlerts } from "./incomingCallDataModules/useResolvedPatientAlerts";
import { useResolvedCallerIdentity } from "./incomingCallDataModules/useResolvedCallerIdentity";

export interface UseIncomingCallDataResult {
	currentCall: IncomingCallPayload | null;
	elapsedSeconds: number;
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null;
	// biome-ignore lint/suspicious/noExplicitAny: insight like compatibility
	patientInsight: any;
	financialSummary: PatientFinancialSummary;
	lastVisitSummary: PatientLastVisitSummary | null;
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	somaticAlerts: PatientSomaticAlert[];
	allergyAlerts: PatientSomaticAlert[];
	acutePainAlerts: PatientSomaticAlert[];
	activeTreatmentPlan: PatientActiveTreatmentPlanSummary;
	callAttribution: CallAttribution | null;
	callerName: string;
	formattedPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string };
	isKnownPatient: boolean;
	patientCategory: TelephonyPatientCategory;
	providerLabel: string;
	isServerLookupLoading: boolean;
}

export function useIncomingCallData(
	activeCall: IncomingCallPayload | null,
	dashboard: Dashboard | undefined,
	dismissCall: () => void,
): UseIncomingCallDataResult {
	const lastCallRef = useRef<IncomingCallPayload | null>(activeCall);
	useEffect(() => {
		if (activeCall) {
			lastCallRef.current = activeCall;
		}
	}, [activeCall]);

	const currentCall = activeCall || lastCallRef.current;
	const elapsedSeconds = useCallDurationTimer(activeCall, dismissCall);
	const { serverLookup, isServerLookupLoading } = useServerCallerLookup(currentCall);
	const resolvedPatient = useResolvedPatient(serverLookup, currentCall, dashboard);

	const {
		patientInsight,
		financialSummary,
		lastVisitSummary,
		upcomingAppointment,
		patientCategory,
	} = useResolvedClinicalSummaries(serverLookup, resolvedPatient, dashboard);

	const {
		somaticAlerts,
		allergyAlerts,
		acutePainAlerts,
		activeTreatmentPlan,
	} = useResolvedPatientAlerts(serverLookup, resolvedPatient, patientInsight, dashboard);

	const {
		callAttribution,
		callerName,
		formattedPhone,
		initials,
		avatarColors,
		isKnownPatient,
		providerLabel,
	} = useResolvedCallerIdentity(currentCall, resolvedPatient);

	return {
		currentCall,
		elapsedSeconds,
		resolvedPatient,
		patientInsight,
		financialSummary,
		lastVisitSummary,
		upcomingAppointment,
		somaticAlerts,
		allergyAlerts,
		acutePainAlerts,
		activeTreatmentPlan,
		callAttribution,
		callerName,
		formattedPhone,
		initials,
		avatarColors,
		isKnownPatient,
		patientCategory,
		providerLabel,
		isServerLookupLoading,
	};
}
