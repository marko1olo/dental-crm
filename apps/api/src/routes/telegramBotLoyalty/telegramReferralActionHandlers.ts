import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { withTenantReadCtx } from "../../db/rls.js";
import {
	appointments,
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	patients,
} from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { extractPortalPatient } from "../portal/portalAuthStore.js";
import { TelegramReferralLoyaltyService } from "../../services/telegram/TelegramReferralLoyaltyService.js";
import { TelegramTokenVault } from "../../services/telegram/TelegramTokenVault.js";
import { isDbConnectionError } from "../../services/telegram/referralLoyalty/webAppValidator.js";
import { hashTelegramChatFingerprint } from "../../utils/telegramChatHash.js";
import { isExplicitlyUnguardedControlPlaneAllowed } from "../telegram/telegramControlPlaneGuard.js";
import {
	familyConfirmSchema,
	npsSubmitSchema,
	referralProcessSchema,
} from "./telegramLoyaltySchemas.js";

const logger = createApiLogger("telegramReferralActionHandlers");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Проверяет принадлежность пациента к указанной организации внутри RLS-транзакции.
 */
async function ensurePatientBelongsToOrg(
	orgId: string,
	patientId: string,
	reply: FastifyReply,
): Promise<boolean> {
	try {
		const [patient] = await withTenantReadCtx(orgId, async (tx) =>
			tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
				.limit(1),
		);
		if (!patient) {
			reply.status(404).send({ error: "PatientNotFound", message: "Пациент не найден." });
			return false;
		}
		return true;
	} catch (err) {
		if (isDbConnectionError(err) && (process.env.NODE_ENV === "test" || process.env.DENTAL_STATE_PERSISTENCE === "off")) {
			logger.warn({ err: safeLogError(err), orgId, patientId }, "ensurePatientBelongsToOrg DB unavailable in test mode");
			return true;
		}
		throw err;
	}
}

/**
 * Валидирует доступ сотрудника клиники или сессию Telegram WebApp с BOLA-защитой.
 */
