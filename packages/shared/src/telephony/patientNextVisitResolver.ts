import type { PatientNextVisitSummary } from "./types.js";
import type {
	TelephonyAppointmentLike,
	TelephonyStaffMemberLike,
} from "./resolverTypes.js";

/**
 * Resolves upcoming next visit date with full descriptive summary.
 */
export function resolvePatientNextVisit(
	patientId: string | null | undefined,
	appointments: TelephonyAppointmentLike[] | null | undefined,
	staff: TelephonyStaffMemberLike[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientNextVisitSummary {
	if (!patientId || !appointments || appointments.length === 0) {
		return {
			hasNextVisit: false,
			appointmentId: null,
			formattedDate: "—",
			formattedTime: "—",
			doctorName: null,
			doctorSpecialty: null,
			reason: null,
			isToday: false,
			isTomorrow: false,
			startsAt: null,
			fullTextRu: "Следующий визит не запланирован",
		};
	}

	const upcoming = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "planned" || a.status === "confirmed")
		.filter((a) => a.startsAt >= nowIso)
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

	const nextAppt = upcoming[0];
	if (!nextAppt) {
		return {
			hasNextVisit: false,
			appointmentId: null,
			formattedDate: "—",
			formattedTime: "—",
			doctorName: null,
			doctorSpecialty: null,
			reason: null,
			isToday: false,
			isTomorrow: false,
			startsAt: null,
			fullTextRu: "Следующий визит не запланирован",
		};
	}

	let doctorName: string | null = null;
	let doctorSpecialty: string | null = null;
	if (nextAppt.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === nextAppt.doctorUserId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
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

	const prefix = isToday ? "Сегодня" : isTomorrow ? "Завтра" : formattedDate;
	const docStr = doctorName ? ` (${doctorName})` : "";
	const reasonStr = nextAppt.reason ? ` — ${nextAppt.reason}` : "";
	const fullTextRu = `Следующий визит: ${prefix} в ${formattedTime}${docStr}${reasonStr}`;

	return {
		hasNextVisit: true,
		appointmentId: nextAppt.id,
		formattedDate,
		formattedTime,
		doctorName,
		doctorSpecialty,
		reason: nextAppt.reason || nextAppt.comment || null,
		isToday,
		isTomorrow,
		startsAt: nextAppt.startsAt,
		fullTextRu,
	};
}
