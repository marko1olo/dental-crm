/**
 * agentToolsAndActionRoutes.ts — Tool Execution, Catalog & 2-Phase HITL Confirmations
 * Mandate 8b: Submodule decomposed from monolith agentRoutes.ts (< 300 lines).
 * T.A.R.S. Safety: Zero fallback to fake zero-UUID. Strictly 401 Unauthorized if unauthenticated.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	getDentalTools,
	executeDentalTool,
	normalizeToolName,
	type DentalToolContext,
} from "../../ai/dentalTools.js";
import { defaultCopilotActionManager } from "../../ai/copilotActionManager.js";
import { resolveRuntimeMode } from "./agentChatRoutes.js";

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
					patientId?: string;
					visitId?: string;
				};

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
						patientId: (typeof effectiveArgs.patientId === "string" ? effectiveArgs.patientId : undefined) || body.patientId || undefined,
						activeVisitId: (typeof effectiveArgs.visitId === "string" ? effectiveArgs.visitId : undefined) || body.visitId || undefined,
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
						const rawToolResult = await executeDentalTool(canonicalTool, effectiveArgs, dentalContext);
						const toolResult = rawToolResult && typeof rawToolResult === "object"
							? (rawToolResult as Record<string, unknown>)
							: null;
						const isSuccess = toolResult ? toolResult.success !== false : true;
						const toolError = typeof toolResult?.error === "string" ? toolResult.error : undefined;
						return reply.code(200).send({
							ok: isSuccess,
							result: rawToolResult,
							data: rawToolResult,
							error: toolError,
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
								patientId: body.patientId,
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
			},
		);
	}
};
