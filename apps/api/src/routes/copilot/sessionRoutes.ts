/**
 * sessionRoutes.ts — Layer 2: Fastify Routes for Copilot Sessions and Message History.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getRequestIdentity } from "../../security/identity.js";
import { PERMISSIONS } from "../../security/permissions.js";
import {
	AgentOrchestrator,
	buildCompactedSystemPrompt,
	buildDenteAgentSystemPrompt,
	defaultCopilotActionManager,
	defaultCopilotSessionStore,
	defaultLlmProvider,
	defaultSessionStore,
	defaultToolRegistry,
	formatSseEvent,
	type AgentContext,
	type TurnEvent,
} from "../../services/agent/index.js";
import { extractDoctorScreenContext } from "./contextExtractor.js";
import {
	createSessionBodySchema,
	getMessagesQuerySchema,
	listSessionsQuerySchema,
	messageBodySchema,
} from "./types.js";
import { routeClinicalTask } from "../../ai/clinicalModelRouter.js";

const DENTE_COPILOT_SYSTEM_PROMPT = buildDenteAgentSystemPrompt();

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

	// POST /api/v1/copilot/sessions/:sessionId/messages — Stream conversation turn
	server.post<{
		Params: { sessionId: string };
		Body: { content?: string; message?: string; text?: string };
	}>(
		"/api/v1/copilot/sessions/:sessionId/messages",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot send message",
			);
			if (!resolvedOrgId) return;

			const { sessionId } = request.params;
			const parsedBody = messageBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат запроса",
				});
			}

			const body = parsedBody.data;
			const userText = (
				body.content ??
				body.message ??
				body.text ??
				""
			).trim();

			if (!userText) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Текст сообщения не может быть пустым",
				});
			}

			const identity = getRequestIdentity(request);
			const userId =
				identity.userId ?? "00000000-0000-7000-8000-000000000001";

			// Get or initialize persistent session state from PostgreSQL / L1 cache
			const session = await defaultSessionStore.getOrCreate(
				sessionId,
				resolvedOrgId,
				userId,
				resolvedOrgId,
			);

			// Append user message to history
			session.history.push({
				role: "user",
				content: userText,
			});

			// Persist user message to normalized PostgreSQL store with auto-compaction
			await defaultCopilotSessionStore
				.addMessage({
					sessionId,
					organizationId: resolvedOrgId,
					role: "user",
					content: userText,
					autoCompact: true,
				})
				.catch(() => {});

			const { doctorContext } = extractDoctorScreenContext(
				userText,
				parsedBody.data.uiContext ?? parsedBody.data.context,
			);

			// Setup SSE headers
			reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
			reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
			reply.raw.setHeader("Connection", "keep-alive");
			reply.raw.setHeader("X-Accel-Buffering", "no");
			reply.raw.flushHeaders?.();

			// Build agent context
			const rawTrust = body.trustLevel;
			const effectiveMode =
				rawTrust === "autonomous"
					? ("autonomous" as const)
					: rawTrust === "cautious" || rawTrust === "confirm_all"
						? ("cautious" as const)
						: ("supervised" as const);

			const ctx: AgentContext = {
				organizationId: resolvedOrgId,
				clinicId: resolvedOrgId,
				userId,
				sessionId,
				mode: effectiveMode,
				role: identity.role ?? "doctor",
				permissions: [...PERMISSIONS],
				tools: defaultToolRegistry,
				db,
				metadata: {
					...(doctorContext ? { doctorContext } : {}),
					...(body.runtimeMode ? { runtimeMode: body.runtimeMode } : {}),
					trustLevel: effectiveMode,
				},
			};

			let assistantText = "";
			const assistantToolCalls: Record<string, unknown>[] = [];

			// Fetch persisted summary for system prompt augmentation
			const sessionRecord = await defaultCopilotSessionStore
				.getSession(sessionId, resolvedOrgId)
				.catch(() => null);
			const effectiveSystemPrompt = buildCompactedSystemPrompt(
				DENTE_COPILOT_SYSTEM_PROMPT,
				sessionRecord?.summary,
				doctorContext,
			);

			const routingDecision = routeClinicalTask({
				messages: session.history.map((m) => ({
					role: m.role as any,
					content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
				})),
				speedMode: body.speedMode,
				modelRoutingMode: body.modelRoutingMode,
				byokProvider: body.byokProvider,
				byokApiKey: body.byokApiKey,
				byokModel: body.byokModel,
			});

			try {
				const stream = AgentOrchestrator.runTurnStream({
					ctx,
					provider: defaultLlmProvider,
					system: effectiveSystemPrompt,
					history: session.history,
					toolNames: defaultToolRegistry.list(),
					redactor: session.redactor,
					model: routingDecision.model,
				});

				for await (const event of stream) {
					if (event.type === "token") {
						assistantText += event.text;
					} else if (event.type === "tool_call_started") {
						assistantToolCalls.push({
							name: event.name,
							arguments: event.arguments,
						});
					} else if (event.type === "confirmation_required") {
						defaultCopilotActionManager.registerPending(
							sessionId,
							event.callId,
							event.name,
							event.arguments,
							{ organizationId: resolvedOrgId, userId },
						);
					}
					const chunk = formatSseEvent(event);
					reply.raw.write(chunk);
				}
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				const errorEvent: TurnEvent = {
					type: "token",
					text: `\n\n⚠️ Ошибка выполнения: ${errorMsg}`,
				};
				reply.raw.write(formatSseEvent(errorEvent));
				reply.raw.write(formatSseEvent({ type: "final", stopReason: "error" }));
			} finally {
				// Persist assistant message in normalized copilot_messages
				if (assistantText.trim() || assistantToolCalls.length > 0) {
					await defaultCopilotSessionStore
						.addMessage({
							sessionId,
							organizationId: resolvedOrgId,
							role: "assistant",
							content: assistantText.trim() || "Выполнены действия",
							toolCalls:
								assistantToolCalls.length > 0 ? assistantToolCalls : undefined,
							autoCompact: true,
						})
						.catch(() => {});
				}

				// Persist updated session history and redactor symbol table to PostgreSQL
				await defaultSessionStore
					.save(sessionId, resolvedOrgId, session, userId, resolvedOrgId)
					.catch(() => {});
				reply.raw.end();
			}
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
