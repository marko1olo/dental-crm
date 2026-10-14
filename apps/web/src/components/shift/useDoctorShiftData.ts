import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import {
	calendarDateOfInstant,
	formatClockTime,
	localCalendarDateString,
	NIL_UUID,
} from "./shiftPrintStatements";
import { useShiftRealtimeTelemetry } from "./useShiftRealtimeTelemetry";
import { useShiftFinancialSummary } from "./useShiftFinancialSummary";
import { useShiftAppointmentQueues } from "./useShiftAppointmentQueues";

export { calendarDateOfInstant, formatClockTime, localCalendarDateString, NIL_UUID };
export { useShiftRealtimeTelemetry } from "./useShiftRealtimeTelemetry";
export { useShiftFinancialSummary } from "./useShiftFinancialSummary";
export { useShiftAppointmentQueues } from "./useShiftAppointmentQueues";

export interface UseDoctorShiftDataOptions {
	readonly dashboard?: Dashboard | null | undefined;
}

/**
 * useDoctorShiftData — Unified shift data facade hook for doctor cockpit.
 * Decomposed into specialized telemetry, queue and financial modules for low-spec resilience.
 */
export function useDoctorShiftData({ dashboard }: UseDoctorShiftDataOptions) {
	const patientsById = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const index = new Map<string, any>();
		for (const patient of dashboard?.patients ?? [])
			index.set(patient.id, patient);
		return index;
	}, [dashboard?.patients]);

	const todayIso = dashboard?.todayIso || localCalendarDateString();

	const todayAppointments = useMemo(() => {
		return (
			(dashboard?.appointments ?? [])
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				.filter((app: any) => calendarDateOfInstant(app.startsAt) === todayIso)
				.filter(
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					(app: any) =>
						!["cancelled", "no_show"].includes(
							String(app.status ?? "").toLowerCase(),
						),
				)
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				.sort((a: any, b: any) =>
					String(a.startsAt).localeCompare(String(b.startsAt)),
				)
		);
	}, [dashboard?.appointments, todayIso]);

	const inChairAppointment = useMemo(() => {
		const inChairStatuses = ["in_chair", "in_treatment", "in_progress"];
		const foundByStatus = todayAppointments.find((app: any) => {
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			return inChairStatuses.includes(statusKey);
		});
		if (foundByStatus) return foundByStatus;

		const now = Date.now();
		return (
			todayAppointments.find((app: any) => {
				const statusKey = String(app.status || app.appointmentStatus || app.state || "").toLowerCase();
				if (["cancelled", "no_show", "completed", "done"].includes(statusKey)) return false;
				const starts = new Date(app.startsAt).getTime();
				const ends = new Date(app.endsAt ?? app.startsAt).getTime();
				return Number.isFinite(starts) && Number.isFinite(ends) && starts <= now && now <= ends;
			}) ?? null
		);
	}, [todayAppointments]);

	const currentPatient = useMemo(() => {
		const visit = dashboard?.activeVisit;
		if (
			visit?.id &&
			visit.id !== NIL_UUID &&
			visit.patientId &&
			visit.patientId !== NIL_UUID &&
			visit.status === "draft"
		) {
			const p = patientsById.get(visit.patientId ?? "");
			if (p) return p;
		}

		if (
			inChairAppointment?.patientId &&
			inChairAppointment.patientId !== NIL_UUID
		) {
			const p = patientsById.get(inChairAppointment.patientId ?? "");
			if (p) return p;
			const inChairAny = inChairAppointment as any;
			if (inChairAny?.patient) return inChairAny.patient;
			if (inChairAny?.patientFullName) {
				return {
					id: inChairAppointment.patientId,
					fullName: inChairAny.patientFullName,
					phone: inChairAny.patientPhone ?? "",
				};
			}
		}

		return null;
	}, [dashboard?.activeVisit, inChairAppointment, patientsById]);

	const currentPatientCallablePhone = (currentPatient?.phone ?? "")
		.trim()
		.replace(/[^\d+]/g, "");
	const currentPatientHasCallablePhone =
		currentPatientCallablePhone.length >= 5;

	const currentAppointmentReason = useMemo(() => {
		if (!inChairAppointment) return "";
		const appAny = inChairAppointment as any;
		return (
			inChairAppointment.reason ||
			appAny.treatmentDescription ||
			appAny.serviceTitle ||
			appAny.complaint ||
			appAny.complaints ||
			""
		);
	}, [inChairAppointment]);

	const staffById = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const index = new Map<string, any>();
		for (const member of dashboard?.clinicSettings?.staff ?? [])
			index.set(member.id, member);
		return index;
	}, [dashboard?.clinicSettings?.staff]);

	const manyDoctors = useMemo(
		() =>
			(dashboard?.clinicSettings?.staff ?? []).filter(
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				(member: any) => member.active && member.role === "doctor",
			).length > 1,
		[dashboard?.clinicSettings?.staff],
	);

	const rolesWorthShowing = useMemo(
		() =>
			new Set(
				(dashboard?.clinicSettings?.staff ?? [])
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					.filter((member: any) => member.active)
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					.map((member: any) => member.role),
			).size > 2,
		[dashboard?.clinicSettings?.staff],
	);

	// Delegated appointment queues calculation
	const {
		nextAppointment,
		nextAppointmentPatient,
		inChairAppointments,
		waitingAppointments,
		awaitingPaymentAppointments,
	} = useShiftAppointmentQueues({
		todayAppointments,
		inChairAppointment,
		patientsById,
	});

	const shiftDoctorsList = useMemo(() => {
		const staff = dashboard?.clinicSettings?.staff ?? [];
		const activeDoctors = staff.filter(
			(member: any) => member.active && member.role === "doctor",
		);
		if (activeDoctors.length === 0) return undefined;
		return activeDoctors.map((doc: any) => ({
			id: String(doc.id),
			name: String(doc.fullName || doc.name || "Лечащий врач"),
			specialtyId: String(doc.specialty || doc.specialtyId || "general_dentist"),
		}));
	}, [dashboard?.clinicSettings?.staff]);

	const shiftActiveDoctorId = useMemo(() => {
		if (inChairAppointment?.doctorUserId) {
			return inChairAppointment.doctorUserId;
		}
		if (shiftDoctorsList && shiftDoctorsList.length > 0) {
			return shiftDoctorsList[0]?.id;
		}
		return undefined;
	}, [inChairAppointment?.doctorUserId, shiftDoctorsList]);

	// Delegated realtime telemetry calculation
	const telemetry = useShiftRealtimeTelemetry({
		todayAppointments,
		inChairAppointments,
		patientsById,
		currentPatient,
		todayIso,
	});

	// Delegated financial summary calculation
	const financial = useShiftFinancialSummary({
		todayAppointments,
		payments: dashboard?.payments,
		staffById,
		patientsById,
		currentPatient,
		shiftActiveDoctorId,
		todayIso,
	});

	const shiftStats = useMemo(() => {
		return {
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
		};
	}, [telemetry, financial]);

	return {
		todayIso,
		patientsById,
		todayAppointments,
		inChairAppointment,
		currentPatient,
		currentPatientCallablePhone,
		currentPatientHasCallablePhone,
		currentAppointmentReason,
		staffById,
		manyDoctors,
		nextAppointment,
		nextAppointmentPatient,
		rolesWorthShowing,
		inChairAppointments,
		waitingAppointments,
		awaitingPaymentAppointments,
		shiftStats,
		shiftDoctorsList,
		shiftActiveDoctorId,
		shiftCompletedServices: financial.shiftCompletedServices,
		mobileAppointments: telemetry.mobileAppointments,
	};
}
