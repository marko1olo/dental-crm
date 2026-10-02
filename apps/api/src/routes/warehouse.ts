/**
 * apps/api/src/routes/warehouse.ts — Warehouse API routes.
 *
 * Implements Mandate 8e item 10 & Mandate 8n (Solo Doctor & Small Clinic):
 * 1. 1-click nurse disposal of empty anesthetic carpules (SanPiN 3.3686-21, single nurse signature, NO 3-person commission).
 * 2. Soft warehouse overdraft: when stock is 0 or insufficient due to supplier invoice delay,
 *    never throws fatal 400/500 or blocks patient care/treatment/operation. Decrements stock into negative,
 *    records emergency_overdraft transaction, and returns 200 OK with soft overdraft warning.
 * 3. 1-click auto-deduction of consumables by procedure tech-cards / visit (Mandate 8v).
 * 4. Zero Dead-Ends (Mandate 8n): endpoints under /api/warehouse support both parameterized (/ :organizationId / ...)
 *    and unparameterized master routes (/deduct, /deduct/visit, /soft-overdraft-deduct, /quick-carpule-disposal).
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { inventoryQuery } from "../db/inventoryQuery.js";
import {
	executeQuickCarpuleDisposal,
	executeSoftOverdraftDeduct,
	handleWarehouseDeductRequest,
	handleWarehouseDeductVisitRequest,
	quickCarpuleDisposalSchema,
	softOverdraftDeductSchema,
} from "../services/warehouse/warehouseOperations.js";

export const warehouseRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// POST /api/warehouse/:organizationId/quick-carpule-disposal
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof quickCarpuleDisposalSchema>;
	}>("/:organizationId/quick-carpule-disposal", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse quick carpule disposal",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsed = quickCarpuleDisposalSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const userId = (request.user as { id?: string } | undefined)?.id ?? null;
		const response = await executeQuickCarpuleDisposal(organizationId, parsed.data, userId);
		return reply.status(200).send(response);
	});

	// POST /api/warehouse/quick-carpule-disposal (без orgId в параметрах URL)
	server.post("/quick-carpule-disposal", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse quick carpule disposal",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsed = quickCarpuleDisposalSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const userId = (request.user as { id?: string } | undefined)?.id ?? null;
		const response = await executeQuickCarpuleDisposal(targetOrgId, parsed.data, userId);
		return reply.status(200).send(response);
	});

	// POST /api/warehouse/:organizationId/soft-overdraft-deduct
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof softOverdraftDeductSchema>;
	}>("/:organizationId/soft-overdraft-deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse soft overdraft deduct",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsed = softOverdraftDeductSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const userId = (request.user as { id?: string } | undefined)?.id ?? null;
		const result = await executeSoftOverdraftDeduct(organizationId, parsed.data, userId);

		return reply.status(200).send({
			success: true,
			itemId: result.item.id,
			itemName: result.item.name,
			quantityDeducted: parsed.data.quantity,
			newStock: result.newStock,
			isOverdraft: result.isOverdraft,
			deficit: result.deficit,
			warning: result.isOverdraft ? "soft_overdraft" : undefined,
			warningMessage: result.isOverdraft
				? `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${result.deficit} ${result.item.unit ?? "ед."}). Задержка оприходования накладной не блокирует проведение приема!`
				: undefined,
		});
	});

	// POST /api/warehouse/soft-overdraft-deduct (без orgId в параметрах URL)
	server.post("/soft-overdraft-deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse soft overdraft deduct",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsed = softOverdraftDeductSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const userId = (request.user as { id?: string } | undefined)?.id ?? null;
		const result = await executeSoftOverdraftDeduct(targetOrgId, parsed.data, userId);

		return reply.status(200).send({
			success: true,
			itemId: result.item.id,
			itemName: result.item.name,
			quantityDeducted: parsed.data.quantity,
			newStock: result.newStock,
			isOverdraft: result.isOverdraft,
			deficit: result.deficit,
			warning: result.isOverdraft ? "soft_overdraft" : undefined,
			warningMessage: result.isOverdraft
				? `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${result.deficit} ${result.item.unit ?? "ед."}). Задержка оприходования накладной не блокирует проведение приема!`
				: undefined,
		});
	});

	// POST /api/warehouse/:organizationId/deduct (Мандат 8e, 8n)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse deduct",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleWarehouseDeductRequest(organizationId, request.body, request, reply);
	});

	// POST /api/warehouse/deduct (Мандат 8e, 8n)
	server.post("/deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse deduct",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleWarehouseDeductRequest(targetOrgId, request.body, request, reply);
	});

	// POST /api/warehouse/:organizationId/deduct/visit (Мандаты 8e, 8n, 8v)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/deduct/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse deduct visit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleWarehouseDeductVisitRequest(organizationId, request.body, request, reply);
	});

	// POST /api/warehouse/deduct/visit (Мандаты 8e, 8n, 8v)
	server.post("/deduct/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse deduct visit",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleWarehouseDeductVisitRequest(targetOrgId, request.body, request, reply);
	});

	// GET /api/warehouse/:organizationId/stock
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/stock",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"warehouse stock read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const items = await inventoryQuery.getInventoryItems(organizationId);

			return reply.send(items);
		},
	);

	// GET /api/warehouse/stock (автоопределение orgId из сессии)
	server.get("/stock", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"warehouse stock read",
		);
		if (!resolvedOrgId) return;

		const items = await inventoryQuery.getInventoryItems(resolvedOrgId);

		return reply.send(items);
	});
};

export default warehouseRoutes;
