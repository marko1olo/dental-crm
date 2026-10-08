/**
 * actionRoutes.ts — Layer 2: Fastify Routes for Doctor Action Confirmations and Clinical Tools.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getRequestIdentity } from "../../security/identity.js";
import { PERMISSIONS } from "../../security/permissions.js";
import {
	AgentOrchestrator,
	buildDenteAgentSystemPrompt,
	defaultCopilotActionManager,
	defaultLlmProvider,
	defaultSessionStore,
	defaultToolRegistry,
	formatSseEvent,
	type AgentContext,
	type TurnEvent,
} from "../../services/agent/index.js";
import { confirmationBodySchema } from "./types.js";

const DENTE_COPILOT_SYSTEM_PROMPT = buildDenteAgentSystemPrompt();

export const actionRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
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
};
