import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { defineStreamRoute } from "../../../core/routeFactories.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { ChatLockService } from "../../../services/communications/ChatLockService.js";
import { chatIdParamSchema, unlockChatBodySchema } from "../types.js";

export function registerChatUnlockHandlers(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/communications/chats/:chatId/unlock",
		permission: "public",
		handler: async ({ request, reply }) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications unlock chat",
			);
			if (!organizationId) return;

			const paramResult = chatIdParamSchema.safeParse(request.params);
			if (!paramResult.success) {
				return reply.code(400).send({
					error: "InvalidChatIdError",
					message: "Идентификатор чата должен быть корректным UUID.",
				});
			}

			const bodyResult = unlockChatBodySchema.safeParse(request.body ?? {});
			if (!bodyResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры освобождения блокировки чата.",
				});
			}

			const identity = getRequestIdentity(request);
			const agentName =
				bodyResult.data?.agentName?.trim() ||
				identity.fullName?.trim() ||
				null;

			const result = await ChatLockService.releaseLock({
				organizationId,
				chatId: paramResult.data.chatId,
				agentName,
				force: bodyResult.data?.force ?? false,
			});

			if (!result.success) {
				return reply.code(409).send({
					error: "ChatLockMismatchError",
					message: result.message,
					lockedByAgent: result.lockedByAgent,
				});
			}

			return reply.code(200).send({
				success: true,
				chatId: result.chatId,
				released: result.released,
			});
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/communications/chats/:chatId/lock-status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications get chat lock status",
			);
			if (!organizationId) return;

			const paramResult = chatIdParamSchema.safeParse(request.params);
			if (!paramResult.success) {
				return reply.code(400).send({
					error: "InvalidChatIdError",
					message: "Идентификатор чата должен быть корректным UUID.",
				});
			}

			const status = await ChatLockService.getLockStatus({
				organizationId,
				chatId: paramResult.data.chatId,
			});

			return reply.code(200).send(status);
		},
	});
}
