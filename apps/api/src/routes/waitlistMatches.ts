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
import { and, eq, gt, inArray, lte } from "drizzle-orm";
import { requireClinicalReadContext } from "../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import { db } from "../db/client.js";
import { appointments, users } from "../db/schema.js";
import { findWaitlistMatches, type WaitlistMatch } from "../services/schedule/waitlistMatching.js";

function badRequest(reply: FastifyReply, message: string) {
	return reply.code(400).send({ error: "WaitlistMatchValidationError", message });
}

export async function registerWaitlistMatchRoutes(app: FastifyInstance) {
	/**
	 * Освободившиеся окна: будущие приёмы, которые отменили или на которые не
	 * пришли.
	 *
	 * ЗАЧЕМ ОТДЕЛЬНЫЙ СПИСОК. Подбор по одному приёму отвечает на вопрос «кому
	 * позвонить», но чтобы этот вопрос возник, администратор должен сначала
	 * заметить отмену. В расписании отменённый приём выглядит как пустое место,
	 * то есть не выглядит никак: заметить его можно только пролистав день
	 * глазами. Здесь окна собраны в один список, и у каждого сразу видно, есть
	 * ли кому предложить.
	 *
	 * Неявка (no_show) считается тем же освободившимся окном: время потеряно
	 * одинаково, независимо от того, предупредил пациент или нет.
	 */
	app.get("/api/schedule/freed-slots", async (request, reply) => {
		const context = await requireClinicalReadContext(request, reply, "freed slots");
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "schedule.read")) return;

		const now = new Date();
		const horizonDays = 30;
		const horizon = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);

		const rows = await db
			.select({
				appointmentId: appointments.id,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				status: appointments.status,
				doctorUserId: appointments.doctorUserId,
				doctorName: users.fullName
			})
			.from(appointments)
			.leftJoin(users, eq(users.id, appointments.doctorUserId))
			.where(
				and(
					eq(appointments.organizationId, context.organizationId),
					inArray(appointments.status, ["cancelled", "no_show"]),
					// Только будущее: прошедшее окно предлагать некому.
					gt(appointments.startsAt, now),
					lte(appointments.startsAt, horizon)
				)
			)
			.orderBy(appointments.startsAt);

		/*
		 * Кандидаты считаются сразу для каждого окна. Иначе экран показывал бы
		 * «есть 6 свободных окон» и заставлял открывать каждое, чтобы выяснить,
		 * что предлагать их некому.
		 */
		/** Тип объявлен явно: пустой массив без него выводится как never[]. */
		const slots: {
			appointmentId: string;
			startsAt: Date;
			endsAt: Date;
			status: string;
			doctorName: string | null;
			freedBecause: string;
			topMatches: WaitlistMatch[];
			candidatesTotal: number;
		}[] = [];
		for (const row of rows) {
			const report = await findWaitlistMatches(
				{
					organizationId: context.organizationId,
					startsAt: row.startsAt,
					endsAt: row.endsAt,
					doctorUserId: row.doctorUserId,
					doctorName: row.doctorName ?? null
				},
				3
			);
			slots.push({
				appointmentId: row.appointmentId,
				startsAt: row.startsAt,
				endsAt: row.endsAt,
				status: row.status,
				doctorName: row.doctorName ?? null,
				// Причина освобождения человеческими словами.
				freedBecause: row.status === "no_show" ? "пациент не пришёл" : "приём отменён",
				topMatches: report.matches,
				candidatesTotal: report.examinedEntries
			});
		}

		return {
			slots,
			horizonDays,
			note:
				"Показаны будущие приёмы, которые отменили или на которые не пришли: время потеряно одинаково. " +
				"Система никого не записывает сама — она подсказывает, кому позвонить."
		};
	});

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
