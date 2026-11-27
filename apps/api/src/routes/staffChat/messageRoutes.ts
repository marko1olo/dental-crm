import { sendStaffChatMessageInputSchema } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { onTenantTxCommit, withTenantWriteCtx } from "../../db/rls.js";
import {
	getOrCreateDirectStaffChannel,
	getStaffChannelBySlug,
	insertStaffMessage,
	listStaffMessages,
	markStaffChannelAsRead,
} from "../../db/staffChatQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	getMessagesQuerySchema,
	markReadSchema,
	sendMappedStaffChatError,
} from "./schemasAndErrors.js";

export function registerStaffChatMessageRoutes(app: FastifyInstance): void {
	const selfManagedRouteOpts = { config: { tenantTxSelfManaged: true } } as const;

	/**
	 * GET /api/staff-chat/messages
	 * История сообщений в выбранном канале / диалоге.
	 */
	app.get("/api/staff-chat/messages", selfManagedRouteOpts, async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat messages",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const parsed = getMessagesQuerySchema.safeParse(request.query);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверные параметры запроса сообщений.",
				});
			}

			let beforeDate: Date | undefined;
			if (parsed.data.before) {
				beforeDate = new Date(parsed.data.before);
				if (Number.isNaN(beforeDate.getTime())) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректная дата параметра before.",
					});
				}
			}

			const messages = await listStaffMessages(
				organizationId,
				parsed.data.channelId,
				parsed.data.limit,
				beforeDate,
				identity.userId ?? null,
			);

			return { messages };
		} catch (error: unknown) {
			return sendMappedStaffChatError(
				request,
				reply,
				error,
				"Ошибка при загрузке сообщений.",
			);
		}
	});

	/**
	 * POST /api/staff-chat/messages
	 * Отправка текстового сообщения, прикрепления карточки пациента или системного уведомления.
	 */
	app.post("/api/staff-chat/messages", selfManagedRouteOpts, async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat send message",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const parsed = sendStaffChatMessageInputSchema.strict().safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверный формат сообщения.",
					details: parsed.error.issues,
				});
			}

			if (!parsed.data.channelId && !parsed.data.channelSlug && parsed.data.directUserId && !identity.userId) {
				return reply.code(400).send({
					error: "UserRequired",
					message: "Для отправки личного сообщения требуется сессия сотрудника.",
				});
			}

			const senderName = identity.fullName || "Сотрудник клиники";
			const senderRole = identity.role || "staff";

			const txResult = await withTenantWriteCtx(organizationId, async (tx) => {
				let targetChannelId = parsed.data.channelId;

				if (!targetChannelId && parsed.data.channelSlug) {
					const ch = await getStaffChannelBySlug(
						organizationId,
						parsed.data.channelSlug,
						tx,
					);
					if (!ch) {
						return { kind: "not_found" as const };
					}
					targetChannelId = ch.id;
				} else if (!targetChannelId && parsed.data.directUserId) {
					const directCh = await getOrCreateDirectStaffChannel(
						organizationId,
						identity.userId as string,
						parsed.data.directUserId,
						tx,
					);
					targetChannelId = directCh.id;
				}

				if (!targetChannelId) {
					return { kind: "missing_channel" as const };
				}

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
					tx,
				});

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "STAFF_CHAT_MESSAGE",
						payload: createdMessage,
					});
				});

				return { kind: "ok" as const, createdMessage };
			});

			if (txResult.kind === "not_found") {
				return reply.code(404).send({
					error: "ChannelNotFound",
					message: "Целевой канал чата не найден.",
				});
			}
			if (txResult.kind === "missing_channel") {
				return reply.code(400).send({
					error: "ChannelNotFound",
					message: "Не указан целевой канал чата.",
				});
			}

			return reply.code(201).send({ message: txResult.createdMessage });
		} catch (error: unknown) {
			return sendMappedStaffChatError(
				request,
				reply,
				error,
				"Ошибка при отправке сообщения.",
			);
		}
	});

	/**
	 * POST /api/staff-chat/read
	 * Отметить сообщения в канале прочитанными.
	 */
	app.post("/api/staff-chat/read", selfManagedRouteOpts, async (request, reply) => {
		try {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"staff-chat read",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const userId = identity.userId;
			if (!userId) {
				return reply.code(200).send({ ok: true, updatedCount: 0 });
			}

			const parsed = markReadSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Неверный ID канала.",
				});
			}

			const channelId = parsed.data.channelId;
			const updatedCount = await withTenantWriteCtx(organizationId, async (tx) => {
				const count = await markStaffChannelAsRead(organizationId, channelId, userId, tx);
				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "STAFF_CHAT_READ",
						payload: { channelId, userId },
					});
				});
				return count;
			});

			return { ok: true, updatedCount };
		} catch (error: unknown) {
			return sendMappedStaffChatError(
				request,
				reply,
				error,
				"Ошибка при отметке прочтения.",
			);
		}
	});
}
