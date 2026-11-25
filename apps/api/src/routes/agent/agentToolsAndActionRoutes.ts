/**
 * agentToolsAndActionRoutes.ts — Tool Execution, Catalog & 2-Phase HITL Confirmations
 * Mandate 8b: Submodule decomposed from monolith agentRoutes.ts (< 300 lines).
 * T.A.R.S. Safety: Zero fallback to fake zero-UUID. Strictly 401 Unauthorized if unauthenticated.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	getDentalTools,
	executeDentalTool,
	isDestructiveDentalTool,
	normalizeToolName,
	type DentalToolContext,
} from "../../ai/dentalTools.js";
import { defaultCopilotActionManager } from "../../ai/copilotActionManager.js";
import { ensureValidUuid, UUID_REGEX } from "../../ai/session/copilotSessionTypes.js";
import { resolveRuntimeMode } from "./agentChatRoutes.js";

const agentActionBodySchema = z
	.object({
		sessionId: z.string().optional(),
		callId: z.string().trim().min(1).optional(),
		decision: z.enum(["confirm", "reject"]).optional(),
		reason: z.string().max(2000).optional(),
		modifiedArgs: z.record(z.unknown()).optional(),
		confirmed: z.boolean().optional(),
		toolName: z.string().trim().min(1).optional(),
		tool: z.string().trim().min(1).optional(),
		args: z.record(z.unknown()).optional(),
		arguments: z.record(z.unknown()).optional(),
		runtimeMode: z
			.enum(["web_browser", "desktop_native", "chairside_tablet", "mobile_tablet"])
			.optional(),
		patientId: z.string().uuid().optional(),
		visitId: z.string().uuid().optional(),
	})
	.strict();

export async function registerAgentToolsAndActionRoutes(
	server: FastifyInstance,
): Promise<void> {
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

	// ─── ACTION CONFIRMATION & DIRECT EXECUTION (TWO-PHASE GUARD & HITL) ──────
	const actionEndpoints = [
		"/api/agent/action",
		"/api/agent/confirm",
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

				const identity = getRequestIdentity(request);
				if (!identity.userId) {
					return reply.code(401).send({
						error: "Unauthorized",
						message: "Необходима авторизация врача для выполнения клинического действия",
					});
				}
				const userId = identity.userId;

				const parsedBody = agentActionBodySchema.safeParse(request.body ?? {});
				if (!parsedBody.success) {
					return reply.code(400).send({
						ok: false,
						error: "ValidationError",
						message: "Некорректные параметры выполнения действия",
						details: parsedBody.error.format(),
					});
				}

				const body = parsedBody.data;
				const sessionId = ensureValidUuid(body.sessionId);
				const runtimeMode = resolveRuntimeMode(request, body.runtimeMode);
				const allowLocalExecution = runtimeMode === "desktop_native";
				const callId = body.callId;

				// 1. Two-phase HITL confirmation / rejection via copilotActionManager (takes precedence when callId is provided)
				if (callId) {
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
									patientId: body.patientId,
									activeVisitId: body.visitId,
								},
							},
							callId,
							body.modifiedArgs,
						);
						if (!result.ok && (result.error?.includes("Конфликт") || result.error?.includes("уже подтверждено"))) {
							return reply.code(409).send({
								ok: false,
								error: result.error,
							});
						}
						return reply.code(result.ok ? 200 : 400).send({
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
				}

				const directToolName = body.toolName || body.tool;

				// 2. Direct tool execution via Canonical SSOT executeDentalTool (requires explicit confirmed=true for destructive tools)
				if (directToolName) {
					const canonicalTool = normalizeToolName(directToolName);
					if (isDestructiveDentalTool(canonicalTool) && body.confirmed !== true) {
						return reply.code(403).send({
							ok: false,
							error: "ConfirmationRequired",
							message: "Деструктивное действие требует подтверждения врача (передайте confirmed: true или callId)",
						});
					}

					const effectiveArgs: Record<string, unknown> = {
						...(body.args || body.arguments || body.modifiedArgs || {}),
					};
					if (body.confirmed === true && effectiveArgs.confirmed === undefined) {
						effectiveArgs.confirmed = true;
					}

					if (typeof effectiveArgs.patientId === "string" && !UUID_REGEX.test(effectiveArgs.patientId)) {
						return reply.code(400).send({
							ok: false,
							error: "ValidationError",
							message: "Некорректный UUID пациента в аргументах инструмента",
						});
					}
					if (typeof effectiveArgs.visitId === "string" && !UUID_REGEX.test(effectiveArgs.visitId)) {
						return reply.code(400).send({
							ok: false,
							error: "ValidationError",
							message: "Некорректный UUID приёма в аргументах инструмента",
						});
					}

					const dentalContext: DentalToolContext = {
						organizationId: resolvedOrgId,
						userId,
						doctorId: userId,
						patientId: (typeof effectiveArgs.patientId === "string" ? effectiveArgs.patientId : undefined) || body.patientId || undefined,
						activeVisitId: (typeof effectiveArgs.visitId === "string" ? effectiveArgs.visitId : undefined) || body.visitId || undefined,
						activeTooth: typeof effectiveArgs.toothNumber === "number"
							? effectiveArgs.toothNumber
							: typeof effectiveArgs.tooth === "number"
								? effectiveArgs.tooth
								: undefined,
						runtimeMode,
						allowLocalExecution,
					};

					try {
						const rawToolResult = await executeDentalTool(canonicalTool, effectiveArgs, dentalContext);
						const toolResult = rawToolResult && typeof rawToolResult === "object"
							? (rawToolResult as Record<string, unknown>)
							: null;
						const isSuccess = toolResult ? toolResult.success !== false : true;
						const toolCode = typeof toolResult?.code === "string" ? toolResult.code : undefined;
						const toolError = typeof toolResult?.error === "string" ? toolResult.error : undefined;

						if (!isSuccess) {
							const errorStatusCode =
								toolCode === "DESKTOP_DENIED"
									? 403
									: toolCode === "TOOL_NOT_FOUND"
										? 404
										: 400;
							return reply.code(errorStatusCode).send({
								ok: false,
								result: rawToolResult,
								data: rawToolResult,
								error: toolError ?? "Ошибка выполнения инструмента",
							});
						}

						return reply.code(200).send({
							ok: true,
							result: rawToolResult,
							data: rawToolResult,
							error: toolError,
						});
					} catch (err: unknown) {
						request.log.error({ err, toolName: canonicalTool }, "[agentToolsAndActionRoutes] Tool execution failed");
						return reply.code(500).send({
							ok: false,
							error: err instanceof Error ? err.message : String(err),
						});
					}
				}

				return reply.code(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректный формат: укажите callId или toolName",
				});
			},
		);
	}
};
