import {
	INTERCOM_PRESETS,
	sendIntercomAckInputSchema,
	sendIntercomPingInputSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import {
	getStaffChannelBySlug,
	insertStaffMessage,
	recordIntercomAck,
} from "../../db/staffChatQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import { TelegramBotHostingService } from "../../services/telegram/TelegramBotHostingService.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { sendMappedStaffChatError } from "./schemasAndErrors.js";

export function registerStaffChatIntercomRoutes(app: FastifyInstance): void {
	/**
	 * POST /api/staff-chat/intercom-ping
	 * Быстрый вызов с кресла врача (Интерком).
	 */
	app.post("/api/staff-chat/intercom-ping", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat intercom ping",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const parsed = sendIntercomPingInputSchema.strict().safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверные параметры вызова интеркома.",
					details: parsed.error.issues,
				});
			}

			const preset = INTERCOM_PRESETS[parsed.data.presetKey];
			if (!preset) {
				return reply.code(400).send({
					error: "UnknownPreset",
					message: "Неизвестный пресет интеркома.",
				});
			}

			let targetSlug = preset.channelSlug;
			if (parsed.data.targetAudience === "reception") {
				targetSlug = "reception";
			} else if (parsed.data.targetAudience === "dental_lab") {
				targetSlug = "lab_ztl";
			} else if (parsed.data.targetAudience === "doctor_sos") {
				targetSlug = "general";
			} else if (parsed.data.targetAudience === "all_assistants") {
				targetSlug = "intercom_assistants";
			}

			const formatParams: Parameters<typeof preset.formatMessage>[0] = {};
			if (parsed.data.patientName) formatParams.patientName = parsed.data.patientName;
			if (parsed.data.cabinetNumber) formatParams.cabinetNumber = parsed.data.cabinetNumber;
			if (parsed.data.reason) formatParams.reason = parsed.data.reason;
			if (parsed.data.delayMinutes !== undefined) {
				formatParams.delayMinutes = parsed.data.delayMinutes;
			}
			if (parsed.data.orderNumber) formatParams.orderNumber = parsed.data.orderNumber;
			if (parsed.data.customNote) formatParams.customNote = parsed.data.customNote;
			const resolvedDocName = parsed.data.doctorName || identity.fullName;
			if (resolvedDocName) formatParams.doctorName = resolvedDocName;

			const messageText = preset.formatMessage(formatParams);
			const senderName = identity.fullName || "Интерком клиники";
			const senderRole = identity.role || "doctor";
			let urgency = parsed.data.urgency || preset.defaultUrgency;
			if (parsed.data.targetAudience === "doctor_sos") {
				urgency = "critical";
			}

			const patientAttachment = parsed.data.patientId
				? {
						patientId: parsed.data.patientId,
						fullName: parsed.data.patientName || "Пациент",
						cabinetNumber: parsed.data.cabinetNumber || null,
						doctorName: parsed.data.doctorName || identity.fullName || null,
					}
				: null;

			const createdMessage = await withTenantCtx(organizationId, async (tx) => {
				const channel = await getStaffChannelBySlug(organizationId, targetSlug, tx);
				if (!channel) return null;

				const saved = await insertStaffMessage({
					organizationId,
					channelId: channel.id,
					senderUserId: identity.userId,
					senderName,
					senderRole,
					messageType: "intercom_ping",
					content: messageText,
					urgency,
					intercomPreset: preset.key,
					targetAudience: parsed.data.targetAudience || null,
					patientAttachment,
					metadata: {
						cabinetNumber: parsed.data.cabinetNumber,
						chairId: parsed.data.chairId,
						reason: parsed.data.reason,
						specialtyCategory: parsed.data.specialtyCategory,
						delayMinutes: parsed.data.delayMinutes,
						orderNumber: parsed.data.orderNumber,
						customNote: parsed.data.customNote,
					},
					tx,
				});

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "INTERCOM_PING",
						payload: {
							ping: saved,
							preset: {
								key: preset.key,
								label: preset.label,
								badge: preset.badge,
								urgency,
							},
						},
					});

					wsBroker.broadcastToOrganization(organizationId, {
						type: "STAFF_CHAT_MESSAGE",
						payload: saved,
					});

					void TelegramBotHostingService.dispatchIntercomPingToTelegramStaff({
						organizationId,
						messageId: saved.id,
						senderName,
						content: messageText,
						urgency,
						intercomPreset: preset.key,
						targetAudience: parsed.data.targetAudience ?? null,
					}).catch((tgErr) => {
						request.log.warn(
							{ tgErr, messageId: saved.id },
							"[Telegram] Не удалось отправить интерком-пуш сотрудникам в Telegram",
						);
					});
				});

				return saved;
			});

			if (!createdMessage) {
				return reply.code(404).send({
					error: "ChannelNotFound",
					message: `Канал интеркома #${targetSlug} не найден.`,
				});
			}

			return reply.code(201).send({
				message: createdMessage,
				preset: preset.key,
				channelSlug: targetSlug,
			});
		} catch (error: unknown) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при выполнении вызова интеркома.",
			});
		}
	});

	/**
	 * POST /api/staff-chat/intercom-ack
	 * Двустороннее подтверждение вызова интеркома.
	 */
	app.post("/api/staff-chat/intercom-ack", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat intercom ack",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const userId = identity.userId;
			if (!userId) {
				return reply.code(400).send({
					error: "UserRequired",
					message: "Для подтверждения интерком-вызова требуется сессия сотрудника.",
				});
			}
			const parsed = sendIntercomAckInputSchema.strict().safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверный формат подтверждения интеркома.",
					details: parsed.error.issues,
				});
			}

			const staffName = identity.fullName || "Сотрудник";
			const staffRole = identity.role || "staff";

			const updatedMessage = await withTenantCtx(organizationId, async (tx) => {
				const ackParams: Parameters<typeof recordIntercomAck>[0] = {
					organizationId,
					messageId: parsed.data.messageId,
					staffId: userId,
					staffName,
					staffRole,
					ackType: parsed.data.ackType,
					tx,
					...(parsed.data.customComment !== undefined
						? { customComment: parsed.data.customComment }
						: {}),
				};
				const updated = await recordIntercomAck(ackParams);
				if (!updated) return null;

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "INTERCOM_ACK",
						payload: {
							message: updated,
							ack: {
								staffId: userId,
								staffName,
								staffRole,
								ackType: parsed.data.ackType,
								customComment: parsed.data.customComment,
							},
						},
					});

					wsBroker.broadcastToOrganization(organizationId, {
						type: "STAFF_CHAT_MESSAGE_UPDATED",
						payload: updated,
					});
				});

				return updated;
			});

			if (!updatedMessage) {
				return reply.code(404).send({
					error: "MessageNotFound",
					message: "Сообщение интерком-вызова не найдено.",
				});
			}

			return { message: updatedMessage };
		} catch (error: unknown) {
			return sendMappedStaffChatError(
				request,
				reply,
				error,
				"Ошибка при записи ответа на интерком-вызов.",
			);
		}
	});
}
