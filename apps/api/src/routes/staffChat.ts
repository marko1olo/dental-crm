import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { getRequestIdentity } from "../security/identity.js";
import {
	ensureDefaultStaffChannels,
	getOrCreateDirectStaffChannel,
	getStaffChannelById,
	getStaffChannelBySlug,
	insertStaffMessage,
	listClinicIntercomLocations,
	listStaffChannels,
	listStaffMembersForChat,
	listStaffMessages,
	markStaffChannelAsRead,
	recordIntercomAck,
} from "../db/staffChatQuery.js";
import { wsBroker } from "../services/websocketBroker.js";
import {
	INTERCOM_PRESETS,
	type IntercomPresetKey,
	sendIntercomAckInputSchema,
	sendIntercomPingInputSchema,
	sendStaffChatMessageInputSchema,
	type StaffMemberPresenceItem,
} from "@dental/shared";
import { TelegramBotHostingService } from "../services/telegram/TelegramBotHostingService.js";

const markReadSchema = z.object({
	channelId: z.string().uuid(),
});

const directChannelSchema = z.object({
	targetUserId: z.string().uuid(),
});

const getMessagesQuerySchema = z.object({
	channelId: z.string().uuid(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
	before: z.string().optional(),
});

export async function registerStaffChatRoutes(app: FastifyInstance) {
	/**
	 * GET /api/staff-chat/channels
	 * Список доступных каналов и личных переписок сотрудника.
	 */
	app.get("/api/staff-chat/channels", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat channels",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const channels = await listStaffChannels(
				organizationId,
				identity.userId || undefined,
			);
			return { channels };
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении списка каналов клиники.",
			});
		}
	});

	/**
	 * POST /api/staff-chat/channels/direct
	 * Создать или открыть существующий личный чат (Direct Message) с сотрудником.
	 */
	app.post("/api/staff-chat/channels/direct", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat direct channel",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			if (!identity.userId) {
				return reply.code(400).send({
					error: "UserRequired",
					message: "Для открытия личного диалога требуется сессия сотрудника.",
				});
			}

			const parsed = directChannelSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверный ID сотрудника.",
				});
			}

			const channel = await getOrCreateDirectStaffChannel(
				organizationId,
				identity.userId,
				parsed.data.targetUserId,
			);
			return { channel };
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: error.message || "Ошибка при создании личного чата.",
			});
		}
	});

	/**
	 * GET /api/staff-chat/messages
	 * История сообщений в выбранном канале / диалоге.
	 */
	app.get("/api/staff-chat/messages", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat messages",
			);
			if (!organizationId) return;

			const parsed = getMessagesQuerySchema.safeParse(request.query);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверные параметры запроса сообщений.",
				});
			}

			const beforeDate = parsed.data.before
				? new Date(parsed.data.before)
				: undefined;

			const messages = await listStaffMessages(
				organizationId,
				parsed.data.channelId,
				parsed.data.limit,
				beforeDate,
			);

			return { messages };
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при загрузке сообщений.",
			});
		}
	});

	/**
	 * POST /api/staff-chat/messages
	 * Отправка текстового сообщения, прикрепления карточки пациента или системного уведомления.
	 */
	app.post("/api/staff-chat/messages", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat send message",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const parsed = sendStaffChatMessageInputSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверный формат сообщения.",
					details: parsed.error.issues,
				});
			}

			let targetChannelId = parsed.data.channelId;

			// Если channelId не передан, резолвим по slug или directUserId
			if (!targetChannelId && parsed.data.channelSlug) {
				const ch = await getStaffChannelBySlug(
					organizationId,
					parsed.data.channelSlug,
				);
				if (ch) targetChannelId = ch.id;
			} else if (!targetChannelId && parsed.data.directUserId && identity.userId) {
				const directCh = await getOrCreateDirectStaffChannel(
					organizationId,
					identity.userId,
					parsed.data.directUserId,
				);
				targetChannelId = directCh.id;
			}

			if (!targetChannelId) {
				return reply.code(400).send({
					error: "ChannelNotFound",
					message: "Не указан целевой канал чата.",
				});
			}

			const senderName = identity.fullName || "Сотрудник клиники";
			const senderRole = identity.role || "staff";

			const createdMessage = await insertStaffMessage({
				organizationId,
				channelId: targetChannelId,
				senderUserId: identity.userId,
				senderName,
				senderRole,
				messageType: parsed.data.messageType,
				content: parsed.data.content,
				urgency: parsed.data.urgency,
				patientAttachment: parsed.data.patientAttachment ?? null,
				intercomPreset: parsed.data.intercomPreset ?? null,
				metadata: parsed.data.metadata ?? null,
			});

			// Рассылаем по локальному WebSocket в клинику
			wsBroker.broadcastToOrganization(organizationId, {
				type: "STAFF_CHAT_MESSAGE",
				payload: createdMessage,
			});

			return reply.code(201).send({ message: createdMessage });
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при отправке сообщения.",
			});
		}
	});

	/**
	 * POST /api/staff-chat/intercom-ping
	 * Быстрый вызов в 1 клик с кресла врача (Интерком).
	 * Пресеты: пациент в холле, вызов ассистента, готовность КТ, работа из ЗТЛ, задержка.
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
			const parsed = sendIntercomPingInputSchema.safeParse(request.body);
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

			// Динамическая маршрутизация канала по адресату (Target Audience)
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

			// Находим канал по слагу
			const channel = await getStaffChannelBySlug(
				organizationId,
				targetSlug,
			);
			if (!channel) {
				return reply.code(500).send({
					error: "ChannelNotFound",
					message: `Канал интеркома #${targetSlug} не найден.`,
				});
			}

			// Формируем параметры форматирования без undefined ключей (exactOptionalPropertyTypes)
			const formatParams: Parameters<typeof preset.formatMessage>[0] = {};
			if (parsed.data.patientName) formatParams.patientName = parsed.data.patientName;
			if (parsed.data.cabinetNumber) formatParams.cabinetNumber = parsed.data.cabinetNumber;
			if (parsed.data.reason) formatParams.reason = parsed.data.reason;
			if (parsed.data.delayMinutes !== undefined) formatParams.delayMinutes = parsed.data.delayMinutes;
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

			// Формируем прикрепление пациента, если передано
			const patientAttachment = parsed.data.patientId
				? {
						patientId: parsed.data.patientId,
						fullName: parsed.data.patientName || "Пациент",
						cabinetNumber: parsed.data.cabinetNumber || null,
						doctorName: parsed.data.doctorName || identity.fullName || null,
					}
				: null;

			const createdMessage = await insertStaffMessage({
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
			});

			// Рассылаем специализированное интерком-событие по WebSocket для звукового сигнала и шторки
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INTERCOM_PING",
				payload: {
					ping: createdMessage,
					preset: {
						key: preset.key,
						label: preset.label,
						badge: preset.badge,
						urgency,
					},
				},
			});

			// Также рассылаем стандартное событие чата для мгновенного обновления потока
			wsBroker.broadcastToOrganization(organizationId, {
				type: "STAFF_CHAT_MESSAGE",
				payload: createdMessage,
			});

			// Дублируем срочный вызов интеркома в Telegram привязанного персонала
			void TelegramBotHostingService.dispatchIntercomPingToTelegramStaff({
				organizationId,
				messageId: createdMessage.id,
				senderName,
				content: messageText,
				urgency,
				intercomPreset: preset.key,
				targetAudience: parsed.data.targetAudience ?? null,
			}).catch((tgErr) => {
				request.log.warn(
					{ tgErr, messageId: createdMessage.id },
					"[Telegram] Не удалось отправить интерком-пуш сотрудникам в Telegram",
				);
			});

			return reply.code(201).send({
				message: createdMessage,
				preset: preset.key,
				channelSlug: targetSlug,
			});
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при выполнении вызова интеркома.",
			});
		}
	});

	/**
	 * GET /api/staff-chat/locations
	 * Список реальных стоматологических кресел и кабинетов клиники для интеркома.
	 */
	app.get("/api/staff-chat/locations", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat locations",
			);
			if (!organizationId) return;

			const locations = await listClinicIntercomLocations(organizationId);
			return { locations };
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении списка кресел/кабинетов.",
			});
		}
	});

	/**
	 * POST /api/staff-chat/intercom-ack
	 * Двустороннее подтверждение вызова интеркома: [🏃 Иду! (1 мин)], [⏱ Через 3-5 мин], [❌ Занят].
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
			const parsed = sendIntercomAckInputSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверный формат подтверждения интеркома.",
					details: parsed.error.issues,
				});
			}

			const ackParams: Parameters<typeof recordIntercomAck>[0] = {
				organizationId,
				messageId: parsed.data.messageId,
				staffId: identity.userId || "anonymous",
				staffName: identity.fullName || "Сотрудник",
				staffRole: identity.role || "staff",
				ackType: parsed.data.ackType,
			};
			if (parsed.data.customComment) {
				ackParams.customComment = parsed.data.customComment;
			}

			const updatedMessage = await recordIntercomAck(ackParams);

			if (!updatedMessage) {
				return reply.code(404).send({
					error: "MessageNotFound",
					message: "Сообщение интерком-вызова не найдено.",
				});
			}

			// Оповещаем клинику через сокет о подтверждении вызова
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INTERCOM_ACK",
				payload: {
					message: updatedMessage,
					ack: {
						staffId: identity.userId || "anonymous",
						staffName: identity.fullName || "Сотрудник",
						staffRole: identity.role || "staff",
						ackType: parsed.data.ackType,
						customComment: parsed.data.customComment,
					},
				},
			});

			// Также обновляем сообщение в общем потоке чата
			wsBroker.broadcastToOrganization(organizationId, {
				type: "STAFF_CHAT_MESSAGE_UPDATED",
				payload: updatedMessage,
			});

			return { message: updatedMessage };
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при записи ответа на интерком-вызов.",
			});
		}
	});

	/**
	 * POST /api/staff-chat/read
	 * Отметить сообщения в канале прочитанными.
	 */
	app.post("/api/staff-chat/read", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat read",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			if (!identity.userId) {
				return reply.code(200).send({ ok: true, updatedCount: 0 });
			}

			const parsed = markReadSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверный ID канала.",
				});
			}

			const updatedCount = await markStaffChannelAsRead(
				organizationId,
				parsed.data.channelId,
				identity.userId,
			);

			// Оповещаем сокеты об изменении статуса прочтения
			wsBroker.broadcastToOrganization(organizationId, {
				type: "STAFF_CHAT_READ",
				payload: {
					channelId: parsed.data.channelId,
					userId: identity.userId,
				},
			});

			return { ok: true, updatedCount };
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при отметке прочтения.",
			});
		}
	});

	/**
	 * GET /api/staff-chat/members
	 * Список сотрудников клиники с их текущим статусом присутствия (online / in_visit / offline).
	 */
	app.get("/api/staff-chat/members", async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat members",
			);
			if (!organizationId) return;

			const dbUsers = await listStaffMembersForChat(organizationId);
			const livePresence = wsBroker.getPresence(organizationId);
			const presenceByStaffId = new Map(
				livePresence.map((p) => [p.staffId, p]),
			);

			const members: StaffMemberPresenceItem[] = dbUsers.map((u) => {
				const active = presenceByStaffId.get(u.id);
				let status: StaffMemberPresenceItem["status"] = "offline";
				let currentVisitId: string | null = null;
				let currentPatientName: string | null = null;
				let cabinetNumber: string | null = null;

				if (active) {
					if (active.visitId) {
						status = "in_visit";
						currentVisitId = active.visitId;
					} else {
						status = "online";
					}
					cabinetNumber = active.role || null;
				}

				return {
					staffId: u.id,
					fullName: u.fullName,
					role: u.role,
					specialty: null,
					cabinetNumber,
					status,
					currentVisitId,
					currentPatientName,
					lastSeenAt: active
						? new Date(active.lastSeen).toISOString()
						: new Date(0).toISOString(),
				};
			});

			return { members };
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Ошибка при получении списка сотрудников.",
			});
		}
	});
}
