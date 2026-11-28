import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { shiftCalendarDay, todayDateKeyInTimeZone } from "@dental/shared";
import { z } from "zod";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { definePublicRoute } from "../../core/routeFactories.js";
import { withSavepoint, withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	appointments,
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	patients,
	portalOtpCodes,
	users,
	visits,
} from "../../db/schema.js";
import {
	clinicTimeZone,
	DEFAULT_CLINIC_TIME_ZONE,
} from "../../services/reports/managerReports/timezone.js";
import {
	isDbConnectionError,
	TelegramReferralLoyaltyService,
} from "../../services/telegram/TelegramReferralLoyaltyService.js";
import { TelegramTokenVault } from "../../services/telegram/TelegramTokenVault.js";
import { signToken, verifyCredential } from "../../utils/cryptoHelper.js";
import { hashTelegramChatFingerprint } from "../../utils/telegramChatHash.js";
import { bookingVerificationEngine } from "../publicBooking/smsVerificationAndSpamGate.js";
import { extractPortalPatient } from "../portal/portalAuthStore.js";
import { PORTAL_TOKEN_KIND, PORTAL_TOKEN_TTL_SECONDS } from "../portal/types.js";
import { calculateAvailableSlots } from "../publicBooking/bookingModules/publicBookingSlotEngine.js";
import {
	toothComplaintSchema,
	webAppBookingSchema,
	webAppSessionSchema,
} from "./telegramLoyaltySchemas.js";

const webAppSlotsQuerySchema = z.object({
	organizationId: z.string().uuid("Некорректный идентификатор организации (ожидается UUID)"),
});

async function resolveWebAppBotToken(organizationId: string): Promise<string | null> {
	try {
		const [botConfig] = await withTenantReadCtx(organizationId, async (tx) =>
			tx
				.select({ tokenSecretRef: denteTelegramBotConfigs.tokenSecretRef })
				.from(denteTelegramBotConfigs)
				.where(
					and(
						eq(denteTelegramBotConfigs.organizationId, organizationId),
						eq(denteTelegramBotConfigs.isActive, true),
					),
				)
				.orderBy(desc(denteTelegramBotConfigs.updatedAt))
				.limit(1),
		);
		const dbToken = TelegramTokenVault.resolveOperationalToken(
			botConfig?.tokenSecretRef,
			organizationId,
		);
		if (dbToken) return dbToken;
	} catch (err) {
		if (!isDbConnectionError(err)) {
			throw err;
		}
	}

	const envToken = process.env.TELEGRAM_BOT_TOKEN || process.env.DENTE_TELEGRAM_BOT_TOKEN;
	if (envToken) return envToken;
	if (process.env.NODE_ENV === "test") return "test_bot_token";
	return null;
}

