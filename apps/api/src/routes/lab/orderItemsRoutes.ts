import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { labItems, labOrders } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { createLabItemSchema } from "./types.js";

export async function registerOrderItemsRoutes(app: FastifyInstance) {
	// ─── Multi-Unit Restoration Items CRUD ───────────────────────────────────

	app.get("/api/clinical/lab-orders/:id/items", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Единицы протезирования ЗТЛ содержат формулу зубов и параметры препарирования (врачебная тайна)
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.lab_order.read",
				role: staffRole,
				message: `Отказ в доступе к единицам протезирования ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id: labOrderId } = request.params as { id: string };

		const items = await db
			.select()
			.from(labItems)
			.where(and(eq(labItems.organizationId, orgId), eq(labItems.labOrderId, labOrderId)))
			.orderBy(labItems.toothFdi);

		return reply.send({ items });
	});

	app.post("/api/clinical/lab-orders/:id/items", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
		);
		if (!orgId) return;

		// 152-ФЗ / 323-ФЗ: Добавление единиц протезирования ЗТЛ разрешено только клиническому персоналу
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.lab_order.write",
				role: staffRole,
				message: `Отказ в добавлении единицы протезирования ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id: labOrderId } = request.params as { id: string };

		const [order] = await db
			.select({ id: labOrders.id })
			.from(labOrders)
			.where(
				and(
					eq(labOrders.id, labOrderId),
					eq(labOrders.organizationId, orgId),
				),
			)
			.limit(1);

		if (!order) {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Наряд зуботехнической лаборатории не найден в текущей клинике.",
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
		const body = parsed.data;

		const [createdItem] = await db
			.insert(labItems)
			.values({
				organizationId: orgId,
				labOrderId,
				toothFdi: body.toothFdi,
				restorationType: body.restorationType,
				material: body.material,
				shadeSystem: body.shadeSystem,
				shadeFinal: body.shadeFinal,
				shadeStump: body.shadeStump ?? null,
				shadeGingiva: body.shadeGingiva ?? null,
				translucencyLevel: body.translucencyLevel,
				cementGapMicrons: body.cementGapMicrons,
				extraMarginGapMicrons: body.extraMarginGapMicrons,
				minimalThicknessMm: body.minimalThicknessMm,
				implantSystem: body.implantSystem ?? null,
				implantPlatformDiameterMm: body.implantPlatformDiameterMm ?? null,
				tiBaseHeightMm: body.tiBaseHeightMm ?? null,
				meshTriangleCount: body.meshTriangleCount ?? null,
				meshSurfaceAreaMm2: body.meshSurfaceAreaMm2 ?? null,
				meshVolumeMm3: body.meshVolumeMm3 ?? null,
				meshBboxMm: body.meshBboxMm ?? null,
				isManifold: body.isManifold,
				priceRub: body.priceRub ? String(body.priceRub) : null,
			})
			.returning();

		return reply.status(201).send({ success: true, item: createdItem });
	});
}
