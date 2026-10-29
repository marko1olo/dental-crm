/**
 * actionRoutes.ts — Layer 2: Fastify Routes for Doctor Action Confirmations and Clinical Tools.
 *
 * Mandate 8b: Refactored and decomposed into:
 * - actionConfirmationHandler.ts (shared confirm/reject logic with ReAct stream closure)
 * - clinicalToolRoutes.ts (direct clinical diary, prescription, plan, DDI routes)
 *
 * Provides two-phase execution guard and doctor confirmation workflows.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { handleActionConfirmation } from "./actionConfirmationHandler.js";
import { clinicalToolRoutes } from "./clinicalToolRoutes.js";
import { confirmationBodySchema } from "./types.js";

export const actionRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// Register direct clinical tool endpoints
	await server.register(clinicalToolRoutes);

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

			await handleActionConfirmation({
				reply,
				resolvedOrgId,
				userId,
				role: identity.role ?? "doctor",
				sessionId,
				callId,
				decision,
				reason,
				modifiedArgs,
				wantsJson,
			});
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

			await handleActionConfirmation({
				reply,
				resolvedOrgId,
				userId,
				role: identity.role ?? "doctor",
				sessionId,
				callId,
				decision,
				reason,
				modifiedArgs,
				wantsJson,
			});
		},
	);

	// POST /api/copilot/action — Canonical Fastify endpoint for copilot actions & confirmations
	server.post<{
		Body: {
			sessionId?: string;
			callId?: string;
			decision?: "confirm" | "reject";
			reason?: string;
			modifiedArgs?: Record<string, unknown>;
		};
	}>(
		"/api/copilot/action",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
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
			};
			const callId = body.callId;
			if (!callId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат: укажите callId",
				});
			}

			const identity = getRequestIdentity(request);
			const userId =
				identity.userId ?? "00000000-0000-7000-8000-000000000001";
			const sessionId = body.sessionId ?? "default-session";
			const decision = body.decision ?? (body.confirmed !== false ? "confirm" : "reject");

			await handleActionConfirmation({
				reply,
				resolvedOrgId,
				userId,
				role: identity.role ?? "doctor",
				sessionId,
				callId,
				decision,
				reason: body.reason,
				modifiedArgs: body.modifiedArgs,
				wantsJson: true,
			});
		},
	);
};
