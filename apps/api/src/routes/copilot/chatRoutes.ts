/**
 * chatRoutes.ts — Layer 2: Fastify Routes for SSE Streaming Chat Conversations with Copilot.
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
import { messageBodySchema } from "./types.js";

const DENTE_COPILOT_SYSTEM_PROMPT = buildDenteAgentSystemPrompt();

export const chatRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
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

			const userText = (
				parsedBody.data.content ??
				parsedBody.data.message ??
				parsedBody.data.text ??
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

			const { doctorContext, cleanText } = extractDoctorScreenContext(
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
			const ctx: AgentContext = {
				organizationId: resolvedOrgId,
				clinicId: resolvedOrgId,
				userId,
				sessionId,
				mode: "supervised",
				role: identity.role ?? "doctor",
				permissions: [...PERMISSIONS],
				tools: defaultToolRegistry,
				db,
				...(doctorContext ? { metadata: { doctorContext } } : {}),
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

			try {
				const stream = AgentOrchestrator.runTurnStream({
					ctx,
					provider: defaultLlmProvider,
					system: effectiveSystemPrompt,
					history: session.history,
					toolNames: defaultToolRegistry.list(),
					redactor: session.redactor,
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

	// POST /api/v1/copilot/chat — Unified SSE conversation endpoint
	server.post<{
		Body: {
			conversationId?: string;
			sessionId?: string;
			content?: string;
			message?: string;
			text?: string;
		};
	}>(
		"/api/v1/copilot/chat",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot chat",
			);
			if (!resolvedOrgId) return;

			const body = request.body ?? {};
			const sessionId =
				body.conversationId ?? body.sessionId ?? `sess_${Date.now()}`;
			const userText = (body.content ?? body.message ?? body.text ?? "").trim();

			if (!userText) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Текст сообщения не может быть пустым",
				});
			}

			const identity = getRequestIdentity(request);
			const userId =
				identity.userId ?? "00000000-0000-7000-8000-000000000001";

			const session = await defaultSessionStore.getOrCreate(
				sessionId,
				resolvedOrgId,
				userId,
				resolvedOrgId,
			);

			session.history.push({
				role: "user",
				content: userText,
			});

			await defaultCopilotSessionStore
				.addMessage({
					sessionId,
					organizationId: resolvedOrgId,
					role: "user",
					content: userText,
					autoCompact: true,
				})
				.catch(() => {});

			const rawBody = body as { uiContext?: unknown; context?: unknown };
			const { doctorContext, cleanText } = extractDoctorScreenContext(
				userText,
				rawBody.uiContext ?? rawBody.context,
			);

			reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
			reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
			reply.raw.setHeader("Connection", "keep-alive");
			reply.raw.setHeader("X-Accel-Buffering", "no");
			reply.raw.flushHeaders?.();

			const ctx: AgentContext = {
				organizationId: resolvedOrgId,
				clinicId: resolvedOrgId,
				userId,
				sessionId,
				mode: "supervised",
				role: identity.role ?? "doctor",
				permissions: [...PERMISSIONS],
				tools: defaultToolRegistry,
				db,
				...(doctorContext ? { metadata: { doctorContext } } : {}),
			};

			let assistantText = "";
			const assistantToolCalls: Record<string, unknown>[] = [];

			const sessionRecord = await defaultCopilotSessionStore
				.getSession(sessionId, resolvedOrgId)
				.catch(() => null);
			const effectiveSystemPrompt = buildCompactedSystemPrompt(
				DENTE_COPILOT_SYSTEM_PROMPT,
				sessionRecord?.summary,
				doctorContext,
			);

			try {
				const stream = AgentOrchestrator.runTurnStream({
					ctx,
					provider: defaultLlmProvider,
					system: effectiveSystemPrompt,
					history: session.history,
					toolNames: defaultToolRegistry.list(),
					redactor: session.redactor,
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

				await defaultSessionStore
					.save(sessionId, resolvedOrgId, session, userId, resolvedOrgId)
					.catch(() => {});
				reply.raw.end();
			}
		},
	);
};
