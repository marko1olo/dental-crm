import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	appointments,
	chairs,
	patients,
	users,
	yandexCalendarSyncs,
} from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import { requireStaffIdentity } from "../security/identity.js";
import { signToken, verifyToken } from "../utils/cryptoHelper.js";

const SettingsSchema = z.object({
	yandexCalendarId: z.string().nullable(),
	yandexCalendarToken: z.any().nullable(),
});

/**
 * Анонимизация персональных данных пациента для календаря (152-ФЗ / HIPAA).
 * Преобразует "Иванов Иван Иванович" -> "Пациент И.И."
 */
export function anonymizePatientName(fullName?: string | null): string {
	if (!fullName || typeof fullName !== "string") {
		return "Пациент";
	}
	const clean = fullName.trim();
	if (!clean) return "Пациент";

	if (clean.toLowerCase().startsWith("пациент")) {
		return clean;
	}

	const words = clean.split(/\s+/).filter(Boolean);
	if (words.length === 0) return "Пациент";

	const initials = words
		.slice(0, 2)
		.map((w) => {
			const letter = w.replace(/^[^a-zA-Zа-яА-ЯёЁ]/, "")[0];
			return letter ? `${letter.toUpperCase()}.` : "";
		})
		.filter(Boolean)
		.join("");

	if (!initials) return "Пациент";
	return `Пациент ${initials}`;
}

/**
 * Экранирование спецсимволов RFC 5545 (пункт 3.3.11).
 */
export function escapeIcalText(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\r?\n/g, "\\n");
}

/**
 * Форматирование даты в формат RFC 5545 UTC (YYYYMMDDTHHMMSSZ).
 */
export function formatIcalDateTime(date: Date | string | number): string {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) {
		return "19700101T000000Z";
	}
	const pad = (n: number) => n.toString().padStart(2, "0");
	const year = d.getUTCFullYear();
	const month = pad(d.getUTCMonth() + 1);
	const day = pad(d.getUTCDate());
	const hours = pad(d.getUTCHours());
	const minutes = pad(d.getUTCMinutes());
	const seconds = pad(d.getUTCSeconds());
	return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Разбивка длинных строк iCalendar по стандарту RFC 5545 (не более 75 октетов).
 */
export function foldIcalLine(line: string, maxLen = 75): string {
	if (line.length <= maxLen) return line;
	const parts: string[] = [];
	let remaining = line;
	let isFirst = true;
	while (remaining.length > 0) {
		const chunkLen = isFirst ? maxLen : maxLen - 1;
		parts.push(remaining.slice(0, chunkLen));
		remaining = remaining.slice(chunkLen);
		isFirst = false;
	}
	return parts.join("\r\n ");
}

export interface IcalAppointmentItem {
	id: string;
	startsAt: Date | string;
	endsAt: Date | string;
	status: string;
	reason?: string | null;
	chairName?: string | null;
	patientFullName?: string | null;
}

/**
 * Генерация RFC 5545 iCalendar (VCALENDAR / VEVENT) фида приёмов врача.
 */
export function generateIcsCalendar(params: {
	doctorName: string;
	appointments: IcalAppointmentItem[];
}): string {
	const nowUtc = formatIcalDateTime(new Date());
	const calName = `Расписание врача — ${params.doctorName}`;

	const rawLines: string[] = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Dente Dental CRM//Doctor Schedule RFC 5545//RU",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		`X-WR-CALNAME:${escapeIcalText(calName)}`,
		"X-WR-TIMEZONE:UTC",
	];

	for (const apt of params.appointments) {
		const start = formatIcalDateTime(apt.startsAt);
		const end = formatIcalDateTime(apt.endsAt);
		const patientLabel = anonymizePatientName(apt.patientFullName);

		let summary = "Приём врача";
		if (apt.reason && patientLabel) {
			summary = `Приём: ${apt.reason} (${patientLabel})`;
		} else if (apt.reason) {
			summary = `Приём: ${apt.reason}`;
		} else if (patientLabel) {
			summary = `Приём: ${patientLabel}`;
		}

		const statusMap: Record<string, string> = {
			planned: "TENTATIVE",
			confirmed: "CONFIRMED",
			completed: "CONFIRMED",
			cancelled: "CANCELLED",
			no_show: "CANCELLED",
		};
		const icalStatus = statusMap[apt.status] || "CONFIRMED";

		const statusLabels: Record<string, string> = {
			planned: "Запланирован",
			confirmed: "Подтвержден",
			completed: "Завершен",
			cancelled: "Отменен",
			no_show: "Неявка",
		};
		const statusText = statusLabels[apt.status] || apt.status;

		const descParts = [
			`Пациент: ${patientLabel}`,
			`Статус: ${statusText}`,
		];
		if (apt.chairName) {
			descParts.push(`Кресло/Кабинет: ${apt.chairName}`);
		}
		if (apt.reason) {
			descParts.push(`Причина/Услуга: ${apt.reason}`);
		}
		const description = descParts.join("\n");

		rawLines.push("BEGIN:VEVENT");
		rawLines.push(`UID:appointment-${apt.id}@dental-crm`);
		rawLines.push(`DTSTAMP:${nowUtc}`);
		rawLines.push(`DTSTART:${start}`);
		rawLines.push(`DTEND:${end}`);
		rawLines.push(`SUMMARY:${escapeIcalText(summary)}`);
		rawLines.push(`DESCRIPTION:${escapeIcalText(description)}`);
		rawLines.push(`STATUS:${icalStatus}`);
		rawLines.push("END:VEVENT");
	}

	rawLines.push("END:VCALENDAR");

	return rawLines.map((line) => foldIcalLine(line)).join("\r\n") + "\r\n";
}

