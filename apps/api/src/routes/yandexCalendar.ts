import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { appointments, patients, users } from "../db/schema.js";
import { requireStaffIdentity } from "../security/identity.js";

const GenerateSchema = z.object({
	staffId: z.string().uuid(),
});

export async function registerYandexCalendarRoutes(app: FastifyInstance) {
	// Возвращает список врачей и статус их WebCal-ссылок для админки
	app.get("/api/integrations/yandex-calendar-syncs", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.organizationId) return;

			const staffList = await db
				.select({
					id: users.id,
					doctorName: users.fullName,
					yandexCalendarToken: users.yandexCalendarToken,
				})
				.from(users)
				.where(eq(users.organizationId, identity.organizationId));

			const host = request.headers.origin || `https://${request.headers.host}`;

			return staffList.map((s) => ({
				id: s.id,
				doctorName: s.doctorName,
				syncStatus: s.yandexCalendarToken ? "synced" : "empty",
				yandexCalendarId: s.yandexCalendarToken ? "Включено (WebCal)" : "Отключено",
				feedUrl: s.yandexCalendarToken ? `${host}/api/integrations/yandex-calendar/feed/${s.id}/${s.yandexCalendarToken}.ics` : null
			}));
		} catch (error: any) {
			request.log.error(error);
			return reply
				.status(500)
				.send({ error: "InternalServerError", message: "Internal server error" });
		}
	});

	// Генерирует новый токен для WebCal (ICS), отзывая старый (если был)
	app.post(
		"/api/integrations/yandex-calendar/generate",
		async (request, reply) => {
			try {
				const identity = await requireStaffIdentity(request, reply);
				if (!identity?.organizationId) return;
				const { staffId } = GenerateSchema.parse(request.body);

				const newToken = randomUUID();

				await db
					.update(users)
					.set({ yandexCalendarToken: newToken })
					.where(
						and(
							eq(users.id, staffId),
							eq(users.organizationId, identity.organizationId),
						),
					);

				return { success: true, token: newToken, staffId };
			} catch (error: any) {
				request.log.error(error);
				return reply
					.status(500)
					.send({ error: "InternalServerError", message: "Internal server error" });
			}
		},
	);

	// Отключает WebCal (удаляет токен)
	app.post(
		"/api/integrations/yandex-calendar/revoke",
		async (request, reply) => {
			try {
				const identity = await requireStaffIdentity(request, reply);
				if (!identity?.organizationId) return;
				const { staffId } = GenerateSchema.parse(request.body);

				await db
					.update(users)
					.set({ yandexCalendarToken: null })
					.where(
						and(
							eq(users.id, staffId),
							eq(users.organizationId, identity.organizationId),
						),
					);

				return { success: true };
			} catch (error: any) {
				request.log.error(error);
				return reply
					.status(500)
					.send({ error: "InternalServerError", message: "Internal server error" });
			}
		},
	);

	// Публичный эндпоинт, который Yandex/Google/Apple Calendar дёргают по ссылке.
	// Защищён секретным токеном, который передается в пути.
	app.get<{ Params: { staffId: string; token: string } }>(
		"/api/integrations/yandex-calendar/feed/:staffId/:token",
		async (request, reply) => {
			try {
				const { staffId, token } = request.params;
				if (!staffId || !token || !token.endsWith(".ics")) {
					return reply.status(404).send("Not found");
				}
				const actualToken = token.replace(".ics", "");

				const staffInfo = await db
					.select({
						yandexCalendarToken: users.yandexCalendarToken,
						orgId: users.organizationId,
					})
					.from(users)
					.where(eq(users.id, staffId))
					.then((r) => r[0]);

				if (
					!staffInfo ||
					!staffInfo.yandexCalendarToken ||
					staffInfo.yandexCalendarToken !== actualToken
				) {
					return reply.status(403).send("Forbidden");
				}

				const events = await db
					.select({
						id: appointments.id,
						startsAt: appointments.startsAt,
						endsAt: appointments.endsAt,
						reason: appointments.reason,
						patientName: patients.fullName,
					})
					.from(appointments)
					.leftJoin(patients, eq(appointments.patientId, patients.id))
					.where(
						and(
							eq(appointments.doctorUserId, staffId),
							ne(appointments.status, "cancelled"),
							eq(appointments.organizationId, staffInfo.orgId),
						),
					);

				const lines = [
					"BEGIN:VCALENDAR",
					"VERSION:2.0",
					"PRODID:-//DENTE CRM//RU",
					"CALSCALE:GREGORIAN",
					"X-WR-CALNAME:DENTE Расписание",
				];

				for (const ev of events) {
					const formatICSDate = (d: Date) => {
						return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
					};

					const summary = `Прием: ${ev.patientName || "Неизвестно"}${ev.reason ? ` (${ev.reason})` : ""}`;

					lines.push("BEGIN:VEVENT");
					lines.push(`UID:${ev.id}@dente.crm`);
					// Использование startsAt как DTSTAMP, если нет created_at. Но лучше текущее время.
					lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
					lines.push(`DTSTART:${formatICSDate(ev.startsAt)}`);
					lines.push(`DTEND:${formatICSDate(ev.endsAt)}`);
					lines.push(`SUMMARY:${summary}`);
					lines.push("END:VEVENT");
				}

				lines.push("END:VCALENDAR");

				reply.header("Content-Type", "text/calendar; charset=utf-8");
				reply.header("Content-Disposition", `attachment; filename="schedule.ics"`);
				return reply.send(lines.join("\r\n"));
			} catch (error) {
				request.log.error(error);
				return reply.status(500).send("Internal Server Error");
			}
		},
	);
}