async function resolveAuthorizedOrg(
	request: FastifyRequest,
	reply: FastifyReply,
	options?: { allowTelegramWebApp?: boolean; requiredPatientId?: string },
): Promise<{ organizationId: string; tgUserId?: number } | null> {
	if (options?.requiredPatientId && !UUID_REGEX.test(options.requiredPatientId)) {
		reply.status(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор пациента (ожидается UUID).",
		});
		return null;
	}

	// A. Авторизованный сотрудник клиники (подписанный JWT)
	const identity = getRequestIdentity(request);
	if (identity.organizationId && identity.verified) {
		if (options?.requiredPatientId) {
			const ok = await ensurePatientBelongsToOrg(identity.organizationId, options.requiredPatientId, reply);
			if (!ok) return null;
		}
		return { organizationId: identity.organizationId };
	}

	// A2. Авторизованный пациент Telegram WebApp / Портала (Bearer sessionToken)
	if (options?.allowTelegramWebApp) {
		const portalAuth = await extractPortalPatient(request);
		if (portalAuth) {
			if (options.requiredPatientId) {
				const ok = await ensurePatientBelongsToOrg(portalAuth.organizationId, options.requiredPatientId, reply);
				if (!ok) return null;
				if (portalAuth.patientId !== options.requiredPatientId) {
					const family = await TelegramReferralLoyaltyService.getFamilyProfile(
						portalAuth.organizationId,
						portalAuth.patientId,
					);
					const isFamilyMatch = family.members.some((m) => m.patientId === options.requiredPatientId);
					if (!isFamilyMatch) {
						reply.status(403).send({
							error: "Forbidden",
							message: "Доступ запрещен: данный профиль не принадлежит вам или вашей семейной группе.",
						});
						return null;
					}
				}
			}
			return { organizationId: portalAuth.organizationId };
		}
	}

	// B. Пациент из Telegram WebApp с HMAC-SHA256 подписью
	const rawInitData =
		(typeof request.headers["x-telegram-init-data"] === "string"
			? request.headers["x-telegram-init-data"]
			: undefined) ||
		(request.query as { initData?: string })?.initData ||
		(request.body as { initData?: string })?.initData;

	if (options?.allowTelegramWebApp && rawInitData) {
		const orgId =
			(request.query as { organizationId?: string })?.organizationId ||
			(request.body as { organizationId?: string })?.organizationId ||
			process.env.DENTE_TELEGRAM_ORGANIZATION_ID;

		if (!orgId) {
			reply.status(400).send({ error: "MissingOrgId", message: "organizationId обязателен." });
			return null;
		}
		if (!UUID_REGEX.test(orgId)) {
			reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации." });
			return null;
		}

		let dbBotToken: string | null = null;
		try {
			const [botConfig] = await withTenantReadCtx(orgId, async (tx) =>
				tx
					.select({ tokenSecretRef: denteTelegramBotConfigs.tokenSecretRef })
					.from(denteTelegramBotConfigs)
					.where(
						and(
							eq(denteTelegramBotConfigs.organizationId, orgId),
							eq(denteTelegramBotConfigs.isActive, true),
						),
					)
					.orderBy(desc(denteTelegramBotConfigs.updatedAt))
					.limit(1),
			);
			dbBotToken = TelegramTokenVault.resolveOperationalToken(botConfig?.tokenSecretRef, orgId);
		} catch (err) {
			if (!isDbConnectionError(err)) {
				throw err;
			}
		}

		const botToken =
			dbBotToken ||
			process.env.TELEGRAM_BOT_TOKEN ||
			process.env.DENTE_TELEGRAM_BOT_TOKEN ||
			(process.env.NODE_ENV === "test" ? "test_bot_token" : null);
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
			{
				allowDevBypass:
					process.env.NODE_ENV === "test" &&
					isExplicitlyUnguardedControlPlaneAllowed(),
			},
		);
		if (validation.isValid && validation.user) {
			const tgUser = validation.user;

			// BOLA-проверка: принадлежит ли patientId данному пользователю Telegram или его семье
			if (options.requiredPatientId) {
				const requiredPatientId = options.requiredPatientId;
				const { patient, authPatient } = await withTenantReadCtx(orgId, async (tx) => {
					const [p] = await tx
						.select()
						.from(patients)
						.where(and(eq(patients.organizationId, orgId), eq(patients.id, requiredPatientId)))
						.limit(1);

					const linkedTgId = (p?.administrativeProfile as Record<string, unknown> | null)?.telegramUserId;
					const directMatch = Boolean(linkedTgId && String(linkedTgId) === String(tgUser.id));

					let authP: typeof patients.$inferSelect | undefined;
					if (p && !directMatch) {
						const [foundAuth] = await tx
							.select()
							.from(patients)
							.where(
								and(
									eq(patients.organizationId, orgId),
									sql`${patients.administrativeProfile}->>'telegramUserId' = ${String(tgUser.id)}`,
								),
							)
							.limit(1);
						authP = foundAuth;
					}
					return { patient: p, authPatient: authP };
				});

				if (!patient) {
					reply.status(404).send({ error: "PatientNotFound", message: "Пациент не найден." });
					return null;
				}

				const linkedTgId = (patient.administrativeProfile as Record<string, unknown> | null)?.telegramUserId;
				const isDirectMatch = linkedTgId && String(linkedTgId) === String(tgUser.id);

				if (!isDirectMatch) {
					let isFamilyMatch = false;
					if (authPatient) {
						const family = await TelegramReferralLoyaltyService.getFamilyProfile(orgId, authPatient.id);
						isFamilyMatch = family.members.some((m) => m.patientId === requiredPatientId);
					}

					const isTestBypass = process.env.NODE_ENV === "test" && isExplicitlyUnguardedControlPlaneAllowed();

					if (!isFamilyMatch && !isTestBypass) {
						reply.status(403).send({
							error: "Forbidden",
							message: "Доступ запрещен: данный профиль не принадлежит вам или вашей семейной группе.",
						});
						return null;
					}
				}
			}

			return { organizationId: orgId, tgUserId: tgUser.id };
		}
	}

	// C. Режим тестов при явно включенном DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE
	if (isExplicitlyUnguardedControlPlaneAllowed()) {
		const queryOrg =
			(request.query as { organizationId?: string })?.organizationId ||
			(request.body as { organizationId?: string })?.organizationId ||
			identity.organizationId;
		if (queryOrg) {
			if (!UUID_REGEX.test(queryOrg)) {
				reply.status(400).send({ error: "ValidationError", message: "Некорректный UUID организации." });
				return null;
			}
			if (options?.requiredPatientId) {
				const ok = await ensurePatientBelongsToOrg(queryOrg, options.requiredPatientId, reply);
				if (!ok) return null;
			}
			return { organizationId: queryOrg };
		}
	}

	// D. Строгая проверка организации через токен клиники/сотрудника (шлёт 401 при отсутствии)
	const requiredOrg = requireOrganizationId(request, reply);
	if (!requiredOrg) return null;
	if (options?.requiredPatientId) {
		const ok = await ensurePatientBelongsToOrg(requiredOrg, options.requiredPatientId, reply);
		if (!ok) return null;
	}
	return { organizationId: requiredOrg };
}

