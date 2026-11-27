import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { generateUuidV7, isValidUuid } from "@dental/shared";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../../db/rls.js";
import { labOrderEvents, labOrders } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { createLabOrderEventSchema } from "../types.js";

function readLabOrderIdParam(request: FastifyRequest): string {
	if (typeof request.params !== "object" || request.params === null) return "";
	const record = request.params as Record<string, unknown>;
	return typeof record.id === "string" ? record.id : "";
}

export async function handleGetLabOrderEvents(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.read",
			role: staffRole,
			message: `Отказ в доступе к журналу этапов ЗТЛ: ${evalAccess.reason}`,
		});
	}

	const labOrderId = readLabOrderIdParam(request);

	const events = await withTenantReadCtx(orgId, async (tx) => {
		return tx
			.select()
			.from(labOrderEvents)
			.where(
				and(
					eq(labOrderEvents.organizationId, orgId),
					eq(labOrderEvents.labOrderId, labOrderId),
				),
			)
			.orderBy(desc(labOrderEvents.createdAt));
	});

	return reply.send({ events });
}

export async function handleCreateLabOrderEvent(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"lab order event create",
	);
	if (reply.sent || !orgId) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.write",
			role: staffRole,
			message: `Отказ в фиксации этапа ЗТЛ: ${evalAccess.reason}`,
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
	if (typeof reply.header === "function") {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const labOrderId = readLabOrderIdParam(request);
	const parsed = createLabOrderEventSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "LabOrderEventValidationError",
			message: "Проверьте данные этапа наряда ЗТЛ.",
			details: parsed.error.format(),
		});
	}
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
			.limit(1);

		if (!order) {
			return { kind: "not_found" as const };
		}

		const [ev] = await tx
			.insert(labOrderEvents)
			.values({
				organizationId: orgId,
				labOrderId,
				milestone: body.milestone,
				actorType: body.actorType,
				actorId: body.actorId ?? null,
				actorName: body.actorName,
				notes: body.notes ?? null,
				barcodeScanned: body.barcodeScanned ?? null,
				photoUrls: body.photoUrls,
				cadPreviewGlbUrl: body.cadPreviewGlbUrl ?? null,
			})
			.returning();

		return { kind: "ok" as const, event: ev };
	});

	if (result.kind === "not_found") {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ-наряд ЗТЛ не найден в вашей клинике.",
		});
	}

	return reply.status(201).send({ success: true, event: result.event });
}
