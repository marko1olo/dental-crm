/**
 * telegramTreatmentPlanCloser.ts — Fastify routes for AI Treatment Plan Closer & Installment Calculator.
 *
 * Exposes:
 * - GET /api/telegram/treatment-plans/pending/:patientId
 * - POST /api/telegram/treatment-plans/:planId/installment-calc
 * - POST /api/telegram/treatment-plans/:planId/send-followup
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { resolveTelegramRuntimeContext } from "./telegram/telegramRuntimeResolver.js";
import {
	TelegramTreatmentPlanCloserService,
	formatRub,
} from "../services/telegram/TelegramTreatmentPlanCloserService.js";

// ============================================================================
// СХЕМЫ ВАЛИДАЦИИ ZOD
// ============================================================================

const pendingPlansParamsSchema = z.object({
	patientId: z.string().uuid("Некорректный UUID пациента."),
});

const installmentCalcParamsSchema = z.object({
	planId: z.string().uuid("Некорректный UUID плана лечения."),
});

const installmentCalcBodySchema = z.object({
	monthsCount: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]).default(12),
	downPaymentRub: z.number().nonnegative().default(0),
	bankProvider: z.enum(["tinkoff", "sberbank", "otp", "clinic_internal"]).default("tinkoff"),
});

const sendFollowupParamsSchema = z.object({
	planId: z.string().uuid("Некорректный UUID плана лечения."),
});

const sendFollowupBodySchema = z
	.object({
		force: z.boolean().default(false),
		/** Поле оставлено только для обратной совместимости схемы; клиентский токен игнорируется на сервере. */
		botToken: z.string().optional(),
	})
	.strict();

// ============================================================================
// РЕГИСТРАЦИЯ МАРШРУТОВ
// ============================================================================

export async function registerTelegramTreatmentPlanCloserRoutes(app: FastifyInstance) {
	/**
	 * GET /api/telegram/treatment-plans/pending/:patientId
	 * Возвращает актуальные неподтвержденные планы лечения для дожима и рассрочки.
	 */
	app.get(
		"/api/telegram/treatment-plans/pending/:patientId",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"telegram pending treatment plans",
			);
			if (!organizationId) return;

			const parsedParams = pendingPlansParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор пациента.",
					details: parsedParams.error.issues,
				});
			}

			const { patientId } = parsedParams.data;
			const plans = await TelegramTreatmentPlanCloserService.getPendingTreatmentPlansForPatient(
				patientId,
				organizationId,
			);

			return reply.code(200).send({
				ok: true,
				patientId,
				plans,
			});
		},
	);

	/**
	 * POST /api/telegram/treatment-plans/:planId/installment-calc
	 * Финансовый калькулятор рассрочки 0% (Т-Банк / Сбербанк) с расчетом платежа и вычета НДФЛ.
	 */
	app.post(
		"/api/telegram/treatment-plans/:planId/installment-calc",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"telegram installment calc",
			);
			if (!organizationId) return;

			const parsedParams = installmentCalcParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор плана лечения.",
					details: parsedParams.error.issues,
				});
			}

			const parsedBody = installmentCalcBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры расчета рассрочки.",
					details: parsedBody.error.issues,
				});
			}

			const { planId } = parsedParams.data;
			const { monthsCount, downPaymentRub, bankProvider } = parsedBody.data;

			const plan = await TelegramTreatmentPlanCloserService.getPendingPlanById(
				planId,
				organizationId,
			);

			if (!plan) {
				return reply.code(404).send({
					error: "PlanNotFound",
					message: "План лечения не найден.",
				});
			}

			const option = TelegramTreatmentPlanCloserService.calculateInstallmentOption(
				plan.totalPriceRub,
				monthsCount,
				downPaymentRub,
				bankProvider,
			);

			return reply.code(200).send({
				ok: true,
				planId: plan.planId,
				totalAmountRub: option.totalAmountRub,
				downPaymentRub: option.downPaymentRub,
				financedAmountRub: option.financedAmountRub,
				monthsCount: option.months,
				monthlyPaymentRub: option.monthlyPaymentRub,
				monthlyPaymentFormatted: `${formatRub(option.monthlyPaymentRub)} ₽/мес без переплат на ${option.months} месяцев`,
				totalOverpaymentRub: option.overpaymentRub,
				interestRatePercent: option.interestRatePercent,
				bankProvider: option.bankProvider,
				bankNameRu: option.bankNameRu,
				ndflRefundAmountRub: option.ndflRefundRub,
				partsRub: option.partsRub,
			});
		},
	);

	/**
	 * POST /api/telegram/treatment-plans/:planId/send-followup
	 * Запуск отправки интерактивного follow-up сообщения пациенту в Telegram.
	 */
	app.post(
		"/api/telegram/treatment-plans/:planId/send-followup",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"telegram send followup",
			);
			if (!organizationId) return;

			const parsedParams = sendFollowupParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор плана лечения.",
					details: parsedParams.error.issues,
				});
			}

			const parsedBody = sendFollowupBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры отправки напоминания.",
					details: parsedBody.error.issues,
				});
			}

			const { planId } = parsedParams.data;
			const { force } = parsedBody.data;

			const runtimeRes = resolveTelegramRuntimeContext(organizationId);
			const orgToken = runtimeRes.ok ? runtimeRes.context.botToken : null;
			const resolvedBotToken =
				orgToken ||
				process.env.TELEGRAM_BOT_TOKEN ||
				process.env.DENTE_TELEGRAM_BOT_TOKEN ||
				"";

			if (!resolvedBotToken) {
				return reply.code(503).send({
					error: "TelegramBotTokenMissing",
					message: "Токен Telegram-бота не сконфигурирован на сервере.",
				});
			}

			const result = await TelegramTreatmentPlanCloserService.sendPlanFollowUpMessage({
				planId,
				botToken: resolvedBotToken,
				organizationId,
				force,
			});

			if (!result.ok) {
				return reply.code(422).send({
					error: "FollowUpFailed",
					message: result.error || "Не удалось отправить сообщение follow-up.",
				});
			}

			return reply.code(200).send({
				ok: true,
				messageId: result.messageId,
				message: "Сообщение follow-up успешно отправлено пациенту в Telegram.",
			});
		},
	);
}
