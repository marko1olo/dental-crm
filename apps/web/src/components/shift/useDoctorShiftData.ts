import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import { calendarDateOfInstant, formatClockTime, localCalendarDateString, NIL_UUID } from "./shiftPrintStatements";
import { useShiftRealtimeTelemetry } from "./useShiftRealtimeTelemetry";
import { useShiftFinancialSummary } from "./useShiftFinancialSummary";
import { useShiftAppointmentQueues } from "./useShiftAppointmentQueues";
import { useShiftActivePatient } from "./useShiftActivePatient";
import { useShiftStaffMetadata } from "./useShiftStaffMetadata";

export { calendarDateOfInstant, formatClockTime, localCalendarDateString, NIL_UUID };
export { useShiftRealtimeTelemetry } from "./useShiftRealtimeTelemetry";
export { useShiftFinancialSummary } from "./useShiftFinancialSummary";
export { useShiftAppointmentQueues } from "./useShiftAppointmentQueues";

export interface UseDoctorShiftDataOptions {
	readonly dashboard?: Dashboard | null | undefined;
}

export function useDoctorShiftData({ dashboard }: UseDoctorShiftDataOptions) {
	const patientsById = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: patient map
		const index = new Map<string, any>();
		for (const patient of dashboard?.patients ?? []) index.set(patient.id, patient);
		return index;
	}, [dashboard?.patients]);

	const todayIso = dashboard?.todayIso || localCalendarDateString();

	const todayAppointments = useMemo(() => {
		return (dashboard?.appointments ?? [])
			// biome-ignore lint/suspicious/noExplicitAny: appointment
			.filter((app: any) => calendarDateOfInstant(app.startsAt) === todayIso && !["cancelled", "no_show"].includes(String(app.status ?? "").toLowerCase()))
			// biome-ignore lint/suspicious/noExplicitAny: appointment
			.sort((a: any, b: any) => String(a.startsAt).localeCompare(String(b.startsAt)));
	}, [dashboard?.appointments, todayIso]);

	const inChairAppointment = useMemo(() => {
		const found = todayAppointments.find((app: any) => ["in_chair", "in_treatment", "in_progress"].includes(String(app.status || app.appointmentStatus || app.state || "").toLowerCase()));
		if (found) return found;
		const now = Date.now();
		return todayAppointments.find((app: any) => {
			const st = String(app.status || app.appointmentStatus || app.state || "").toLowerCase();
			if (["cancelled", "no_show", "completed", "done"].includes(st)) return false;
			const starts = new Date(app.startsAt).getTime();
			const ends = new Date(app.endsAt ?? app.startsAt).getTime();
			return Number.isFinite(starts) && Number.isFinite(ends) && starts <= now && now <= ends;
		}) ?? null;
	}, [todayAppointments]);

	const activePatient = useShiftActivePatient({ dashboard, patientsById, inChairAppointment });
	const staffMeta = useShiftStaffMetadata({ dashboard, inChairAppointment });
	const queues = useShiftAppointmentQueues({ todayAppointments, inChairAppointment, patientsById });
	const telemetry = useShiftRealtimeTelemetry({ todayAppointments, inChairAppointments: queues.inChairAppointments, patientsById, currentPatient: activePatient.currentPatient, todayIso });
	const financial = useShiftFinancialSummary({ todayAppointments, payments: dashboard?.payments, staffById: staffMeta.staffById, patientsById, currentPatient: activePatient.currentPatient, shiftActiveDoctorId: staffMeta.shiftActiveDoctorId, todayIso });

	const shiftStats = useMemo(() => ({
		totalAppointments: telemetry.totalAppointments,
		completedCount: telemetry.completedCount,
		inProgressCount: telemetry.inProgressCount,
		totalRevenueRub: financial.totalRevenueRub,
		plannedRevenueRub: financial.plannedRevenueRub,
		directPaymentsRub: financial.directPaymentsRub,
		appointmentBilledRub: financial.appointmentBilledRub,
		cashBreakdown: financial.cashBreakdown,
		doctorCommissionPct: financial.doctorCommissionPct,
		estimatedDoctorPayoutRub: financial.estimatedDoctorPayoutRub,
		hasActiveOvertime: telemetry.hasActiveOvertime,
	}), [telemetry, financial]);

	return {
		todayIso, patientsById, todayAppointments, inChairAppointment,
		currentPatient: activePatient.currentPatient,
		currentPatientCallablePhone: activePatient.currentPatientCallablePhone,
		currentPatientHasCallablePhone: activePatient.currentPatientHasCallablePhone,
		currentAppointmentReason: activePatient.currentAppointmentReason,
		staffById: staffMeta.staffById, manyDoctors: staffMeta.manyDoctors,
		nextAppointment: queues.nextAppointment, nextAppointmentPatient: queues.nextAppointmentPatient,
		rolesWorthShowing: staffMeta.rolesWorthShowing, inChairAppointments: queues.inChairAppointments,
		waitingAppointments: queues.waitingAppointments, awaitingPaymentAppointments: queues.awaitingPaymentAppointments,
		shiftStats, shiftDoctorsList: staffMeta.shiftDoctorsList, shiftActiveDoctorId: staffMeta.shiftActiveDoctorId,
		shiftCompletedServices: financial.shiftCompletedServices, mobileAppointments: telemetry.mobileAppointments,
	};
}
