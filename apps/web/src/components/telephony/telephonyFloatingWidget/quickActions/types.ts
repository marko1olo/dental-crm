import type React from "react";
import type {
	DashboardResponse,
	IncomingCallPayload,
	PatientRecord,
	PatientUpcomingAppointment,
} from "../../../../store/telephonyStore";
import type { TelephonyWidgetTab } from "../types";

export interface UseFloatingCallQuickActionsParams {
	activeCall: IncomingCallPayload | null;
	resolvedPatient: PatientRecord | null;
	upcomingAppointment: PatientUpcomingAppointment | null;
	callerName: string;
	formattedPhone: string;
	dialNumber: string;
	setDialNumber: React.Dispatch<React.SetStateAction<string>>;
	dialInputRef: React.RefObject<HTMLInputElement | null>;
	setActiveTab: React.Dispatch<React.SetStateAction<TelephonyWidgetTab>>;
	dashboard: DashboardResponse | null | undefined;
	setDashboard?: React.Dispatch<React.SetStateAction<DashboardResponse | null>> | undefined;
	setSelectedPatientId: (id: string) => void;
	setNewPatientPhone: (phone: string) => void;
	triggerIncomingCall: (call: IncomingCallPayload) => void;
	acceptCall: () => void;
}
