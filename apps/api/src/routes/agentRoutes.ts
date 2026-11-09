/**
 * agentRoutes.ts — Fastify Endpoints for Autonomous Clinical Dental AI Agent
 *
 * Implements:
 * - POST /api/agent/chat — SSE streaming and JSON ReAct completions
 * - GET  /api/agent/tools — Registry of dental clinical tools & desktop native extensions
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { getRequestIdentity } from "../security/identity.js";
import { runAgentHarness, type AgentHarnessEvent } from "../ai/agentHarness.js";
import {
	getDentalTools,
	executeDentalTool,
	normalizeToolName,
	type AgentRuntimeMode,
	type DentalToolContext,
} from "../ai/dentalTools.js";
import {
	validateUniversalApiKeyLive,
	type AgentRouterChatMessage,
} from "../ai/agentRouterClient.js";
import { registerAgentSessionRoutes } from "./agentSessionRoutes.js";
import { defaultCopilotActionManager } from "../ai/copilotActionManager.js";
import { addMessageToDb } from "../ai/session/copilotMessageDb.js";
import {
	getDoctorPreferencesFromDb,
	saveDoctorPreferencesInDb,
} from "../db/doctorPreferencesQuery.js";

const chatMessageSchema = z.object({
	role: z.enum(["system", "user", "assistant", "tool"]),
	content: z.string().nullable().optional(),
	name: z.string().optional(),
	tool_call_id: z.string().optional(),
	tool_calls: z.array(z.any()).optional(),
});

const agentChatBodySchema = z.object({
	messages: z.array(chatMessageSchema).min(1, "Массив сообщений не может быть пустым"),
	patientId: z.string().uuid().optional(),
	activeVisitId: z.string().uuid().optional(),
	sessionId: z.string().optional(),
	conversationId: z.string().optional(),
	stream: z.boolean().optional().default(false),
	runtimeMode: z.enum(["web_browser", "desktop_native", "chairside_tablet", "mobile_tablet"]).optional(),
	enableAutoCompaction: z.boolean().optional(),
	compactThresholdTokens: z.number().int().positive().optional(),
	slidingWindowRetainedTurns: z.number().int().positive().optional(),
	initialSummary: z.string().optional(),
	trustLevel: z.enum(["confirm_all", "balanced", "autonomous", "cautious", "supervised"]).optional(),
	granularPermissions: z.object({
		autoApproveFileReads: z.boolean().optional(),
		autoApproveFileWrites: z.boolean().optional(),
		autoApproveClinicalMutations: z.boolean().optional(),
		autoApproveFinancialDrafts: z.boolean().optional(),
		autoApproveExternalSoftware: z.boolean().optional(),
	}).optional(),
	customInstructions: z.string().optional(),
	memoryFacts: z.array(z.string()).optional(),
	doctorSpecialization: z.string().optional(),
	speedMode: z.enum(["turbo", "deep_reasoning"]).optional(),
	activeTooth: z.number().int().min(11).max(85).nullable().optional(),
	swarmRole: z.enum(["orchestrator", "triage", "odontogram_inquisitor", "billing_sentinel", "vision_specialist"]).optional(),
	fallbackToDeterministicAgent: z.boolean().optional(),
	modelRoutingMode: z.enum(["server_managed", "custom_byok"]).optional(),
	byokProvider: z.string().optional(),
	byokApiKey: z.string().optional(),
	byokModel: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	contextLimitTokens: z.number().int().positive().optional(),
	showTypingAnimation: z.boolean().optional(),
});

function formatSseMessage(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function resolveRuntimeMode(
	request: FastifyRequest,
	bodyRuntimeMode?: string,
): AgentRuntimeMode {
	const headerRuntime = request.headers["x-agent-runtime"];
	if (
		headerRuntime === "desktop_native" ||
		bodyRuntimeMode === "desktop_native" ||
		process.env.IS_DESKTOP_EXE === "true"
	) {
		return "desktop_native";
	}
	return "web_browser";
}

function normalizeIncomingBody(
	rawBody: unknown,
	params?: { sessionId?: string },
	headers?: Record<string, string | string[] | undefined>,
): Record<string, unknown> {
	const b = (rawBody && typeof rawBody === "object") ? { ...(rawBody as Record<string, unknown>) } : {};
	if (!Array.isArray(b.messages)) {
		const text = (
			(b.content as string) ??
			(b.message as string) ??
			(b.text as string) ??
			""
		).trim();
		if (text) {
			b.messages = [{ role: "user", content: text }];
		}
	}
	if (params?.sessionId && !b.sessionId && !b.conversationId) {
		b.sessionId = params.sessionId;
	}
	const accept = headers?.accept;
	if (
		b.stream === undefined &&
		((typeof accept === "string" && accept.includes("text/event-stream")) || Boolean(params?.sessionId))
	) {
		b.stream = true;
	}
	return b;
}

/**
 * Canonical SSOT handler for agent and copilot chat requests (Mandate 8s).
 * Handles streaming SSE and standard JSON ReAct turns.
 */
