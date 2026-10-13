import { useMemo } from "react";
import {
	getDemoShowcasePatients,
	isDemoShowcaseMode,
} from "../../../lib/demoMode";
import {
	type DashboardResponse,
	type IncomingCallPayload,
	calculatePatientFinancialStatus,
	formatPatientInitials,
	formatPhoneDisplay,
	getAvatarColor,
	resolvePatientFromPhone,
	resolvePatientLastVisit,
	resolvePatientSomaticAlerts,
	resolvePatientUpcomingAppointment,
} from "../../../store/telephonyStore";
import { resolveCallAdvertisingAttribution } from "../telephonyAttribution";

export function useFloatingPatientMatch(
	activeCall: IncomingCallPayload | null,
	dashboard: DashboardResponse | null | undefined,
	dialNumber: string,
) {
	const resolvedPatient = useMemo(() => {
		if (!activeCall) return null;
		if (dashboard?.patients && dashboard.patients.length > 0) {
			if (activeCall.patientId) {
				const found = dashboard.patients.find(
					(p) => p.id === activeCall.patientId,
				);
				if (found) return found;
			}
			const foundByPhone = resolvePatientFromPhone(
				dashboard.patients,
				activeCall.phone,
			);
			if (foundByPhone) return foundByPhone;
			if (activeCall.patientName) {
				const foundByName = dashboard.patients.find(
					(p) => p.fullName === activeCall.patientName,
				);
				if (foundByName) return foundByName;
			}
		}
		if (isDemoShowcaseMode()) {
			const demoPatient = dashboard?.patients?.find(
				(p) =>
					p.id === "01a00000-0000-0000-0000-000000000001" ||
					p.fullName === "Смирнова Анна Сергеевна" ||
					p.phone === "+7 916 234-56-78",
			);
			if (demoPatient) return demoPatient;
			const demoList = getDemoShowcasePatients();
			return demoList[0] || null;
		}
		return null;
	}, [activeCall, dashboard?.patients]);

	const patientInsight = useMemo(() => {
		if (!resolvedPatient || !dashboard?.patientInsights) return null;
		return (
			dashboard.patientInsights.find(
				(pi) => pi.patientId === resolvedPatient.id,
			) || null
		);
	}, [resolvedPatient, dashboard?.patientInsights]);

	const financialSummary = useMemo(() => {
		return calculatePatientFinancialStatus(
			resolvedPatient,
			patientInsight,
			dashboard?.insuranceContracts,
		);
	}, [resolvedPatient, patientInsight, dashboard?.insuranceContracts]);

	const lastVisitSummary = useMemo(() => {
		return resolvePatientLastVisit(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const somaticAlerts = useMemo(() => {
		return resolvePatientSomaticAlerts(resolvedPatient, patientInsight);
	}, [resolvedPatient, patientInsight]);

	const allergyAlerts = useMemo(() => {
		const raw = somaticAlerts.filter((a) => a.category === "allergy");
		const seenSubstances = new Set<string>();
		return raw.filter((alert) => {
			const lower = alert.label.toLowerCase();
			const key =
				lower.includes("пенициллин") || lower.includes("амокси")
					? "penicillin"
					: lower.includes("лидокаин") || lower.includes("анестети")
						? "anesthetic"
						: lower.includes("латекс")
							? "latex"
							: lower;
			if (seenSubstances.has(key)) return false;
			seenSubstances.add(key);
			return true;
		});
	}, [somaticAlerts]);
	const acutePainAlerts = useMemo(
		() => somaticAlerts.filter((a) => a.category === "pain"),
		[somaticAlerts],
	);

	const callAttribution = useMemo(() => {
		if (!activeCall) return null;
		return resolveCallAdvertisingAttribution(activeCall);
	}, [activeCall]);

	const callerName = useMemo(() => {
		if (resolvedPatient?.fullName) return resolvedPatient.fullName;
		if (isDemoShowcaseMode()) {
			return "Смирнова Анна Сергеевна";
		}
		return activeCall?.patientName || "Неизвестный номер";
	}, [resolvedPatient?.fullName, activeCall?.patientName]);

	const formattedPhone = formatPhoneDisplay(activeCall?.phone || dialNumber);
	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);
	const isCallAnswered =
		activeCall?.status === "answered" || activeCall?.status === "connected";

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
