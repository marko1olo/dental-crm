/**
 * visitWriteOffHandlers.ts — Layer 2: Fastify route handlers for atomic consumable write-offs
 * on visit completion, stock sufficiency checks, alerts, and 1-click bundles.
 * All mutations run inside withTenantCtx fail-closed RLS context.
 */

import {
	isValidUuid,
	processClinicalMaterialWriteoff,
	type ClinicalConsumableNorm,
	type ClinicalMaterialWriteoffResult,
} from "@dental/shared";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { defineTenantMutation, defineTenantQuery } from "../../../core/routeFactories.js";

const orgUuidParamsSchema = z.object({
	organizationId: z.string().uuid(),
});

function readIdempotencyHeader(headers: Record<string, unknown>): string | undefined {
	const val = headers["idempotency-key"];
	return typeof val === "string" ? val : undefined;
}
import * as schema from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { fefoStockService } from "../../../services/inventory/fefoStockService.js";
import { TreatmentConsumablesService } from "../../../services/treatmentConsumablesService.js";
import {
	alertsQuerySchema,
	emergencyWriteoffSchema,
	quickWriteoffCarpulesSchema,
	quickWriteoffEmergencyAntishockSchema,
	quickWriteoffVisitBundleSchema,
	stockAvailabilityCheckRequestSchema,
	treatmentConsumableDeductionRequestSchema,
	visitDeductWithOptionalNormsSchema,
} from "./types.js";

const INVENTORY_READ_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
	allowUnverifiedHeaderRead: true,
} as const;

const INVENTORY_WRITE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

/**
 * Registers visit write-off, stock check, alert, emergency write-off, and 1-click bundle routes.
 */
