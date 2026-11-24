/**
 * visitWriteOffHandlers.ts — Layer 2: Fastify route handlers for atomic consumable write-offs
 * on visit completion, stock sufficiency checks, alerts, and 1-click bundles.
 * All mutations run inside withTenantCtx fail-closed RLS context.
 */

import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { TreatmentConsumablesService } from "../../../services/treatmentConsumablesService.js";
import {
	alertsQuerySchema,
	emergencyWriteoffSchema,
	quickWriteoffCarpulesSchema,
	quickWriteoffEmergencyAntishockSchema,
	quickWriteoffVisitBundleSchema,
	stockAvailabilityCheckRequestSchema,
	treatmentConsumableDeductionRequestSchema,
	visitStockDeductionRequestSchema,
} from "./types.js";

/**
 * Registers visit write-off, stock check, alert, emergency write-off, and 1-click bundle routes.
 */
export async function registerVisitWriteOffHandlers(
	server: FastifyInstance,
): Promise<void> {
	// POST /apply-deduction — Idempotent consumable deduction on visit completion (Mandate 8e Doctor Autonomy)
	server.post("/apply-deduction", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables apply deduction",
		);
		if (!orgId) return;

		const parsed = treatmentConsumableDeductionRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		const result = await withTenantCtx(orgId, async (tx) => {
			return TreatmentConsumablesService.applyDeduction(
				orgId,
				parsed.data,
				tx,
			);
		});
		return reply.status(200).send(result);
	});

	// POST /:organizationId/deduct/visit — Auto-deduct consumables for visit (doctor instant solo writeoff)
	server.post<{
		Params: { organizationId: string };
		Body: {
			visitId: string;
			userId?: string | null;
			transactionType?: "auto_deduct" | "manual_writeoff";
			services?: Array<{ serviceId: string; quantity?: number }>;
			items?: Array<{ inventoryItemId: string; quantity: number; reason?: string | null }>;
			carpulesCount?: number;
			drugName?: string;
			paperJournalAcknowledged?: boolean;
			allowOverdraft?: boolean;
		};
	}>("/:organizationId/deduct/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables deduct visit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = visitStockDeductionRequestSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		const result = await withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.deductForVisit(tx, {
				organizationId,
				visitId: parsedBody.data.visitId,
				clientMutationId:
					parsedBody.data.clientMutationId ??
					(request.headers["idempotency-key"] as string | undefined) ??
					null,
				...(parsedBody.data.userId !== undefined
					? { userId: parsedBody.data.userId }
					: { userId: getRequestIdentity(request).userId }),
				...(parsedBody.data.transactionType !== undefined
					? { transactionType: parsedBody.data.transactionType }
					: {}),
				...(parsedBody.data.services !== undefined
					? { services: parsedBody.data.services }
					: {}),
				...(parsedBody.data.items !== undefined
					? { items: parsedBody.data.items }
					: {}),
				...(parsedBody.data.carpulesCount !== undefined
					? { carpulesCount: parsedBody.data.carpulesCount }
					: {}),
				...(parsedBody.data.drugName !== undefined
					? { drugName: parsedBody.data.drugName }
					: {}),
				...(parsedBody.data.paperJournalAcknowledged !== undefined
					? { paperJournalAcknowledged: parsedBody.data.paperJournalAcknowledged }
					: {}),
				...(parsedBody.data.allowOverdraft !== undefined
					? { allowOverdraft: parsedBody.data.allowOverdraft }
					: {}),
			});
		});
		return result;
	});

	// POST /:organizationId/check-availability — Pre-flight check stock sufficiency
	server.post<{
		Params: { organizationId: string };
		Body: {
			items: Array<{ serviceId: string; quantity: number }>;
		};
	}>("/:organizationId/check-availability", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables check availability",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = stockAvailabilityCheckRequestSchema.safeParse(
			request.body,
		);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		const result = await withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.checkStockSufficiency(
				tx,
				organizationId,
				parsedBody.data.items,
			);
		});
		return result;
	});

	// =========================================================================
	// MANDATE 8s (CANONICAL AUTHORITY & ANTI-BLOAT LAW):
	// Canonical master route for warehouse alerts: `apps/api/src/routes/inventory.ts`
	// (GET /api/inventory/:organizationId/alerts).
	// This route under /api/treatment-consumables serves as a transparent alias/facade
	// delegating directly to TreatmentConsumablesService.getInventoryAlerts, ensuring
	// 100% parity of stock deficiency and expiration logic without code divergence.
	// =========================================================================
	// GET /:organizationId/alerts — Low stock & batch expiration alerts
	server.get<{
		Params: { organizationId: string };
		Querystring: { expiringWithinDays?: number };
	}>("/:organizationId/alerts", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read alerts",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedQuery = alertsQuerySchema.safeParse(request.query ?? {});
		const expiringWithinDays = parsedQuery.success
			? parsedQuery.data.expiringWithinDays
			: 30;

		const alerts = await withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.getInventoryAlerts(
				tx,
				organizationId,
				...(expiringWithinDays !== undefined ? [{ expiringWithinDays }] : []),
			);
		});
		return alerts;
	});

	// POST /:organizationId/deduct/emergency-writeoff — Emergency write-off with guaranteed soft overdraft
	server.post<{
		Params: { organizationId: string };
		Body: {
			items: Array<{
				inventoryItemId: string;
				quantity: number;
				reason?: string | null;
			}>;
			visitId?: string | null;
			userId?: string | null;
			notes?: string | null;
		};
	}>("/:organizationId/deduct/emergency-writeoff", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables emergency writeoff",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = emergencyWriteoffSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		const result = await withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.deductManualItems(tx, {
				organizationId,
				items: parsedBody.data.items,
				visitId: parsedBody.data.visitId,
				userId: parsedBody.data.userId ?? getRequestIdentity(request).userId,
				notes: parsedBody.data.notes,
				allowOverdraft: true,
			});
		});
		return result;
	});

	// =========================================================================
	// MANDATE 8s (CANONICAL AUTHORITY & ANTI-BLOAT LAW):
	// Canonical master route: `apps/api/src/routes/inventory.ts`
	// (POST /api/inventory/:organizationId/quick-writeoff-carpules).
	// =========================================================================
	// POST /:organizationId/quick-writeoff-carpules — 1-Click carpules writeoff by nurse
	server.post<{
		Params: { organizationId: string };
		Body?: {
			carpulesCount?: number;
			drugName?: string;
			visitId?: string | null;
			userId?: string | null;
			notes?: string | null;
		};
	}>("/:organizationId/quick-writeoff-carpules", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables quick writeoff carpules",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = quickWriteoffCarpulesSchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}
		const body = parsedBody.data;
		const result = await withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
				organizationId,
				carpulesCount: body.carpulesCount,
				drugName: body.drugName,
				visitId: body.visitId ?? null,
				userId: body.userId ?? getRequestIdentity(request).userId,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// =========================================================================
	// MANDATE 8s (CANONICAL AUTHORITY & ANTI-BLOAT LAW):
	// Canonical master route: `apps/api/src/routes/inventory.ts`
	// (POST /api/inventory/:organizationId/quick-writeoff-visit-bundle).
	// =========================================================================
	// POST /:organizationId/quick-writeoff-visit-bundle — 1-клик списание набора клинического приёма
	server.post<{
		Params: { organizationId: string };
		Body?: {
			visitType?: "therapy" | "surgery" | "implant" | "sinus_gbr";
			visitId?: string | null;
			userId?: string | null;
			notes?: string | null;
		};
	}>("/:organizationId/quick-writeoff-visit-bundle", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables quick writeoff visit bundle",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = quickWriteoffVisitBundleSchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}
		const body = parsedBody.data;
		const result = await withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
				organizationId,
				visitType: body.visitType || "therapy",
				visitId: body.visitId ?? null,
				userId: body.userId ?? getRequestIdentity(request).userId,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// POST /:organizationId/quick-writeoff-emergency-antishock — 1-клик списание укладки «Антишок» (Приказ 786н)
	server.post<{
		Params: { organizationId: string };
		Body?: {
			visitId?: string | null;
			userId?: string | null;
			scenarioId?: string | null;
			notes?: string | null;
		};
	}>("/:organizationId/quick-writeoff-emergency-antishock", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables quick writeoff emergency antishock",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = quickWriteoffEmergencyAntishockSchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}
		const body = parsedBody.data;
		const result = await withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.quickWriteoffEmergencyAntishock(tx, {
				organizationId,
				visitId: body.visitId ?? null,
				userId: body.userId ?? getRequestIdentity(request).userId,
				notes: body.notes ?? null,
			});
		});

		return result;
	});
}
