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
import { getDentalTools, type AgentRuntimeMode } from "../ai/dentalTools.js";
import {
	validateUniversalApiKeyLive,
	type AgentRouterChatMessage,
} from "../ai/agentRouterClient.js";
import { registerAgentSessionRoutes } from "./agentSessionRoutes.js";
import { defaultCopilotActionManager } from "../services/agent/index.js";

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

	// Normalize trust level
	const normalizedTrust: "confirm_all" | "balanced" | "autonomous" | undefined =
		body.trustLevel === "cautious" ? "confirm_all" :
		body.trustLevel === "supervised" ? "balanced" :
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
			await runAgentHarness({
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
				signal: abortController.signal,
				onEvent: (event: AgentHarnessEvent) => {
					if (!reply.raw.writableEnded) {
						if (event.type === "tool_start") {
							reply.raw.write(formatSseMessage("tool_call_started", { name: event.tool, arguments: event.arguments }));
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
								event.arguments,
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
			signal: abortController.signal,
		});

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

	// ─── REGISTER SESSION & DIALOGUE HISTORY ROUTES ────────────────────────────
	await registerAgentSessionRoutes(server);
};
