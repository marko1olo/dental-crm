/**
 * agentToolsAndActionRoutes.ts — Tool Execution, Catalog & 2-Phase HITL Confirmations
 * Mandate 8b: Submodule decomposed from monolith agentRoutes.ts (< 300 lines).
 * T.A.R.S. Safety: Zero fallback to fake zero-UUID. Strictly 401 Unauthorized if unauthenticated.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { defineTenantMutation, defineTenantQuery } from "../../core/routeFactories.js";
import { getDoctorPreferencesFromDb } from "../../db/doctorPreferencesQuery.js";
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
		localDropzonePath: z.string().max(500).optional(),
		patientId: z.string().uuid().nullish(),
		visitId: z.string().uuid().nullish(),
	})
	.strict();

function resolveActionErrorStatusCode(
	errorCode: string | undefined,
	errorMessage: string | undefined,
): number {
	if (errorCode === "DESKTOP_DENIED") return 403;
	if (errorCode === "TOOL_NOT_FOUND") return 404;
	if (errorMessage) {
		if (
			errorMessage.includes("Конфликт") ||
			errorMessage.includes("уже подтверждено")
		) {
			return 409;
		}
		if (errorMessage.includes("не найден") || errorMessage.includes("истек срок")) {
			return 404;
		}
	}
	return 400;
}

export async function registerAgentToolsAndActionRoutes(
	server: FastifyInstance,
): Promise<void> {
	// ─── GET /api/agent/tools ──────────────────────────────────────────────────
	defineTenantQuery(server, {
		method: "GET",
		path: "/api/agent/tools",
		permission: "agent.read",
		authOptions: { allowClinicTokenWithoutStaff: true },
		handler: async ({ request }) => {
			const runtimeMode = resolveRuntimeMode(request);
			const tools = getDentalTools(runtimeMode);

			return {
				tools,
				count: tools.length,
				runtimeMode,
			};
		},
	});

	// ─── ACTION CONFIRMATION & DIRECT EXECUTION (TWO-PHASE GUARD & HITL) ──────
	const actionEndpoints = [
		"/api/agent/action",
		"/api/agent/confirm",
	];

	for (const endpoint of actionEndpoints) {
		defineTenantMutation(server, {
			method: "POST",
			path: endpoint,
			permission: "agent.write",
			authOptions: {
				requireStaffToken: true,
				allowClinicTokenWithoutStaff: false,
			},
			idempotency: "optional_header",
			execute: async ({ tx, principal, organizationId, request, reply }) => {
				const userId = principal.userId;
				if (!userId) {
					return reply.code(401).send({
						error: "StaffAuthRequired",
						message: "Необходима авторизация врача для выполнения клинического действия",
					});
				}

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

				let effectiveLocalDropzonePath = body.localDropzonePath;
				if (!effectiveLocalDropzonePath && allowLocalExecution) {
					const prefRecord = await getDoctorPreferencesFromDb(
						organizationId,
						userId,
						tx,
					);
					const prefs = (prefRecord?.preferences || {}) as Record<string, unknown>;
					const copilotSettings =
						prefs.copilotSettings && typeof prefs.copilotSettings === "object"
							? (prefs.copilotSettings as Record<string, unknown>)
							: undefined;
					if (
						typeof copilotSettings?.localDropzonePath === "string" &&
						copilotSettings.localDropzonePath.trim().length > 0
					) {
						effectiveLocalDropzonePath = copilotSettings.localDropzonePath.trim();
					}
				}

				// 1. Two-phase HITL confirmation / rejection via copilotActionManager
				if (callId) {
					const decision = body.decision ?? (body.confirmed !== false ? "confirm" : "reject");

					if (decision === "confirm") {
						const result = await defaultCopilotActionManager.confirmAction(
							{
								organizationId,
								clinicId: organizationId,
								userId,
								sessionId,
								mode: "autonomous",
								db: tx,
								metadata: {
									runtimeMode,
									patientId: body.patientId,
									activeVisitId: body.visitId,
									localDropzonePath: effectiveLocalDropzonePath,
								},
							},
							callId,
							body.modifiedArgs,
						);
						if (!result.ok) {
							const dataEnvelope =
								result.data && typeof result.data === "object"
									? (result.data as { code?: string })
									: undefined;
							const statusCode = resolveActionErrorStatusCode(
								dataEnvelope?.code,
								result.error,
							);
							return reply.code(statusCode).send({
								ok: false,
								result: result.data,
								data: result.data,
								error: result.error ?? "Не удалось подтвердить действие",
							});
						}
						return reply.code(200).send({
							ok: true,
							result: result.data,
							data: result.data,
						});
					}

					const rejection = await defaultCopilotActionManager.rejectActionAsync(
						callId,
						body.reason ?? "Отклонено пользователем",
						organizationId,
					);
					return reply.code(200).send({
						ok: true,
						rejected: true,
						reason: rejection.reason,
					});
				}

				const directToolName = body.toolName || body.tool;

				// 2. Direct tool execution via Canonical SSOT executeDentalTool
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
						organizationId,
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
						localDropzonePath: effectiveLocalDropzonePath,
						db: tx,
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
							const errorStatusCode = resolveActionErrorStatusCode(toolCode, toolError);
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
		});
	}
}
