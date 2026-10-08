import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { inventoryQuery } from "../../db/inventoryQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	fefoStockService,
	getDefaultExpirationDate,
} from "../../services/inventory/fefoStockService.js";
import { inventoryReceiveBatchBodySchema } from "./types.js";

export const batchTrackingRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET /:organizationId/batches — Получение партий FEFO со сроками годности (inventoryQuery SSOT)
	server.get<{
		Params: { organizationId: string };
		Querystring: {
			itemId?: string;
			status?: "active" | "depleted" | "expired" | "quarantine" | "all";
			warehouseId?: string;
			limit?: string | number;
			offset?: string | number;
		};
	}>(
		"/:organizationId/batches",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory batches read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const limit = request.query.limit ? Number(request.query.limit) : undefined;
			const offset = request.query.offset ? Number(request.query.offset) : undefined;

			const batches = await inventoryQuery.getStockBatches(organizationId, {
				itemId: request.query.itemId,
				status: request.query.status,
				warehouseId: request.query.warehouseId,
				limit,
				offset,
			});
			return batches;
		},
	);

	// GET /batches — Получение партий FEFO с автоопределением организации (Zero Dead-Ends)
	server.get<{
		Querystring: {
			itemId?: string;
			status?: "active" | "depleted" | "expired" | "quarantine" | "all";
			warehouseId?: string;
			limit?: string | number;
			offset?: string | number;
		};
	}>(
		"/batches",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory batches read",
			);
			if (!resolvedOrgId) return;

			const limit = request.query.limit ? Number(request.query.limit) : undefined;
			const offset = request.query.offset ? Number(request.query.offset) : undefined;

			const batches = await inventoryQuery.getStockBatches(resolvedOrgId, {
				itemId: request.query.itemId,
				status: request.query.status,
				warehouseId: request.query.warehouseId,
				limit,
				offset,
			});
			return batches;
		},
	);

	// GET /:organizationId/batches/expiring — Мониторинг истекающих партий (Shelf-Life Monitor)
	server.get<{
		Params: { organizationId: string };
		Querystring: { daysAhead?: string | number };
	}>(
		"/:organizationId/batches/expiring",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory expiring batches read",
			);
			if (!resolvedOrgId) return;

			const { organizationId } = request.params;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const daysAhead = request.query.daysAhead ? Number(request.query.daysAhead) : 30;
			const batches = await inventoryQuery.getExpiringBatches(organizationId, daysAhead);
			return batches;
		},
	);

	// GET /batches/expiring — Мониторинг истекающих партий с автоопределением организации
	server.get<{
		Querystring: { daysAhead?: string | number };
	}>(
		"/batches/expiring",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"inventory expiring batches read",
			);
			if (!resolvedOrgId) return;

			const daysAhead = request.query.daysAhead ? Number(request.query.daysAhead) : 30;
			const batches = await inventoryQuery.getExpiringBatches(resolvedOrgId, daysAhead);
			return batches;
		},
	);

	const handleReceiveBatchRequest = async (
		targetOrgId: string,
		rawBody: unknown,
		request: any,
		reply: any,
	) => {
		const parsed = inventoryReceiveBatchBodySchema.safeParse(rawBody);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message:
					parsed.error.errors[0]?.message ||
					"Неверные данные для оприходования партии",
				details: parsed.error.errors,
			});
		}

		const data = parsed.data;
		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;

		try {
			const batch = await db.transaction(async (tx) => {
				return fefoStockService.receiveBatch(tx, {
					organizationId: targetOrgId,
					inventoryItemId: data.inventoryItemId,
					warehouseId: data.warehouseId ?? null,
					batchNumber:
						data.batchNumber ||
						data.lotNumber ||
						`LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
					expirationDate: data.expirationDate || getDefaultExpirationDate(),
					manufactureDate: data.manufactureDate ?? null,
					quantity: data.quantity,
					purchasePricePerUnit: data.purchasePricePerUnit ?? null,
					barcode: data.barcode ?? null,
					userId: effectiveUserId,
					notes: data.notes ?? null,
				});
			});

			return reply.status(201).send({
				success: true,
				message: `Партия ${batch.batchNumber} успешно оприходована (${data.quantity} ед.)`,
				batch,
			});
		} catch (error) {
			request.log.error(error, "Failed to receive batch");
			const msg =
				error instanceof Error
					? error.message
					: "Не удалось сохранить приходную партию";
			return reply.status(400).send({
				error: "ReceiveBatchFailed",
				message: msg,
			});
		}
	};

	// POST /:organizationId/receive-batch
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof inventoryReceiveBatchBodySchema>;
	}>("/:organizationId/receive-batch", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory receive batch",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleReceiveBatchRequest(organizationId, request.body, request, reply);
	});

	// POST /receive-batch
	server.post<{
		Body: z.infer<typeof inventoryReceiveBatchBodySchema> & {
			organizationId?: string;
		};
	}>("/receive-batch", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory receive batch",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleReceiveBatchRequest(targetOrgId, request.body, request, reply);
	});
};
