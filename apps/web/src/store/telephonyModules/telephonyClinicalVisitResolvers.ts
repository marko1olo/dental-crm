import type { Appointment, StaffMember } from "@dental/shared";
import type {
	PatientLastVisitSummary,
	PatientNextVisitSummary,
	PatientUpcomingAppointmentSummary,
} from "../telephonyTypes";

/**
 * Safely extracts startsAt date string from Appointment or legacy runtime object.
 * Supports canonical Appointment.startsAt as well as legacy startIso or date.
 */
export function getAppointmentStartsAt(appointment: unknown): string | null {
	if (!appointment || typeof appointment !== "object") return null;
	const candidate = appointment as Record<string, unknown>;
	if (typeof candidate.startsAt === "string" && candidate.startsAt.trim()) {
		return candidate.startsAt.trim();
	}
	if (typeof candidate.startIso === "string" && candidate.startIso.trim()) {
		return candidate.startIso.trim();
	}
	if (typeof candidate.date === "string" && candidate.date.trim()) {
		return candidate.date.trim();
	}
	return null;
}

/**
 * Safely extracts endsAt date string from Appointment or legacy runtime object.
 * Supports canonical Appointment.endsAt as well as legacy endIso.
 */
export function getAppointmentEndsAt(appointment: unknown): string | null {
	if (!appointment || typeof appointment !== "object") return null;
	const candidate = appointment as Record<string, unknown>;
	if (typeof candidate.endsAt === "string" && candidate.endsAt.trim()) {
		return candidate.endsAt.trim();
	}
	if (typeof candidate.endIso === "string" && candidate.endIso.trim()) {
		return candidate.endIso.trim();
	}
	return null;
}

/**
 * Safely extracts doctor identifier from Appointment or legacy runtime object.
 * Supports canonical Appointment.doctorUserId as well as legacy doctorId.
 */
export function getAppointmentDoctorId(appointment: unknown): string | null {
	if (!appointment || typeof appointment !== "object") return null;
	const candidate = appointment as Record<string, unknown>;
	if (typeof candidate.doctorUserId === "string" && candidate.doctorUserId.trim()) {
		return candidate.doctorUserId.trim();
	}
	if (typeof candidate.doctorId === "string" && candidate.doctorId.trim()) {
		return candidate.doctorId.trim();
	}
	return null;
}

function getAppointmentTimestamp(appointment: unknown): number {
	const startsAt = getAppointmentStartsAt(appointment);
	if (!startsAt) return 0;
	const time = new Date(startsAt).getTime();
	return Number.isFinite(time) ? time : 0;
}

/**
 * Resolves the last completed/past visit and attending doctor for a patient.
 */
export function resolvePatientLastVisit(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientLastVisitSummary {
	if (!patientId || !appointments || appointments.length === 0) {
		return {
			lastVisitDate: null,
			formattedLastVisit: "Первичный приём (визитов нет)",
			doctorName: null,
			doctorSpecialty: null,
			appointmentReason: null,
			isNewPatient: true,
		};
	}

	const patientAppointments = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => {
			const dateStr = getAppointmentStartsAt(a);
			return a.status === "completed" || Boolean(dateStr && dateStr <= nowIso);
		})
		.sort((a, b) => {
			const timeA = getAppointmentTimestamp(a);
			const timeB = getAppointmentTimestamp(b);
			return timeB - timeA;
		});

	const latest = patientAppointments[0];
	if (!latest) {
		return {
			lastVisitDate: null,
			formattedLastVisit: "Первичный приём (визитов нет)",
			doctorName: null,
			doctorSpecialty: null,
			appointmentReason: null,
			isNewPatient: true,
		};
	}

	let doctorName: string | null = null;
	let doctorSpecialty: string | null = null;

	const doctorId = getAppointmentDoctorId(latest);
	if (doctorId && staff) {
		const doctor = staff.find((s) => s.id === doctorId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const rawDateStr = getAppointmentStartsAt(latest);
	const dateObj = rawDateStr ? new Date(rawDateStr) : null;
	const isValidDate = dateObj && !isNaN(dateObj.getTime());

	const formattedLastVisit = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				day: "numeric",
				month: "short",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}).format(dateObj)
		: "Первичный приём (визитов нет)";

	return {
		lastVisitDate: rawDateStr || null,
		formattedLastVisit,
		doctorName,
		doctorSpecialty,
		appointmentReason: latest.reason || latest.comment || null,
		isNewPatient: false,
	};
}

/**
 * Resolves upcoming future appointment for a patient (for 1-click confirmation trigger).
 */
export function resolvePatientUpcomingAppointment(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientUpcomingAppointmentSummary | null {
	if (!patientId || !appointments || appointments.length === 0) return null;

	const upcoming = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "planned" || a.status === "confirmed")
		.filter((a) => {
			const dateStr = getAppointmentStartsAt(a);
			return Boolean(dateStr && dateStr >= nowIso);
		})
		.sort((a, b) => {
			const timeA = getAppointmentTimestamp(a);
			const timeB = getAppointmentTimestamp(b);
			return timeA - timeB;
		});

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
		: "";

	const formattedTime = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			}).format(dateObj)
		: "";

	return {
		appointmentId: nextAppt.id,
		startsAt: rawStartsAt,
		endsAt: rawEndsAt,
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

/**
 * Resolves upcoming next visit date with full descriptive summary.
 */
export function resolvePatientNextVisit(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
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
		.filter((a) => {
			const dateStr = getAppointmentStartsAt(a);
			return Boolean(dateStr && dateStr >= nowIso);
		})
		.sort((a, b) => {
			const timeA = getAppointmentTimestamp(a);
			const timeB = getAppointmentTimestamp(b);
			return timeA - timeB;
		});

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
	const doctorId = getAppointmentDoctorId(nextAppt);
	if (doctorId && staff) {
		const doctor = staff.find((s) => s.id === doctorId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const rawStartsAt = getAppointmentStartsAt(nextAppt) || nowIso;
	const dateObj = new Date(rawStartsAt);
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
		startsAt: rawStartsAt,
		fullTextRu,
	};
}
