import { and, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { getDashboardFromDb } from "../../db/dashboardQuery.js";
import {
	appointments,
	chairs,
	clinics,
	patients,
	staffChatChannels,
	users,
} from "../../db/schema.js";
import {
	isMissingOrDefaultChairId,
	isMissingOrDefaultDoctorId,
	normalizeAppointmentFieldAliases,
} from "./appointmentsHelpers.js";
import { dashboardSchema } from "./appointmentsSchemas.js";
import type { DbClientOrTransaction } from "./types.js";

export async function resolveDefaultChairForCreate(
	tx: DbClientOrTransaction = db,
	orgId: string,
): Promise<string | undefined> {
	const [firstActiveChair] = await tx
		.select({ id: chairs.id })
		.from(chairs)
		.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
		.limit(1);
	if (firstActiveChair) {
		return firstActiveChair.id;
	}

	const [anyChair] = await tx
		.select({ id: chairs.id })
		.from(chairs)
		.where(eq(chairs.organizationId, orgId))
		.limit(1);
	if (anyChair) {
		return anyChair.id;
	}

	let [clinic] = await tx
		.select({ id: clinics.id })
		.from(clinics)
		.where(eq(clinics.organizationId, orgId))
		.limit(1);
	if (!clinic) {
		const [newClinic] = await tx
			.insert(clinics)
			.values({
				organizationId: orgId,
				name: "Стоматологическая клиника",
			})
			.returning({ id: clinics.id });
		clinic = newClinic;
	}

	const targetClinicId = clinic?.id;
	if (targetClinicId) {
		const [autoChair] = await tx
			.insert(chairs)
			.values({
				organizationId: orgId,
				clinicId: targetClinicId,
				name: "Кресло 1",
				isActive: true,
			})
			.returning({ id: chairs.id });
		if (autoChair) {
			return autoChair.id;
		}
	}

	return undefined;
}

export async function resolveDefaultDoctorForCreate(
	tx: DbClientOrTransaction = db,
	orgId: string,
): Promise<string | undefined> {
	const [firstActiveDoctor] = await tx
		.select({ id: users.id })
		.from(users)
		.where(
			and(
				eq(users.organizationId, orgId),
				eq(users.isActive, true),
				eq(users.role, "doctor"),
			),
		)
		.limit(1);
	if (firstActiveDoctor) {
		return firstActiveDoctor.id;
	}

	const [anyDoctor] = await tx
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.organizationId, orgId), eq(users.role, "doctor")))
		.limit(1);
	if (anyDoctor) {
		return anyDoctor.id;
	}

	const [firstActiveOwnerOrAdmin] = await tx
		.select({ id: users.id })
		.from(users)
		.where(
			and(
				eq(users.organizationId, orgId),
				eq(users.isActive, true),
				inArray(users.role, ["owner", "admin"]),
			),
		)
		.limit(1);
	if (firstActiveOwnerOrAdmin) {
		return firstActiveOwnerOrAdmin.id;
	}

	const [anyOrgUser] = await tx
		.select({ id: users.id })
		.from(users)
		.where(eq(users.organizationId, orgId))
		.limit(1);
	if (anyOrgUser) {
		return anyOrgUser.id;
	}

	return undefined;
}

export async function prepareCreateAppointmentRawBody(
	orgId: string,
	body: unknown,
	tx: DbClientOrTransaction = db,
): Promise<Record<string, unknown> | null> {
	const rawBody =
		body && typeof body === "object"
			? { ...(body as Record<string, unknown>) }
			: null;

	if (rawBody) {
		normalizeAppointmentFieldAliases(rawBody);

		if (isMissingOrDefaultChairId(rawBody.chairId)) {
			const resolvedChairId = await resolveDefaultChairForCreate(tx, orgId);
			if (resolvedChairId) {
				rawBody.chairId = resolvedChairId;
			}
		}

		if (isMissingOrDefaultDoctorId(rawBody.doctorUserId)) {
			const resolvedDoctorId = await resolveDefaultDoctorForCreate(tx, orgId);
			if (resolvedDoctorId) {
				rawBody.doctorUserId = resolvedDoctorId;
			}
		}
	}

	return rawBody;
}

