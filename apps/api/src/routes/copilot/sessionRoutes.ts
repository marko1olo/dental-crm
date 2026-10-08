/**
 * sessionRoutes.ts — Layer 2: Fastify Routes for Copilot Sessions and Message History.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	defaultCopilotSessionStore,
	defaultSessionStore,
} from "../../services/agent/index.js";
import {
	createSessionBodySchema,
	getMessagesQuerySchema,
	listSessionsQuerySchema,
} from "./types.js";

export const sessionRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// Periodic GC for expired sessions (TTL 24 hours)
	defaultSessionStore.cleanupStaleSessions().catch(() => {});

	// GET /api/v1/copilot/sessions — List active sessions for tenant/user/patient
	server.get(
		"/api/v1/copilot/sessions",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot list sessions",
			);
			if (!resolvedOrgId) return;

			const parsedQuery = listSessionsQuerySchema.safeParse(request.query ?? {});
			const query = parsedQuery.success ? parsedQuery.data : {};

			const sessions = await defaultCopilotSessionStore.listSessions(
				resolvedOrgId,
				{
					userId: query.userId,
					patientId: query.patientId,
					limit: query.limit,
					offset: query.offset,
				},
			);

			return reply.send({ data: sessions });
		},
	);

	// POST /api/v1/copilot/sessions — Create new persistent session
	server.post(
		"/api/v1/copilot/sessions",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot create session",
			);
			if (!resolvedOrgId) return;

			const parsedBody = createSessionBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры сессии",
				});
			}

			const identity = getRequestIdentity(request);
			const userId = parsedBody.data.userId ?? identity.userId ?? null;

			const session = await defaultCopilotSessionStore.createSession({
				id: parsedBody.data.id,
				organizationId: resolvedOrgId,
				userId,
				patientId: parsedBody.data.patientId ?? null,
				activeView: parsedBody.data.activeView ?? null,
				summary: parsedBody.data.summary ?? null,
			});

			return reply.code(201).send({ ok: true, data: session });
		},
	);

	// GET /api/v1/copilot/sessions/:sessionId/messages — Load message history
	server.get<{
		Params: { sessionId: string };
	}>(
		"/api/v1/copilot/sessions/:sessionId/messages",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot get session messages",
			);
			if (!resolvedOrgId) return;

			const { sessionId } = request.params;
			const parsedQuery = getMessagesQuerySchema.safeParse(request.query ?? {});
			const query = parsedQuery.success ? parsedQuery.data : {};

			const messages = await defaultCopilotSessionStore.getMessages(
				sessionId,
				resolvedOrgId,
				{
					limit: query.limit,
					offset: query.offset,
					order: query.order,
				},
			);

			const session = await defaultCopilotSessionStore.getSession(
				sessionId,
				resolvedOrgId,
			);

			return reply.send({
				data: messages,
				sessionId,
				summary: session?.summary ?? null,
			});
		},
	);

	// DELETE /api/v1/copilot/sessions/:sessionId — Clear/delete session
	server.delete<{
		Params: { sessionId: string };
	}>(
		"/api/v1/copilot/sessions/:sessionId",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot delete session",
			);
			if (!resolvedOrgId) return;

			const { sessionId } = request.params;

			await defaultSessionStore.delete(sessionId, resolvedOrgId).catch(() => {});
			const deleted = await defaultCopilotSessionStore.deleteSession(
				sessionId,
				resolvedOrgId,
			);

			return reply.send({ ok: true, deleted });
		},
	);
};
