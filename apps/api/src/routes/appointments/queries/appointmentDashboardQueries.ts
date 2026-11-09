import { and, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import { getDashboardFromDb } from "../../../db/dashboardQuery.js";
import {
	appointments,
	chairs,
	patients,
	staffChatChannels,
	users,
} from "../../../db/schema.js";
import { dashboardSchema } from "../appointmentsSchemas.js";
import type { DbClientOrTransaction } from "../types.js";

/**
 * Получает метаданные приёма для уведомления о прибытии пациента.
 */
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

/**
 * Получает внутренние каналы интеркома для оповещения персонала.
 */
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

/**
 * Отправляет ответ со стандартизированной структурой после создания приёма:
 * { success: true, appointment: createdRecord, dashboard: updatedDashboard }
 */
export async function sendDashboardResponseAfterCreate(
	request: FastifyRequest,
	reply: FastifyReply,
	orgId: string,
	appointmentId: string,
	createdRecord?: unknown,
) {
	let dashboard: Awaited<ReturnType<typeof getDashboardFromDb>> | null = null;
	try {
		dashboard = await getDashboardFromDb(orgId);
	} catch (dashErr) {
		request.log.error(
			{ err: dashErr, appointmentId, orgId },
			"[Schedule] Запись создана, но сводку прочитать не удалось",
		);
	}

	const parsed = dashboard ? dashboardSchema.safeParse(dashboard) : null;
	if (parsed && !parsed.success) {
		request.log.warn(
			{
				appointmentId,
				orgId,
				errors: parsed.error.errors,
			},
			"[Schedule] Запись создана, сводка прочиталась, но не прошла контракт",
		);
	}

	const updatedDashboard = parsed?.success ? parsed.data : (dashboard ?? undefined);

	return reply.code(201).send({
		success: true,
		appointment: createdRecord ?? { id: appointmentId },
		dashboard: updatedDashboard,
	});
}

/**
 * Формирует ответ с актуальной сводкой дашборда после изменения приёма.
 */
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

/**
 * Получает сводку дашборда после планирования следующего этапа.
 */
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
