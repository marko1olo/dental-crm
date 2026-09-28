/**
 * routeErrors.ts
 *
 * Канонический хелпер для стандартизированных 400 Bad Request ответов в роутах.
 * Мандаты: 8b (<=800 строк), 8s (SSOT).
 */

import type { FastifyReply } from "fastify";

export function replyBadRequest(
	reply: FastifyReply,
	error: string,
	message: string,
) {
	return reply.code(400).send({ error, message });
}
