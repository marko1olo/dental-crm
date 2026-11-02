import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireOrganizationId } from "../../security/identity.js";
import { TelegramReferralLoyaltyService } from "../../services/telegram/TelegramReferralLoyaltyService.js";
import {
	familyConfirmSchema,
	npsSubmitSchema,
	referralProcessSchema,
} from "./telegramLoyaltySchemas.js";

/**
 * Регистрация маршрутов реферальной программы, NPS-опросов и семейного профиля
 */
export async function registerTelegramReferralActionRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 5. Персональная реферальная ссылка пациента:
	 */
	app.get("/api/telegram/loyalty/referral-link/:patientId", async (request: FastifyRequest, reply: FastifyReply) => {
		const queryOrg = (request.query as { organizationId?: string })?.organizationId;
		const orgId = queryOrg || requireOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
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
		const queryOrg = (request.query as { organizationId?: string })?.organizationId;
		const orgId = queryOrg || requireOrganizationId(request, reply);
		if (!orgId) return;

		const { minMonths, limit } = request.query as { minMonths?: string; limit?: string };
		const candidates = await TelegramReferralLoyaltyService.findChurnCandidates(orgId, {
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
		const queryOrg = (request.query as { organizationId?: string })?.organizationId;
		const orgId = queryOrg || requireOrganizationId(request, reply);
		if (!orgId) return;

		const { patientId } = request.params as { patientId: string };
		const family = await TelegramReferralLoyaltyService.getFamilyProfile(orgId, patientId);
		return reply.send({ success: true, family });
	});

	/**
	 * 10. Подтверждение записи ребенка / члена семьи родителем в 1 клик:
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
