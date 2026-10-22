import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { ChatLockService } from "../../../services/communications/ChatLockService.js";
import { chatIdParamSchema, lockChatBodySchema } from "../types.js";

export function registerChatLockHandlers(app: FastifyInstance): void {
	app.post(
		"/api/communications/chats/:chatId/lock",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications lock chat",
			);
			if (!organizationId) return;

			const paramResult = chatIdParamSchema.safeParse(request.params);
			if (!paramResult.success) {
				return reply.code(400).send({
					error: "InvalidChatIdError",
					message: "Идентификатор чата должен быть корректным UUID.",
				});
			}

			const bodyResult = lockChatBodySchema.safeParse(request.body ?? {});
			if (!bodyResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры блокировки чата.",
				});
			}

			const identity = getRequestIdentity(request);
			const agentName =
				bodyResult.data?.agentName?.trim() ||
				identity.fullName?.trim() ||
				"Оператор";

			const result = await ChatLockService.acquireLock({
				organizationId,
				chatId: paramResult.data.chatId,
				agentName,
				durationMinutes: bodyResult.data?.durationMinutes ?? 5,
			});

			if (!result.success) {
				return reply.code(409).send({
					error: "ChatAlreadyLockedError",
					message: result.message,
					lockedByAgent: result.lockedByAgent,
					expiresAtIso: result.expiresAtIso,
				});
			}

			return reply.code(200).send({
				success: true,
				chatId: result.lock.chatId,
				lockedByAgent: result.lock.lockedByAgent,
				lockAcquiredAt: result.lock.lockAcquiredAt,
				lockExpiresAt: result.lock.lockExpiresAt,
				expiresAtIso: result.lock.expiresAtIso,
			});
		},
	);

	app.post(
		"/api/communications/chats/:chatId/heartbeat",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications heartbeat chat",
			);
			if (!organizationId) return;

			const paramResult = chatIdParamSchema.safeParse(request.params);
			if (!paramResult.success) {
				return reply.code(400).send({
					error: "InvalidChatIdError",
					message: "Идентификатор чата должен быть корректным UUID.",
				});
			}

			const bodyResult = lockChatBodySchema.safeParse(request.body ?? {});
			if (!bodyResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры продления блокировки чата.",
				});
			}

			const identity = getRequestIdentity(request);
			const agentName =
				bodyResult.data?.agentName?.trim() ||
				identity.fullName?.trim() ||
				"Оператор";

			const result = await ChatLockService.heartbeatLock({
				organizationId,
				chatId: paramResult.data.chatId,
				agentName,
				durationMinutes: bodyResult.data?.durationMinutes ?? 5,
			});

			if (!result.success) {
				return reply.code(409).send({
					error:
						result.reason === "lock_expired"
							? "ChatLockExpiredError"
							: "ChatLockMismatchError",
					message: result.message,
				});
			}

			return reply.code(200).send({
				success: true,
				chatId: result.chatId,
				lockedByAgent: result.lockedByAgent,
				lockExpiresAt: result.lockExpiresAt,
				expiresAtIso: result.expiresAtIso,
			});
		},
	);
}
