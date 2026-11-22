import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { labItems, labOrders } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { createLabItemSchema, updateLabItemSchema } from "./types.js";
import {
	deleteLabItemTx,
	insertLabItemTx,
	updateLabItemTx,
} from "./orderItemsCrud.js";

export async function registerOrderItemsRoutes(app: FastifyInstance) {
	// ─── Multi-Unit Restoration Items CRUD ───────────────────────────────────

	const getOrderItemsHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

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

		const labOrderId = request.params.id;

		const items = await withTenantCtx(orgId, async (tx) => {
			return tx
				.select()
				.from(labItems)
				.where(and(eq(labItems.organizationId, orgId), eq(labItems.labOrderId, labOrderId)))
				.orderBy(labItems.toothFdi);
		});

		return reply.send({ items });
	};

	app.get<{ Params: { id: string } }>("/api/clinical/lab-orders/:id/items", getOrderItemsHandler);
	app.get<{ Params: { id: string } }>("/api/lab/orders/:id/items", getOrderItemsHandler);

	// ─── POST /items: Добавление позиции с неделимой транзакцией и пересчетом родителя (SEV-1 / Мандат 8bo) ───

	const postOrderItemHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
		);
		if (!orgId) return;

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

		const labOrderId = request.params.id;
		const body = parsed.data;

		const result = await withTenantCtx(orgId, async (tx) => {
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

	app.post<{ Params: { id: string } }>("/api/clinical/lab-orders/:id/items", postOrderItemHandler);
	app.post<{ Params: { id: string } }>("/api/lab/orders/:id/items", postOrderItemHandler);

	// ─── PUT /items/:itemId: Обновление позиции с неделимой транзакцией и пересчетом родителя (SEV-3 / Мандат 8bo) ───

	const putOrderItemHandler = async (
		request: FastifyRequest<{ Params: { id: string; itemId: string } }>,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

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

		const { id: labOrderId, itemId } = request.params;
		const body = parsed.data;

		const result = await withTenantCtx(orgId, async (tx) => {
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

	app.put<{ Params: { id: string; itemId: string } }>(
		"/api/clinical/lab-orders/:id/items/:itemId",
		putOrderItemHandler,
	);
	app.put<{ Params: { id: string; itemId: string } }>(
		"/api/lab/orders/:id/items/:itemId",
		putOrderItemHandler,
	);

	// ─── DELETE /items/:itemId: Удаление позиции с неделимой транзакцией и пересчетом родителя (SEV-3 / Мандат 8bo) ───

	const deleteOrderItemHandler = async (
		request: FastifyRequest<{ Params: { id: string; itemId: string } }>,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

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

		const { id: labOrderId, itemId } = request.params;

		const result = await withTenantCtx(orgId, async (tx) => {
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

	app.delete<{ Params: { id: string; itemId: string } }>(
		"/api/clinical/lab-orders/:id/items/:itemId",
		deleteOrderItemHandler,
	);
	app.delete<{ Params: { id: string; itemId: string } }>(
		"/api/lab/orders/:id/items/:itemId",
		deleteOrderItemHandler,
	);
}
