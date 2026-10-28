/**
 * clinicalToolRoutes.ts — Direct Clinical Copilot Tool Fastify Routes.
 *
 * Implements direct programmatic invocations for SOAP visit diaries,
 * prescriptions, treatment plans, and DDI interaction audits (Mandate 8b).
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getRequestIdentity } from "../../security/identity.js";
import { PERMISSIONS } from "../../security/permissions.js";
import {
	defaultToolRegistry,
	type AgentContext,
} from "../../services/agent/index.js";

function createClinicalContext(
	resolvedOrgId: string,
	userId: string,
): AgentContext {
	return {
		organizationId: resolvedOrgId,
		clinicId: resolvedOrgId,
		userId,
		sessionId: `copilot-direct-${Date.now()}`,
		mode: "autonomous",
		permissions: [...PERMISSIONS],
		tools: defaultToolRegistry,
		db,
	};
}

export const clinicalToolRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// POST /api/v1/copilot/clinical/diary — Generate outpatient visit record / SOAP diary
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
			const context = createClinicalContext(
				resolvedOrgId,
				identity.userId ?? "system",
			);

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

	// POST /api/v1/copilot/clinical/prescription-107 — Generate standard outpatient prescription
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
			const context = createClinicalContext(
				resolvedOrgId,
				identity.userId ?? "system",
			);

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
			const context = createClinicalContext(
				resolvedOrgId,
				identity.userId ?? "system",
			);

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
			const context = createClinicalContext(
				resolvedOrgId,
				identity.userId ?? "system",
			);

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
