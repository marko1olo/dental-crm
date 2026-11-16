import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { appointments, patients, users, visits } from "../../db/schema.js";
import {
	isDbConnectionError,
	TelegramReferralLoyaltyService,
} from "../../services/telegram/TelegramReferralLoyaltyService.js";
import { calculateAvailableSlots } from "../publicBooking/bookingModules/publicBookingSlotEngine.js";
import {
	toothComplaintSchema,
	webAppBookingSchema,
	webAppSessionSchema,
} from "./telegramLoyaltySchemas.js";

interface TelegramPatientAdministrativeProfile {
	telegramUserId?: string | undefined;
	[key: string]: unknown;
}

function getAdministrativeProfile(profile: unknown): TelegramPatientAdministrativeProfile {
	if (profile && typeof profile === "object" && !Array.isArray(profile)) {
		return profile as TelegramPatientAdministrativeProfile;
	}
	return {};
}

/**
 * Регистрация маршрутов сессии и бронирования Telegram WebApp
 */
export async function registerTelegramWebAppSessionRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 1. Сессия Telegram WebApp Mini App:
	 * Валидирует initData (HMAC-SHA256) или phone/patientId,
	 * возвращает профиль пациента, баланс бонусов, семейную группу,
	 * ближайшие записи и историю визитов для легкого мобильного экрана.
	 */
	app.post("/api/telegram/webapp/session", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = webAppSessionSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры сессии WebApp.",
				details: parsed.error.issues,
			});
		}

		const { initData, organizationId, patientId, phone } = parsed.data;
		const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.DENTE_TELEGRAM_BOT_TOKEN || "test_bot_token";

		const validation = TelegramReferralLoyaltyService.validateTelegramWebAppData(initData, botToken, {
			allowDevBypass: process.env.NODE_ENV === "test" || !process.env.TELEGRAM_BOT_TOKEN,
		});
		if (!validation.isValid || !validation.user) {
			return reply.status(401).send({
				error: "Unauthorized",
				message: "Недействительная подпись данных Telegram WebApp (HMAC-SHA256).",
			});
		}
		const tgUser = validation.user;

		try {
			return await withTenantCtx(organizationId, async () => {
				let authenticatedPatient: typeof patients.$inferSelect | undefined;

				// 1. Поиск по telegramUserId
				const [pByTg] = await db
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							sql`${patients.administrativeProfile}->>'telegramUserId' = ${String(tgUser.id)}`,
						),
					)
					.limit(1);
				authenticatedPatient = pByTg;

				// 2. Поиск по телефону (если передан)
				if (!authenticatedPatient && phone) {
					const [pByPhone] = await db
						.select()
						.from(patients)
						.where(and(eq(patients.organizationId, organizationId), eq(patients.phone, phone.trim())))
						.limit(1);
					if (pByPhone) {
						authenticatedPatient = pByPhone;
						const currentProfile = getAdministrativeProfile(pByPhone.administrativeProfile);
						await db
							.update(patients)
							.set({
								administrativeProfile: {
									...currentProfile,
									telegramUserId: String(tgUser.id),
								},
							})
							.where(eq(patients.id, pByPhone.id));
					}
				}

				// 3. Поиск по patientId с BOLA-проверкой
				if (!authenticatedPatient && patientId) {
					const [pById] = await db
						.select()
						.from(patients)
						.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
						.limit(1);
					if (pById) {
						const currentProfile = getAdministrativeProfile(pById.administrativeProfile);
						const linkedTgId = currentProfile.telegramUserId;
						if (linkedTgId && String(linkedTgId) !== String(tgUser.id)) {
							return reply.status(403).send({
								error: "Forbidden",
								message: "Доступ запрещен: данный профиль пациента привязан к другому Telegram аккаунту.",
							});
						}
						authenticatedPatient = pById;
						if (!linkedTgId) {
							await db
								.update(patients)
								.set({
									administrativeProfile: {
										...currentProfile,
										telegramUserId: String(tgUser.id),
									},
								})
								.where(eq(patients.id, pById.id));
						}
					}
				}

				// 4. Если пациент не найден — создаем гостевой профиль для этого tgUser
				if (!authenticatedPatient) {
					const guestName = tgUser?.first_name || "Пациент Telegram";
					const [created] = await db
						.insert(patients)
						.values({
							organizationId,
							fullName: guestName,
							phone: phone || null,
							administrativeProfile: { telegramUserId: String(tgUser.id) },
						})
						.returning();
					authenticatedPatient = created;
				}

				if (!authenticatedPatient) {
					return reply.status(404).send({ error: "PatientNotFound", message: "Пациент не найден." });
				}

				// 5. BOLA защита: переключение на целевой профиль (например, ребенка в семье)
				let targetPatient = authenticatedPatient;
				if (patientId && patientId !== authenticatedPatient.id) {
					const familyProfile = await TelegramReferralLoyaltyService.getFamilyProfile(organizationId, authenticatedPatient.id);
					const isFamilyMember = familyProfile.members.some((m) => m.patientId === patientId);
					if (!isFamilyMember) {
						return reply.status(403).send({
							error: "Forbidden",
							message: "Доступ запрещен: запрошенный профиль не принадлежит вам или вашей семейной группе.",
						});
					}
					const [pTarget] = await db
						.select()
						.from(patients)
						.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
						.limit(1);
					if (!pTarget) {
						return reply.status(404).send({ error: "PatientNotFound", message: "Запрошенный пациент не найден." });
					}
					targetPatient = pTarget;
				}

				// Получаем семейный профиль
				const familyProfile = await TelegramReferralLoyaltyService.getFamilyProfile(organizationId, targetPatient.id);

				// Получаем предстоящие записи
				const upcomingAppointments = await db
					.select({
						id: appointments.id,
						doctorId: appointments.doctorUserId,
						doctorName: users.fullName,
						doctorSpecialty: sql<string>`'Врач-стоматолог'`,
						startTime: appointments.startsAt,
						endTime: appointments.endsAt,
						status: appointments.status,
						notes: appointments.comment,
					})
					.from(appointments)
					.leftJoin(users, eq(appointments.doctorUserId, users.id))
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							eq(appointments.patientId, targetPatient.id),
							sql`${appointments.status} IN ('planned', 'confirmed')`,
						),
					)
					.orderBy(appointments.startsAt)
					.limit(5);

				// Прошедшие визиты
				const pastVisits = await db
					.select({
						id: visits.id,
						startTime: visits.createdAt,
						status: visits.status,
						doctorName: sql<string>`'Лечащий врач'`,
						doctorSpecialty: sql<string>`'Врач-стоматолог'`,
						diagnosis: visits.diagnosis,
					})
					.from(visits)
					.where(and(eq(visits.organizationId, organizationId), eq(visits.patientId, targetPatient.id)))
					.orderBy(sql`${visits.createdAt} DESC`)
					.limit(10);

				return reply.send({
					success: true,
					authenticated: true,
					patient: {
						id: targetPatient.id,
						fullName: targetPatient.fullName,
						phone: targetPatient.phone,
						birthDate: targetPatient.birthDate,
						bonusBalanceRub: familyProfile.members.find((m) => m.patientId === targetPatient?.id)?.activeBonusPoints || 0,
					},
					family: familyProfile,
					upcomingAppointments,
					pastVisits,
				});
			});
		} catch (err) {
			if (isDbConnectionError(err)) {
				return reply.status(503).send({
					error: "DB_CONNECTION_FAILED",
					message: "Сервер базы данных временно недоступен. Пожалуйста, повторите попытку через минуту.",
				});
			}
			throw err;
		}
	});

	/**
	 * 2. Приём жалобы на зуб из 3D/2D зубной формулы («Беспокоит зуб 16»):
	 */
	app.post("/api/telegram/webapp/complaint", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = toothComplaintSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры жалобы.",
				details: parsed.error.issues,
			});
		}

		const { organizationId, patientId, toothNumber, symptom, painIntensity, notes, urgency } = parsed.data;

		const result = await TelegramReferralLoyaltyService.submitToothComplaint(organizationId, patientId, {
			toothNumber,
			symptom,
			painIntensity,
			notes,
			urgency,
		});

		return reply.send(result);
	});

	/**
	 * 3. Доступные слоты врачей на ближайшую неделю для онлайн-календаря WebApp:
	 */
	app.get("/api/telegram/webapp/slots", async (request: FastifyRequest, reply: FastifyReply) => {
		const { organizationId } = request.query as { organizationId?: string };
		if (!organizationId) {
			return reply.status(400).send({ error: "MissingOrgId", message: "organizationId обязателен." });
		}

		try {
			return await withTenantCtx(organizationId, async (tx) => {
				const doctors = await tx
					.select({
						id: users.id,
						fullName: users.fullName,
					})
					.from(users)
					.where(and(eq(users.organizationId, organizationId), eq(users.isActive, true)))
					.limit(10);

				const weekSlots: Array<{
					date: string;
					dayOfWeek: string;
					doctors: Array<{
						doctorId: string;
						doctorName: string;
						specialty: string | null;
						slots: string[];
					}>;
				}> = [];

				const daysRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

				for (let i = 0; i < 7; i++) {
					const d = new Date();
					d.setDate(d.getDate() + i);
					const dateStr = d.toISOString().split("T")[0] || "";
					const dayOfWeek = daysRu[d.getDay()] || "";

					const doctorsWithSlots = await Promise.all(
						doctors.map(async (doc) => {
							try {
								const calcResult = await calculateAvailableSlots(tx, {
									organizationId,
									date: dateStr,
									requestedDoctorId: doc.id,
								});
								const slots = calcResult.success ? calcResult.slots.map((s) => s.time) : [];
								return {
									doctorId: doc.id,
									doctorName: doc.fullName,
									specialty: "Врач-стоматолог",
									slots,
								};
							} catch {
								return {
									doctorId: doc.id,
									doctorName: doc.fullName,
									specialty: "Врач-стоматолог",
									slots: [],
								};
							}
						}),
					);

					weekSlots.push({
						date: dateStr,
						dayOfWeek,
						doctors: doctorsWithSlots,
					});
				}

				return reply.send({ success: true, schedule: weekSlots });
			});
		} catch (err) {
			if (isDbConnectionError(err)) {
				return reply.status(503).send({
					error: "DB_CONNECTION_FAILED",
					message: "Сервер базы данных временно недоступен. Пожалуйста, повторите попытку через минуту.",
				});
			}
			throw err;
		}
	});

	/**
	 * 4. Запись на приём из Telegram WebApp:
	 */
	app.post("/api/telegram/webapp/book", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = webAppBookingSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры записи.",
				details: parsed.error.issues,
			});
		}

		const {
			organizationId,
			patientId,
			doctorId,
			date,
			time,
			serviceName,
			familyMemberPatientId,
			complaintNotes,
		} = parsed.data;

		const result = await TelegramReferralLoyaltyService.bookAppointmentFromWebApp(
			organizationId,
			patientId,
			{
				doctorId,
				date,
				time,
				serviceName,
				familyMemberPatientId,
				complaintNotes,
			},
		);

		return reply.send(result);
	});
}
