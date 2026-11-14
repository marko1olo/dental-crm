import type { PatientLastVisitSummary } from "./types.js";
import type {
	TelephonyAppointmentLike,
	TelephonyStaffMemberLike,
} from "./resolverTypes.js";

/**
 * Safely extracts startsAt date string from Appointment or legacy runtime object.
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

export function getAppointmentTimestamp(appointment: unknown): number {
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
	appointments: TelephonyAppointmentLike[] | null | undefined,
	staff: TelephonyStaffMemberLike[] | null | undefined,
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
