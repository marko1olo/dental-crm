/**
 * agentChatRoutes.ts — Autonomous Clinical Dental AI Agent: Chat & SSE ReAct Stream
 * Mandate 8b: Submodule decomposed from monolith agentRoutes.ts (< 300 lines).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { runAgentHarness, type AgentHarnessEvent } from "../../ai/agentHarness.js";
import type { AgentRuntimeMode } from "../../ai/dentalTools.js";
import type { AgentRouterChatMessage } from "../../ai/agentRouterClient.js";
import { defaultCopilotActionManager } from "../../ai/copilotActionManager.js";
import { addMessageToDb } from "../../ai/session/copilotMessageDb.js";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tolerantUuid = z.string().optional().transform((val) => {
	if (!val) return undefined;
	const trimmed = val.trim();
	return uuidRegex.test(trimmed) ? trimmed : undefined;
});

const agentToolCallSchema = z
	.object({
		id: z.string().optional(),
		type: z.string().optional(),
		function: z
			.object({
				name: z.string().optional(),
				arguments: z.string().optional(),
			})
			.passthrough()
			.optional(),
	})
	.passthrough();

const chatMessageSchema = z.object({
	role: z.enum(["system", "user", "assistant", "tool"]),
	content: z.string().nullable().optional(),
	name: z.string().optional(),
	tool_call_id: z.string().optional(),
	tool_calls: z.array(agentToolCallSchema).optional(),
});

export const agentChatBodySchema = z.object({
	messages: z.array(chatMessageSchema).min(1, "Массив сообщений не может быть пустым"),
	patientId: tolerantUuid,
	activeVisitId: tolerantUuid,
	sessionId: z.string().optional(),
	conversationId: z.string().optional(),
	stream: z.boolean().optional().default(false),
	runtimeMode: z.enum(["web_browser", "desktop_native", "chairside_tablet", "mobile_tablet"]).optional(),
	maskPhiData: z.boolean().optional(),
	enableAutoCompaction: z.boolean().optional(),
	compactThresholdTokens: z.number().int().positive().optional(),
	slidingWindowRetainedTurns: z.number().int().positive().optional(),
	initialSummary: z.string().optional(),
	trustLevel: z.enum(["confirm_all", "balanced", "autonomous"]).optional(),
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
	patientAllergies: z.array(z.string()).optional(),
	allergies: z.array(z.string()).optional(),
	somaticHistory: z.union([z.string(), z.array(z.string())]).optional(),
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

export function formatSseMessage(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function resolveRuntimeMode(
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

export function normalizeIncomingBody(
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
	const normalizedTrust = body.trustLevel;

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
					patientAllergies: body.patientAllergies || body.allergies,
					somaticHistory: body.somaticHistory,
					runtimeMode,
				},
				runtimeMode,
				maskPhiData: body.maskPhiData,
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
							toolCalls: harnessResult.toolCalls?.length
								? harnessResult.toolCalls.map((tc): Record<string, unknown> => ({
										tool: tc.tool,
										args: tc.args,
										result: tc.result,
								  }))
								: null,
							autoCompact: body.enableAutoCompaction ?? true,
						});
					}
				} catch (persistErr) {
					request.log.warn({ err: persistErr, targetSessionId }, "[agentChatRoutes] Failed to persist SSE copilot messages to PostgreSQL");
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
				patientAllergies: body.patientAllergies || body.allergies,
				somaticHistory: body.somaticHistory,
				runtimeMode,
			},
			runtimeMode,
			maskPhiData: body.maskPhiData,
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
						toolCalls: result.toolCalls?.length
							? result.toolCalls.map((tc): Record<string, unknown> => ({
									tool: tc.tool,
									args: tc.args,
									result: tc.result,
							  }))
							: null,
						autoCompact: body.enableAutoCompaction ?? true,
					});
				}
			} catch (persistErr) {
				request.log.warn({ err: persistErr, targetSessionId }, "[agentChatRoutes] Failed to persist JSON copilot messages to PostgreSQL");
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

export async function registerAgentChatRoutes(
	server: FastifyInstance,
): Promise<void> {
	server.post(
		"/api/agent/chat",
		{ config: { tenantTxSelfManaged: true } },
		handleAgentChat,
	);
}
