import type { PatientUpcomingAppointmentSummary } from "./types.js";
import type {
	TelephonyAppointmentLike,
	TelephonyStaffMemberLike,
} from "./resolverTypes.js";
import {
	getAppointmentDoctorId,
	getAppointmentEndsAt,
	getAppointmentStartsAt,
	getAppointmentTimestamp,
} from "./patientLastVisitResolver.js";

/**
 * Resolves upcoming future appointment for a patient (for 1-click confirmation trigger).
 */
export function resolvePatientUpcomingAppointment(
	patientId: string | null | undefined,
	appointments: TelephonyAppointmentLike[] | null | undefined,
	staff: TelephonyStaffMemberLike[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientUpcomingAppointmentSummary | null {
	if (!patientId || !appointments || appointments.length === 0) return null;

	const upcoming = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "planned" || a.status === "confirmed")
		.filter((a) => {
			const startsAt = getAppointmentStartsAt(a);
			return Boolean(startsAt && startsAt >= nowIso);
		})
		.sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));

	const nextAppt = upcoming[0];
	if (!nextAppt) return null;

	let doctorName: string | null = null;
	const doctorId = getAppointmentDoctorId(nextAppt);
	if (doctorId && staff) {
		const doctor = staff.find((s) => s.id === doctorId);
		if (doctor) doctorName = doctor.fullName;
	}

	const rawStartsAt = getAppointmentStartsAt(nextAppt) || nowIso;
	const rawEndsAt = getAppointmentEndsAt(nextAppt) || rawStartsAt;
	const dateObj = new Date(rawStartsAt);
	const nowDate = new Date(nowIso);

	const isValidDate = !isNaN(dateObj.getTime());
	const isToday =
		isValidDate &&
		dateObj.getFullYear() === nowDate.getFullYear() &&
		dateObj.getMonth() === nowDate.getMonth() &&
		dateObj.getDate() === nowDate.getDate();

	const tomorrowDate = new Date(nowDate);
	tomorrowDate.setDate(tomorrowDate.getDate() + 1);
	const isTomorrow =
		isValidDate &&
		dateObj.getFullYear() === tomorrowDate.getFullYear() &&
		dateObj.getMonth() === tomorrowDate.getMonth() &&
		dateObj.getDate() === tomorrowDate.getDate();

	const formattedDate = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				day: "numeric",
				month: "long",
				weekday: "short",
			}).format(dateObj)
		: "—";

	const formattedTime = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			}).format(dateObj)
		: "—";

	return {
		appointmentId: nextAppt.id,
		startsAt: rawStartsAt,
		endsAt: rawEndsAt,
		formattedDate,
		formattedTime,
		doctorName,
		chairName: null,
		reason: nextAppt.reason || nextAppt.comment || null,
		status: (nextAppt.status as "planned" | "confirmed" | "completed" | "cancelled") || "planned",
		isToday,
		isTomorrow,
	};
}
