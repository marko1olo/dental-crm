import { useMemo } from "react";
import type { Appointment, Dashboard, Patient } from "@dental/shared";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { calendarDateOfInstant, formatClockTime, localCalendarDateString, NIL_UUID } from "./shiftPrintStatements";
import { useShiftRealtimeTelemetry } from "./useShiftRealtimeTelemetry";
import { useShiftFinancialSummary } from "./useShiftFinancialSummary";
import { useShiftAppointmentQueues } from "./useShiftAppointmentQueues";
import { useShiftActivePatient } from "./useShiftActivePatient";
import { useShiftStaffMetadata } from "./useShiftStaffMetadata";
import {
	type DemoShiftAppointment,
	getDemoShiftAppointments,
	getDemoShiftPatients,
	getDemoShiftPayments,
} from "./demoShiftShowcase";
import type { ShiftRawServiceItem } from "./buildShiftCompletedServices";

export { calendarDateOfInstant, formatClockTime, localCalendarDateString, NIL_UUID };
export { useShiftRealtimeTelemetry } from "./useShiftRealtimeTelemetry";
export { useShiftFinancialSummary } from "./useShiftFinancialSummary";
export { useShiftAppointmentQueues } from "./useShiftAppointmentQueues";

export type ShiftDataPatient = (Patient | { id: string; fullName: string; phone?: string | null | undefined; allergies?: string[] }) & {
	readonly medicalCardNumber?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
};

export type ShiftDataAppointment = (Appointment | DemoShiftAppointment) & {
	readonly doctorUserId?: string | null | undefined;
	readonly appointmentStatus?: string | null | undefined;
	readonly state?: string | null | undefined;
	readonly treatmentDescription?: string | null | undefined;
	readonly serviceTitle?: string | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly priceRub?: number | string | undefined;
	readonly costRub?: number | string | undefined;
	readonly totalRub?: number | string | undefined;
	readonly amountRub?: number | string | undefined;
	readonly protocolCompleted?: boolean | undefined;
	readonly emrSigned?: boolean | undefined;
	readonly diaryRecorded?: boolean | undefined;
	readonly services?: readonly ShiftRawServiceItem[] | undefined;
	readonly items?: readonly ShiftRawServiceItem[] | undefined;
	readonly completedServices?: readonly ShiftRawServiceItem[] | undefined;
};

export interface UseDoctorShiftDataOptions {
	readonly dashboard?: Dashboard | null | undefined;
}

export function useDoctorShiftData({ dashboard }: UseDoctorShiftDataOptions) {
	const isDemo = isDemoShowcaseMode();

	const patientsById = useMemo(() => {
		const index = new Map<string, ShiftDataPatient>();
		for (const patient of dashboard?.patients ?? []) index.set(patient.id, patient);
		if (isDemo) {
			for (const p of getDemoShiftPatients()) {
				if (!index.has(p.id)) index.set(p.id, p);
			}
		}
		return index;
	}, [dashboard?.patients, isDemo]);

	const todayIso = dashboard?.todayIso || localCalendarDateString();

	const todayAppointments = useMemo(() => {
		const raw: ShiftDataAppointment[] = (dashboard?.appointments ?? [])
			.filter((app) => calendarDateOfInstant(app.startsAt) === todayIso && !["cancelled", "no_show"].includes(String(app.status ?? "").toLowerCase()))
			.sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));

		if (raw.length === 0 && isDemo) {
			return getDemoShiftAppointments(todayIso);
		}
		return raw;
	}, [dashboard?.appointments, todayIso, isDemo]);

	const effectivePayments = useMemo(() => {
		const raw = dashboard?.payments ?? [];
		if (raw.length === 0 && isDemo) {
			return getDemoShiftPayments(todayIso);
		}
		return raw;
	}, [dashboard?.payments, isDemo, todayIso]);

	const inChairAppointment = useMemo(() => {
		const found = todayAppointments.find((app) => ["in_chair", "in_treatment", "in_progress"].includes(String(app.status || app.appointmentStatus || ("state" in app ? app.state : "") || "").toLowerCase()));
		if (found) return found;
		const now = Date.now();
		return todayAppointments.find((app) => {
			const st = String(app.status || app.appointmentStatus || ("state" in app ? app.state : "") || "").toLowerCase();
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
	const financial = useShiftFinancialSummary({ todayAppointments, payments: effectivePayments, staffById: staffMeta.staffById, patientsById, currentPatient: activePatient.currentPatient, shiftActiveDoctorId: staffMeta.shiftActiveDoctorId, todayIso });

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