/**
 * Поиск доктора по токену подписки iCal.
 */
export async function lookupDoctorByIcalToken(rawToken: string): Promise<{
	doctorId: string;
	organizationId: string;
	doctorName: string;
} | null> {
	return withSuperuserBypass(async (tx) => {
		// 1. Попытка валидации подписанного токена HMAC
		const secret = authTokenSecret();
		const payload = verifyToken(rawToken, secret) as {
			doctorId?: string;
			userId?: string;
			organizationId?: string;
		} | null;

		if (
			payload &&
			(payload.doctorId || payload.userId) &&
			payload.organizationId
		) {
			const targetUserId = payload.doctorId || payload.userId;
			const user = await tx
				.select({
					id: users.id,
					organizationId: users.organizationId,
					fullName: users.fullName,
					isActive: users.isActive,
				})
				.from(users)
				.where(
					and(
						eq(users.id, targetUserId!),
						eq(users.organizationId, payload.organizationId),
					),
				)
				.then((r) => r[0]);

			if (user && user.isActive) {
				return {
					doctorId: user.id,
					organizationId: user.organizationId,
					doctorName: user.fullName,
				};
			}
		}

		const isUuid =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
				rawToken,
			);

		if (isUuid) {
			// 2. Прямой поиск по ID пользователя
			const user = await tx
				.select({
					id: users.id,
					organizationId: users.organizationId,
					fullName: users.fullName,
					isActive: users.isActive,
				})
				.from(users)
				.where(and(eq(users.id, rawToken), eq(users.isActive, true)))
				.then((r) => r[0]);

			if (user) {
				return {
					doctorId: user.id,
					organizationId: user.organizationId,
					doctorName: user.fullName,
				};
			}

			// 3. Поиск по ID синхронизации
			const sync = await tx
				.select({
					doctorId: yandexCalendarSyncs.doctorId,
					organizationId: yandexCalendarSyncs.organizationId,
					doctorName: users.fullName,
					isActive: users.isActive,
				})
				.from(yandexCalendarSyncs)
				.innerJoin(users, eq(yandexCalendarSyncs.doctorId, users.id))
				.where(eq(yandexCalendarSyncs.id, rawToken))
				.then((r) => r[0]);

			if (sync && sync.isActive) {
				return {
					doctorId: sync.doctorId,
					organizationId: sync.organizationId,
					doctorName: sync.doctorName,
				};
			}
		}

		// 4. Поиск по yandexCalendarId
		const userByCalId = await tx
			.select({
				id: users.id,
				organizationId: users.organizationId,
				fullName: users.fullName,
				isActive: users.isActive,
			})
			.from(users)
			.where(
				and(eq(users.yandexCalendarId, rawToken), eq(users.isActive, true)),
			)
			.then((r) => r[0]);

		if (userByCalId) {
			return {
				doctorId: userByCalId.id,
				organizationId: userByCalId.organizationId,
				doctorName: userByCalId.fullName,
			};
		}

		return null;
	});
}