export async function handleAgentChat(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const resolvedOrgId = await requireResolvedOrganizationId(
		request,
		reply,
		"agent chat",
	);
	if (!resolvedOrgId) return;

	const normalizedBody = normalizeIncomingBody(
		request.body,
		request.params as { sessionId?: string } | undefined,
		request.headers as Record<string, string | string[] | undefined>,
	);

	const parseResult = agentChatBodySchema.safeParse(normalizedBody);
	if (!parseResult.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректное тело запроса для агента",
			details: parseResult.error.format(),
		});
	}

	const body = parseResult.data;
	const runtimeMode = resolveRuntimeMode(request, body.runtimeMode);
	const identity = getRequestIdentity(request);
	const doctorId = identity.userId || undefined;

	// Canonical SSOT Trust Level normalization (cautious, supervised, autonomous)
	const normalizedTrust: "cautious" | "supervised" | "autonomous" | undefined =
		body.trustLevel === "confirm_all" ? "cautious" :
		body.trustLevel === "balanced" ? "supervised" :
		body.trustLevel;

	const isSseRequested =
		body.stream === true ||
		(request.headers.accept?.includes("text/event-stream") ?? false);

	const abortController = new AbortController();
	request.raw.on("close", () => {
		abortController.abort();
	});

	// STREAMING SSE MODE
	if (isSseRequested) {
		reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
		reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
		reply.raw.setHeader("Connection", "keep-alive");
		reply.raw.setHeader("X-Accel-Buffering", "no");
		reply.raw.flushHeaders?.();

		try {
			const harnessResult = await runAgentHarness({
				messages: body.messages as AgentRouterChatMessage[],
				context: {
					organizationId: resolvedOrgId,
					doctorId,
					patientId: body.patientId,
					activeVisitId: body.activeVisitId,
					runtimeMode,
				},
				runtimeMode,
				enableAutoCompaction: body.enableAutoCompaction,
				compactThresholdTokens: body.compactThresholdTokens,
				slidingWindowRetainedTurns: body.slidingWindowRetainedTurns,
				initialSummary: body.initialSummary,
				trustLevel: normalizedTrust,
				granularPermissions: body.granularPermissions,
				customInstructions: body.customInstructions,
				memoryFacts: body.memoryFacts,
				doctorSpecialization: body.doctorSpecialization,
				speedMode: body.speedMode,
				activeTooth: body.activeTooth,
				swarmRole: body.swarmRole,
				fallbackToDeterministicAgent: body.fallbackToDeterministicAgent,
				modelRoutingMode: body.modelRoutingMode,
				byokProvider: body.byokProvider,
				byokApiKey: body.byokApiKey,
				byokModel: body.byokModel,
				sessionId: body.sessionId || body.conversationId,
				temperature: body.temperature,
				contextLimitTokens: body.contextLimitTokens,
				showTypingAnimation: body.showTypingAnimation,
				signal: abortController.signal,
				onEvent: (event: AgentHarnessEvent) => {
					if (!reply.raw.writableEnded) {
						if (event.type === "tool_start") {
							reply.raw.write(formatSseMessage("tool_call_started", { name: event.tool, arguments: event.args }));
							reply.raw.write(formatSseMessage("tool_start", event));
						} else if (event.type === "tool_end") {
							reply.raw.write(formatSseMessage("tool_call_finished", { name: event.tool, result: event.result }));
							reply.raw.write(formatSseMessage("tool_end", event));
						} else if (event.type === "confirmation_required") {
							const sessId = body.sessionId || body.conversationId || `sess_${Date.now()}`;
							defaultCopilotActionManager.registerPending(
								sessId,
								event.callId,
								event.tool,
								event.args,
								{ organizationId: resolvedOrgId, userId: doctorId },
							);
							reply.raw.write(formatSseMessage("confirmation_required", event));
						} else if (event.type === "done") {
							reply.raw.write(formatSseMessage("final", event));
							reply.raw.write(formatSseMessage("done", event));
						} else {
							reply.raw.write(formatSseMessage(event.type, event));
						}
					}
				},
			});

			// Persistent Dialogue Memory: save user message and assistant answer into copilot_messages
			const targetSessionId = body.sessionId || body.conversationId;
			if (targetSessionId) {
				try {
					const lastUserPrompt = [...body.messages].reverse().find((m) => m.role === "user")?.content;
					if (lastUserPrompt && typeof lastUserPrompt === "string" && lastUserPrompt.trim().length > 0) {
						await addMessageToDb({
							sessionId: targetSessionId,
							organizationId: resolvedOrgId,
							role: "user",
							content: lastUserPrompt.trim(),
							autoCompact: false,
						});
					}
					if (harnessResult?.text && typeof harnessResult.text === "string" && harnessResult.text.trim().length > 0) {
						await addMessageToDb({
							sessionId: targetSessionId,
							organizationId: resolvedOrgId,
							role: "assistant",
							content: harnessResult.text.trim(),
							toolCalls: harnessResult.toolCalls?.length ? (harnessResult.toolCalls as any) : null,
							autoCompact: body.enableAutoCompaction ?? true,
						});
					}
				} catch (persistErr) {
					request.log.warn({ err: persistErr, targetSessionId }, "[agentRoutes] Failed to persist SSE copilot messages to PostgreSQL");
				}
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (!reply.raw.writableEnded) {
				reply.raw.write(formatSseMessage("error", { error: msg }));
			}
		} finally {
			if (!reply.raw.writableEnded) {
				reply.raw.end();
			}
		}
		return;
	}

	// STANDARD JSON MODE
	try {
		const result = await runAgentHarness({
			messages: body.messages as AgentRouterChatMessage[],
			context: {
				organizationId: resolvedOrgId,
				doctorId,
				patientId: body.patientId,
				activeVisitId: body.activeVisitId,
				runtimeMode,
			},
			runtimeMode,
			enableAutoCompaction: body.enableAutoCompaction,
			compactThresholdTokens: body.compactThresholdTokens,
			slidingWindowRetainedTurns: body.slidingWindowRetainedTurns,
			initialSummary: body.initialSummary,
			trustLevel: normalizedTrust,
			granularPermissions: body.granularPermissions,
			customInstructions: body.customInstructions,
			memoryFacts: body.memoryFacts,
			doctorSpecialization: body.doctorSpecialization,
			speedMode: body.speedMode,
			activeTooth: body.activeTooth,
			swarmRole: body.swarmRole,
			fallbackToDeterministicAgent: body.fallbackToDeterministicAgent,
			modelRoutingMode: body.modelRoutingMode,
			byokProvider: body.byokProvider,
			byokApiKey: body.byokApiKey,
			byokModel: body.byokModel,
			sessionId: body.sessionId || body.conversationId,
			temperature: body.temperature,
			contextLimitTokens: body.contextLimitTokens,
			showTypingAnimation: body.showTypingAnimation,
			signal: abortController.signal,
		});

		// Persistent Dialogue Memory: save user message and assistant answer into copilot_messages
		const targetSessionId = body.sessionId || body.conversationId;
		if (targetSessionId) {
			try {
				const lastUserPrompt = [...body.messages].reverse().find((m) => m.role === "user")?.content;
				if (lastUserPrompt && typeof lastUserPrompt === "string" && lastUserPrompt.trim().length > 0) {
					await addMessageToDb({
						sessionId: targetSessionId,
						organizationId: resolvedOrgId,
						role: "user",
						content: lastUserPrompt.trim(),
						autoCompact: false,
					});
				}
				if (result?.text && typeof result.text === "string" && result.text.trim().length > 0) {
					await addMessageToDb({
						sessionId: targetSessionId,
						organizationId: resolvedOrgId,
						role: "assistant",
						content: result.text.trim(),
						toolCalls: result.toolCalls?.length ? (result.toolCalls as any) : null,
						autoCompact: body.enableAutoCompaction ?? true,
					});
				}
			} catch (persistErr) {
				request.log.warn({ err: persistErr, targetSessionId }, "[agentRoutes] Failed to persist JSON copilot messages to PostgreSQL");
			}
		}

		return reply.code(200).send({
			text: result.text,
			toolCalls: result.toolCalls,
			iterations: result.iterations,
			runtimeMode,
			compacted: result.compacted,
			summary: result.summary,
			tokenUsage: result.tokenUsage,
		});
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		return reply.code(500).send({
			error: "AgentExecutionError",
			message: msg,
		});
	}
}