/**
 * Регистрация маршрутов реферальной программы, NPS-опросов и семейного профиля
 */
export async function registerTelegramReferralActionRoutes(app: FastifyInstance): Promise<void> {
	const selfManagedRouteOpts = { config: { tenantTxSelfManaged: true } } as const;

	/**
	 * 5. Персональная реферальная ссылка пациента:
	 */
	app.get("/api/telegram/loyalty/referral-link/:patientId", selfManagedRouteOpts, async (request: FastifyRequest, reply: FastifyReply) => {
		const { patientId } = request.params as { patientId: string };
		if (!UUID_REGEX.test(patientId)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID).",
			});
		}
		const auth = await resolveAuthorizedOrg(request, reply, {
			allowTelegramWebApp: true,
			requiredPatientId: patientId,
		});
		if (!auth) return;

		const botUsername = process.env.TELEGRAM_BOT_USERNAME || "DenteClinicBot";
		const linkInfo = TelegramReferralLoyaltyService.generateReferralLink(botUsername, patientId);
		return reply.send(linkInfo);
	});

	/**
	 * 6. Применение реферальной ссылки при входе друга в бот:
	 */
	app.post("/api/telegram/loyalty/process-referral", selfManagedRouteOpts, async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = referralProcessSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры реферала.",
				details: parsed.error.issues,
			});
		}

		const { organizationId, refereeTelegramChatId, startPayload, refereeProfile } = parsed.data;
		const auth = await resolveAuthorizedOrg(request, reply, {
			allowTelegramWebApp: true,
		});
		if (!auth) return;
		if (auth.organizationId !== organizationId) {
			return reply.status(403).send({
				error: "Forbidden",
				message: "Несоответствие организации в реферальном запросе.",
			});
		}

		const result = await TelegramReferralLoyaltyService.processReferralStart(
			auth.organizationId,
			refereeTelegramChatId,
			startPayload,
			refereeProfile,
		);

		return reply.send(result);
	});

	/**
	 * 7. Радар оттока пациентов (не были 6+ месяцев):
	 */
	app.get("/api/telegram/loyalty/retention-radar", selfManagedRouteOpts, async (request: FastifyRequest, reply: FastifyReply) => {
		const auth = await resolveAuthorizedOrg(request, reply);
		if (!auth) return;

		const { minMonths, limit } = request.query as { minMonths?: string; limit?: string };
		let parsedMonths = 6;
		if (minMonths !== undefined) {
			const n = Number.parseInt(minMonths, 10);
			if (!Number.isFinite(n) || Number.isNaN(n) || n < 1 || n > 120) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный параметр minMonths (ожидается целое число от 1 до 120).",
				});
			}
			parsedMonths = n;
		}
		let parsedLimit = 50;
		if (limit !== undefined) {
			const n = Number.parseInt(limit, 10);
			if (!Number.isFinite(n) || Number.isNaN(n) || n < 1 || n > 200) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный параметр limit (ожидается целое число от 1 до 200).",
				});
			}
			parsedLimit = n;
		}
		const candidates = await TelegramReferralLoyaltyService.findChurnCandidates(auth.organizationId, {
			minMonths: parsedMonths,
			limit: parsedLimit,
		});

		return reply.send({ success: true, count: candidates.length, candidates });
	});

	/**
	 * 8. Опрос NPS / индекс лояльности с маршрутизацией отзывов:
	 */
	app.post("/api/telegram/loyalty/nps", selfManagedRouteOpts, async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = npsSubmitSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры NPS.",
				details: parsed.error.issues,
			});
		}

		const { organizationId, appointmentId, score, comment, telegramChatId } = parsed.data;
		const auth = await resolveAuthorizedOrg(request, reply, {
			allowTelegramWebApp: true,
		});
		if (!auth) return;
		if (auth.organizationId !== organizationId) {
			return reply.status(403).send({
				error: "Forbidden",
				message: "Несоответствие организации в NPS-запросе.",
			});
		}

		if (auth.tgUserId !== undefined) {
			const tgUserIdStr = String(auth.tgUserId);
			const chatFp = hashTelegramChatFingerprint(tgUserIdStr);
			const ownership = await withTenantReadCtx(auth.organizationId, async (tx) => {
				const [appt] = await tx
					.select({ id: appointments.id, patientId: appointments.patientId })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, auth.organizationId),
							eq(appointments.id, appointmentId),
						),
					)
					.limit(1);
				if (!appt) return { found: false as const, allowed: false as const };

				const [apptPatient] = await tx
					.select({
						id: patients.id,
						familyGroupId: patients.familyGroupId,
						administrativeProfile: patients.administrativeProfile,
					})
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, auth.organizationId),
							eq(patients.id, appt.patientId),
						),
					)
					.limit(1);

				const directTgId = (apptPatient?.administrativeProfile as Record<string, unknown> | null)
					?.telegramUserId;
				if (directTgId && String(directTgId) === tgUserIdStr) {
					return { found: true as const, allowed: true as const };
				}

				const [linkedPatient] = await tx
					.select({ id: patients.id, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, auth.organizationId),
							sql`${patients.administrativeProfile}->>'telegramUserId' = ${tgUserIdStr}`,
						),
					)
					.limit(1);
				if (
					linkedPatient &&
					(linkedPatient.id === appt.patientId ||
						(linkedPatient.familyGroupId &&
							linkedPatient.familyGroupId === apptPatient?.familyGroupId))
				) {
					return { found: true as const, allowed: true as const };
				}

				const [chatLink] = await tx
					.select({
						subjectType: denteTelegramChatLinks.subjectType,
						subjectId: denteTelegramChatLinks.subjectId,
					})
					.from(denteTelegramChatLinks)
					.where(
						and(
							eq(denteTelegramChatLinks.organizationId, auth.organizationId),
							eq(denteTelegramChatLinks.chatFingerprint, chatFp),
							eq(denteTelegramChatLinks.status, "active"),
						),
					)
					.limit(1);
				if (chatLink?.subjectType === "patient" && chatLink.subjectId === appt.patientId) {
					return { found: true as const, allowed: true as const };
				}

				return { found: true as const, allowed: false as const };
			});

			if (!ownership.found) {
				return reply.status(404).send({
					error: "AppointmentNotFound",
					message: "Запись на приём не найдена.",
				});
			}
			if (!ownership.allowed) {
				return reply.status(403).send({
					error: "Forbidden",
					message: "Доступ запрещён: оценка может быть отправлена только по собственной записи.",
				});
			}
		}

		const result = await TelegramReferralLoyaltyService.handleNpsFeedback(auth.organizationId, {
			appointmentId,
			score,
			comment,
			telegramChatId,
		});

		return reply.send(result);
	});

	/**
	 * 9. Семейный профиль:
	 */
	app.get("/api/telegram/family/members/:patientId", selfManagedRouteOpts, async (request: FastifyRequest, reply: FastifyReply) => {
		const { patientId } = request.params as { patientId: string };
		if (!UUID_REGEX.test(patientId)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID).",
			});
		}
		const auth = await resolveAuthorizedOrg(request, reply, {
			allowTelegramWebApp: true,
			requiredPatientId: patientId,
		});
		if (!auth) return;

		const family = await TelegramReferralLoyaltyService.getFamilyProfile(auth.organizationId, patientId);
		return reply.send({ success: true, family });
	});

	/**
	 * 10. Подтверждение записи члена семьи родителем (семейный профиль):
	 */
	const handleFamilyConfirm = async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = familyConfirmSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры подтверждения записи.",
				details: parsed.error.issues,
			});
		}

		const { organizationId, parentPatientId, appointmentId } = parsed.data;

		const auth = await resolveAuthorizedOrg(request, reply, {
			allowTelegramWebApp: true,
			requiredPatientId: parentPatientId,
		});
		if (!auth) return;
		if (auth.organizationId !== organizationId) {
			return reply.status(403).send({
				error: "Forbidden",
				message: "Несоответствие организации при подтверждении записи семьи.",
			});
		}

		const result = await TelegramReferralLoyaltyService.confirmFamilyAppointment(
			auth.organizationId,
			parentPatientId,
			appointmentId,
		);

		return reply.send(result);
	};

	app.post("/api/telegram/family/confirm-booking", selfManagedRouteOpts, handleFamilyConfirm);
	app.post("/api/telegram/webapp/family/confirm", selfManagedRouteOpts, handleFamilyConfirm);
}
