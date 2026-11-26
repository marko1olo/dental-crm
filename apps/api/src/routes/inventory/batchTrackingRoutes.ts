import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { inventoryQuery } from "../../db/inventoryQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	fefoStockService,
	getDefaultExpirationDate,
} from "../../services/inventory/fefoStockService.js";
import { inventoryReceiveBatchBodySchema } from "./types.js";

const batchListQuerySchema = z.object({
	itemId: z.string().uuid("Некорректный UUID материала").optional(),
	status: z.enum(["active", "depleted", "expired", "quarantine", "all"]).optional(),
	warehouseId: z.string().uuid("Некорректный UUID склада").optional(),
	limit: z.coerce.number().int().min(1).max(1000).optional(),
	offset: z.coerce.number().int().min(0).max(100_000).optional(),
});

const expiringBatchesQuerySchema = z.object({
	daysAhead: z.coerce.number().int().min(0).max(3650).default(30),
});

const organizationIdParamSchema = z.object({
	organizationId: z.string().uuid("Некорректный UUID организации"),
});

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

			const orgParamParsed = organizationIdParamSchema.safeParse(request.params);
			if (!orgParamParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: orgParamParsed.error.issues[0]?.message ?? "Некорректный UUID организации",
				});
			}
			const { organizationId } = orgParamParsed.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const queryParsed = batchListQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: queryParsed.error.issues[0]?.message ?? "Некорректные параметры запроса партий",
					details: queryParsed.error.issues,
				});
			}

			const batches = await inventoryQuery.getStockBatches(organizationId, {
				itemId: queryParsed.data.itemId,
				status: queryParsed.data.status,
				warehouseId: queryParsed.data.warehouseId,
				limit: queryParsed.data.limit,
				offset: queryParsed.data.offset,
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

			const queryParsed = batchListQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: queryParsed.error.issues[0]?.message ?? "Некорректные параметры запроса партий",
					details: queryParsed.error.issues,
				});
			}

			const batches = await inventoryQuery.getStockBatches(resolvedOrgId, {
				itemId: queryParsed.data.itemId,
				status: queryParsed.data.status,
				warehouseId: queryParsed.data.warehouseId,
				limit: queryParsed.data.limit,
				offset: queryParsed.data.offset,
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

			const orgParamParsed = organizationIdParamSchema.safeParse(request.params);
			if (!orgParamParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: orgParamParsed.error.issues[0]?.message ?? "Некорректный UUID организации",
				});
			}
			const { organizationId } = orgParamParsed.data;
			if (resolvedOrgId !== organizationId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			const queryParsed = expiringBatchesQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: queryParsed.error.issues[0]?.message ?? "Некорректный параметр daysAhead",
					details: queryParsed.error.issues,
				});
			}

			const batches = await inventoryQuery.getExpiringBatches(
				organizationId,
				queryParsed.data.daysAhead,
			);
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

			const queryParsed = expiringBatchesQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: queryParsed.error.issues[0]?.message ?? "Некорректный параметр daysAhead",
					details: queryParsed.error.issues,
				});
			}

			const batches = await inventoryQuery.getExpiringBatches(
				resolvedOrgId,
				queryParsed.data.daysAhead,
			);
			return batches;
		},
	);

	const handleReceiveBatchRequest = async (
		targetOrgId: string,
		rawBody: unknown,
		request: FastifyRequest,
		reply: FastifyReply,
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
			const batch = await withTenantCtx(targetOrgId, async (tx) => {
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

		const orgParamParsed = organizationIdParamSchema.safeParse(request.params);
		if (!orgParamParsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: orgParamParsed.error.issues[0]?.message ?? "Некорректный UUID организации",
			});
		}
		const { organizationId } = orgParamParsed.data;
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

		const rawBody = request.body;
		const bodyOrgId =
			rawBody && typeof rawBody === "object" && "organizationId" in rawBody && typeof rawBody.organizationId === "string"
				? rawBody.organizationId
				: undefined;
		if (bodyOrgId) {
			const orgCheck = organizationIdParamSchema.safeParse({ organizationId: bodyOrgId });
			if (!orgCheck.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный UUID организации",
				});
			}
			if (bodyOrgId !== resolvedOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}
		}

		return handleReceiveBatchRequest(resolvedOrgId, request.body, request, reply);
	});
};
