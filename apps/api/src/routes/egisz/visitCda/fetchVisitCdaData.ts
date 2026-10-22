/**
 * fetchVisitCdaData.ts — Fetches raw visit, patient, doctor, clinic, and diary data for CDA export.
 * Mandate 8b compliant (<= 120 lines).
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import {
	formatDoctorSpecialtyLabelForCda,
	formatDoctorSpecialtyNsiCodeForCda,
	splitFullName,
} from "../helpers.js";

export async function fetchVisitRow(visitId: string, orgId: string) {
	const [row] = await db
		.select({ visit: schema.visits, patient: schema.patients, organization: schema.organizations })
		.from(schema.visits)
		.innerJoin(schema.patients, eq(schema.visits.patientId, schema.patients.id))
		.innerJoin(schema.organizations, eq(schema.visits.organizationId, schema.organizations.id))
		.where(and(eq(schema.visits.id, visitId), eq(schema.visits.organizationId, orgId)))
		.limit(1);
	return row || null;
}

export async function fetchDiaryRow(visitId: string, orgId: string) {
	const [diaryRow] = await db
		.select({
			anamnesis: schema.visitDiaries.anamnesis, statusLocalis: schema.visitDiaries.statusLocalis,
			diagnosisIcd10: schema.visitDiaries.diagnosisIcd10, diagnosisTooth: schema.visitDiaries.diagnosisTooth,
			treatmentDescription: schema.visitDiaries.treatmentDescription, complications: schema.visitDiaries.complications,
			comorbidities: schema.visitDiaries.comorbidities, instrumentTrayBarcode: schema.visitDiaries.instrumentTrayBarcode,
			doctorId: schema.visitDiaries.doctorId, lockedByUserId: schema.visitDiaries.lockedByUserId,
			authorId: schema.visitDiaries.authorId, isLocked: schema.visitDiaries.isLocked,
			version: schema.visitDiaries.version, lockedAt: schema.visitDiaries.lockedAt,
		})
		.from(schema.visitDiaries)
		.where(and(eq(schema.visitDiaries.visitId, visitId), eq(schema.visitDiaries.organizationId, orgId)))
		.limit(1);
	return diaryRow || null;
}

export async function resolveDoctorFromAppointmentOrDiary(
	appointmentId: string | null | undefined,
	diaryRow: any,
	orgId: string,
) {
	let doctorName: { first: string; last: string; middle?: string } = { first: "", last: "Не указан" };
	let doctorPosition: string | undefined;
	let doctorPositionCode: string | undefined;
	let doctorContact: { phone?: string | null; email?: string | null } | undefined;
	let encounterDate: Date | null = null;

	if (appointmentId) {
		const [appointment] = await db
			.select({ doctorUserId: schema.appointments.doctorUserId, startsAt: schema.appointments.startsAt })
			.from(schema.appointments)
			.where(and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.organizationId, orgId)))
			.limit(1);
		if (appointment?.startsAt instanceof Date) encounterDate = appointment.startsAt;
		else if (appointment?.startsAt && typeof appointment.startsAt === "string") {
			const parsed = new Date(appointment.startsAt);
			if (!Number.isNaN(parsed.getTime())) encounterDate = parsed;
		}
		if (appointment?.doctorUserId) {
			const [doctor] = await db
				.select({ fullName: schema.users.fullName, specialties: schema.users.specialties, phone: schema.users.phone, email: schema.users.email })
				.from(schema.users)
				.where(and(eq(schema.users.id, appointment.doctorUserId), eq(schema.users.organizationId, orgId)))
				.limit(1);
			if (doctor) {
				doctorName = splitFullName(doctor.fullName);
				const pos = formatDoctorSpecialtyLabelForCda(doctor.specialties);
				if (pos) doctorPosition = pos;
				const posCode = formatDoctorSpecialtyNsiCodeForCda(doctor.specialties);
				if (posCode) doctorPositionCode = posCode;
				doctorContact = { phone: doctor.phone, email: doctor.email };
			}
		}
	}

	if (diaryRow?.doctorId) {
		const [diaryDoc] = await db
			.select({ fullName: schema.users.fullName, specialties: schema.users.specialties, phone: schema.users.phone, email: schema.users.email })
			.from(schema.users)
			.where(and(eq(schema.users.id, diaryRow.doctorId), eq(schema.users.organizationId, orgId)))
			.limit(1);
		if (diaryDoc?.fullName) {
			doctorName = splitFullName(diaryDoc.fullName);
			const pos = formatDoctorSpecialtyLabelForCda(diaryDoc.specialties);
			if (pos) doctorPosition = pos;
			doctorContact = { phone: diaryDoc.phone, email: diaryDoc.email };
		}
	}

	if ((!doctorName.last || doctorName.last === "Не указан") && diaryRow) {
		const fallbacks = [diaryRow.lockedByUserId, diaryRow.authorId].filter((id): id is string => typeof id === "string" && id.trim().length > 0);
		if (fallbacks.length > 0) {
			const fUsers = await db.select({ id: schema.users.id, fullName: schema.users.fullName, specialties: schema.users.specialties, phone: schema.users.phone, email: schema.users.email }).from(schema.users).where(and(inArray(schema.users.id, fallbacks), eq(schema.users.organizationId, orgId)));
			for (const uid of fallbacks) {
				const u = fUsers.find((x) => x.id === uid);
				if (u?.fullName?.trim()) {
					doctorName = splitFullName(u.fullName);
					const pos = formatDoctorSpecialtyLabelForCda(u.specialties);
					if (pos) doctorPosition = pos;
					const posCode = formatDoctorSpecialtyNsiCodeForCda(u.specialties);
					if (posCode) doctorPositionCode = posCode;
					doctorContact = { phone: u.phone, email: u.email };
					break;
				}
			}
		}
	}

	return { doctorName, doctorPosition, doctorPositionCode, doctorContact, encounterDate };
}
