/**
 * copilot.ts — Fastify API routes for DENTE Clinical AI Copilot.
 */

import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { appointments } from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import { PERMISSIONS } from "../security/permissions.js";
import {
	AgentOrchestrator,
	defaultCopilotActionManager,
	defaultLlmProvider,
	defaultToolRegistry,
	formatSseEvent,
	Redactor,
	type AgentContext,
	type ProviderMessage,
	type TurnEvent,
} from "../services/agent/index.js";

interface SessionState {
	history: ProviderMessage[];
	redactor: Redactor;
	updatedAt: number;
}

const sessionStore = new Map<string, SessionState>();

// Periodic session GC: remove sessions older than 24 hours
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
function cleanupStaleSessions(): void {
	const now = Date.now();
	for (const [id, session] of sessionStore.entries()) {
		if (now - session.updatedAt > SESSION_TTL_MS) {
			sessionStore.delete(id);
		}
	}
}

const messageBodySchema = z.object({
	content: z.string().optional(),
	message: z.string().optional(),
	text: z.string().optional(),
});

const confirmationBodySchema = z.object({
	decision: z.enum(["confirm", "reject"]),
	reason: z.string().optional(),
});

const DENTE_COPILOT_SYSTEM_PROMPT = `Вы — высококвалифицированный клинический AI-ассистент DENTE для стоматологов и администраторов клиник.
Ваша цель — ускорять работу врача, безошибочно вести медицинские карты 043/у по клиническим протоколам Стоматологической Ассоциации России (СтАР), находить данные пациентов, проверять свободные окна и контролировать планы лечения.
Отвечайте на чистом русском языке, четко, структурированно, без воды.
Используйте инструменты из реестра для поиска и изменения данных. При выполнении действий, требующих подтверждения, дождитесь решения врача.`;