export async function registerVisitWriteOffHandlers(
	server: FastifyInstance,
): Promise<void> {
	// POST /apply-deduction — Idempotent consumable deduction on visit completion (Mandate 8e Doctor Autonomy)
	defineTenantMutation(server, {
		method: "POST",
		path: "/apply-deduction",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			const parsed = treatmentConsumableDeductionRequestSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: parsed.error.errors[0]?.message ?? "Неверные параметры запроса",
				});
			}

			const result = await TreatmentConsumablesService.applyDeduction(
				orgId,
				parsed.data,
				tx,
			);
			return reply.status(200).send(result);
		},
	});

	// POST /:organizationId/deduct/visit — Auto-deduct consumables for visit (doctor instant solo writeoff + 2-tier VN/VI norms)
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/deduct/visit",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const parsedBody = visitDeductWithOptionalNormsSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
				});
			}

			const data = parsedBody.data;
			const clinicalNorms = "clinicalNorms" in data ? data.clinicalNorms : undefined;

			let twoLevelWriteoff: ClinicalMaterialWriteoffResult | undefined;
			let mergedItems = data.items ? [...data.items] : [];

			if (clinicalNorms && clinicalNorms.length > 0) {
				const materialIds = clinicalNorms.map((n) => n.inventoryItemId);
				const dbItems = materialIds.length > 0
					? await tx
						.select({ id: schema.inventoryItems.id, stockQuantity: schema.inventoryItems.stockQuantity })
						.from(schema.inventoryItems)
						.where(and(
							eq(schema.inventoryItems.organizationId, organizationId),
							inArray(schema.inventoryItems.id, materialIds),
						))
					: [];
				const currentStocks: Record<string, number> = {};
				for (const row of dbItems) {
					currentStocks[row.id] = Number(row.stockQuantity ?? 0);
				}

				twoLevelWriteoff = processClinicalMaterialWriteoff({
					visitId: data.visitId,
					treatmentServiceId: ("treatmentServiceId" in data ? data.treatmentServiceId : undefined) ?? "visit-clinical-bom",
					treatmentServiceTitle: ("treatmentServiceTitle" in data ? data.treatmentServiceTitle : undefined) ?? "Клиническое списание по приёму",
					norms: clinicalNorms,
					currentStocks,
					allowOverdraft: data.allowOverdraft ?? true,
				});

				const activeNormItems = [
					...twoLevelWriteoff.overheadItems,
					...twoLevelWriteoff.clinicalItems,
				]
					.filter((line) => !line.isOmitted && line.quantity > 0)
					.map((line) => ({
						inventoryItemId: line.inventoryItemId,
						quantity: line.quantity,
						reason: line.tier === "cheap_overhead"
							? "Уровень 1 · общеклинический норматив"
							: "Уровень 2 · клинический расходник (ВН/ВИ)",
					}));

				mergedItems = [...mergedItems, ...activeNormItems];
			}

			const deductionRes = await TreatmentConsumablesService.deductForVisit(tx, {
				organizationId,
				visitId: data.visitId,
				clientMutationId:
					data.clientMutationId ??
					readIdempotencyHeader(request.headers) ??
					null,
				...(data.userId !== undefined
					? { userId: data.userId }
					: { userId: getRequestIdentity(request).userId }),
				...(data.transactionType !== undefined
					? { transactionType: data.transactionType }
					: {}),
				...(data.services !== undefined
					? { services: data.services }
					: {}),
				...(mergedItems.length > 0
					? { items: mergedItems }
					: {}),
				...(data.carpulesCount !== undefined
					? { carpulesCount: data.carpulesCount }
					: {}),
				...(data.drugName !== undefined
					? { drugName: data.drugName }
					: {}),
				...(data.paperJournalAcknowledged !== undefined
					? { paperJournalAcknowledged: data.paperJournalAcknowledged }
					: {}),
				allowOverdraft: data.allowOverdraft ?? true,
			});

			return twoLevelWriteoff
				? { ...deductionRes, twoLevelWriteoff }
				: deductionRes;
		},
	});

	// POST /:organizationId/check-availability — Pre-flight check stock sufficiency
	defineTenantQuery(server, {
		method: "POST",
		path: "/:organizationId/check-availability",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
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

			return TreatmentConsumablesService.checkStockSufficiency(
				tx,
				organizationId,
				parsedBody.data.items,
			);
		},
	});

	// GET /:organizationId/alerts — Low stock & batch expiration alerts
	defineTenantQuery(server, {
		path: "/:organizationId/alerts",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const parsedQuery = alertsQuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message:
						parsedQuery.error.errors[0]?.message ??
						"Некорректные параметры запроса уведомлений",
				});
			}
			const expiringWithinDays = parsedQuery.data.expiringWithinDays;

			return TreatmentConsumablesService.getInventoryAlerts(
				tx,
				organizationId,
				...(expiringWithinDays !== undefined ? [{ expiringWithinDays }] : []),
			);
		},
	});

	// POST /:organizationId/deduct/emergency-writeoff — Emergency write-off with guaranteed soft overdraft
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/deduct/emergency-writeoff",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
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

			const effectiveUserId = parsedBody.data.userId ?? getRequestIdentity(request).userId;
			const safeVisitId =
				parsedBody.data.visitId && isValidUuid(parsedBody.data.visitId)
					? parsedBody.data.visitId
					: null;
			const qtyByItemId = new Map<string, { qty: number; reason?: string | undefined }>();
			for (const entry of parsedBody.data.items) {
				if (!entry.inventoryItemId || !Number.isFinite(entry.quantity) || entry.quantity <= 0) {
					continue;
				}
				const prev = qtyByItemId.get(entry.inventoryItemId);
				qtyByItemId.set(entry.inventoryItemId, {
					qty: Number(((prev?.qty ?? 0) + entry.quantity).toFixed(4)),
					reason: entry.reason ?? prev?.reason,
				});
			}

			const sortedIds = Array.from(qtyByItemId.keys()).sort();
			const lockedItems =
				sortedIds.length > 0
					? await tx
							.select()
							.from(schema.inventoryItems)
							.where(
								and(
									eq(schema.inventoryItems.organizationId, organizationId),
									inArray(schema.inventoryItems.id, sortedIds),
								),
							)
							.orderBy(asc(schema.inventoryItems.id))
							.for("update")
					: [];

			const deducted: Array<{
				inventoryItemId: string;
				itemName: string;
				quantityDeducted: number;
				isOverdraft: boolean;
				deficitQty: number;
				warning?: string | undefined;
			}> = [];
			const warnings: string[] = [];
			let isOverdraft = false;
			let totalDeductedQty = 0;

			for (const inv of lockedItems) {
				const target = qtyByItemId.get(inv.id);
				if (!target || target.qty <= 0) continue;
				const noteParts = [parsedBody.data.notes, target.reason].filter(
					(v): v is string => typeof v === "string" && v.trim().length > 0,
				);
				const fefoRes = await fefoStockService.deductFefo(tx, {
					organizationId,
					inventoryItemId: inv.id,
					requiredQty: target.qty,
					visitId: safeVisitId,
					userId: effectiveUserId,
					allowOverdraft: true,
					transactionType: "emergency_overdraft",
					notes: noteParts.length > 0 ? noteParts.join(" • ") : "Экстренное списание расходников",
				});
				if (fefoRes.isOverdraft) isOverdraft = true;
				if (fefoRes.warning) warnings.push(fefoRes.warning);
				totalDeductedQty = Number((totalDeductedQty + fefoRes.deductedQty).toFixed(4));
				deducted.push({
					inventoryItemId: fefoRes.inventoryItemId,
					itemName: fefoRes.inventoryItemName || inv.name,
					quantityDeducted: fefoRes.deductedQty,
					isOverdraft: fefoRes.isOverdraft,
					deficitQty: fefoRes.deficitQty,
					...(fefoRes.warning ? { warning: fefoRes.warning } : {}),
				});
			}

			return {
				success: true,
				visitId: safeVisitId,
				isOverdraft,
				deducted,
				warnings,
				itemCount: deducted.length,
				totalDeductedQty,
			};
		},
	});

	// POST /:organizationId/quick-writeoff-carpules — 1-Click carpules writeoff by nurse
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/quick-writeoff-carpules",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
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
			return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
				organizationId,
				carpulesCount: body.carpulesCount,
				drugName: body.drugName,
				visitId: body.visitId ?? null,
				userId: body.userId ?? getRequestIdentity(request).userId,
				notes: body.notes ?? null,
			});
		},
	});

	// POST /:organizationId/quick-writeoff-visit-bundle — списание набора клинического приёма
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/quick-writeoff-visit-bundle",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
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
			return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
				organizationId,
				visitType: body.visitType || "therapy",
				visitId: body.visitId ?? null,
				userId: body.userId ?? getRequestIdentity(request).userId,
				notes: body.notes ?? null,
			});
		},
	});

	// POST /:organizationId/quick-writeoff-emergency-antishock — списание укладки «Антишок»
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/quick-writeoff-emergency-antishock",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const parsedParams = orgUuidParamsSchema.safeParse(request.params ?? {});
			if (!parsedParams.success) {
				return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID организации" });
			}
			const { organizationId } = parsedParams.data;
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
			return TreatmentConsumablesService.quickWriteoffEmergencyAntishock(tx, {
				organizationId,
				visitId: body.visitId ?? null,
				userId: body.userId ?? getRequestIdentity(request).userId,
				notes: body.notes ?? null,
			});
		},
	});
}