export async function prepareUpdateAppointmentRawBody(
	orgId: string,
	body: unknown,
	tx: DbClientOrTransaction = db,
): Promise<Record<string, unknown> | null> {
	const rawBody =
		body && typeof body === "object"
			? { ...(body as Record<string, unknown>) }
			: null;

	if (rawBody) {
		normalizeAppointmentFieldAliases(rawBody);

		if (
			rawBody.chairId !== undefined &&
			isMissingOrDefaultChairId(rawBody.chairId)
		) {
			const resolvedChairId = await resolveDefaultChairForCreate(tx, orgId);
			if (resolvedChairId) {
				rawBody.chairId = resolvedChairId;
			} else {
				delete rawBody.chairId;
			}
		}

		if (
			rawBody.doctorUserId !== undefined &&
			isMissingOrDefaultDoctorId(rawBody.doctorUserId)
		) {
			const resolvedDoctorId = await resolveDefaultDoctorForCreate(tx, orgId);
			if (resolvedDoctorId) {
				rawBody.doctorUserId = resolvedDoctorId;
			} else {
				delete rawBody.doctorUserId;
			}
		}
	}

	return rawBody;
}

export async function fetchArrivalAppointmentMeta(
	tx: DbClientOrTransaction = db,
	orgId: string,
	appointmentId: string,
) {
	const [apptMeta] = await tx
		.select({
			patientName: patients.fullName,
			doctorName: users.fullName,
			chairName: chairs.name,
		})
		.from(appointments)
		.leftJoin(
			patients,
			and(
				eq(patients.id, appointments.patientId),
				eq(patients.organizationId, orgId),
			),
		)
		.leftJoin(
			users,
			and(
				eq(users.id, appointments.doctorUserId),
				eq(users.organizationId, orgId),
			),
		)
		.leftJoin(
			chairs,
			and(
				eq(chairs.id, appointments.chairId),
				eq(chairs.organizationId, orgId),
			),
		)
		.where(
			and(
				eq(appointments.id, appointmentId),
				eq(appointments.organizationId, orgId),
			),
		)
		.limit(1);

	return apptMeta;
}

export async function fetchTargetIntercomChannels(
	tx: DbClientOrTransaction = db,
	orgId: string,
	targetSlugs: readonly string[],
) {
	return tx
		.select()
		.from(staffChatChannels)
		.where(
			and(
				eq(staffChatChannels.organizationId, orgId),
				inArray(staffChatChannels.slug, [...targetSlugs]),
			),
		);
}

export async function sendDashboardResponseAfterCreate(
	request: FastifyRequest,
	reply: FastifyReply,
	orgId: string,
	appointmentId: string,
) {
	let dashboard: Awaited<ReturnType<typeof getDashboardFromDb>>;
	try {
		dashboard = await getDashboardFromDb(orgId);
	} catch (dashErr) {
		request.log.error(
			{ err: dashErr, appointmentId, orgId },
			"[Schedule] Запись создана, но сводку прочитать не удалось",
		);
		return reply.code(201).send({
			success: true,
			appointmentId,
			message:
				"Запись создана. Сводка не обновлена — перезагрузите страницу.",
		});
	}

	const parsed = dashboardSchema.safeParse(dashboard);
	if (!parsed.success) {
		request.log.warn(
			{
				appointmentId,
				orgId,
				errors: parsed.error.errors,
			},
			"[Schedule] Запись создана, сводка прочиталась, но не прошла контракт",
		);
		return reply.code(201).send({
			success: true,
			appointmentId,
			message:
				"Запись создана. Сводка не обновлена — перезагрузите страницу.",
		});
	}
	return reply.code(201).send(parsed.data);
}

export async function buildDashboardResponseAfterUpdate(
	request: FastifyRequest,
	orgId: string,
	appointmentId: string,
) {
	let dashboard: Awaited<ReturnType<typeof getDashboardFromDb>>;
	try {
		dashboard = await getDashboardFromDb(orgId);
	} catch (dashErr) {
		request.log.error(
			{ err: dashErr, appointmentId, orgId },
			"[Schedule] Приём изменён, но сводку прочитать не удалось",
		);
		return {
			success: true,
			appointmentId,
			message:
				"Запись изменена. Сводка не обновлена — перезагрузите страницу.",
		};
	}

	const parsed = dashboardSchema.safeParse(dashboard);
	if (!parsed.success) {
		request.log.warn(
			{
				appointmentId,
				orgId,
				errors: parsed.error.errors,
			},
			"[Schedule] Приём изменён, сводка прочиталась, но не прошла контракт",
		);
		return {
			success: true,
			appointmentId,
			message:
				"Запись изменена. Сводка не обновлена — перезагрузите страницу.",
		};
	}
	return parsed.data;
}

export async function fetchDashboardAfterNextStage(
	request: FastifyRequest,
	orgId: string,
	appointmentId: string,
) {
	let dashboard: Awaited<ReturnType<typeof getDashboardFromDb>> | null = null;
	try {
		dashboard = await getDashboardFromDb(orgId);
	} catch (dashErr) {
		request.log.error(
			{ err: dashErr, appointmentId, orgId },
			"[Schedule] След. этап создан, но сводку прочитать не удалось",
		);
	}
	return dashboard;
}
