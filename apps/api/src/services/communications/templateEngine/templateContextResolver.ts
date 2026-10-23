import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	patients,
	users,
	visits,
} from "../../../db/schema.js";

export async function resolveContextVariables(
	organizationId: string,
	patientId?: string,
	appointmentId?: string,
	visitId?: string,
): Promise<Record<string, string>> {
	const ctx: Record<string, string> = {};

	const [clinic] = await db
		.select({ name: clinics.name, address: clinics.address, phone: clinics.phone })
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);

	if (clinic) {
		if (clinic.name) ctx.clinic_name = clinic.name;
		if (clinic.phone) ctx.clinic_phone = clinic.phone;
		if (clinic.address) ctx.clinic_address = clinic.address;
	}

	if (patientId) {
		const [patient] = await db
			.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
			.limit(1);

		if (patient) {
			ctx.patient_name = patient.fullName;
			const parts = patient.fullName.trim().split(/\s+/);
			ctx.patient_first_name = parts[1] || parts[0] || "";
			if (!ctx.clinic_phone && patient.phone) ctx.patient_phone = patient.phone;
			ctx.portal_link = `https://dente.clinic/portal/${patient.id.slice(0, 8)}`;
			ctx.sbp_payment_link = `https://sbp.nspk.ru/pay?id=dente-${patient.id.slice(0, 8)}`;
		}
	}

	if (appointmentId) {
		const [appointment] = await db
			.select({ id: appointments.id, startsAt: appointments.startsAt, doctorUserId: appointments.doctorUserId, chairId: appointments.chairId })
			.from(appointments)
			.where(and(eq(appointments.id, appointmentId), eq(appointments.organizationId, organizationId)))
			.limit(1);

		if (appointment) {
			if (appointment.startsAt) {
				const dateObj = new Date(appointment.startsAt);
				ctx.appointment_date = dateObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
				ctx.appointment_time = dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
			}
			if (appointment.doctorUserId) {
				const [doc] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, appointment.doctorUserId)).limit(1);
				if (doc?.fullName) ctx.doctor_name = doc.fullName;
			}
			if (appointment.chairId) {
				const [chair] = await db.select({ name: chairs.name }).from(chairs).where(eq(chairs.id, appointment.chairId)).limit(1);
				if (chair?.name) ctx.chair_number = chair.name;
			}
		}
	}

	if (visitId && !ctx.doctor_name) {
		const [visitRow] = await db
			.select({ id: visits.id, appointmentId: visits.appointmentId })
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, organizationId)))
			.limit(1);

		if (visitRow?.appointmentId) {
			const [appRow] = await db
				.select({ doctorUserId: appointments.doctorUserId })
				.from(appointments)
				.where(eq(appointments.id, visitRow.appointmentId))
				.limit(1);
			if (appRow?.doctorUserId) {
				const [doc] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, appRow.doctorUserId)).limit(1);
				if (doc?.fullName) ctx.doctor_name = doc.fullName;
			}
		}
	}

	return ctx;
}