export const copilotRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// Periodic GC
	cleanupStaleSessions();

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

			// Get or initialize session state
			let session = sessionStore.get(sessionId);
			if (!session) {
				session = {
					history: [],
					redactor: new Redactor(),
					updatedAt: Date.now(),
				};
				sessionStore.set(sessionId, session);
			}
			session.updatedAt = Date.now();

			// Append user message to history
			session.history.push({
				role: "user",
				content: userText,
			});

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
				permissions: [...PERMISSIONS],
				tools: defaultToolRegistry,
				db,
			};

			try {
				const stream = AgentOrchestrator.runTurnStream({
					ctx,
					provider: defaultLlmProvider,
					system: DENTE_COPILOT_SYSTEM_PROMPT,
					history: session.history,
					toolNames: defaultToolRegistry.list(),
					redactor: session.redactor,
				});

				for await (const event of stream) {
					if (event.type === "confirmation_required") {
						defaultCopilotActionManager.registerPending(
							sessionId,
							event.callId,
							event.name,
							event.arguments,
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
				reply.raw.end();
			}
		},
	);

	// POST /api/v1/copilot/chat — Unified SSE conversation endpoint
	server.post<{
		Body: { conversationId?: string; sessionId?: string; content?: string; message?: string; text?: string };
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
			const sessionId = body.conversationId ?? body.sessionId ?? `sess_${Date.now()}`;
			const userText = (body.content ?? body.message ?? body.text ?? "").trim();

			if (!userText) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Текст сообщения не может быть пустым",
				});
			}

			const identity = getRequestIdentity(request);
			const userId = identity.userId ?? "00000000-0000-7000-8000-000000000001";

			let session = sessionStore.get(sessionId);
			if (!session) {
				session = {
					history: [],
					redactor: new Redactor(),
					updatedAt: Date.now(),
				};
				sessionStore.set(sessionId, session);
			}
			session.updatedAt = Date.now();

			session.history.push({
				role: "user",
				content: userText,
			});

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
				permissions: [...PERMISSIONS],
				tools: defaultToolRegistry,
				db,
			};

			try {
				const stream = AgentOrchestrator.runTurnStream({
					ctx,
					provider: defaultLlmProvider,
					system: DENTE_COPILOT_SYSTEM_PROMPT,
					history: session.history,
					toolNames: defaultToolRegistry.list(),
					redactor: session.redactor,
				});

				for await (const event of stream) {
					if (event.type === "confirmation_required") {
						defaultCopilotActionManager.registerPending(
							sessionId,
							event.callId,
							event.name,
							event.arguments,
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
				reply.raw.end();
			}
		},
	);


	// POST /api/v1/copilot/sessions/:sessionId/confirmations/:callId — Doctor confirmation/rejection
	server.post<{
		Params: { sessionId: string; callId: string };
		Body: { decision: "confirm" | "reject"; reason?: string };
	}>(
		"/api/v1/copilot/sessions/:sessionId/confirmations/:callId",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot action confirmation",
			);
			if (!resolvedOrgId) return;

			const { sessionId, callId } = request.params;
			const parsedBody = confirmationBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Некорректный формат подтверждения: укажите decision ('confirm' | 'reject')",
				});
			}

			const identity = getRequestIdentity(request);
			const userId =
				identity.userId ?? "00000000-0000-7000-8000-000000000001";
			const { decision, reason } = parsedBody.data;

			// Setup SSE headers
			reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
			reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
			reply.raw.setHeader("Connection", "keep-alive");
			reply.raw.setHeader("X-Accel-Buffering", "no");
			reply.raw.flushHeaders?.();

			if (decision === "confirm") {
				const pending = defaultCopilotActionManager.getPending(callId);
				if (!pending) {
					reply.raw.write(
						formatSseEvent({
							type: "token",
							text: "\n\n⚠️ Запрос на действие не найден или истек срок ожидания (15 минут).",
						}),
					);
					reply.raw.write(
						formatSseEvent({ type: "final", stopReason: "expired" }),
					);
					reply.raw.end();
					return;
				}

				const ctx: AgentContext = {
					organizationId: resolvedOrgId,
					clinicId: resolvedOrgId,
					userId,
					sessionId,
					mode: "autonomous",
					permissions: [...PERMISSIONS],
					tools: defaultToolRegistry,
					db,
				};

				try {
					const result = await defaultCopilotActionManager.confirmAction(
						ctx,
						callId,
					);
					const toolFinishedEvent: TurnEvent = {
						type: "tool_call_finished",
						callId,
						name: pending.toolName,
						ok: result.ok,
						result: result.ok ? result.data : { error: result.error },
					};
					reply.raw.write(formatSseEvent(toolFinishedEvent));

					const tokenText = result.ok
						? `\n\n✅ Действие **${pending.toolName}** успешно подтверждено и выполнено.`
						: `\n\n❌ Ошибка при выполнении **${pending.toolName}**: ${result.error}`;
					reply.raw.write(formatSseEvent({ type: "token", text: tokenText }));
					reply.raw.write(
						formatSseEvent({ type: "final", stopReason: "stop" }),
					);
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : String(err);
					reply.raw.write(
						formatSseEvent({
							type: "token",
							text: `\n\n❌ Исключение при выполнении действия: ${errorMsg}`,
						}),
					);
					reply.raw.write(
						formatSseEvent({ type: "final", stopReason: "error" }),
					);
				} finally {
					reply.raw.end();
				}
				return;
			}

			// decision === "reject"
			const rejection = defaultCopilotActionManager.rejectAction(
				callId,
				reason ?? "Отклонено пользователем",
			);
			reply.raw.write(
				formatSseEvent({
					type: "token",
					text: `\n\n🚫 Действие отменено пользователем: ${rejection.reason}`,
				}),
			);
			reply.raw.write(
				formatSseEvent({ type: "final", stopReason: "rejected" }),
			);
			reply.raw.end();
		},
	);

	// POST /api/v1/copilot/confirm — Alias endpoint for backwards compatibility
	server.post<{
		Body: { sessionId?: string; callId: string; decision: "confirm" | "reject"; reason?: string };
	}>(
		"/api/v1/copilot/confirm",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot action confirmation alias",
			);
			if (!resolvedOrgId) return;

			const parsedBody = confirmationBodySchema.safeParse(request.body ?? {});
			const callId = (request.body as { callId?: string })?.callId;
			if (!parsedBody.success || !callId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат: укажите callId и decision ('confirm' | 'reject')",
				});
			}

			const identity = getRequestIdentity(request);
			const userId = identity.userId ?? "00000000-0000-7000-8000-000000000001";
			const sessionId = (request.body as { sessionId?: string })?.sessionId ?? "default-session";
			const { decision, reason } = parsedBody.data;

			if (decision === "confirm") {
				const pending = defaultCopilotActionManager.getPending(callId);
				if (!pending) {
					return reply.code(404).send({
						error: "NotFound",
						message: "Запрос на действие не найден или истек срок ожидания (15 минут)",
					});
				}

				const ctx: AgentContext = {
					organizationId: resolvedOrgId,
					clinicId: resolvedOrgId,
					userId,
					sessionId,
					mode: "autonomous",
					permissions: [...PERMISSIONS],
					tools: defaultToolRegistry,
					db,
				};

				const result = await defaultCopilotActionManager.confirmAction(ctx, callId);
				return reply.code(200).send({ ok: result.ok, result: result.ok ? result.data : undefined, error: result.error });
			}

			const rejection = defaultCopilotActionManager.rejectAction(callId, reason ?? "Отклонено пользователем");
			return reply.code(200).send({ ok: true, rejected: true, reason: rejection.reason });
		},
	);

	// GET /api/v1/copilot/nudges — Proactive clinic nudges and recommendations
	server.get("/api/v1/copilot/nudges", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"copilot read nudges",
		);
		if (!resolvedOrgId) return;

		const now = new Date();
		const startOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const endOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			23,
			59,
			59,
			999,
		);

		const nudges: Array<{
			id: string;
			kind: string;
			payload: Record<string, unknown>;
			created_at: string;
			expires_at: string;
		}> = [];

		try {
			// 1. Check today's appointments for pending visits
			const todayAppts = await db
				.select({
					id: appointments.id,
					status: appointments.status,
					startsAt: appointments.startsAt,
					patientId: appointments.patientId,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, resolvedOrgId),
						gte(appointments.startsAt, startOfDay),
						lte(appointments.startsAt, endOfDay),
					),
				)
				.limit(10);

			const plannedCount = todayAppts.filter(
				(a) => a.status === "planned" || a.status === "confirmed",
			).length;
			if (plannedCount > 0) {
				nudges.push({
					id: `nudge_today_appts_${startOfDay.getTime()}`,
					kind: "schedule_reminder",
					payload: {
						title: `Сегодня запланировано ${plannedCount} приёмов`,
						description:
							"Проверьте готовность кабинетов и амбулаторных карт 043/у",
						count: plannedCount,
					},
					created_at: now.toISOString(),
					expires_at: endOfDay.toISOString(),
				});
			}
		} catch {
			// If DB query encounters table locks or empty state, fall back safely
		}

		// Fallback default proactive nudges if list is empty
		if (nudges.length === 0) {
			nudges.push({
				id: `nudge_clinical_protocol_${now.getTime()}`,
				kind: "clinical_hint",
				payload: {
					title: "Заполнение дневника приёма 043/у",
					description:
						"Используйте диктовку голосом или команду 'Заполни дневник по шаблону'",
				},
				created_at: now.toISOString(),
				expires_at: new Date(now.getTime() + 8 * 3600 * 1000).toISOString(),
			});
		}

		return { data: nudges };
	});

	// POST /api/v1/copilot/dismiss-nudge — Dismiss proactive suggestion
	server.post<{ Body: { id?: string } }>(
		"/api/v1/copilot/dismiss-nudge",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot dismiss nudge",
			);
			if (!resolvedOrgId) return;

			return reply.send({ ok: true });
		},
	);
};
