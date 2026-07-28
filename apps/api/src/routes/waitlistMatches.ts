/**
 * Кому предложить окно, освободившееся после отмены.
 *
 * ЧТО БЫЛО. Лист ожидания заполнялся (POST /api/waitlist) и читался списком, но
 * с отменами не был связан вообще: слово waitlist во всём сервере встречалось
 * только в собственном маршруте. Приём отменяли — окно пропадало, а люди в
 * очереди продолжали ждать звонка, которого никто не делал.
 *
 * ДОСТУП: чтение расписания и картотеки, право schedule.read. Подбор ничего не
 * меняет — он отвечает на вопрос «кому звонить», и записывает потом человек.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import { and, eq } from "drizzle-orm";
import { requireClinicalReadContext } from "../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import { db } from "../db/client.js";
import { appointments, users } from "../db/schema.js";
import { findWaitlistMatches } from "../services/schedule/waitlistMatching.js";

function badRequest(reply: FastifyReply, message: string) {
	return reply.code(400).send({ error: "WaitlistMatchValidationError", message });
}

export async function registerWaitlistMatchRoutes(app: FastifyInstance) {
	/**
	 * Подбор по конкретному приёму. Приём берётся из базы, а не из параметров
	 * запроса: время и врач должны быть настоящими, иначе подбор сделан под
	 * выдуманное окно.
	 */
	app.get("/api/appointments/:appointmentId/waitlist-matches", async (request, reply) => {
		const context = await requireClinicalReadContext(request, reply, "waitlist matches");
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "schedule.read")) return;

		const appointmentId = (request.params as { appointmentId?: string }).appointmentId;
		if (!appointmentId) return badRequest(reply, "Не указан приём.");

		const [appointment] = await db
			.select({
				id: appointments.id,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				status: appointments.status,
				doctorUserId: appointments.doctorUserId,
				doctorName: users.fullName
			})
			.from(appointments)
			.leftJoin(users, eq(users.id, appointments.doctorUserId))
			.where(and(eq(appointments.id, appointmentId), eq(appointments.organizationId, context.organizationId)))
			.limit(1);

		if (!appointment) {
			return reply.code(404).send({ error: "AppointmentNotFound", message: "Приём не найден в этой клинике." });
		}

		/*
		 * Подбор имеет смысл только для освободившегося окна. Для приёма, который
		 * идёт своим ходом, это была бы прямая подсказка отдать чужое время —
		 * поэтому отказ, и отказ объяснённый.
		 */
		if (appointment.status !== "cancelled" && appointment.status !== "no_show") {
			return badRequest(
				reply,
				"Это время ещё занято: приём не отменён и пациент не помечен как неявившийся. Подбор нужен для освободившегося окна."
			);
		}

		if (appointment.startsAt.getTime() < Date.now()) {
			return badRequest(reply, "Это окно уже в прошлом — предлагать его некому.");
		}

		const report = await findWaitlistMatches({
			organizationId: context.organizationId,
			startsAt: appointment.startsAt,
			endsAt: appointment.endsAt,
			doctorUserId: appointment.doctorUserId,
			doctorName: appointment.doctorName ?? null
		});

		return { appointmentId: appointment.id, ...report };
	});
}

export default registerWaitlistMatchRoutes;
