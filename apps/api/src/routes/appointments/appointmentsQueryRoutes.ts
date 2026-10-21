import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getAppointmentByIdInDb } from "../../db/appointmentsQuery.js";
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

export async function handleGetAppointments(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"get appointments",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const query = request.query as Record<string, string | undefined> | undefined;
	const period = query?.period;
	const doctorId = query?.doctorId;
	const date = query?.date;
	const patientId = query?.patientId;

	const conditions = [eq(appointments.organizationId, orgId)];
	if (doctorId) {
		conditions.push(eq(appointments.doctorUserId, doctorId));
	}
	if (patientId) {
		conditions.push(eq(appointments.patientId, patientId));
	}
	if (date) {
		const dayStart = new Date(`${date}T00:00:00.000Z`);
		const dayEnd = new Date(`${date}T23:59:59.999Z`);
		conditions.push(sql`${appointments.startsAt} >= ${dayStart} AND ${appointments.startsAt} <= ${dayEnd}`);
	} else if (period) {
		const now = new Date();
		let dateThreshold: Date | undefined;
		if (period === "day") {
			dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		} else if (period === "week") {
			dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		} else if (period === "month") {
			dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
		} else if (period === "quarter") {
			const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
			dateThreshold = new Date(now.getFullYear(), currentQuarterMonth, 1);
		} else if (period === "year") {
			dateThreshold = new Date(now.getFullYear(), 0, 1);
		}
		if (dateThreshold) {
			conditions.push(sql`${appointments.startsAt} >= ${dateThreshold}`);
		}
	}

	const cardNumSql = sql<string>`coalesce(
		${patients.administrativeProfile}->>'cardNumber',
		${patients.administrativeProfile}->>'chartNumber',
		${patients.administrativeProfile}->>'medicalCardNumber',
		'К-' || substring(${appointments.id}::text, 1, 8)
	)`;

	const rows = await db
		.select({
			appointment: appointments,
			patientFullName: patients.fullName,
			patientPhone: patients.phone,
			patientBirthDate: patients.birthDate,
			cardNumber: cardNumSql,
			chairName: chairs.name,
			doctorFullName: users.fullName,
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
			chairs,
			and(
				eq(chairs.id, appointments.chairId),
				eq(chairs.organizationId, orgId),
			),
		)
		.leftJoin(
			users,
			and(
				eq(users.id, appointments.doctorUserId),
				eq(users.organizationId, orgId),
			),
		)
		.where(and(...conditions))
		.orderBy(asc(appointments.startsAt))
		.limit(1000);

	const formatted = rows.map((r) => ({
		id: r.appointment.id,
		patientId: r.appointment.patientId,
		patientFullName: r.patientFullName ?? undefined,
		patientName: r.patientFullName ?? undefined,
		patientPhone: r.patientPhone ?? undefined,
		patientBirthDate: r.patientBirthDate ?? undefined,
		cardNumber: r.cardNumber ?? undefined,
		chairId: r.appointment.chairId,
		chairName: r.chairName ?? undefined,
		doctorId: r.appointment.doctorUserId,
		doctorUserId: r.appointment.doctorUserId,
		doctorFullName: r.doctorFullName ?? undefined,
		doctorName: r.doctorFullName ?? undefined,
		startsAt: r.appointment.startsAt.toISOString(),
		endsAt: r.appointment.endsAt.toISOString(),
		status: r.appointment.status,
		reason: r.appointment.reason,
		comment: r.appointment.comment,
		stageIndex: r.appointment.stageIndex,
		clinicalStage: r.appointment.clinicalStage,
		toothNumber: r.appointment.toothNumber,
		diagnosisMkb10: r.appointment.diagnosisMkb10,
	}));

	return reply.send({
		success: true,
		data: formatted,
		appointments: formatted,
	});
}

export async function handleGetAppointmentById(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"get appointment by id",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const { appointmentId, id } = request.params as {
		appointmentId?: string;
		id?: string;
	};
	const targetId = appointmentId || id;
	if (!targetId) {
		return reply.code(400).send({
			code: "AppointmentValidationError",
			message: "Не указан ID приёма",
		});
	}

	const appt = await getAppointmentByIdInDb(orgId, targetId);
	if (!appt) {
		return reply.code(404).send({
			code: "AppointmentNotFound",
			message: "Приём не найден",
		});
	}

	return reply.send({
		success: true,
		appointment: {
			...appt,
			startsAt: appt.startsAt instanceof Date ? appt.startsAt.toISOString() : new Date(appt.startsAt).toISOString(),
			endsAt: appt.endsAt instanceof Date ? appt.endsAt.toISOString() : new Date(appt.endsAt).toISOString(),
		},
	});
}

