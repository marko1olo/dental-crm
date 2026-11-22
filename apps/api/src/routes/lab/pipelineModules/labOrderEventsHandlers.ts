import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { labOrderEvents } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { createLabOrderEventSchema } from "../types.js";

export async function handleGetLabOrderEvents(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
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

	const labOrderId = request.params.id;

	const events = await withTenantCtx(orgId, async (tx) => {
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

export async function handleCreateLabOrderEvent(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

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

	const labOrderId = request.params.id;
	const parsed = createLabOrderEventSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "LabOrderEventValidationError",
			message: "Проверьте данные этапа наряда ЗТЛ.",
			details: parsed.error.format(),
		});
	}
	const body = parsed.data;

	const createdEvent = await withTenantCtx(orgId, async (tx) => {
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
		return ev;
	});

	return reply.status(201).send({ success: true, event: createdEvent });
}
