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
	buildCompactedSystemPrompt,
	defaultCopilotActionManager,
	defaultCopilotSessionStore,
	defaultCopilotStreamManager,
	defaultLlmProvider,
	defaultSessionStore,
	defaultToolRegistry,
	defaultWhatsAppBridge,
	formatSseEvent,
	type AgentContext,
	type DoctorScreenContext,
	type ProactiveAlertCardData,
	type TurnEvent,
	type WhatsAppApprovalCardData,
} from "../services/agent/index.js";
import { defaultDaemonScheduler } from "../services/daemons/index.js";

export function extractDoctorScreenContext(
	text: string,
	bodyContext?: unknown,
): { doctorContext: DoctorScreenContext | null; cleanText: string } {
	if (bodyContext && typeof bodyContext === "object") {
		return {
			doctorContext: bodyContext as DoctorScreenContext,
			cleanText: text,
		};
	}

	const headerMatch = text.match(
		/^\[UI Context:\s*([\s\S]*?)\](?=\s*(?:\r?\n|$))(?:\r?\n)?/i,
	);
	if (!headerMatch) {
		return { doctorContext: null, cleanText: text };
	}

	const rawHeader = headerMatch[0];
	const headerBody = headerMatch[1] ?? "";

	const viewMatch = headerBody.match(/View='([^']*)'/i);
	const patientIdMatch = headerBody.match(/PatientId=(null|'[^']*')/i);
	const activeToothMatch = headerBody.match(/ActiveTooth=(null|[0-9]+|'[^']*')/i);
	const activeDoctorMatch = headerBody.match(/ActiveDoctor=(null|'[^']*')/i);
	const toothFormulaMatch = headerBody.match(/ToothFormula='([^']*)'/i);
	const diagnosesMatch = headerBody.match(/Diagnoses='([^']*)'/i);
	const form043Match = headerBody.match(/Form043='([^']*)'/i);
	const allergiesMatch = headerBody.match(/Allergies='([^']*)'/i);

	const patientId =
		patientIdMatch?.[1] && patientIdMatch[1] !== "null"
			? patientIdMatch[1].replace(/^'|'$/g, "").replace(/\\'/g, "'")
			: null;

	let activeTooth: number | string | null = null;
	if (activeToothMatch?.[1] && activeToothMatch[1] !== "null") {
		const unquoted = activeToothMatch[1]
			.replace(/^'|'$/g, "")
			.replace(/\\'/g, "'");
		const num = Number(unquoted);
		activeTooth = !Number.isNaN(num) && num > 0 ? num : unquoted;
	}

	const activeDoctor =
		activeDoctorMatch?.[1] && activeDoctorMatch[1] !== "null"
			? activeDoctorMatch[1].replace(/^'|'$/g, "").replace(/\\'/g, "'")
			: null;

	let toothFormula: Record<string, string> | undefined = undefined;
	if (toothFormulaMatch?.[1]) {
		const raw = toothFormulaMatch[1].replace(/\\'/g, "'");
		try {
			toothFormula = JSON.parse(raw);
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse toothFormula JSON:", raw, err);
		}
	}

	let diagnosesByTooth: Record<string, string> | undefined = undefined;
	if (diagnosesMatch?.[1]) {
		const raw = diagnosesMatch[1].replace(/\\'/g, "'");
		try {
			diagnosesByTooth = JSON.parse(raw);
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse diagnosesByTooth JSON:", raw, err);
		}
	}

	let clinical043Context: Record<string, string> | undefined = undefined;
	if (form043Match?.[1]) {
		const raw = form043Match[1].replace(/\\'/g, "'");
		try {
			clinical043Context = JSON.parse(raw);
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse clinical043Context JSON:", raw, err);
		}
	}

	let allergies: string[] | undefined = undefined;
	if (allergiesMatch?.[1]) {
		const raw = allergiesMatch[1].replace(/\\'/g, "'");
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				allergies = parsed.map(String);
			}
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse allergies JSON:", raw, err);
			// Resilient fallback: parse comma-separated or bracketed tokens so critical life-saving allergies are not lost
			const salvaged = raw
				.replace(/^[\["']+|[\]"']+$/g, "")
				.split(/[,\n;]+/)
				.map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
				.filter(Boolean);
			if (salvaged.length > 0) {
				allergies = salvaged;
			}
		}
	}

	const doctorContext: DoctorScreenContext = {
		view: viewMatch?.[1] || null,
		patientId,
		activeTooth,
		activeDoctor,
		toothFormula: toothFormula ?? null,
		diagnosesByTooth: diagnosesByTooth ?? null,
		clinical043Context: (clinical043Context as any) ?? null,
		allergies: allergies ?? null,
	};

	const cleanText = text.slice(rawHeader.length).trimStart();
	return { doctorContext, cleanText };
}

const messageBodySchema = z.object({
	content: z.string().optional(),
	message: z.string().optional(),
	text: z.string().optional(),
	uiContext: z.record(z.unknown()).optional(),
	context: z.record(z.unknown()).optional(),
});

const confirmationBodySchema = z.object({
	sessionId: z.string().optional(),
	callId: z.string().optional(),
	decision: z.enum(["confirm", "reject"]),
	reason: z.string().optional(),
	modifiedArgs: z.record(z.unknown()).optional(),
});

const createSessionBodySchema = z.object({
	id: z.string().optional(),
	userId: z.string().optional(),
	patientId: z.string().optional(),
	activeView: z.string().optional(),
	summary: z.string().optional(),
});

const listSessionsQuerySchema = z.object({
	userId: z.string().optional(),
	patientId: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional(),
	offset: z.coerce.number().min(0).optional(),
});

const getMessagesQuerySchema = z.object({
	limit: z.coerce.number().min(1).max(200).optional(),
	offset: z.coerce.number().min(0).optional(),
	order: z.enum(["asc", "desc"]).optional(),
});

const ztlScanBodySchema = z.object({
	organizationId: z.string().uuid().optional(),
	lookAheadHours: z.number().min(1).max(168).optional(),
});

const emrSaviorBodySchema = z.object({
	organizationId: z.string().uuid().optional(),
	targetDate: z.string().optional(),
});

const retentionScanBodySchema = z.object({
	organizationId: z.string().uuid().optional(),
});

const gapFillerBodySchema = z.object({
	cancelledAppointmentId: z.string().uuid(),
	organizationId: z.string().uuid().optional(),
	maxCandidates: z.number().min(1).max(20).optional(),
});

const proactiveAlertsQuerySchema = z.object({
	organizationId: z.string().uuid().optional(),
	liveScan: z.enum(["true", "false"]).optional(),
});

const DENTE_COPILOT_SYSTEM_PROMPT = `Вы — высококвалифицированный клинический AI-ассистент DENTE для стоматологов и администраторов клиник.
Ваша цель — ускорять работу врача, безошибочно вести медицинские карты 043/у по клиническим протоколам Стоматологической Ассоциации России (СтАР), находить данные пациентов, проверять свободные окна и контролировать планы лечения.
Отвечайте на чистом русском языке, четко, структурированно, без воды.
Используйте инструменты из реестра для поиска и изменения данных. При выполнении действий, требующих подтверждения, дождитесь решения врача.`;

export const copilotRoutes: FastifyPluginAsync = async (
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

	// POST /api/v1/copilot/sessions/:sessionId/confirmations/:callId — Doctor confirmation/rejection
	server.post<{
		Params: { sessionId: string; callId: string };
		Body: {
			decision: "confirm" | "reject";
			reason?: string;
			modifiedArgs?: Record<string, unknown>;
		};
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
			const { decision, reason, modifiedArgs } = parsedBody.data;

			const wantsJson = request.headers.accept === "application/json";

			if (decision === "confirm") {
				const pending = await defaultCopilotActionManager.resolvePending(
					callId,
					resolvedOrgId,
				);
				if (!pending) {
					if (wantsJson) {
						return reply.code(404).send({
							error: "NotFound",
							message:
								"Запрос на действие не найден или истек срок ожидания (15 минут)",
						});
					}
					reply.raw.setHeader(
						"Content-Type",
						"text/event-stream; charset=utf-8",
					);
					reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
					reply.raw.setHeader("Connection", "keep-alive");
					reply.raw.setHeader("X-Accel-Buffering", "no");
					reply.raw.flushHeaders?.();
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
					role: identity.role ?? "doctor",
					permissions: [...PERMISSIONS],
					tools: defaultToolRegistry,
					db,
				};

				try {
					const result = await defaultCopilotActionManager.confirmAction(
						ctx,
						callId,
						modifiedArgs,
					);

					if (wantsJson) {
						return reply.code(200).send({
							ok: result.ok,
							result: result.ok ? result.data : undefined,
							error: result.error,
						});
					}

					// Setup SSE headers for ReAct Stream Closure
					reply.raw.setHeader(
						"Content-Type",
						"text/event-stream; charset=utf-8",
					);
					reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
					reply.raw.setHeader("Connection", "keep-alive");
					reply.raw.setHeader("X-Accel-Buffering", "no");
					reply.raw.flushHeaders?.();

					const toolFinishedEvent: TurnEvent = {
						type: "tool_call_finished",
						callId,
						name: pending.toolName,
						ok: result.ok,
						result: result.ok ? result.data : { error: result.error },
					};
					reply.raw.write(formatSseEvent(toolFinishedEvent));

					// Append tool result into persistent session history
					const session = await defaultSessionStore.getOrCreate(
						sessionId,
						resolvedOrgId,
						userId,
						resolvedOrgId,
					);

					session.history.push({
						role: "tool",
						content: [
							{
								type: "tool_result",
								toolCallId: callId,
								content: result.ok ? result.data : { error: result.error },
								isError: !result.ok,
							},
						],
					});

					// Continue ReAct turn to generate closing assistant message
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
								{ organizationId: resolvedOrgId, userId },
							);
						}
						reply.raw.write(formatSseEvent(event));
					}

					await defaultSessionStore
						.save(sessionId, resolvedOrgId, session, userId, resolvedOrgId)
						.catch(() => {});
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
			const rejection = await defaultCopilotActionManager.rejectActionAsync(
				callId,
				reason ?? "Отклонено пользователем",
				resolvedOrgId,
			);

			if (wantsJson) {
				return reply.code(200).send({
					ok: true,
					rejected: true,
					reason: rejection.reason,
				});
			}

			reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
			reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
			reply.raw.setHeader("Connection", "keep-alive");
			reply.raw.setHeader("X-Accel-Buffering", "no");
			reply.raw.flushHeaders?.();

			try {
				const session = await defaultSessionStore.getOrCreate(
					sessionId,
					resolvedOrgId,
					userId,
					resolvedOrgId,
				);

				session.history.push({
					role: "tool",
					content: [
						{
							type: "tool_result",
							toolCallId: callId,
							content: {
								error: `Действие отменено пользователем: ${rejection.reason}`,
							},
							isError: true,
						},
					],
				});

				reply.raw.write(
					formatSseEvent({
						type: "token",
						text: `\n\n🚫 Действие отменено пользователем: ${rejection.reason}`,
					}),
				);
				reply.raw.write(
					formatSseEvent({ type: "final", stopReason: "rejected" }),
				);

				await defaultSessionStore
					.save(sessionId, resolvedOrgId, session, userId, resolvedOrgId)
					.catch(() => {});
			} finally {
				reply.raw.end();
			}
		},
	);

	// POST /api/v1/copilot/confirm — Unified confirm endpoint with ReAct Stream Closure
	server.post<{
		Body: {
			sessionId?: string;
			callId: string;
			decision: "confirm" | "reject";
			reason?: string;
			modifiedArgs?: Record<string, unknown>;
		};
	}>(
		"/api/v1/copilot/confirm",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot action confirmation",
			);
			if (!resolvedOrgId) return;

			const parsedBody = confirmationBodySchema.safeParse(request.body ?? {});
			const callId =
				parsedBody.success && parsedBody.data.callId
					? parsedBody.data.callId
					: (request.body as { callId?: string })?.callId;
			if (!parsedBody.success || !callId) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Некорректный формат: укажите callId и decision ('confirm' | 'reject')",
				});
			}

			const identity = getRequestIdentity(request);
			const userId =
				identity.userId ?? "00000000-0000-7000-8000-000000000001";
			const sessionId =
				parsedBody.data.sessionId ??
				(request.body as { sessionId?: string })?.sessionId ??
				"default-session";
			const { decision, reason, modifiedArgs } = parsedBody.data;

			const wantsJson = request.headers.accept === "application/json";

			if (decision === "confirm") {
				const pending = await defaultCopilotActionManager.resolvePending(
					callId,
					resolvedOrgId,
				);
				if (!pending) {
					if (wantsJson) {
						return reply.code(404).send({
							error: "NotFound",
							message:
								"Запрос на действие не найден или истек срок ожидания (15 минут)",
						});
					}
					reply.raw.setHeader(
						"Content-Type",
						"text/event-stream; charset=utf-8",
					);
					reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
					reply.raw.setHeader("Connection", "keep-alive");
					reply.raw.setHeader("X-Accel-Buffering", "no");
					reply.raw.flushHeaders?.();
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
					role: identity.role ?? "doctor",
					permissions: [...PERMISSIONS],
					tools: defaultToolRegistry,
					db,
				};

				try {
					const result = await defaultCopilotActionManager.confirmAction(
						ctx,
						callId,
						modifiedArgs,
					);

					if (wantsJson) {
						return reply.code(200).send({
							ok: result.ok,
							result: result.ok ? result.data : undefined,
							error: result.error,
						});
					}

					// Setup SSE headers for ReAct Stream Closure
					reply.raw.setHeader(
						"Content-Type",
						"text/event-stream; charset=utf-8",
					);
					reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
					reply.raw.setHeader("Connection", "keep-alive");
					reply.raw.setHeader("X-Accel-Buffering", "no");
					reply.raw.flushHeaders?.();

					const toolFinishedEvent: TurnEvent = {
						type: "tool_call_finished",
						callId,
						name: pending.toolName,
						ok: result.ok,
						result: result.ok ? result.data : { error: result.error },
					};
					reply.raw.write(formatSseEvent(toolFinishedEvent));

					// Append tool result into persistent session history
					const session = await defaultSessionStore.getOrCreate(
						sessionId,
						resolvedOrgId,
						userId,
						resolvedOrgId,
					);

					session.history.push({
						role: "tool",
						content: [
							{
								type: "tool_result",
								toolCallId: callId,
								content: result.ok ? result.data : { error: result.error },
								isError: !result.ok,
							},
						],
					});

					// Continue ReAct turn to generate closing assistant message
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
								{ organizationId: resolvedOrgId, userId },
							);
						}
						reply.raw.write(formatSseEvent(event));
					}

					await defaultSessionStore
						.save(sessionId, resolvedOrgId, session, userId, resolvedOrgId)
						.catch(() => {});
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
			const rejection = await defaultCopilotActionManager.rejectActionAsync(
				callId,
				reason ?? "Отклонено пользователем",
				resolvedOrgId,
			);

			if (wantsJson) {
				return reply.code(200).send({
					ok: true,
					rejected: true,
					reason: rejection.reason,
				});
			}

			reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
			reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
			reply.raw.setHeader("Connection", "keep-alive");
			reply.raw.setHeader("X-Accel-Buffering", "no");
			reply.raw.flushHeaders?.();

			try {
				const session = await defaultSessionStore.getOrCreate(
					sessionId,
					resolvedOrgId,
					userId,
					resolvedOrgId,
				);

				session.history.push({
					role: "tool",
					content: [
						{
							type: "tool_result",
							toolCallId: callId,
							content: {
								error: `Действие отменено пользователем: ${rejection.reason}`,
							},
							isError: true,
						},
					],
				});

				reply.raw.write(
					formatSseEvent({
						type: "token",
						text: `\n\n🚫 Действие отменено пользователем: ${rejection.reason}`,
					}),
				);
				reply.raw.write(
					formatSseEvent({ type: "final", stopReason: "rejected" }),
				);

				await defaultSessionStore
					.save(sessionId, resolvedOrgId, session, userId, resolvedOrgId)
					.catch(() => {});
			} finally {
				reply.raw.end();
			}
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

	// POST /api/v1/copilot/clinical/diary — Generate 043/у visit diary protocol
	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/diary",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot generate visit diary",
			);
			if (!resolvedOrgId) return;

			const identity = getRequestIdentity(request);
			const context: AgentContext = {
				organizationId: resolvedOrgId,
				clinicId: resolvedOrgId,
				userId: identity.userId ?? "system",
				sessionId: `copilot-direct-${Date.now()}`,
				mode: "autonomous",
				permissions: [...PERMISSIONS],
				tools: defaultToolRegistry,
				db,
			};

			try {
				const result = await defaultToolRegistry.call(
					context,
					"generate_visit_diary",
					request.body ?? {},
				);
				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(400).send({
					error: "ClinicalToolExecutionError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/clinical/prescription-107 — Generate Form 107-1/у prescription
	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/prescription-107",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot create prescription 107",
			);
			if (!resolvedOrgId) return;

			const identity = getRequestIdentity(request);
			const context: AgentContext = {
				organizationId: resolvedOrgId,
				clinicId: resolvedOrgId,
				userId: identity.userId ?? "system",
				sessionId: `copilot-direct-${Date.now()}`,
				mode: "autonomous",
				permissions: [...PERMISSIONS],
				tools: defaultToolRegistry,
				db,
			};

			try {
				const result = await defaultToolRegistry.call(
					context,
					"create_prescription_107",
					request.body ?? {},
				);
				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(400).send({
					error: "PrescriptionGenerationError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/clinical/treatment-plan — Generate 3-Tier Treatment Plan
	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/treatment-plan",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot suggest treatment plan",
			);
			if (!resolvedOrgId) return;

			const identity = getRequestIdentity(request);
			const context: AgentContext = {
				organizationId: resolvedOrgId,
				clinicId: resolvedOrgId,
				userId: identity.userId ?? "system",
				sessionId: `copilot-direct-${Date.now()}`,
				mode: "autonomous",
				permissions: [...PERMISSIONS],
				tools: defaultToolRegistry,
				db,
			};

			try {
				const result = await defaultToolRegistry.call(
					context,
					"suggest_treatment_plan",
					request.body ?? {},
				);
				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(400).send({
					error: "TreatmentPlanGenerationError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/clinical/check-ddi — Audit DDI & Medication Contraindications
	server.post<{ Body: Record<string, unknown> }>(
		"/api/v1/copilot/clinical/check-ddi",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot check drug interactions",
			);
			if (!resolvedOrgId) return;

			const identity = getRequestIdentity(request);
			const context: AgentContext = {
				organizationId: resolvedOrgId,
				clinicId: resolvedOrgId,
				userId: identity.userId ?? "system",
				sessionId: `copilot-direct-${Date.now()}`,
				mode: "autonomous",
				permissions: [...PERMISSIONS],
				tools: defaultToolRegistry,
				db,
			};

			try {
				const result = await defaultToolRegistry.call(
					context,
					"check_drug_interaction",
					request.body ?? {},
				);
				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(400).send({
					error: "DrugSafetyAuditError",
					message: errMsg,
				});
			}
		},
	);

	// =========================================================================
	// SERVER-INITIATED PROACTIVE MESSAGES & SSE STREAM HUB
	// =========================================================================

	// GET /api/v1/copilot/stream — Persistent SSE connection for proactive alerts & HitL
	const handleCopilotProactiveStream = async (
		request: any,
		reply: any,
	) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"copilot proactive stream",
		);
		if (!resolvedOrgId) return;

		const identity = getRequestIdentity(request);
		const userId = identity.userId ?? undefined;
		const query = (request.query as Record<string, string>) || {};
		const sessionId = query.sessionId || undefined;
		const subscriberId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

		// Setup SSE Headers
		reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
		reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
		reply.raw.setHeader("Connection", "keep-alive");
		reply.raw.setHeader("X-Accel-Buffering", "no");
		reply.raw.flushHeaders?.();

		// Initial connection handshake
		const welcomeChunk = formatSseEvent({
			type: "connected",
			subscriberId,
			organizationId: resolvedOrgId,
			timestamp: new Date().toISOString(),
		});
		reply.raw.write(welcomeChunk);

		// Stream existing active proactive alerts for this tenant on connect
		const activeAlerts = defaultWhatsAppBridge
			.getHitLQueue()
			.listProactiveAlerts(resolvedOrgId);
		for (const alert of activeAlerts) {
			reply.raw.write(formatSseEvent({ type: "proactive_alert", data: alert }));
		}

		// Register subscriber in CopilotStreamManager
		const unsubscribe = defaultCopilotStreamManager.subscribe({
			id: subscriberId,
			organizationId: resolvedOrgId,
			userId,
			sessionId,
			send: (chunk: string) => {
				try {
					if (!reply.raw.writableEnded && !reply.raw.destroyed) {
						reply.raw.write(chunk);
						return true;
					}
					return false;
				} catch {
					return false;
				}
			},
			close: () => {
				try {
					if (!reply.raw.writableEnded) reply.raw.end();
				} catch (closeErr) {
					console.warn("[Copilot SSE] Error ending raw response stream:", closeErr);
				}
			},
		});

		// 20-second heartbeat to keep SSE alive
		const heartbeatTimer = setInterval(() => {
			try {
				if (!reply.raw.writableEnded && !reply.raw.destroyed) {
					reply.raw.write(`: ping ${Date.now()}\n\n`);
				} else {
					clearInterval(heartbeatTimer);
					unsubscribe();
				}
			} catch {
				clearInterval(heartbeatTimer);
				unsubscribe();
			}
		}, 20000);

		request.raw.on("close", () => {
			clearInterval(heartbeatTimer);
			unsubscribe();
		});
	};

	server.get(
		"/api/v1/copilot/stream",
		{ config: { tenantTxSelfManaged: true } },
		handleCopilotProactiveStream,
	);

	server.post(
		"/api/v1/copilot/stream",
		{ config: { tenantTxSelfManaged: true } },
		handleCopilotProactiveStream,
	);

	// GET /api/v1/copilot/proactive/pending — List active emergency alerts & HitL cards
	server.get(
		"/api/v1/copilot/proactive/pending",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot list proactive pending",
			);
			if (!resolvedOrgId) return;

			const queue = defaultWhatsAppBridge.getHitLQueue();
			const alerts = queue.listProactiveAlerts(resolvedOrgId);
			const hitlCards = queue.listPendingCards(resolvedOrgId);

			return reply.send({
				ok: true,
				alerts,
				hitlCards,
			});
		},
	);

	// POST /api/v1/copilot/proactive/approve — 1-Click Approve WhatsApp/HitL message
	server.post<{
		Body: {
			approvalId: string;
			modifiedReply?: string;
			sendNow?: boolean;
		};
	}>(
		"/api/v1/copilot/proactive/approve",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot approve proactive card",
			);
			if (!resolvedOrgId) return;

			const { approvalId, modifiedReply, sendNow } = request.body || {};
			if (!approvalId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указан approvalId",
				});
			}

			try {
				const queue = defaultWhatsAppBridge.getHitLQueue();
				const approveOptions: { modifiedReply?: string; sendNow?: boolean } = {};
				if (modifiedReply !== undefined) approveOptions.modifiedReply = modifiedReply;
				if (sendNow !== undefined) approveOptions.sendNow = sendNow;
				const result = await queue.approveCard(approvalId, resolvedOrgId, approveOptions);

				// Broadcast resolution to active copilot streams
				defaultCopilotStreamManager.broadcastToOrganization(
					resolvedOrgId,
					"proactive_alert_resolved",
					{
						id: approvalId,
						status: "approved",
						sent: result.sent,
					},
				);

				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(404).send({
					error: "ApprovalError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/proactive/reject — 1-Click Reject WhatsApp/HitL card
	server.post<{
		Body: {
			approvalId: string;
			reason?: string;
		};
	}>(
		"/api/v1/copilot/proactive/reject",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot reject proactive card",
			);
			if (!resolvedOrgId) return;

			const { approvalId, reason } = request.body || {};
			if (!approvalId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указан approvalId",
				});
			}

			try {
				const queue = defaultWhatsAppBridge.getHitLQueue();
				const result = await queue.rejectCard(
					approvalId,
					resolvedOrgId,
					reason,
				);

				// Broadcast resolution to active copilot streams
				defaultCopilotStreamManager.broadcastToOrganization(
					resolvedOrgId,
					"proactive_alert_resolved",
					{
						id: approvalId,
						status: "rejected",
						reason,
					},
				);

				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(404).send({
					error: "RejectionError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/proactive/dismiss-alert — Dismiss proactive alert card
	server.post<{
		Body: {
			alertId: string;
		};
	}>(
		"/api/v1/copilot/proactive/dismiss-alert",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot dismiss proactive alert",
			);
			if (!resolvedOrgId) return;

			const { alertId } = request.body || {};
			if (!alertId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указан alertId",
				});
			}

			const deleted = defaultWhatsAppBridge
				.getHitLQueue()
				.dismissProactiveAlert(alertId);

			defaultCopilotStreamManager.broadcastToOrganization(
				resolvedOrgId,
				"proactive_alert_dismissed",
				{ alertId },
			);

			return reply.send({ ok: true, deleted });
		},
	);

	// POST /api/v1/copilot/proactive/trigger-triage — Trigger Triage on message
	server.post<{
		Body: {
			text: string;
			fromPhone?: string;
			patientId?: string;
			patientName?: string;
		};
	}>(
		"/api/v1/copilot/proactive/trigger-triage",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger triage",
			);
			if (!resolvedOrgId) return;

			const { text, fromPhone, patientId, patientName } = request.body || {};
			if (!text || !text.trim()) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Текст сообщения не может быть пустым",
				});
			}

			const result = await defaultWhatsAppBridge.handleIncomingMessage({
				messageId: `msg_${Date.now()}`,
				fromPhone: fromPhone || "+79990000000",
				rawText: text,
				patientId: patientId || null,
				patientName: patientName || null,
				organizationId: resolvedOrgId,
			});

			return reply.send({ ok: true, data: result });
		},
	);

	// =========================================================================
	// BACKGROUND DAEMONS & SCHEDULER CONTROL ENDPOINTS
	// =========================================================================

	// POST /api/v1/copilot/daemons/ztl-scan — Trigger 08:00 AM ZTL Look-Ahead scan on demand
	server.post(
		"/api/v1/copilot/daemons/ztl-scan",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger ztl scan",
			);
			if (!resolvedOrgId) return;

			const parsedBody = ztlScanBodySchema.safeParse(request.body ?? {});
			const body = parsedBody.success ? parsedBody.data : {};
			const orgId = body.organizationId ?? resolvedOrgId;

			const alerts = await defaultDaemonScheduler.triggerZtlScan({
				organizationId: orgId,
				...(body.lookAheadHours !== undefined ? { lookAheadHours: body.lookAheadHours } : {}),
			});

			return reply.send({ ok: true, data: alerts, count: alerts.length });
		},
	);

	// POST /api/v1/copilot/daemons/emr-savior — Trigger 21:00 PM EMR Savior scan on demand
	server.post(
		"/api/v1/copilot/daemons/emr-savior",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger emr savior",
			);
			if (!resolvedOrgId) return;

			const parsedBody = emrSaviorBodySchema.safeParse(request.body ?? {});
			const body = parsedBody.success ? parsedBody.data : {};
			const orgId = body.organizationId ?? resolvedOrgId;

			const alerts = await defaultDaemonScheduler.triggerEmrSaviorScan({
				organizationId: orgId,
				...(body.targetDate ? { targetDate: new Date(body.targetDate) } : {}),
			});

			return reply.send({ ok: true, data: alerts, count: alerts.length });
		},
	);

	// POST /api/v1/copilot/daemons/retention-scan — Trigger Weekly Retention Hunter scan on demand
	server.post(
		"/api/v1/copilot/daemons/retention-scan",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger retention scan",
			);
			if (!resolvedOrgId) return;

			const parsedBody = retentionScanBodySchema.safeParse(request.body ?? {});
			const body = parsedBody.success ? parsedBody.data : {};
			const orgId = body.organizationId ?? resolvedOrgId;

			const summaries = await defaultDaemonScheduler.triggerRetentionScan({
				organizationId: orgId,
			});

			return reply.send({ ok: true, data: summaries, count: summaries.length });
		},
	);

	// POST /api/v1/copilot/daemons/gap-filler — Trigger Smart Gap-Filler when appointment is cancelled
	server.post(
		"/api/v1/copilot/daemons/gap-filler",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger gap filler",
			);
			if (!resolvedOrgId) return;

			const parsedBody = gapFillerBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный запрос: укажите cancelledAppointmentId",
				});
			}

			const alert = await defaultDaemonScheduler.triggerGapFiller(
				parsedBody.data.cancelledAppointmentId,
				{
					organizationId: parsedBody.data.organizationId ?? resolvedOrgId,
					...(parsedBody.data.maxCandidates !== undefined
						? { maxCandidates: parsedBody.data.maxCandidates }
						: {}),
				},
			);

			if (!alert) {
				return reply.code(404).send({
					error: "NotFound",
					message: "Отмененный прием не найден",
				});
			}

			return reply.send({ ok: true, data: alert });
		},
	);

	// GET /api/v1/copilot/proactive/alerts — Get aggregated proactive alerts (ZTL, EMR Savior, Retention)
	server.get(
		"/api/v1/copilot/proactive/alerts",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot get proactive alerts",
			);
			if (!resolvedOrgId) return;

			const parsedQuery = proactiveAlertsQuerySchema.safeParse(request.query ?? {});
			const query = parsedQuery.success ? parsedQuery.data : {};
			const orgId = query.organizationId ?? resolvedOrgId;
			const liveScan = query.liveScan === "true" || query.liveScan === undefined;

			const aggregate = await defaultDaemonScheduler.getProactiveAlerts({
				organizationId: orgId,
				liveScan,
			});

			return reply.send({ ok: true, data: aggregate });
		},
	);
};

