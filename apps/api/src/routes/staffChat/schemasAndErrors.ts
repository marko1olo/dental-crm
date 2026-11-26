import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	StaffChatAccessDeniedError,
	StaffChatChannelNotFoundError,
	StaffChatEntityNotFoundError,
	StaffChatValidationError,
} from "../../db/staffChatQuery.js";

export const markReadSchema = z
	.object({
		channelId: z.string().uuid(),
	})
	.strict();

export const directChannelSchema = z
	.object({
		targetUserId: z.string().uuid(),
	})
	.strict();

export const getMessagesQuerySchema = z
	.object({
		channelId: z.string().uuid(),
		limit: z.coerce.number().int().min(1).max(200).default(50),
		before: z.string().trim().min(1).max(64).optional(),
	})
	.strict();

export function sendMappedStaffChatError(
	request: FastifyRequest,
	reply: FastifyReply,
	error: unknown,
	fallbackMessage: string,
) {
	if (
		error instanceof StaffChatChannelNotFoundError ||
		error instanceof StaffChatAccessDeniedError ||
		error instanceof StaffChatValidationError ||
		error instanceof StaffChatEntityNotFoundError
	) {
		return reply.code(error.statusCode).send({
			error: error.code,
			message: error.message,
		});
	}
	request.log.error({ err: error }, fallbackMessage);
	return reply.status(500).send({
		error: "InternalServerError",
		message: fallbackMessage,
	});
}
