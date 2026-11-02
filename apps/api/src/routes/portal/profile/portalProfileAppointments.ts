/**
 * Portal Patient Profile Appointments & Doctor Roster Queries
 * (DOMAIN: PATIENT PORTAL - LAYER 2 DATA ACCESS)
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { appointments, users } from "../../../db/schema.js";

export interface EnrichedPortalAppointment {
	id: string;
	doctorUserId: string | null;
	chairId: string | null;
	startsAt: Date;
	endsAt: Date;
	status: string;
	reason: string | null;
	comment: string | null;
	doctorName: string;
	doctorSpecialtyRu: string;
}

export interface ClinicDoctorInfo {
	id: string;
	fullName: string;
	specialties: unknown;
}

/**
 * Получение истории и запланированных визитов пациента с обогащением именами врачей клиники.
 */
export async function fetchPatientAppointmentsAndDoctors(
	patientId: string,
	organizationId: string,
): Promise<{
	appointments: EnrichedPortalAppointment[];
	doctors: ClinicDoctorInfo[];
}> {
	// Appointments from schedule
	const patientAppointments = await db
		.select({
			id: appointments.id,
			doctorUserId: appointments.doctorUserId,
			chairId: appointments.chairId,
			startsAt: appointments.startsAt,
			endsAt: appointments.endsAt,
			status: appointments.status,
			reason: appointments.reason,
			comment: appointments.comment,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.patientId, patientId),
				eq(appointments.organizationId, organizationId),
			),
		)
		.orderBy(desc(appointments.startsAt));

	// Clinic doctors for appointment names and online booking
	const clinicDoctors = await db
		.select({
			id: users.id,
			fullName: users.fullName,
			specialties: users.specialties,
		})
		.from(users)
		.where(
			and(
				eq(users.organizationId, organizationId),
				eq(users.role, "doctor"),
				eq(users.isActive, true),
			),
		);

	const doctorMap = new Map(clinicDoctors.map((d) => [d.id, d]));
	const enrichedAppointments: EnrichedPortalAppointment[] = patientAppointments.map((apt) => {
		const doc = apt.doctorUserId ? doctorMap.get(apt.doctorUserId) : null;
		const docSpecialties = Array.isArray(doc?.specialties) ? (doc.specialties as string[]) : null;
		return {
			...apt,
			doctorName: doc?.fullName || "Лечащий врач",
			doctorSpecialtyRu: docSpecialties?.[0] || "Стоматолог",
		};
	});

	return {
		appointments: enrichedAppointments,
		doctors: clinicDoctors,
	};
}

/**
 * Фильтрация предстоящих приемов для быстрого напоминания и онлайн-переноса.
 */
export function filterUpcomingAppointments(
	appointmentList: EnrichedPortalAppointment[],
	now: Date = new Date(),
): EnrichedPortalAppointment[] {
	return appointmentList.filter(
		(apt) =>
			new Date(apt.startsAt).getTime() >= now.getTime() &&
			apt.status !== "cancelled" &&
			apt.status !== "completed",
	);
}

/**
 * Фильтрация истории прошедших завершенных визитов.
 */
export function filterPastAppointments(
	appointmentList: EnrichedPortalAppointment[],
	now: Date = new Date(),
): EnrichedPortalAppointment[] {
	return appointmentList.filter(
		(apt) =>
			new Date(apt.startsAt).getTime() < now.getTime() ||
			apt.status === "completed",
	);
}
