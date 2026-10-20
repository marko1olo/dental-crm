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
import type { AgentRouterChatMessage } from "../ai/agentRouterClient.js";

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
	stream: z.boolean().optional().default(false),
	runtimeMode: z.enum(["web_browser", "desktop_native"]).optional(),
	enableAutoCompaction: z.boolean().optional(),
	compactThresholdTokens: z.number().int().positive().optional(),
	slidingWindowRetainedTurns: z.number().int().positive().optional(),
	initialSummary: z.string().optional(),
});

function formatSseMessage(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function resolveRuntimeMode(
	request: FastifyRequest,
	bodyRuntimeMode?: AgentRuntimeMode,
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

export const registerAgentRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
): Promise<void> => {
	// ─── POST /api/agent/chat ──────────────────────────────────────────────────
	server.post(
		"/api/agent/chat",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"agent chat",
			);
			if (!resolvedOrgId) return;

			const parseResult = agentChatBodySchema.safeParse(request.body ?? {});
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
						signal: abortController.signal,
						onEvent: (event: AgentHarnessEvent) => {
							if (!reply.raw.writableEnded) {
								reply.raw.write(formatSseMessage(event.type, event));
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
		},
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
};
