import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { normalizePhone, parseKopecks } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import {
	extractIdempotencyKey,
	isValidUuid,
} from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { withTenantCtx } from "../../db/rls.js";
import { crmLeads, crmLeadStageHistory } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { leadSchema, patchLeadSchema } from "./types.js";

function buildLeadUpdatePayload(
	data: z.infer<typeof patchLeadSchema>,
): Partial<typeof crmLeads.$inferInsert> {
	const updatePayload: Partial<typeof crmLeads.$inferInsert> = {};
	if (data.name !== undefined) updatePayload.name = data.name;
	if (data.patientName !== undefined) updatePayload.patientName = data.patientName;
	if (data.patientId !== undefined) updatePayload.patientId = data.patientId;
	if (data.phone !== undefined) {
		updatePayload.phone = data.phone
			? normalizePhone(data.phone) ?? data.phone.trim()
			: null;
	}
	if (data.source !== undefined) updatePayload.source = data.source;
	if (data.expectedRevenue !== undefined) {
		updatePayload.expectedRevenue = data.expectedRevenue;
		updatePayload.expectedRevenueKopecks = data.expectedRevenue
			? BigInt(parseKopecks(data.expectedRevenue))
			: null;
	}
	if (data.status !== undefined) updatePayload.status = data.status;
	if (data.notes !== undefined) updatePayload.notes = data.notes;
	if (data.dropReason !== undefined || data.reason !== undefined) {
		updatePayload.dropReason = data.dropReason ?? data.reason ?? null;
	}
	if (data.assignedDoctorId !== undefined) updatePayload.assignedDoctorId = data.assignedDoctorId;
	if (data.priority !== undefined) updatePayload.priority = data.priority;
	if (data.clinicalTags !== undefined) updatePayload.clinicalTags = data.clinicalTags;
	if (data.audioRecordUrl !== undefined) updatePayload.audioRecordUrl = data.audioRecordUrl;
	if (data.transcriptionSnippet !== undefined) {
		updatePayload.transcriptionSnippet = data.transcriptionSnippet;
	}
	if (data.metadata !== undefined) updatePayload.metadata = data.metadata;
	return updatePayload;
}

async function applyLeadUpdate(params: {
	req: FastifyRequest;
	reply: FastifyReply;
	organizationId: string;
	id: string;
	idempotencyKey: string | null | undefined;
	data: z.infer<typeof patchLeadSchema>;
}) {
	const { req, reply, organizationId, id, idempotencyKey, data } = params;
	const [lead] = await withTenantCtx(organizationId, async (tx) => {
		const [current] = await tx
			.select()
			.from(crmLeads)
			.where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)))
			.for("update")
			.limit(1);

		if (!current) return [];

		const now = new Date();
		const updatePayload = buildLeadUpdatePayload(data);

		if (data.status && data.status !== current.status) {
			const fromStage = current.status;
			const stageStart = current.stageEnteredAt || current.createdAt;
			const durationSeconds = Math.max(
				0,
				Math.floor((now.getTime() - stageStart.getTime()) / 1000),
			);

			const identity = getRequestIdentity(req);
			const changedByUserId =
				identity?.userId && z.string().uuid().safeParse(identity.userId).success
					? identity.userId
					: null;

			await tx.insert(crmLeadStageHistory).values({
				organizationId,
				leadId: current.id,
				fromStage,
				toStage: data.status,
				changedByUserId,
				durationSeconds,
				createdAt: now,
			});

			updatePayload.stageEnteredAt = now;
		}

		return await tx
			.update(crmLeads)
			.set(updatePayload)
			.where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)))
			.returning();
	});

	if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
	wsBroker.broadcastToOrganization(organizationId, {
		type: "LEAD_UPDATED",
		payload: lead,
	});
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}
	return lead;
}

export function registerLeadCrudRoutes(app: FastifyInstance): void {
	app.patch("/api/leads/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead update",
		);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const paramsParsed = z.object({ id: z.string().uuid() }).strict().safeParse(req.params ?? {});
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор лида.",
			});
		}
		const { id } = paramsParsed.data;
		const parsed = patchLeadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте поля лида: переданы некорректные данные.",
			});
		}
		if (Object.keys(parsed.data).length === 0) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Нет данных для обновления лида.",
			});
		}

		return applyLeadUpdate({
			req,
			reply,
			organizationId,
			id,
			idempotencyKey,
			data: parsed.data,
		});
	});

	app.put("/api/leads/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead update",
		);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const paramsParsed = z.object({ id: z.string().uuid() }).strict().safeParse(req.params ?? {});
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор лида.",
			});
		}
		const { id } = paramsParsed.data;
		const parsed = leadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте поля лида: нужно непустое имя.",
			});
		}

		return applyLeadUpdate({
			req,
			reply,
			organizationId,
			id,
			idempotencyKey,
			data: parsed.data,
		});
	});

	const deleteLeadRouteOptions = {
		schema: {
			description:
				"Delete lead mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					"organizationid": { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	};

	app.delete("/api/leads/:id", deleteLeadRouteOptions, async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead delete",
		);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const paramsParsed = z.object({ id: z.string().uuid() }).strict().safeParse(req.params ?? {});
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор лида.",
			});
		}
		const { id } = paramsParsed.data;

		const lead = await withTenantCtx(organizationId, async (tx) => {
			await tx
				.delete(crmLeadStageHistory)
				.where(
					and(
						eq(crmLeadStageHistory.organizationId, organizationId),
						eq(crmLeadStageHistory.leadId, id),
					),
				);

			const [deleted] = await tx
				.delete(crmLeads)
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				)
				.returning();

			return deleted;
		});

		if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_DELETED",
			payload: { id },
		});
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}
		return { success: true };
	});
}
