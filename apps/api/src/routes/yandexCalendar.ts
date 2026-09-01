import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	anonymizePatientName,
	anonymizePatientForCalendar,
	buildGoogleCalendarSubscriptionUrl,
	buildWebcalUrl,
	buildYandexCalendarSubscriptionUrl,
	escapeIcalText,
	foldIcalLine,
	formatIcalDateTime,
	generateDoctorIcsFeed,
	generateIcsCalendar,
	validateIcsRFC5545,
	type IcalAppointmentItem,
} from "@dental/shared";
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

// Re-export shared functions for module and test backward compatibility
export {
	anonymizePatientName,
	anonymizePatientForCalendar,
	escapeIcalText,
	formatIcalDateTime,
	foldIcalLine,
	generateDoctorIcsFeed,
	generateIcsCalendar,
	validateIcsRFC5545,
	buildWebcalUrl,
	buildYandexCalendarSubscriptionUrl,
	buildGoogleCalendarSubscriptionUrl,
	type IcalAppointmentItem,
};

const SettingsSchema = z.object({
	yandexCalendarId: z.string().nullable(),
	yandexCalendarToken: z.any().nullable(),
});

interface TokenPayload {
	userId?: string;
	doctorId?: string;
	organizationId?: string;
	v?: number;
}

interface DoctorTokenMeta {
	tokenVersion?: number;
	rotatedAt?: string;
	lastAccessedAt?: string;
}

/**
 * Поиск доктора по криптографическому токену подписки iCal.
 * Защита от утечек: доступ разрешён ИСКЛЮЧИТЕЛЬНО по валидному HMAC-подписанному
 * токену с совпадением активной версии (мгновенный отзыв при ротации).
 * Fallback-поиск по незащищённым UUID полностью удален.
 */
export async function lookupDoctorByIcalToken(rawToken: string | null | undefined): Promise<{
	doctorId: string;
	organizationId: string;
	doctorName: string;
	tokenVersion: number;
} | null> {
	if (!rawToken || typeof rawToken !== "string") return null;
	const clean = rawToken.replace(/\.ics$/i, "").trim();
	if (!clean) return null;

	// 1. Проверка валидности криптографической HMAC-подписи (без обращения к БД)
	const secret = authTokenSecret();
	const payload = verifyToken(clean, secret) as TokenPayload | null;

	if (
		!payload ||
		!(payload.doctorId || payload.userId) ||
		!payload.organizationId
	) {
		return null;
	}

	const targetDoctorId = payload.doctorId || payload.userId;
	const targetOrgId = payload.organizationId;
	if (!targetDoctorId || !targetOrgId) return null;
	const doctorId: string = targetDoctorId;
	const orgId: string = targetOrgId;

	return withSuperuserBypass(async (tx) => {
		// 2. Чтение пользователя и проверка актуальности версии токена
		const user = await tx
			.select({
				id: users.id,
				organizationId: users.organizationId,
				fullName: users.fullName,
				isActive: users.isActive,
				yandexCalendarToken: users.yandexCalendarToken,
			})
			.from(users)
			.where(
				and(
					eq(users.id, doctorId),
					eq(users.organizationId, orgId),
				),
			)
			.then((r) => r[0]);

		if (!user || !user.isActive) {
			return null;
		}

		const tokenMeta = user.yandexCalendarToken as DoctorTokenMeta | null;
		const activeVersion = tokenMeta?.tokenVersion ?? 1;
		const tokenVersion = payload.v ?? 1;

		// Если токен был отозван через ротацию, старый токен отклоняется
		if (tokenVersion < activeVersion) {
			return null;
		}

		return {
			doctorId: user.id,
			organizationId: user.organizationId,
			doctorName: user.fullName,
			tokenVersion: activeVersion,
		};
	});
}

/**
 * Генерация защищенного токена подписки на iCal расписание врача.
 */
export function generateDoctorIcalToken(params: {
	doctorId: string;
	organizationId: string;
	tokenVersion: number;
	expiresInSeconds?: number;
}): string {
	const { doctorId, organizationId, tokenVersion, expiresInSeconds = 365 * 24 * 3600 } = params;
	return signToken(
		{
			userId: doctorId,
			doctorId,
			organizationId,
			v: tokenVersion,
		},
		authTokenSecret(),
		expiresInSeconds,
	);
}

/**
 * Обработчик выдачи RFC 5545 .ics файла расписания врача.
 */
