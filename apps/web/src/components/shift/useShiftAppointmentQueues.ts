import { useMemo } from "react";

export interface UseShiftAppointmentQueuesOptions {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly todayAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly inChairAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly patientsById: Map<string, any>;
}

export function useShiftAppointmentQueues({
	todayAppointments,
	inChairAppointment,
	patientsById,
}: UseShiftAppointmentQueuesOptions) {
	const nextAppointment = useMemo(() => {
		const now = Date.now();
		const isPendingAppointment = (app: any) => {
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

		const upcoming = todayAppointments.find((app: any) => {
			if (!isPendingAppointment(app)) return false;
			const ends = new Date(app.endsAt ?? app.startsAt).getTime();
			return Number.isFinite(ends) && ends >= now;
		});

		return upcoming ?? todayAppointments.find(isPendingAppointment) ?? null;
	}, [todayAppointments, inChairAppointment]);

	const nextAppointmentPatient = useMemo(() => {
		if (!nextAppointment) return null;
		const fromMap = patientsById.get(nextAppointment.patientId ?? "");
		if (fromMap) return fromMap;
		const appAny = nextAppointment as any;
		if (appAny.patient) return appAny.patient;
		if (appAny.patientFullName || appAny.patientName) {
			return {
				id: nextAppointment.patientId ?? "unknown",
				fullName: appAny.patientFullName || appAny.patientName,
				phone: appAny.patientPhone ?? "",
			};
		}
		return null;
	}, [nextAppointment, patientsById]);

	const inChairAppointments = useMemo(() => {
		const now = Date.now();
		return todayAppointments.filter((app: any) => {
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
		const inChairIds = new Set(inChairAppointments.map((a: any) => a.id));
		return todayAppointments.filter((app: any) => {
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
		return todayAppointments.filter((app: any) => {
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
