/**
 * visitWriteOffHandlers.ts — Layer 2: Fastify route handlers for atomic consumable write-offs
 * on visit/tooth treatment completion, stock sufficiency checks, alerts, and 1-click bundles.
 */

import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { TreatmentConsumableDeductionService } from "../../services/treatmentConsumableDeductionService.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";
import {
	buildSoftOverdraftResponse,
	isInsufficientStockError,
} from "./consumableFefoAllocator.js";
import {
	alertsQuerySchema,
	emergencyWriteoffSchema,
	stockAvailabilityCheckRequestSchema,
	toothTreatmentStockDeductionRequestSchema,
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

		const result = await TreatmentConsumableDeductionService.applyDeduction(
			orgId,
			parsed.data,
		);
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

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductForVisit(tx, {
					organizationId,
					visitId: parsedBody.data.visitId,
					clientMutationId:
						parsedBody.data.clientMutationId ??
						(request.headers["idempotency-key"] as string | undefined) ??
						null,
					...(parsedBody.data.userId !== undefined
						? { userId: parsedBody.data.userId }
						: { userId: (request.user as any)?.id ?? null }),
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
		} catch (err: unknown) {
			if (isInsufficientStockError(err)) {
				// Клинический закон: задержка накладной снабженцем не должна блокировать операцию и лечение зуба.
				// Мягкий овердрафт: отдаем 200 OK с предупреждением о дефиците партии вместо блокирующего 409.
				return reply.status(200).send(buildSoftOverdraftResponse(err, "visit"));
			}
			throw err;
		}
	});

	// POST /:organizationId/deduct/tooth-treatment — Deduct consumables for tooth procedure
	server.post<{
		Params: { organizationId: string };
		Body: {
			treatmentItemId: string;
			serviceId: string;
			toothNumber?: number | null;
			quantity?: number;
			visitId?: string | null;
			userId?: string | null;
			transactionType?: "auto_deduct" | "manual_writeoff";
			clientMutationId?: string | null;
		};
	}>("/:organizationId/deduct/tooth-treatment", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables deduct tooth treatment",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = toothTreatmentStockDeductionRequestSchema.safeParse(
			request.body,
		);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		const clientMutationId =
			(request.headers["idempotency-key"] as string) ||
			(request.headers["x-client-mutation-id"] as string) ||
			parsedBody.data.clientMutationId ||
			null;

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductForToothTreatment(tx, {
					organizationId,
					treatmentItemId: parsedBody.data.treatmentItemId,
					serviceId: parsedBody.data.serviceId,
					clientMutationId,
					...(parsedBody.data.toothNumber !== undefined
						? { toothNumber: parsedBody.data.toothNumber }
						: {}),
					...(parsedBody.data.quantity !== undefined
						? { quantity: parsedBody.data.quantity }
						: {}),
					...(parsedBody.data.visitId !== undefined
						? { visitId: parsedBody.data.visitId }
						: {}),
					...(parsedBody.data.userId !== undefined
						? { userId: parsedBody.data.userId }
						: { userId: (request.user as any)?.id ?? null }),
					...(parsedBody.data.transactionType !== undefined
						? { transactionType: parsedBody.data.transactionType }
						: {}),
				});
			});
			return result;
		} catch (err: unknown) {
			if (isInsufficientStockError(err)) {
				// Клинический закон: задержка накладной снабженцем не должна блокировать операцию и лечение зуба.
				// Мягкий овердрафт: отдаем 200 OK с предупреждением о дефиците партии вместо блокирующего 409.
				return reply
					.status(200)
					.send(buildSoftOverdraftResponse(err, "tooth_treatment"));
			}
			throw err;
		}
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

		const result = await TreatmentConsumablesService.checkStockSufficiency(
			db,
			organizationId,
			parsedBody.data.items,
		);
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

		const alerts = await TreatmentConsumablesService.getInventoryAlerts(
			db,
			organizationId,
			...(expiringWithinDays !== undefined ? [{ expiringWithinDays }] : []),
		);
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

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductManualItems(tx, {
					organizationId,
					items: parsedBody.data.items,
					visitId: parsedBody.data.visitId,
					userId: parsedBody.data.userId ?? (request.user as any)?.id ?? null,
					notes: parsedBody.data.notes,
					allowOverdraft: true,
				});
			});
			return result;
		} catch (err: unknown) {
			if (isInsufficientStockError(err)) {
				return reply
					.status(200)
					.send(buildSoftOverdraftResponse(err, "emergency_writeoff"));
			}
			throw err;
		}
	});

	// =========================================================================
	// MANDATE 8s (CANONICAL AUTHORITY & ANTI-BLOAT LAW):
	// Canonical master route: `apps/api/src/routes/inventory.ts`
	// (POST /api/inventory/:organizationId/quick-writeoff-carpules).
	// This endpoint is maintained as a transparent alias under /api/treatment-consumables
	// to preserve backward compatibility for existing consumers.
	// Both routes delegate execution to the canonical TreatmentConsumablesService.quickWriteoffCarpules
	// with identical transaction semantics, preventing any logic desynchronization.
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

		const body = request.body ?? {};
		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
				organizationId,
				carpulesCount: body.carpulesCount,
				drugName: body.drugName,
				visitId: body.visitId ?? null,
				userId: body.userId ?? (request.user as any)?.id ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});

	// =========================================================================
	// MANDATE 8s (CANONICAL AUTHORITY & ANTI-BLOAT LAW):
	// Canonical master route: `apps/api/src/routes/inventory.ts`
	// (POST /api/inventory/:organizationId/quick-writeoff-visit-bundle).
	// This endpoint is maintained as a transparent alias under /api/treatment-consumables
	// to preserve backward compatibility for existing consumers.
	// Both routes delegate execution to the canonical TreatmentConsumablesService.quickWriteoffVisitBundle
	// with identical transaction semantics, preventing any logic desynchronization.
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

		const body = request.body ?? {};
		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
				organizationId,
				visitType: body.visitType || "therapy",
				visitId: body.visitId ?? null,
				userId: body.userId ?? (request.user as any)?.id ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});
}
