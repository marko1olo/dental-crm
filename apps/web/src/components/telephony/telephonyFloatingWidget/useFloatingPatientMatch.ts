import { useMemo } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import {
	type DashboardResponse,
	type IncomingCallPayload,
	calculatePatientFinancialStatus,
	formatPatientInitials,
	formatPhoneDisplay,
	getAvatarColor,
	resolvePatientLastVisit,
	resolvePatientSomaticAlerts,
	resolvePatientUpcomingAppointment,
} from "../../../store/telephonyStore";
import { resolveCallAdvertisingAttribution } from "../telephonyAttribution";
import { filterUniqueAllergies, resolveFloatingPatient } from "./resolveFloatingPatient";

export function useFloatingPatientMatch(
	activeCall: IncomingCallPayload | null,
	dashboard: DashboardResponse | null | undefined,
	dialNumber: string,
) {
	const resolvedPatient = useMemo(
		() => resolveFloatingPatient(activeCall, dashboard),
		[activeCall, dashboard],
	);

	const patientInsight = useMemo(() => {
		if (!resolvedPatient || !dashboard?.patientInsights) return null;
		return dashboard.patientInsights.find((pi) => pi.patientId === resolvedPatient.id) || null;
	}, [resolvedPatient, dashboard?.patientInsights]);

	const financialSummary = useMemo(() => {
		return calculatePatientFinancialStatus(resolvedPatient, patientInsight, dashboard?.insuranceContracts);
	}, [resolvedPatient, patientInsight, dashboard?.insuranceContracts]);

	const lastVisitSummary = useMemo(() => {
		return resolvePatientLastVisit(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [resolvedPatient?.id, dashboard?.appointments, dashboard?.clinicSettings?.staff, dashboard?.todayIso]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [resolvedPatient?.id, dashboard?.appointments, dashboard?.clinicSettings?.staff, dashboard?.todayIso]);

	const somaticAlerts = useMemo(() => {
		return resolvePatientSomaticAlerts(resolvedPatient, patientInsight);
	}, [resolvedPatient, patientInsight]);

	const allergyAlerts = useMemo(() => filterUniqueAllergies(somaticAlerts), [somaticAlerts]);
	const acutePainAlerts = useMemo(() => somaticAlerts.filter((a) => a.category === "pain"), [somaticAlerts]);

	const callAttribution = useMemo(() => {
		if (!activeCall) return null;
		return resolveCallAdvertisingAttribution(activeCall);
	}, [activeCall]);

	const callerName = useMemo(() => {
		if (resolvedPatient?.fullName) return resolvedPatient.fullName;
		if (isDemoShowcaseMode()) return "Смирнова Анна Сергеевна";
		return activeCall?.patientName || "Неизвестный номер";
	}, [resolvedPatient?.fullName, activeCall?.patientName]);

	const formattedPhone = formatPhoneDisplay(activeCall?.phone || dialNumber);
	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);
	const isCallAnswered = activeCall?.status === "answered" || activeCall?.status === "connected";

	return {
		resolvedPatient,
		patientInsight,
		financialSummary,
		lastVisitSummary,
		upcomingAppointment,
		somaticAlerts,
		allergyAlerts,
		acutePainAlerts,
		callAttribution,
		callerName,
		formattedPhone,
		initials,
		avatarColors,
		isCallAnswered,
	};
}
