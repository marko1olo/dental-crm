/**
 * apps/api/src/routes/shifts/index.ts
 *
 * Fastify route group for Doctor Shift Cockpit & Auto-Close Synchronization (Mandates 8e, 8n).
 * - POST /api/shifts/auto-close-check: Runs on-demand inspection and closes expired shifts.
 * - GET /api/shifts/status: Returns live shift status, schedule bounds and expiry metadata.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	cashBoxes,
	cashBoxShifts,
} from "../../db/schema.js";
import { sendTelegramTextMessage } from "../../telegramTransport.js";
import {
	configuredBotToken,
	runtimeSettingsForRequestedOrganization,
} from "../telegram/telegramRuntimeResolver.js";
import {
	DEFAULT_MAX_SHIFT_HOURS,
	DEFAULT_SHIFT_BUFFER_MINUTES,
	checkAndAutoCloseExpiredShifts,
	type AutoCloseExpiredShiftsOptions,
} from "./shiftAutoCloseService.js";

export * from "./shiftAutoCloseService.js";

const autoCloseCheckSchema = z
	.object({
		maxHours: z.number().min(1).max(24).optional(),
		bufferMinutes: z.number().min(0).max(180).optional(),
		force: z.boolean().optional(),
	})
	.strict();

const sendShiftSummarySchema = z
	.object({
		doctorFullName: z.string().trim().min(1).max(200).optional(),
		doctorSpecialtyRu: z.string().trim().max(200).optional(),
		shiftDateLabel: z.string().trim().max(100).optional(),
		totalRevenueRub: z.number().finite().min(0).max(100_000_000).optional(),
		calculatedPayoutRub: z.number().finite().min(0).max(100_000_000).optional(),
		completedCount: z.number().int().min(0).max(10_000).optional(),
		channel: z.enum(["telegram", "journal", "email"]).default("telegram"),
	})
	.strict();

export async function registerShiftRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 1. POST /api/shifts/auto-close-check
	 * Triggers inspection of open shifts in the organization and automatically closes
	 * shifts that have expired by schedule (+ 30 min buffer), duration (> 12h) or midnight rollover.
	 */
	app.post(
		"/api/shifts/auto-close-check",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"shifts auto-close check",
			);
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const parsed = autoCloseCheckSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры проверки закрытия смен.",
					details: parsed.error.issues,
				});
			}
			const options: AutoCloseExpiredShiftsOptions = {};
			if (typeof parsed.data.maxHours === "number") options.maxHours = parsed.data.maxHours;
			if (typeof parsed.data.bufferMinutes === "number") options.bufferMinutesAfterSchedule = parsed.data.bufferMinutes;
			if (typeof parsed.data.force === "boolean") options.force = parsed.data.force;

			const result = await withTenantCtx(orgId, async (tx) => {
				return await checkAndAutoCloseExpiredShifts(tx, orgId, options);
			});

			return reply.send({
				success: true,
				hasExpiredShifts: result.hasExpiredShifts,
				closedShiftsCount: result.closedShifts.length,
				closedShifts: result.closedShifts,
				message: result.hasExpiredShifts
					? `Автоматически закрыто ${result.closedShifts.length} просроченных смен без блокировки кассы.`
					: "Активные смены в норме, просроченных смен не обнаружено.",
			});
		},
	);

	/**
	 * 2. GET /api/shifts/status
	 * Returns current status of doctor/clinic shifts with schedule bounds.
	 */
	app.get(
		"/api/shifts/status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"shifts status read",
			);
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const statusData = await withTenantCtx(orgId, async (tx) => {
				const openShifts = await tx
					.select()
					.from(cashBoxShifts)
					.where(
						and(
							eq(cashBoxShifts.organizationId, orgId),
							eq(cashBoxShifts.status, "open"),
						),
					);

				const hasOpenShift = openShifts.length > 0;
				const primaryShift = openShifts[0];

				return {
					hasOpenShift,
					activeShiftsCount: openShifts.length,
					primaryShift: primaryShift
						? {
								id: primaryShift.id,
								shiftNumber: primaryShift.shiftNumber,
								openedAt: primaryShift.openedAt,
								openedByUserId: primaryShift.openedByUserId,
								startBalanceRub: primaryShift.startBalanceRub,
							}
						: null,
					autoClosedShiftsCount: 0,
					defaultBufferMinutes: DEFAULT_SHIFT_BUFFER_MINUTES,
					defaultMaxShiftHours: DEFAULT_MAX_SHIFT_HOURS,
				};
			});

			return reply.send({
				success: true,
				...statusData,
			});
		},
	);

	/**
	 * 3. POST /api/shifts/send-shift-summary
	 * Dispatches doctor shift summary report to clinic management / chief doctor (Telegram / Email)
	 * Mandates 8e, 8n (1-click shift handover).
	 */
	app.post(
		"/api/shifts/send-shift-summary",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"shifts send summary",
			);
			if (reply.sent) return reply;
			if (!orgId) return reply;

			const parsed = sendShiftSummarySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные данные сводки смены.",
					details: parsed.error.issues,
				});
			}

			const doctorFullName = parsed.data.doctorFullName || "Лечащий врач";
			const shiftDateLabel =
				parsed.data.shiftDateLabel || new Date().toLocaleDateString("ru-RU");
			const totalRevenueRub = parsed.data.totalRevenueRub ?? 0;
			const calculatedPayoutRub = parsed.data.calculatedPayoutRub ?? 0;
			const completedCount = parsed.data.completedCount ?? 0;
			const channel = parsed.data.channel;

			if (channel === "telegram") {
				const runtime = runtimeSettingsForRequestedOrganization(orgId);
				const botToken = runtime?.settings
					? configuredBotToken(runtime.settings) || process.env.TELEGRAM_BOT_TOKEN
					: process.env.TELEGRAM_BOT_TOKEN;
				const targetChatId =
					process.env.TELEGRAM_MANAGEMENT_CHAT_ID ||
					process.env.TELEGRAM_CLINIC_CHAT_ID;

				if (botToken && targetChatId) {
					const summaryText = [
						"Сводка смены врача",
						`Врач: ${doctorFullName}`,
						`Дата: ${shiftDateLabel}`,
						`Принято пациентов: ${completedCount}`,
						`Выручка за смену: ${totalRevenueRub.toLocaleString("ru-RU")} руб.`,
						`Расчетная выплата: ${calculatedPayoutRub.toLocaleString("ru-RU")} руб.`,
					].join("\n");

					try {
						const sendResult = await sendTelegramTextMessage({
							botToken,
							chatId: targetChatId,
							text: summaryText,
						});

						if (sendResult.ok) {
							return reply.send({
								success: true,
								delivered: true,
								configured: true,
								channel: "telegram",
								telegramMessageId: sendResult.telegramMessageId,
								doctorFullName,
								shiftDateLabel,
								completedCount,
								totalRevenueRub,
								calculatedPayoutRub,
								message: "Сводка смены успешно передана руководству в Telegram-канал клиники.",
							});
						}

						return reply.send({
							success: true,
							delivered: false,
							configured: true,
							channel: "telegram",
							error: sendResult.errorClass,
							details: sendResult.details,
							doctorFullName,
							shiftDateLabel,
							completedCount,
							totalRevenueRub,
							calculatedPayoutRub,
							message: `Не удалось доставить сводку в Telegram: ${sendResult.details || "ошибка шлюза"}. Сводка сохранена локально.`,
						});
					} catch (err: unknown) {
						const errMsg = err instanceof Error ? err.message : String(err);
						return reply.send({
							success: true,
							delivered: false,
							configured: true,
							channel: "telegram",
							doctorFullName,
							shiftDateLabel,
							completedCount,
							totalRevenueRub,
							calculatedPayoutRub,
							message: `Ошибка отправки в Telegram: ${errMsg}. Сводка сохранена локально.`,
						});
					}
				}

				return reply.send({
					success: true,
					delivered: false,
					configured: false,
					channel: "telegram",
					doctorFullName,
					shiftDateLabel,
					completedCount,
					totalRevenueRub,
					calculatedPayoutRub,
					message: "Telegram-канал клиники не настроен (отсутствует токен бота или chat_id руководства). Сводка смены сохранена локально.",
				});
			}

			return reply.send({
				success: true,
				delivered: true,
				channel,
				doctorFullName,
				shiftDateLabel,
				completedCount,
				totalRevenueRub,
				calculatedPayoutRub,
				message: "Сводка смены успешно сохранена в журнал смен клиники.",
			});
		},
	);
}
