import { useMemo } from "react";

export interface ShiftQueuePatient {
	readonly id: string;
	readonly fullName: string;
	readonly phone?: string | null | undefined;
}

export interface ShiftQueueAppointment {
	readonly id: string;
	readonly patientId?: string | null | undefined;
	readonly startsAt: string;
	readonly endsAt?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly appointmentStatus?: string | null | undefined;
	readonly state?: string | null | undefined;
	readonly reason?: string | null | undefined;
	readonly patient?: ShiftQueuePatient | null | undefined;
	readonly patientFullName?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
}

export interface UseShiftAppointmentQueuesOptions {
	readonly todayAppointments: readonly ShiftQueueAppointment[];
	readonly inChairAppointment?: { readonly id?: string | undefined } | null | undefined;
	readonly patientsById: ReadonlyMap<string, ShiftQueuePatient>;
}

export function useShiftAppointmentQueues({
	todayAppointments,
	inChairAppointment,
	patientsById,
}: UseShiftAppointmentQueuesOptions) {
	const nextAppointment = useMemo<ShiftQueueAppointment | null>(() => {
		const now = Date.now();
		const isPendingAppointment = (app: ShiftQueueAppointment) => {
			if (inChairAppointment && app.id === inChairAppointment.id) return false;
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			return ![
				"in_chair",
				"in_treatment",
				"in_progress",
				"completed",
				"done",
				"cancelled",
				"no_show",
			].includes(statusKey);
		};

		const upcoming = todayAppointments.find((app: ShiftQueueAppointment) => {
			if (!isPendingAppointment(app)) return false;
			const ends = new Date(app.endsAt ?? app.startsAt).getTime();
			return Number.isFinite(ends) && ends >= now;
		});

		return upcoming ?? todayAppointments.find(isPendingAppointment) ?? null;
	}, [todayAppointments, inChairAppointment]);

	const nextAppointmentPatient = useMemo<ShiftQueuePatient | null>(() => {
		if (!nextAppointment) return null;
		const fromMap = patientsById.get(nextAppointment.patientId ?? "");
		if (fromMap) return fromMap;
		if (nextAppointment.patient) return nextAppointment.patient;
		if (nextAppointment.patientFullName || nextAppointment.patientName) {
			return {
				id: nextAppointment.patientId ?? "unknown",
				fullName: nextAppointment.patientFullName || nextAppointment.patientName || "Пациент",
				phone: nextAppointment.patientPhone ?? "",
			};
		}
		return null;
	}, [nextAppointment, patientsById]);

	const inChairAppointments = useMemo(() => {
		const now = Date.now();
		return todayAppointments.filter((app: ShiftQueueAppointment) => {
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			if (["in_chair", "in_treatment", "in_progress"].includes(statusKey)) {
				return true;
			}
			if (["cancelled", "no_show", "completed", "done"].includes(statusKey)) {
				return false;
			}
			const starts = new Date(app.startsAt).getTime();
			const ends = new Date(app.endsAt ?? app.startsAt).getTime();
			return Number.isFinite(starts) && Number.isFinite(ends) && starts <= now && now <= ends;
		});
	}, [todayAppointments]);

	const waitingAppointments = useMemo(() => {
		const inChairIds = new Set(inChairAppointments.map((a: ShiftQueueAppointment) => a.id));
		return todayAppointments.filter((app: ShiftQueueAppointment) => {
			if (inChairIds.has(app.id)) return false;
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			return (
				["arrived", "waiting", "planned", "scheduled", "pending", "confirmed"].includes(statusKey) &&
				!["completed", "done", "cancelled", "no_show"].includes(statusKey)
			);
		});
	}, [todayAppointments, inChairAppointments]);

	const awaitingPaymentAppointments = useMemo(() => {
		return todayAppointments.filter((app: ShiftQueueAppointment) => {
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			return ["completed", "done"].includes(statusKey) || statusKey === "payment_pending";
		});
	}, [todayAppointments]);

	return {
		nextAppointment,
		nextAppointmentPatient,
		inChairAppointments,
		waitingAppointments,
		awaitingPaymentAppointments,
	};
}
