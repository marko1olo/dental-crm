import { and, eq } from "drizzle-orm";
import { type TenantDb, withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	chairs,
	clinics,
	patients,
	users,
	visits,
} from "../../../db/schema.js";

async function resolveContextVariablesWithTx(
	tx: TenantDb,
	organizationId: string,
	patientId?: string,
	appointmentId?: string,
	visitId?: string,
): Promise<Record<string, string>> {
	const ctx: Record<string, string> = {};

	const [clinic] = await tx
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
		const [patient] = await tx
			.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)),
			)
			.limit(1);

		if (patient) {
			ctx.patient_name = patient.fullName;
			const parts = patient.fullName.trim().split(/\s+/);
			ctx.patient_first_name = parts[1] || parts[0] || "";
			if (patient.phone) ctx.patient_phone = patient.phone;
		}
	}

	if (appointmentId) {
		const [appointment] = await tx
			.select({
				id: appointments.id,
				startsAt: appointments.startsAt,
				doctorUserId: appointments.doctorUserId,
				chairId: appointments.chairId,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.id, appointmentId),
					eq(appointments.organizationId, organizationId),
				),
			)
			.limit(1);

		if (appointment) {
			if (appointment.startsAt) {
				const dateObj = new Date(appointment.startsAt);
				ctx.appointment_date = dateObj.toLocaleDateString("ru-RU", {
					day: "numeric",
					month: "long",
				});
				ctx.appointment_time = dateObj.toLocaleTimeString("ru-RU", {
					hour: "2-digit",
					minute: "2-digit",
				});
			}
			if (appointment.doctorUserId) {
				const [doc] = await tx
					.select({ fullName: users.fullName, role: users.role })
					.from(users)
					.where(
						and(
							eq(users.id, appointment.doctorUserId),
							eq(users.organizationId, organizationId),
						),
					)
					.limit(1);
				if (doc?.fullName) ctx.doctor_name = doc.fullName;
				if (doc?.role) {
					ctx.doctor_role =
						doc.role === "doctor"
							? "Врач-стоматолог"
							: doc.role === "hygienist"
								? "Гигиенист"
								: doc.role === "surgeon"
									? "Хирург-имплантолог"
									: doc.role;
				}
			}
			if (appointment.chairId) {
				const [chair] = await tx
					.select({ name: chairs.name })
					.from(chairs)
					.where(
						and(
							eq(chairs.id, appointment.chairId),
							eq(chairs.organizationId, organizationId),
						),
					)
					.limit(1);
				if (chair?.name) ctx.chair_number = chair.name;
			}
		}
	}

	if (visitId && !ctx.doctor_name) {
		const [visitRow] = await tx
			.select({ id: visits.id, appointmentId: visits.appointmentId })
			.from(visits)
			.where(
				and(eq(visits.id, visitId), eq(visits.organizationId, organizationId)),
			)
			.limit(1);

		if (visitRow?.appointmentId) {
			const [appRow] = await tx
				.select({ doctorUserId: appointments.doctorUserId })
				.from(appointments)
				.where(
					and(
						eq(appointments.id, visitRow.appointmentId),
						eq(appointments.organizationId, organizationId),
					),
				)
				.limit(1);
			if (appRow?.doctorUserId) {
				const [doc] = await tx
					.select({ fullName: users.fullName })
					.from(users)
					.where(
						and(
							eq(users.id, appRow.doctorUserId),
							eq(users.organizationId, organizationId),
						),
					)
					.limit(1);
				if (doc?.fullName) ctx.doctor_name = doc.fullName;
			}
		}
	}

	return ctx;
}

export async function resolveContextVariables(
	organizationId: string,
	patientId?: string,
	appointmentId?: string,
	visitId?: string,
	tx?: TenantDb,
): Promise<Record<string, string>> {
	if (tx) {
		return resolveContextVariablesWithTx(
			tx,
			organizationId,
			patientId,
			appointmentId,
			visitId,
		);
	}
	return withTenantCtx(organizationId, (tenantTx) =>
		resolveContextVariablesWithTx(
			tenantTx,
			organizationId,
			patientId,
			appointmentId,
			visitId,
		),
	);
}
