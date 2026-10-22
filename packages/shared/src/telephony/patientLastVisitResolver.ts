import type { PatientLastVisitSummary } from "./types.js";
import type {
	TelephonyAppointmentLike,
	TelephonyStaffMemberLike,
} from "./resolverTypes.js";

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
		.filter((a) => a.status === "completed" || a.startsAt <= nowIso)
		.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

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

	if (latest.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === latest.doctorUserId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const dateObj = new Date(latest.startsAt);
	const formattedLastVisit = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(dateObj);

	return {
		lastVisitDate: latest.startsAt,
		formattedLastVisit,
		doctorName,
		doctorSpecialty,
		appointmentReason: latest.reason || latest.comment || null,
		isNewPatient: false,
	};
}