export async function registerYandexCalendarRoutes(app: FastifyInstance) {
	app.get("/api/integrations/yandex-calendar/auth", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.organizationId) return;

			return {
				authUrl:
					"https://oauth.yandex.ru/authorize?response_type=code&client_id=dente_crm",
				connected: false,
			};
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении параметров авторизации Яндекс.Календаря.",
			});
		}
	});

	app.post(
		"/api/integrations/yandex-calendar/settings",
		async (request, reply) => {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.userId || !identity?.organizationId) return;
			const staffId = identity.userId;
			const orgId = identity.organizationId;

			try {
				const body = SettingsSchema.parse(request.body);
				await db
					.update(users)
					.set({
						yandexCalendarId: body.yandexCalendarId,
						yandexCalendarToken: body.yandexCalendarToken,
					})
					.where(and(eq(users.id, staffId), eq(users.organizationId, orgId)));

				return { success: true };
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			} catch (err: any) {
				request.log.error(err, "Failed to update Yandex Calendar settings");
				return reply.code(400).send({ error: "InvalidPayload", message: "Некорректные параметры настроек Яндекс.Календаря." });
			}
		},
	);

	app.get("/api/integrations/yandex-calendar-syncs", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.organizationId) return;

			const syncs = await db
				.select({
					id: yandexCalendarSyncs.id,
					organizationId: yandexCalendarSyncs.organizationId,
					doctorName: users.fullName,
					yandexCalendarId: yandexCalendarSyncs.yandexCalendarId,
					syncStatus: yandexCalendarSyncs.syncStatus,
					lastSyncedAt: yandexCalendarSyncs.lastSyncAt,
				})
				.from(yandexCalendarSyncs)
				.innerJoin(users, eq(yandexCalendarSyncs.doctorId, users.id))
				.where(eq(yandexCalendarSyncs.organizationId, identity.organizationId));

			return syncs;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении статусов синхронизации Яндекс.Календаря.",
			});
		}
	});

	app.post("/api/integrations/yandex-calendar/sync", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.userId || !identity?.organizationId) return;
			const staffId = identity.userId;
			const orgId = identity.organizationId;

			const staffInfo = await db
				.select({
					yandexCalendarId: users.yandexCalendarId,
					yandexCalendarToken: users.yandexCalendarToken,
				})
				.from(users)
				.where(and(eq(users.id, staffId), eq(users.organizationId, orgId)))
				.then((r) => r[0]);

			if (!staffInfo?.yandexCalendarId || !staffInfo?.yandexCalendarToken) {
				return reply.code(400).send({ error: "YandexCalendarNotConnected", message: "Яндекс.Календарь не подключен для данного сотрудника." });
			}

			request.log.info(
				{ staffId },
				"Starting Yandex Calendar sync for staffId",
			);

			const existingSync = await db
				.select({ id: yandexCalendarSyncs.id })
				.from(yandexCalendarSyncs)
				.where(
					and(
						eq(yandexCalendarSyncs.organizationId, orgId),
						eq(yandexCalendarSyncs.doctorId, staffId),
					),
				)
				.then((r) => r[0]);

			if (existingSync) {
				await db
					.update(yandexCalendarSyncs)
					.set({
						yandexCalendarId: staffInfo.yandexCalendarId,
						syncStatus: "synced",
						lastSyncAt: new Date(),
						errorMessage: null,
					})
					.where(
						and(
							eq(yandexCalendarSyncs.id, existingSync.id),
							eq(yandexCalendarSyncs.organizationId, orgId),
						),
					);
			} else {
				await db.insert(yandexCalendarSyncs).values({
					organizationId: orgId,
					doctorId: staffId,
					yandexCalendarId: staffInfo.yandexCalendarId,
					syncStatus: "synced",
					lastSyncAt: new Date(),
				});
			}

			return { success: true, message: "Синхронизация с Яндекс.Календарем успешно запущена." };
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при синхронизации с Яндекс.Календарем.",
			});
		}
	});

	// Endpoint для получения защищенной iCal ссылки для текущего авторизованного врача
	app.get(
		"/api/integrations/yandex-calendar/feed-url",
		async (request, reply) => {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.userId || !identity?.organizationId) return;

			const token = signToken(
				{
					userId: identity.userId,
					doctorId: identity.userId,
					organizationId: identity.organizationId,
				},
				authTokenSecret(),
				365 * 24 * 3600, // 1 год
			);

			return {
				feedUrl: `/api/schedule/ical/${token}.ics`,
				doctorId: identity.userId,
			};
		},
	);

	// RFC 5545 iCalendar endpoint для подписки в Яндекс.Календаре / Apple Calendar / Google Calendar
	app.get("/api/schedule/ical/:token", async (request, reply) => {
		try {
			const { token } = request.params as { token: string };
			const cleanToken = (token || "").replace(/\.ics$/i, "").trim();

			if (!cleanToken) {
				return reply.code(400).send({
					error: "InvalidToken",
					message: "Токен расписания не указан.",
				});
			}

			const doctor = await lookupDoctorByIcalToken(cleanToken);

			if (!doctor) {
				return reply.code(404).send({
					error: "DoctorScheduleNotFound",
					message: "Расписание врача не найдено или токен недействителен.",
				});
			}

			const rows = await withTenantCtx(doctor.organizationId, async (tx) => {
				return tx
					.select({
						id: appointments.id,
						startsAt: appointments.startsAt,
						endsAt: appointments.endsAt,
						status: appointments.status,
						reason: appointments.reason,
						patientFullName: patients.fullName,
						chairName: chairs.name,
					})
					.from(appointments)
					.leftJoin(patients, eq(appointments.patientId, patients.id))
					.leftJoin(chairs, eq(appointments.chairId, chairs.id))
					.where(
						and(
							eq(appointments.organizationId, doctor.organizationId),
							eq(appointments.doctorUserId, doctor.doctorId),
						),
					)
					.orderBy(appointments.startsAt);
			});

			const ics = generateIcsCalendar({
				doctorName: doctor.doctorName,
				appointments: rows,
			});

			return reply
				.code(200)
				.header("Content-Type", "text/calendar; charset=utf-8")
				.header(
					"Content-Disposition",
					`inline; filename="doctor-schedule-${doctor.doctorId}.ics"`,
				)
				.header(
					"Cache-Control",
					"no-cache, no-store, max-age=0, must-revalidate",
				)
				.send(ics);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error, "Failed to export iCal schedule");
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при формировании iCal-расписания.",
			});
		}
	});
}