export const registerAgentRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
): Promise<void> => {
	// ─── POST /api/agent/chat ──────────────────────────────────────────────────
	server.post(
		"/api/agent/chat",
		{ config: { tenantTxSelfManaged: true } },
		handleAgentChat,
	);

	// ─── GET /api/agent/tools ──────────────────────────────────────────────────
	server.get(
		"/api/agent/tools",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"agent tools",
			);
			if (!resolvedOrgId) return;

			const runtimeMode = resolveRuntimeMode(request);
			const tools = getDentalTools(runtimeMode);

			return reply.code(200).send({
				tools,
				count: tools.length,
				runtimeMode,
			});
		},
	);

	// ─── POST /api/agent/validate-key ──────────────────────────────────────────
	server.post(
		"/api/agent/validate-key",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"validate byok key",
			);
			if (!resolvedOrgId) return;

			const bodySchema = z.object({
				provider: z.enum(["gemini", "openai", "anthropic", "deepseek", "custom", "groq"]),
				apiKey: z.string().min(1, "API-ключ обязателен"),
				model: z.string().optional(),
				baseUrl: z.string().optional(),
			});

			const parseResult = bodySchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					valid: false,
					message: "Некорректные параметры валидации API-ключа",
					details: parseResult.error.format(),
				});
			}

			const { provider, apiKey, model, baseUrl } = parseResult.data;
			const validation = await validateUniversalApiKeyLive(
				provider,
				apiKey,
				model,
				baseUrl,
			);

			return reply.code(200).send(validation);
		},
	);

	// ─── GET /api/agent/memory ──────────────────────────────────────────────────
	server.get(
		"/api/agent/memory",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"agent get memory",
			);
			if (!resolvedOrgId) return;

			const identity = getRequestIdentity(request);
			const record = await getDoctorPreferencesFromDb(
				resolvedOrgId,
				identity.userId || null,
			);
			const prefs = (record?.preferences || {}) as Record<string, unknown>;
			const memoryFacts = Array.isArray(prefs.copilotMemoryFacts)
				? prefs.copilotMemoryFacts
				: [];

			return reply.code(200).send({ memoryFacts });
		},
	);

	// ─── PUT /api/agent/memory ──────────────────────────────────────────────────
	server.put(
		"/api/agent/memory",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"agent save memory",
			);
			if (!resolvedOrgId) return;

			const bodySchema = z.object({
				memoryFacts: z.array(z.any()),
			});

			const parseResult = bodySchema.safeParse(request.body ?? {});
			if (!parseResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат фактов клинической памяти",
					details: parseResult.error.format(),
				});
			}

			const identity = getRequestIdentity(request);
			const current = await getDoctorPreferencesFromDb(
				resolvedOrgId,
				identity.userId || null,
			);
			const existingPrefs = (current?.preferences || {}) as Record<string, unknown>;
			const nextPrefs = {
				...existingPrefs,
				copilotMemoryFacts: parseResult.data.memoryFacts,
			};

			await saveDoctorPreferencesInDb(
				resolvedOrgId,
				identity.userId || null,
				nextPrefs,
				current?.specialty || "therapist",
			);

			return reply.code(200).send({
				success: true,
				memoryFacts: parseResult.data.memoryFacts,
			});
		},
	);

	// ─── ACTION CONFIRMATION ENDPOINTS (TWO-PHASE GUARD & HITL) ───────────────
	const actionEndpoints = [
		"/api/agent/action",
		"/api/copilot/action",
		"/api/v1/copilot/confirm",
		"/api/copilot/confirm",
	];

	for (const endpoint of actionEndpoints) {
		server.post(
			endpoint,
			{ config: { tenantTxSelfManaged: true } },
			async (request: FastifyRequest, reply: FastifyReply) => {
				const resolvedOrgId = await requireResolvedOrganizationId(
					request,
					reply,
					"copilot action confirmation",
				);
				if (!resolvedOrgId) return;

				const body = (request.body ?? {}) as {
					sessionId?: string;
					callId?: string;
					decision?: "confirm" | "reject";
					reason?: string;
					modifiedArgs?: Record<string, unknown>;
					confirmed?: boolean;
					toolName?: string;
					tool?: string;
					args?: Record<string, unknown>;
					arguments?: Record<string, unknown>;
					runtimeMode?: string;
				};

				const identity = getRequestIdentity(request);
				const userId = identity.userId ?? "00000000-0000-7000-8000-000000000001";
				const sessionId = body.sessionId ?? "default-session";
				const runtimeMode = resolveRuntimeMode(request, body.runtimeMode);
				const directToolName = body.toolName || body.tool;

				// 1. Direct tool execution via Canonical SSOT executeDentalTool
				if (directToolName) {
					const effectiveArgs = (body.args || body.arguments || body.modifiedArgs || {}) as Record<string, unknown>;
					const dentalContext: DentalToolContext = {
						organizationId: resolvedOrgId,
						userId,
						doctorId: userId,
						patientId: (effectiveArgs.patientId as string) || (body as any).patientId || undefined,
						activeVisitId: (effectiveArgs.visitId as string) || (body as any).visitId || undefined,
						activeTooth: typeof effectiveArgs.toothNumber === "number"
							? effectiveArgs.toothNumber
							: typeof effectiveArgs.tooth === "number"
								? effectiveArgs.tooth
								: undefined,
						runtimeMode,
						allowLocalExecution: true,
					};

					try {
						const canonicalTool = normalizeToolName(directToolName);
						const toolResult = (await executeDentalTool(canonicalTool, effectiveArgs, dentalContext)) as any;
						const isSuccess = toolResult && typeof toolResult === "object" ? toolResult.success !== false : true;
						return reply.code(200).send({
							ok: isSuccess,
							result: toolResult,
							data: toolResult,
							error: toolResult?.error || undefined,
						});
					} catch (err: unknown) {
						return reply.code(200).send({
							ok: false,
							error: err instanceof Error ? err.message : String(err),
						});
					}
				}

				const callId = body.callId;
				if (!callId) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Некорректный формат: укажите callId или toolName",
					});
				}

				const decision = body.decision ?? (body.confirmed !== false ? "confirm" : "reject");

				if (decision === "confirm") {
					const result = await defaultCopilotActionManager.confirmAction(
						{
							organizationId: resolvedOrgId,
							clinicId: resolvedOrgId,
							userId,
							sessionId,
							mode: "autonomous",
							metadata: {
								runtimeMode,
								patientId: (body as any).patientId,
							},
						},
						callId,
						body.modifiedArgs,
					);
					return reply.code(200).send({
						ok: result.ok,
						result: result.ok ? result.data : undefined,
						error: result.error,
					});
				}

				const rejection = await defaultCopilotActionManager.rejectActionAsync(
					callId,
					body.reason ?? "Отклонено пользователем",
					resolvedOrgId,
				);
				return reply.code(200).send({
					ok: true,
					rejected: true,
					reason: rejection.reason,
				});
			},
		);
	}

	// ─── REGISTER SESSION & DIALOGUE HISTORY ROUTES ────────────────────────────
	await registerAgentSessionRoutes(server);
};
