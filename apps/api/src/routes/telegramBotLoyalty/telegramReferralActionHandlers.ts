import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { patients } from "../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { TelegramReferralLoyaltyService } from "../../services/telegram/TelegramReferralLoyaltyService.js";
import { isExplicitlyUnguardedControlPlaneAllowed } from "../telegram/telegramControlPlaneGuard.js";
import {
	familyConfirmSchema,
	npsSubmitSchema,
	referralProcessSchema,
} from "./telegramLoyaltySchemas.js";

/**
 * Валидирует доступ сотрудника клиники или сессию Telegram WebApp с BOLA-защитой.
 */
async function resolveAuthorizedOrg(
	request: FastifyRequest,
	reply: FastifyReply,
	options?: { allowTelegramWebApp?: boolean; requiredPatientId?: string },
): Promise<{ organizationId: string; tgUserId?: number } | null> {
	// A. Авторизованный сотрудник клиники (подписанный JWT)
	const identity = getRequestIdentity(request);
	if (identity.organizationId && identity.verified) {
		return { organizationId: identity.organizationId };
	}

	// B. Пациент из Telegram WebApp с HMAC-SHA256 подписью
	const rawInitData =
		(typeof request.headers["x-telegram-init-data"] === "string"
			? request.headers["x-telegram-init-data"]
			: undefined) ||
		(request.query as { initData?: string })?.initData ||
		(request.body as { initData?: string })?.initData;

	if (options?.allowTelegramWebApp && rawInitData) {
		const botToken =
			process.env.TELEGRAM_BOT_TOKEN ||
			process.env.DENTE_TELEGRAM_BOT_TOKEN ||
			"test_bot_token";
		const validation = TelegramReferralLoyaltyService.validateTelegramWebAppData(
			rawInitData,
			botToken,
			{
				allowDevBypass: process.env.NODE_ENV === "test" || (!process.env.TELEGRAM_BOT_TOKEN && !process.env.DENTE_TELEGRAM_BOT_TOKEN),
			},
		);
		if (validation.isValid && validation.user) {
			const tgUser = validation.user;
			const orgId =
				(request.query as { organizationId?: string })?.organizationId ||
				(request.body as { organizationId?: string })?.organizationId ||
				process.env.DENTE_TELEGRAM_ORGANIZATION_ID;

			if (!orgId) {
				reply.status(400).send({ error: "MissingOrgId", message: "organizationId обязателен." });
				return null;
			}

			// BOLA-проверка: принадлежит ли patientId данному пользователю Telegram или его семье
			if (options.requiredPatientId) {
				const [patient] = await db
					.select()
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, options.requiredPatientId)))
					.limit(1);

				if (!patient) {
					reply.status(404).send({ error: "PatientNotFound", message: "Пациент не найден." });
					return null;
				}

				const linkedTgId = (patient.administrativeProfile as Record<string, unknown> | null)?.telegramUserId;
				const isDirectMatch = linkedTgId && String(linkedTgId) === String(tgUser.id);

				if (!isDirectMatch) {
					const [authPatient] = await db
						.select()
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, orgId),
								sql`${patients.administrativeProfile}->>'telegramUserId' = ${String(tgUser.id)}`,
							),
						)
						.limit(1);

					let isFamilyMatch = false;
					if (authPatient) {
						const family = await TelegramReferralLoyaltyService.getFamilyProfile(orgId, authPatient.id);
						isFamilyMatch = family.members.some((m) => m.patientId === options.requiredPatientId);
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
			return { organizationId: queryOrg };
		}
	}

	// D. Строгая проверка организации через токен клиники/сотрудника (шлёт 401 при отсутствии)
	const requiredOrg = requireOrganizationId(request, reply);
	if (!requiredOrg) return null;
	return { organizationId: requiredOrg };
}

/**
 * Регистрация маршрутов реферальной программы, NPS-опросов и семейного профиля
 */
export async function registerTelegramReferralActionRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 5. Персональная реферальная ссылка пациента:
	 */
	app.get("/api/telegram/loyalty/referral-link/:patientId", async (request: FastifyRequest, reply: FastifyReply) => {
		const { patientId } = request.params as { patientId: string };
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
	app.post("/api/telegram/loyalty/process-referral", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = referralProcessSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры реферала.",
				details: parsed.error.issues,
			});
		}

		const { organizationId, refereeTelegramChatId, startPayload, refereeProfile } = parsed.data;

		const result = await TelegramReferralLoyaltyService.processReferralStart(
			organizationId,
			refereeTelegramChatId,
			startPayload,
			refereeProfile,
		);

		return reply.send(result);
	});

	/**
	 * 7. Радар оттока пациентов (не были 6+ месяцев):
	 */
	app.get("/api/telegram/loyalty/retention-radar", async (request: FastifyRequest, reply: FastifyReply) => {
		const auth = await resolveAuthorizedOrg(request, reply);
		if (!auth) return;

		const { minMonths, limit } = request.query as { minMonths?: string; limit?: string };
		const candidates = await TelegramReferralLoyaltyService.findChurnCandidates(auth.organizationId, {
			minMonths: minMonths ? Number.parseInt(minMonths, 10) : 6,
			limit: limit ? Number.parseInt(limit, 10) : 50,
		});

		return reply.send({ success: true, count: candidates.length, candidates });
	});

	/**
	 * 8. Опрос NPS / индекс лояльности с маршрутизацией отзывов:
	 */
	app.post("/api/telegram/loyalty/nps", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = npsSubmitSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры NPS.",
				details: parsed.error.issues,
			});
		}

		const { organizationId, appointmentId, score, comment, telegramChatId } = parsed.data;

		const result = await TelegramReferralLoyaltyService.handleNpsFeedback(organizationId, {
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
	app.get("/api/telegram/family/members/:patientId", async (request: FastifyRequest, reply: FastifyReply) => {
		const { patientId } = request.params as { patientId: string };
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

		const result = await TelegramReferralLoyaltyService.confirmFamilyAppointment(
			organizationId,
			parentPatientId,
			appointmentId,
		);

		return reply.send(result);
	};

	app.post("/api/telegram/family/confirm-booking", handleFamilyConfirm);
	app.post("/api/telegram/webapp/family/confirm", handleFamilyConfirm);
}
