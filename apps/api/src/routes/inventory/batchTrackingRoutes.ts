import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { defineTenantMutation, defineTenantQuery } from "../../core/routeFactories.js";
import type { TenantDb } from "../../db/rls.js";
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

const INVENTORY_READ_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
	allowUnverifiedHeaderRead: true,
} as const;

const INVENTORY_WRITE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

export const batchTrackingRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET /:organizationId/batches — Получение партий FEFO со сроками годности (inventoryQuery SSOT)
	defineTenantQuery(server, {
		path: "/:organizationId/batches",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
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

			return inventoryQuery.getStockBatches(
				organizationId,
				{
					itemId: queryParsed.data.itemId,
					status: queryParsed.data.status,
					warehouseId: queryParsed.data.warehouseId,
					limit: queryParsed.data.limit,
					offset: queryParsed.data.offset,
				},
				tx,
			);
		},
	});

	// GET /batches — Получение партий FEFO с автоопределением организации (Zero Dead-Ends)
	defineTenantQuery(server, {
		path: "/batches",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const queryParsed = batchListQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: queryParsed.error.issues[0]?.message ?? "Некорректные параметры запроса партий",
					details: queryParsed.error.issues,
				});
			}

			return inventoryQuery.getStockBatches(
				resolvedOrgId,
				{
					itemId: queryParsed.data.itemId,
					status: queryParsed.data.status,
					warehouseId: queryParsed.data.warehouseId,
					limit: queryParsed.data.limit,
					offset: queryParsed.data.offset,
				},
				tx,
			);
		},
	});

	// GET /:organizationId/batches/expiring — Мониторинг истекающих партий (Shelf-Life Monitor)
	defineTenantQuery(server, {
		path: "/:organizationId/batches/expiring",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
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

			return inventoryQuery.getExpiringBatches(
				organizationId,
				queryParsed.data.daysAhead,
				tx,
			);
		},
	});

	// GET /batches/expiring — Мониторинг истекающих партий с автоопределением организации
	defineTenantQuery(server, {
		path: "/batches/expiring",
		permission: "inventory.read",
		authOptions: INVENTORY_READ_AUTH,
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
			const queryParsed = expiringBatchesQuerySchema.safeParse(request.query ?? {});
			if (!queryParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: queryParsed.error.issues[0]?.message ?? "Некорректный параметр daysAhead",
					details: queryParsed.error.issues,
				});
			}

			return inventoryQuery.getExpiringBatches(
				resolvedOrgId,
				queryParsed.data.daysAhead,
				tx,
			);
		},
	});

	const handleReceiveBatchRequest = async (
		tx: TenantDb,
		targetOrgId: string,
		rawBody: unknown,
		request: Parameters<typeof getRequestIdentity>[0],
		reply: { status: (code: number) => { send: (body: unknown) => unknown } },
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
		const userContext = (request as { user?: { id?: string } }).user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;

		try {
			const batch = await fefoStockService.receiveBatch(tx, {
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

			return reply.status(201).send({
				success: true,
				message: `Партия ${batch.batchNumber} успешно оприходована (${data.quantity} ед.)`,
				batch,
			});
		} catch (error) {
			(request as { log: { error: (err: unknown, msg: string) => void } }).log.error(
				error,
				"Failed to receive batch",
			);
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
	defineTenantMutation(server, {
		method: "POST",
		path: "/:organizationId/receive-batch",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
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

			return handleReceiveBatchRequest(tx, organizationId, request.body, request, reply);
		},
	});

	// POST /receive-batch
	defineTenantMutation(server, {
		method: "POST",
		path: "/receive-batch",
		permission: "inventory.write",
		authOptions: INVENTORY_WRITE_AUTH,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
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

			return handleReceiveBatchRequest(tx, resolvedOrgId, request.body, request, reply);
		},
	});
};