async function authorizeWebAppPatientAction(
	request: FastifyRequest,
	reply: FastifyReply,
	params: {
		organizationId: string;
		patientId: string;
		familyMemberPatientId?: string | undefined;
		bodyInitData?: string | undefined;
	},
): Promise<{ callerPatientId: string } | null> {
	const portalAuth = await extractPortalPatient(request);
	let callerPatientId: string | null = null;

	if (portalAuth) {
		if (portalAuth.organizationId !== params.organizationId) {
			reply.status(403).send({
				error: "Forbidden",
				message: "Токен портала принадлежит другой клинике.",
			});
			return null;
		}
		callerPatientId = portalAuth.patientId;
	} else {
		const headerInitData =
			typeof request.headers["x-telegram-init-data"] === "string"
				? request.headers["x-telegram-init-data"]
				: undefined;
		const rawInitData = headerInitData || params.bodyInitData;
		if (!rawInitData) {
			reply.status(401).send({
				error: "Unauthorized",
				message: "Требуется авторизация Telegram WebApp или токен личного кабинета.",
			});
			return null;
		}

		const botToken = await resolveWebAppBotToken(params.organizationId);
		if (!botToken) {
			reply.status(503).send({
				error: "TELEGRAM_INTEGRATION_NOT_CONFIGURED",
				message: "Интеграция с Telegram не сконфигурирована на сервере.",
			});
			return null;
		}

		const validation = TelegramReferralLoyaltyService.validateTelegramWebAppData(
			rawInitData,
			botToken,
			{ allowDevBypass: false },
		);
		if (!validation.isValid || !validation.user) {
			reply.status(401).send({
				error: "Unauthorized",
				message: "Недействительная подпись данных Telegram WebApp (HMAC-SHA256).",
			});
			return null;
		}

		const tgUserId = String(validation.user.id);
		const chatFp = hashTelegramChatFingerprint(tgUserId);

		const linkedPatientId = await withTenantReadCtx(params.organizationId, async (tx) => {
			const [byProfile] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, params.organizationId),
						sql`${patients.administrativeProfile}->>'telegramUserId' = ${tgUserId}`,
					),
				)
				.limit(1);
			if (byProfile) return byProfile.id;

			const [byChatLink] = await tx
				.select({
					subjectType: denteTelegramChatLinks.subjectType,
					subjectId: denteTelegramChatLinks.subjectId,
				})
				.from(denteTelegramChatLinks)
				.where(
					and(
						eq(denteTelegramChatLinks.organizationId, params.organizationId),
						eq(denteTelegramChatLinks.chatFingerprint, chatFp),
						eq(denteTelegramChatLinks.status, "active"),
					),
				)
				.limit(1);

			return byChatLink?.subjectType === "patient" ? byChatLink.subjectId : null;
		});

		if (!linkedPatientId) {
			reply.status(403).send({
				error: "Forbidden",
				message: "Профиль Telegram не привязан к карте пациента в этой клинике.",
			});
			return null;
		}
		callerPatientId = linkedPatientId;
	}

	const targetsToVerify = [
		params.patientId,
		...(params.familyMemberPatientId ? [params.familyMemberPatientId] : []),
	];
	const needsFamilyCheck = targetsToVerify.some((targetId) => targetId !== callerPatientId);
	if (needsFamilyCheck) {
		const familyProfile = await TelegramReferralLoyaltyService.getFamilyProfile(
			params.organizationId,
			callerPatientId,
		);
		const allowedIds = new Set(familyProfile.members.map((m) => m.patientId));
		allowedIds.add(callerPatientId);
		const unauthorized = targetsToVerify.some((targetId) => !allowedIds.has(targetId));
		if (unauthorized) {
			reply.status(403).send({
				error: "Forbidden",
				message: "Доступ запрещён: указанный пациент не принадлежит вам или вашей семейной группе.",
			});
			return null;
		}
	}

	return { callerPatientId };
}

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
	definePublicRoute(app, {
		method: "POST",
		path: "/api/telegram/webapp/session",
		handler: async ({ request, reply }) => {
		const parsed = webAppSessionSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры сессии WebApp.",
				details: parsed.error.issues,
			});
		}

		const { initData, organizationId, patientId, phone, verificationCode } = parsed.data;
		const botToken = await resolveWebAppBotToken(organizationId);

		if (!botToken) {
			return reply.status(503).send({
				error: "TELEGRAM_INTEGRATION_NOT_CONFIGURED",
				message: "Интеграция с Telegram не сконфигурирована на сервере.",
			});
		}

		const validation = TelegramReferralLoyaltyService.validateTelegramWebAppData(
			initData,
			botToken,
			{
				allowDevBypass: false,
			},
		);
		if (!validation.isValid || !validation.user) {
			return reply.status(401).send({
				error: "Unauthorized",
				message: "Недействительная подпись данных Telegram WebApp (HMAC-SHA256).",
			});
		}
		const tgUser = validation.user;

		try {
			return await withTenantWriteCtx(organizationId, async (tx) => {
				let authenticatedPatient: typeof patients.$inferSelect | undefined;

				async function verifyAndLinkPatient(
					candidate: typeof patients.$inferSelect,
				): Promise<{ ok: true } | { ok: false; status: number; error: string; message: string }> {
					const currentProfile = getAdministrativeProfile(candidate.administrativeProfile);
					const linkedTgId = currentProfile.telegramUserId;

					if (linkedTgId && String(linkedTgId) === String(tgUser.id)) {
						return { ok: true };
					}

					if (linkedTgId && String(linkedTgId) !== String(tgUser.id)) {
						return {
							ok: false,
							status: 403,
							error: "Forbidden",
							message: "Доступ запрещен: данный профиль пациента привязан к другому Telegram аккаунту.",
						};
					}

					// [SEV-1 BOLA FIX] Если Telegram еще не привязан — требуем обязательный SMS-код верификации
					if (!verificationCode) {
						return {
							ok: false,
							status: 403,
							error: "VerificationRequired",
							message: "Для первой привязки Telegram-аккаунта к профилю пациента требуется проверочный SMS-код.",
						};
					}

					let isOtpValid = false;
					const now = new Date();

					try {
						await withSavepoint(tx, async (spTx) => {
							const activeOtps = await spTx
								.select({ id: portalOtpCodes.id, codeHash: portalOtpCodes.codeHash })
								.from(portalOtpCodes)
								.where(
									and(
										eq(portalOtpCodes.organizationId, organizationId),
										eq(portalOtpCodes.patientId, candidate.id),
										eq(portalOtpCodes.deliveryStatus, "sent"),
										isNull(portalOtpCodes.consumedAt),
										gte(portalOtpCodes.expiresAt, now),
									),
								)
								.orderBy(desc(portalOtpCodes.createdAt))
								.limit(1);

							if (activeOtps.length > 0 && activeOtps[0]) {
								const candidateOtp = activeOtps[0];
								if (await verifyCredential(verificationCode, candidateOtp.codeHash)) {
									isOtpValid = true;
									await spTx
										.update(portalOtpCodes)
										.set({ consumedAt: now })
										.where(eq(portalOtpCodes.id, candidateOtp.id));
								}
							}
						});
					} catch (err) {
						request.log.warn(
							{ err },
							"[telegramWebAppSession] DB portal OTP verification failed inside savepoint, falling back to in-memory check",
						);
					}

					if (!isOtpValid) {
						const targetPhone = candidate.phone || phone || "";
						const otpCheck = bookingVerificationEngine.verifyPhoneOtp(
							targetPhone,
							verificationCode,
							organizationId,
						);
						if (otpCheck.valid) {
							isOtpValid = true;
						}
					}

					if (!isOtpValid) {
						return {
							ok: false,
							status: 403,
							error: "VerificationFailed",
							message: "Неверный или истёкший проверочный SMS-код.",
						};
					}

					await tx
						.update(patients)
						.set({
							administrativeProfile: {
								...currentProfile,
								telegramUserId: String(tgUser.id),
								telegramUsername: tgUser.username ?? null,
							},
						})
						.where(eq(patients.id, candidate.id));

					return { ok: true };
				}

				// 1. Поиск по telegramUserId
				const [pByTg] = await tx
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
					const [pByPhone] = await tx
						.select()
						.from(patients)
						.where(and(eq(patients.organizationId, organizationId), eq(patients.phone, phone.trim())))
						.limit(1);
					if (pByPhone) {
						const verifyResult = await verifyAndLinkPatient(pByPhone);
						if (!verifyResult.ok) {
							return reply.status(verifyResult.status).send({
								error: verifyResult.error,
								message: verifyResult.message,
							});
						}
						authenticatedPatient = pByPhone;
					}
				}

				// 3. Поиск по patientId с BOLA-проверкой
				if (!authenticatedPatient && patientId) {
					const [pById] = await tx
						.select()
						.from(patients)
						.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
						.limit(1);
					if (pById) {
						const verifyResult = await verifyAndLinkPatient(pById);
						if (!verifyResult.ok) {
							return reply.status(verifyResult.status).send({
								error: verifyResult.error,
								message: verifyResult.message,
							});
						}
						authenticatedPatient = pById;
					}
				}

				// 4. Если пациент не найден — создаем гостевой профиль для этого tgUser
				if (!authenticatedPatient) {
					const guestName = tgUser?.first_name || "Пациент Telegram";
					const [created] = await tx
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
					const [pTarget] = await tx
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
				const upcomingAppointments = await tx
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
				const pastVisits = await tx
					.select({
						id: visits.id,
						startTime: visits.createdAt,
						status: visits.status,
						doctorName: sql<string>`COALESCE(${users.fullName}, 'Лечащий врач')`,
						doctorSpecialty: sql<string>`'Врач-стоматолог'`,
						diagnosis: visits.diagnosis,
					})
					.from(visits)
					.leftJoin(appointments, eq(visits.appointmentId, appointments.id))
					.leftJoin(users, eq(appointments.doctorUserId, users.id))
					.where(and(eq(visits.organizationId, organizationId), eq(visits.patientId, targetPatient.id)))
					.orderBy(sql`${visits.createdAt} DESC`)
					.limit(10);

				const portalToken = signToken(
					{
						sub: targetPatient.id,
						organizationId,
						kind: PORTAL_TOKEN_KIND,
					},
					requireAuthTokenSecret(),
					PORTAL_TOKEN_TTL_SECONDS,
				);

				return reply.send({
					success: true,
					authenticated: true,
					token: portalToken,
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
		},
	});

	/**
	 * 2. Приём жалобы на зуб из 3D/2D зубной формулы («Беспокоит зуб 16»):
	 */
	definePublicRoute(app, {
		method: "POST",
		path: "/api/telegram/webapp/complaint",
		handler: async ({ request, reply }) => {
		const parsed = toothComplaintSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры жалобы.",
				details: parsed.error.issues,
			});
		}

		const {
			organizationId,
			patientId,
			toothNumber,
			symptom,
			painIntensity,
			notes,
			urgency,
			initData,
		} = parsed.data;

		const authorized = await authorizeWebAppPatientAction(request, reply, {
			organizationId,
			patientId,
			bodyInitData: initData,
		});
		if (!authorized) return;

		const result = await TelegramReferralLoyaltyService.submitToothComplaint(organizationId, patientId, {
			toothNumber,
			symptom,
			painIntensity,
			notes,
			urgency,
		});

		return reply.send(result);
		},
	});

	/**
	 * 3. Доступные слоты врачей на ближайшую неделю для онлайн-календаря WebApp:
	 */
	definePublicRoute(app, {
		method: "GET",
		path: "/api/telegram/webapp/slots",
		handler: async ({ request, reply }) => {
		const queryParse = webAppSlotsQuerySchema.safeParse(request.query);
		if (!queryParse.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный organizationId (ожидается UUID).",
				details: queryParse.error.issues,
			});
		}
		const { organizationId } = queryParse.data;

		try {
			return await withTenantReadCtx(organizationId, async (tx) => {
				const doctors = await tx
					.select({
						id: users.id,
						fullName: users.fullName,
					})
					.from(users)
					.where(
						and(
							eq(users.organizationId, organizationId),
							eq(users.role, "doctor"),
							eq(users.isActive, true),
						),
					)
					.limit(10);

				const zone = (await clinicTimeZone(organizationId, tx)) || DEFAULT_CLINIC_TIME_ZONE;
				const todayKey = todayDateKeyInTimeZone(zone);
				const daysRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

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

				for (let i = 0; i < 7; i++) {
					const dateStr = shiftCalendarDay(todayKey, i);
					const weekdayIndex = new Date(`${dateStr}T12:00:00.000Z`).getUTCDay();
					const dayOfWeek = daysRu[weekdayIndex] || "";

					let daySlots: Array<{ time: string; availableDoctorIds: string[] }> = [];
					if (doctors.length > 0) {
						try {
							const calcResult = await calculateAvailableSlots(tx, {
								organizationId,
								date: dateStr,
							});
							if (calcResult.success) {
								daySlots = calcResult.slots;
							}
						} catch (slotErr) {
							request.log.warn(
								{ err: slotErr, dateStr },
								"[telegramWebAppSession] Failed to calculate slots for day",
							);
						}
					}

					const doctorsWithSlots = doctors.map((doc) => ({
						doctorId: doc.id,
						doctorName: doc.fullName,
						specialty: "Врач-стоматолог",
						slots: daySlots
							.filter((slot) => slot.availableDoctorIds.includes(doc.id))
							.map((slot) => slot.time),
					}));

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
		},
	});

	/**
	 * 4. Запись на приём из Telegram WebApp:
	 */
	definePublicRoute(app, {
		method: "POST",
		path: "/api/telegram/webapp/book",
		handler: async ({ request, reply }) => {
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
			initData,
		} = parsed.data;

		const authorized = await authorizeWebAppPatientAction(request, reply, {
			organizationId,
			patientId,
			familyMemberPatientId,
			bodyInitData: initData,
		});
		if (!authorized) return;

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

		if (!result.success) {
			const statusCode =
				"errorCode" in result && result.errorCode === "APPOINTMENT_DOCTOR_REQUIRED"
					? 400
					: 422;
			return reply.status(statusCode).send(result);
		}

		return reply.send(result);
		},
	});
}