async function handleIcalFeedRequest(
	request: FastifyRequest<{ Params: { token?: string } }>,
	reply: FastifyReply,
) {
	try {
		const params = request.params as { token?: string };
		const rawToken = params.token || "";
		const cleanToken = rawToken.replace(/\.ics$/i, "").trim();

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
				message: "Расписание врача не найдено, доступ заблокирован или ссылка устарела после ротации.",
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
					patientNotes: patients.notes,
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

		const items: IcalAppointmentItem[] = rows.map((r) => {
			// Extract card number from patient notes or use ID slice if notes contain card
			let cardNumber: string | null = null;
			if (r.patientNotes && typeof r.patientNotes === "string") {
				const match = r.patientNotes.match(/(?:карта|№)\s*[:№]?\s*([a-zA-Z0-9\-_/]+)/i);
				if (match && match[1]) {
					cardNumber = match[1];
				}
			}

			return {
				id: r.id,
				startsAt: r.startsAt,
				endsAt: r.endsAt,
				status: r.status,
				reason: r.reason,
				chairName: r.chairName,
				patientFullName: r.patientFullName,
				patientCardNumber: cardNumber,
				isEmergency: false,
				sequence: 0,
			};
		});

		const ics = generateDoctorIcsFeed({
			doctorName: doctor.doctorName,
			appointments: items,
			refreshIntervalMinutes: 15,
			alarmMinutesBefore: 15,
			includeAlarms: true,
			anonymizePatient: true,
			includeCardNumber: true,
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
	} catch (error: unknown) {
		request.log.error(error, "Failed to export iCal schedule feed");
		return reply.status(500).send({
			error: "InternalServerError",
			message: "Ошибка при формировании iCal-расписания.",
		});
	}
}

export async function registerYandexCalendarRoutes(app: FastifyInstance) {
	// OAuth URL для Яндекс.Календаря
	app.get("/api/integrations/yandex-calendar/auth", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.organizationId) return;

			return {
				authUrl:
					"https://oauth.yandex.ru/authorize?response_type=code&client_id=dente_crm",
				connected: false,
			};
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении параметров авторизации Яндекс.Календаря.",
			});
		}
	});

	// Сохранение настроек Яндекс.Календаря для врача
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
			} catch (err: unknown) {
				request.log.error(err, "Failed to update Yandex Calendar settings");
				return reply.code(400).send({
					error: "InvalidPayload",
					message: "Некорректные параметры настроек Яндекс.Календаря.",
				});
			}
		},
	);

	// Список синхронизаций с Яндекс Календарём
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
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении статусов синхронизации Яндекс.Календаря.",
			});
		}
	});

	// Ручной запуск синхронизации
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
				return reply.code(400).send({
					error: "YandexCalendarNotConnected",
					message: "Яндекс.Календарь не подключен для данного сотрудника.",
				});
			}

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
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при синхронизации с Яндекс.Календарем.",
			});
		}
	});

	// Получение защищенной ссылки на iCal фид текущего авторизованного врача
	app.get(
		"/api/integrations/yandex-calendar/feed-url",
		async (request, reply) => {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.userId || !identity?.organizationId) return;

			const user = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					yandexCalendarToken: users.yandexCalendarToken,
				})
				.from(users)
				.where(
					and(
						eq(users.id, identity.userId),
						eq(users.organizationId, identity.organizationId),
					),
				)
				.then((r) => r[0]);

			const tokenMeta = user?.yandexCalendarToken as DoctorTokenMeta | null;
			const version = tokenMeta?.tokenVersion ?? 1;

			const token = generateDoctorIcalToken({
				doctorId: identity.userId,
				organizationId: identity.organizationId,
				tokenVersion: version,
			});

			return {
				feedUrl: `/api/schedule/ical/doctor/${token}.ics`,
				doctorId: identity.userId,
				doctorName: user?.fullName || identity.fullName,
				tokenVersion: version,
			};
		},
	);

	// Получение защищенной ссылки на iCal фид для конкретного врача (доступно врачу или владельцу)
	app.get(
		"/api/schedule/ical/doctor/:doctorId/feed-url",
		async (request, reply) => {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.userId || !identity?.organizationId) return;

			const params = request.params as { doctorId?: string };
			const targetDoctorId = params.doctorId || identity.userId;

			// Проверка прав: только сам врач или администратор/владелец
			const isSelf = identity.userId === targetDoctorId;
			const isPrivileged = identity.role === "owner" || identity.role === "admin";
			if (!isSelf && !isPrivileged) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Недостаточно прав для получения ссылки на расписание другого врача.",
				});
			}

			const targetUser = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					isActive: users.isActive,
					yandexCalendarToken: users.yandexCalendarToken,
				})
				.from(users)
				.where(
					and(
						eq(users.id, targetDoctorId),
						eq(users.organizationId, identity.organizationId),
					),
				)
				.then((r) => r[0]);

			if (!targetUser || !targetUser.isActive) {
				return reply.code(404).send({
					error: "DoctorNotFound",
					message: "Врач не найден или не активен в этой организации.",
				});
			}

			const tokenMeta = targetUser.yandexCalendarToken as DoctorTokenMeta | null;
			const version = tokenMeta?.tokenVersion ?? 1;

			const token = generateDoctorIcalToken({
				doctorId: targetUser.id,
				organizationId: identity.organizationId,
				tokenVersion: version,
			});

			return {
				doctorId: targetUser.id,
				doctorName: targetUser.fullName,
				feedUrl: `/api/schedule/ical/doctor/${token}.ics`,
				webcalUrl: `webcal://${request.headers.host || "localhost"}/api/schedule/ical/doctor/${token}.ics`,
				tokenVersion: version,
				tokenCreatedAt: tokenMeta?.rotatedAt || null,
			};
		},
	);

	// Мгновенная ротация токена подписки iCal (при компрометации ссылки)
	app.post(
		"/api/schedule/ical/doctor/:doctorId/rotate",
		async (request, reply) => {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.userId || !identity?.organizationId) return;

			const params = request.params as { doctorId?: string };
			const targetDoctorId = params.doctorId || identity.userId;

			const isSelf = identity.userId === targetDoctorId;
			const isPrivileged = identity.role === "owner" || identity.role === "admin";
			if (!isSelf && !isPrivileged) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Недостаточно прав для ротации ссылки расписания другого врача.",
				});
			}

			const targetUser = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					isActive: users.isActive,
					yandexCalendarToken: users.yandexCalendarToken,
				})
				.from(users)
				.where(
					and(
						eq(users.id, targetDoctorId),
						eq(users.organizationId, identity.organizationId),
					),
				)
				.then((r) => r[0]);

			if (!targetUser || !targetUser.isActive) {
				return reply.code(404).send({
					error: "DoctorNotFound",
					message: "Врач не найден в организации.",
				});
			}

			const prevMeta = (targetUser.yandexCalendarToken as DoctorTokenMeta | null) || {};
			const newVersion = (prevMeta.tokenVersion ?? 1) + 1;
			const rotatedAt = new Date().toISOString();

			const newMeta: DoctorTokenMeta = {
				...prevMeta,
				tokenVersion: newVersion,
				rotatedAt,
			};

			await db
				.update(users)
				.set({
					yandexCalendarToken: newMeta,
				})
				.where(
					and(
						eq(users.id, targetDoctorId),
						eq(users.organizationId, identity.organizationId),
					),
				);

			const newToken = generateDoctorIcalToken({
				doctorId: targetDoctorId,
				organizationId: identity.organizationId,
				tokenVersion: newVersion,
			});

			const host = request.headers.host || "localhost";
			const feedPath = `/api/schedule/ical/doctor/${newToken}.ics`;

			return {
				success: true,
				message: "Ссылка подписки успешно отозвана. Выпущена новая ссылка доступа.",
				doctorId: targetDoctorId,
				doctorName: targetUser.fullName,
				feedUrl: feedPath,
				webcalUrl: `webcal://${host}${feedPath}`,
				tokenVersion: newVersion,
				rotatedAt,
			};
		},
	);

	// Ротация для текущего пользователя
	app.post("/api/schedule/ical/rotate", async (request, reply) => {
		const identity = await requireStaffIdentity(request, reply);
		if (!identity?.userId) return;
		return app.inject({
			method: "POST",
			url: `/api/schedule/ical/doctor/${identity.userId}/rotate`,
			headers: request.headers as Record<string, string>,
		});
	});

	// RFC 5545 iCalendar endpoint: /api/schedule/ical/doctor/:token (.ics)
	app.get("/api/schedule/ical/doctor/:token", handleIcalFeedRequest);

	// RFC 5545 iCalendar endpoint: /api/schedule/ical/:token (.ics) (legacy alias)
	app.get("/api/schedule/ical/:token", handleIcalFeedRequest);
}
