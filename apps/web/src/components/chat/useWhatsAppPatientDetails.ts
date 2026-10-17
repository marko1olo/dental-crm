import { useMemo } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import {
	calculatePatientFinancialStatus,
	formatPatientInitials,
	formatPhoneDisplay,
	getAvatarColor,
	resolvePatientFromPhone,
	resolvePatientUpcomingAppointment,
} from "../../store/telephonyStore";
import type { WhatsAppChatPanelProps } from "./WhatsAppChatPanel";

export function useWhatsAppPatientDetails({
	patientId,
	patientPhone,
	patientName,
}: WhatsAppChatPanelProps) {
	const ctx = useAppLogicContext();
	const dashboard = ctx?.dashboard;
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const effectivePatientId = patientId || selectedPatientId || null;

	const patient = useMemo(() => {
		if (!dashboard?.patients) return null;
		if (effectivePatientId) {
			const p = dashboard.patients.find((item) => item.id === effectivePatientId);
			if (p) return p;
		}
		if (patientPhone) {
			return resolvePatientFromPhone(dashboard.patients, patientPhone);
		}
		return null;
	}, [dashboard?.patients, effectivePatientId, patientPhone]);

	const effectivePhone = patient?.phone || patientPhone || "";
	const effectiveName = patient?.fullName || patientName || "Пациент клиники";
	const formattedPhone = formatPhoneDisplay(effectivePhone);
	const initials = formatPatientInitials(effectiveName);
	const avatarColors = getAvatarColor(effectiveName);

	const financialSummary = useMemo(() => {
		return calculatePatientFinancialStatus(
			patient,
			dashboard?.patientInsights?.find((pi) => pi.patientId === patient?.id),
			dashboard?.insuranceContracts,
		);
	}, [patient, dashboard?.patientInsights, dashboard?.insuranceContracts]);

	const upcomingAppointment = useMemo(() => {
		return resolvePatientUpcomingAppointment(
			patient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [patient?.id, dashboard?.appointments, dashboard?.clinicSettings?.staff, dashboard?.todayIso]);

	const activeTreatmentPlan = useMemo(() => {
		const insight = dashboard?.patientInsights?.find((pi) => pi.patientId === patient?.id);
		if (insight?.treatmentPlanTitle) {
			return {
				title: insight.treatmentPlanTitle,
				totalRub: insight.treatmentPlanTotalRub || "0",
			};
		}
		return null;
	}, [dashboard?.patientInsights, patient?.id]);

	return {
		dashboard,
		effectivePatientId,
		patient,
		effectivePhone,
		effectiveName,
		formattedPhone,
		initials,
		avatarColors,
		financialSummary,
		upcomingAppointment,
		activeTreatmentPlan,
	};
}
