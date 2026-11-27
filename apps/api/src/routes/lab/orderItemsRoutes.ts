import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { generateUuidV7, isValidUuid } from "@dental/shared";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { labItems, labOrders } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { createLabItemSchema, updateLabItemSchema } from "./types.js";
import {
	deleteLabItemTx,
	insertLabItemTx,
	updateLabItemTx,
} from "./orderItemsCrud.js";

function readRouteParam(request: FastifyRequest, key: string): string {
	if (typeof request.params !== "object" || request.params === null) return "";
	const record = request.params as Record<string, unknown>;
	return typeof record[key] === "string" ? record[key] : "";
}

export async function registerOrderItemsRoutes(app: FastifyInstance) {
	// ─── Multi-Unit Restoration Items CRUD ───────────────────────────────────

	const getOrderItemsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return reply;

		// 152-ФЗ / 323-ФЗ: Единицы протезирования ЗТЛ содержат формулу зубов и параметры препарирования (врачебная тайна)
		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.lab_order.read",
				role: staffRole,
				message: `Отказ в доступе к единицам протезирования ЗТЛ: ${evalAccess.reason}`,
			});
		}

		const labOrderId = readRouteParam(request, "id");

		const items = await withTenantReadCtx(orgId, async (tx) => {
			return tx
				.select()
				.from(labItems)
				.where(and(eq(labItems.organizationId, orgId), eq(labItems.labOrderId, labOrderId)))
				.orderBy(labItems.toothFdi);
		});

		return reply.send({ items });
	};

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/lab-orders/:id/items",
		permission: "public",
		handler: async ({ request, reply }) => getOrderItemsHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/lab/orders/:id/items",
		permission: "public",
		handler: async ({ request, reply }) => getOrderItemsHandler(request, reply),
	});

	// ─── POST /items: Добавление позиции с неделимой транзакцией и пересчетом родителя (SEV-1 / Мандат 8bo) ───

	const postOrderItemHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab order item add",
		);
		if (reply.sent || !orgId) return reply;

		// 152-ФЗ / 323-ФЗ: Добавление единиц протезирования ЗТЛ разрешено только клиническому персоналу
		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.lab_order.write",
				role: staffRole,
				message: `Отказ в добавлении единицы протезирования ЗТЛ: ${evalAccess.reason}`,
			});
		}

		const rawIdempotencyKey =
			(request.headers?.["idempotency-key"] as string | undefined) ??
			(request.headers?.["x-idempotency-key"] as string | undefined) ??
			(request.headers?.["Idempotency-Key"] as string | undefined);

		let idempotencyKey = rawIdempotencyKey?.trim();
		if (!idempotencyKey) {
			idempotencyKey = generateUuidV7();
		} else if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}
		reply.header("Idempotency-Key", idempotencyKey);

		const parsed = createLabItemSchema.safeParse(request.body);
		if (!parsed.success) {
			const firstIssueMessage = parsed.error.issues[0]?.message;
			return reply.code(400).send({
				error: "LabItemValidationError",
				message:
					firstIssueMessage ??
					"Проверьте данные единицы протезирования (номер зуба, материал, цвет).",
				details: parsed.error.format(),
			});
		}

		const labOrderId = readRouteParam(request, "id");
		const body = parsed.data;

		const result = await withTenantWriteCtx(orgId, async (tx) => {
			const [order] = await tx
				.select({ id: labOrders.id })
				.from(labOrders)
				.where(
					and(
						eq(labOrders.id, labOrderId),
						eq(labOrders.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);

			if (!order) {
				return { kind: "not_found" as const };
			}

			const createdItem = await insertLabItemTx(tx, orgId, labOrderId, body);
			return { kind: "ok" as const, item: createdItem };
		});

		if (result.kind === "not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Наряд зуботехнической лаборатории не найден в текущей клинике.",
			});
		}

		return reply.status(201).send({ success: true, item: result.item });
	};

	const postItemSchema = {
		headers: {
			type: "object",
			description: "Добавление единицы протезирования с проверкой organizationId и Idempotency-Key",
		},
	} as const;
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/lab-orders/:id/items",
		permission: "public",
		schema: postItemSchema,
		handler: async ({ request, reply }) => postOrderItemHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab/orders/:id/items",
		permission: "public",
		schema: postItemSchema,
		handler: async ({ request, reply }) => postOrderItemHandler(request, reply),
	});

	// ─── PUT /items/:itemId: Обновление позиции с неделимой транзакцией и пересчетом родителя (SEV-3 / Мандат 8bo) ───

	const putOrderItemHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab order item update",
		);
		if (reply.sent || !orgId) return reply;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.lab_order.write",
				role: staffRole,
				message: `Отказ в обновлении единицы протезирования ЗТЛ: ${evalAccess.reason}`,
			});
		}

		const rawIdempotencyKey =
			(request.headers?.["idempotency-key"] as string | undefined) ??
			(request.headers?.["x-idempotency-key"] as string | undefined) ??
			(request.headers?.["Idempotency-Key"] as string | undefined);

		let idempotencyKey = rawIdempotencyKey?.trim();
		if (!idempotencyKey) {
			idempotencyKey = generateUuidV7();
		} else if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}
		reply.header("Idempotency-Key", idempotencyKey);

		const parsed = updateLabItemSchema.safeParse(request.body);
		if (!parsed.success) {
			const firstIssueMessage = parsed.error.issues[0]?.message;
			return reply.code(400).send({
				error: "LabItemValidationError",
				message:
					firstIssueMessage ??
					"Проверьте данные единицы протезирования.",
				details: parsed.error.format(),
			});
		}

		const labOrderId = readRouteParam(request, "id");
		const itemId = readRouteParam(request, "itemId");
		const body = parsed.data;

		const result = await withTenantWriteCtx(orgId, async (tx) => {
			const [order] = await tx
				.select({ id: labOrders.id })
				.from(labOrders)
				.where(and(eq(labOrders.id, labOrderId), eq(labOrders.organizationId, orgId)))
				.for("update")
				.limit(1);

			if (!order) {
				return { kind: "order_not_found" as const };
			}

			const updatedItem = await updateLabItemTx(tx, orgId, labOrderId, itemId, body);
			if (!updatedItem) {
				return { kind: "item_not_found" as const };
			}

			return { kind: "ok" as const, item: updatedItem };
		});

		if (result.kind === "order_not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Наряд зуботехнической лаборатории не найден в текущей клинике.",
			});
		}
		if (result.kind === "item_not_found") {
			return reply.code(404).send({
				error: "LabItemNotFound",
				message: "Позиция изделия ЗТЛ не найдена в указанном наряде.",
			});
		}

		return reply.send({ success: true, item: result.item });
	};

	const putItemSchema = {
		headers: {
			type: "object",
			description: "Обновление единицы протезирования с проверкой organizationId и Idempotency-Key",
		},
	} as const;
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/clinical/lab-orders/:id/items/:itemId",
		permission: "public",
		schema: putItemSchema,
		handler: async ({ request, reply }) => putOrderItemHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/lab/orders/:id/items/:itemId",
		permission: "public",
		schema: putItemSchema,
		handler: async ({ request, reply }) => putOrderItemHandler(request, reply),
	});

	// ─── DELETE /items/:itemId: Удаление позиции с неделимой транзакцией и пересчетом родителя (SEV-3 / Мандат 8bo) ───

	const deleteOrderItemHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab order item delete",
		);
		if (reply.sent || !orgId) return reply;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.lab_order.write",
				role: staffRole,
				message: `Отказ в удалении единицы протезирования ЗТЛ: ${evalAccess.reason}`,
			});
		}

		const rawIdempotencyKey =
			(request.headers?.["idempotency-key"] as string | undefined) ??
			(request.headers?.["x-idempotency-key"] as string | undefined) ??
			(request.headers?.["Idempotency-Key"] as string | undefined);

		let idempotencyKey = rawIdempotencyKey?.trim();
		if (!idempotencyKey) {
			idempotencyKey = generateUuidV7();
		} else if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}
		reply.header("Idempotency-Key", idempotencyKey);

		const labOrderId = readRouteParam(request, "id");
		const itemId = readRouteParam(request, "itemId");

		const result = await withTenantWriteCtx(orgId, async (tx) => {
			const [order] = await tx
				.select({ id: labOrders.id })
				.from(labOrders)
				.where(and(eq(labOrders.id, labOrderId), eq(labOrders.organizationId, orgId)))
				.for("update")
				.limit(1);

			if (!order) {
				return { kind: "order_not_found" as const };
			}

			const deletedItem = await deleteLabItemTx(tx, orgId, labOrderId, itemId);
			if (!deletedItem) {
				return { kind: "item_not_found" as const };
			}

			return { kind: "ok" as const, deletedItem };
		});

		if (result.kind === "order_not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Наряд зуботехнической лаборатории не найден в текущей клинике.",
			});
		}
		if (result.kind === "item_not_found") {
			return reply.code(404).send({
				error: "LabItemNotFound",
				message: "Позиция изделия ЗТЛ не найдена в указанном наряде.",
			});
		}

		return reply.send({ success: true, deletedId: itemId });
	};

	const deleteItemSchema = {
		headers: {
			type: "object",
			description: "Удаление единицы протезирования с проверкой organizationId и Idempotency-Key",
		},
	} as const;
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/clinical/lab-orders/:id/items/:itemId",
		permission: "public",
		schema: deleteItemSchema,
		handler: async ({ request, reply }) => deleteOrderItemHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/lab/orders/:id/items/:itemId",
		permission: "public",
		schema: deleteItemSchema,
		handler: async ({ request, reply }) => deleteOrderItemHandler(request, reply),
	});
}
