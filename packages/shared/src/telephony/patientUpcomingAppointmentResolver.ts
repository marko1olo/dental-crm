import type { PatientUpcomingAppointmentSummary } from "./types.js";
import type {
	TelephonyAppointmentLike,
	TelephonyStaffMemberLike,
} from "./resolverTypes.js";

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
		.filter((a) => a.startsAt >= nowIso)
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

	const nextAppt = upcoming[0];
	if (!nextAppt) return null;

	let doctorName: string | null = null;
	if (nextAppt.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === nextAppt.doctorUserId);
		if (doctor) doctorName = doctor.fullName;
	}

	const dateObj = new Date(nextAppt.startsAt);
	const nowDate = new Date(nowIso);

	const isToday =
		dateObj.getFullYear() === nowDate.getFullYear() &&
		dateObj.getMonth() === nowDate.getMonth() &&
		dateObj.getDate() === nowDate.getDate();

	const tomorrowDate = new Date(nowDate);
	tomorrowDate.setDate(tomorrowDate.getDate() + 1);
	const isTomorrow =
		dateObj.getFullYear() === tomorrowDate.getFullYear() &&
		dateObj.getMonth() === tomorrowDate.getMonth() &&
		dateObj.getDate() === tomorrowDate.getDate();

	const formattedDate = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	}).format(dateObj);

	const formattedTime = new Intl.DateTimeFormat("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(dateObj);

	return {
		appointmentId: nextAppt.id,
		startsAt: nextAppt.startsAt,
		endsAt: nextAppt.endsAt,
		formattedDate,
		formattedTime,
		doctorName,
		chairName: null,
		reason: nextAppt.reason || nextAppt.comment || null,
		status: nextAppt.status,
		isToday,
		isTomorrow,
	};
}
