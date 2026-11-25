import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	DEMO_SHOWCASE_ORG_ID,
	normalizePhone,
	parseKopecks,
	patchLeadStageSchema,
} from "@dental/shared";
import {
	isDemoShowcaseMode,
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import {
	extractIdempotencyKey,
	isValidUuid,
} from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	crmLeads,
	crmLeadStageHistory,
	patients,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	DEMO_SHOWCASE_SEED_LEADS,
	leadSchema,
	patchLeadSchema,
	patchLeadStatusSchema,
} from "./types.js";

export async function registerLeadLifecycleRoutes(app: FastifyInstance): Promise<void> {
	app.get("/api/leads", async (req: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"leads read",
		);
		if (!organizationId) return;

		let leads = await db
			.select()
			.from(crmLeads)
			.where(eq(crmLeads.organizationId, organizationId))
			.orderBy(desc(crmLeads.createdAt));

		if (
			leads.length === 0 &&
			organizationId === DEMO_SHOWCASE_ORG_ID &&
			isDemoShowcaseMode()
		) {
			try {
				const freshStageDate = new Date(Date.now() - 3 * 60_000);
				leads = await withTenantCtx(organizationId, async (tx) =>
					tx
						.insert(crmLeads)
						.values(
							DEMO_SHOWCASE_SEED_LEADS.map((seed) => ({
								organizationId,
								name: seed.name,
								phone: seed.phone,
								source: seed.source,
								status: seed.status,
								expectedRevenue: seed.expectedRevenue,
								expectedRevenueKopecks: seed.expectedRevenue
									? BigInt(parseKopecks(seed.expectedRevenue))
									: null,
								notes: seed.notes,
								clinicalTags: [...seed.clinicalTags],
								priority: "normal" as const,
								stageEnteredAt: freshStageDate,
							})),
						)
						.returning(),
				);
			} catch (seedErr) {
				req.log.warn(
					{ err: seedErr, organizationId },
					"[Leads] Demo showcase seed skipped (concurrent or failed)",
				);
			}
		}

		// Phone deduplication check against existing patients database (Mandates 8l, 8n)
		const phoneList = leads
			.map((l) => (l.phone ? normalizePhone(l.phone) ?? l.phone.trim() : null))
			.filter((p): p is string => Boolean(p));

		const patientMap = new Map<string, { id: string; fullName: string }>();
		if (phoneList.length > 0) {
			const uniquePhones = Array.from(new Set(phoneList));
			const matchedPatients = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						inArray(patients.phone, uniquePhones),
					),
				);

			for (const p of matchedPatients) {
				if (p.phone) {
					patientMap.set(p.phone, { id: p.id, fullName: p.fullName });
					const norm = normalizePhone(p.phone);
					if (norm) patientMap.set(norm, { id: p.id, fullName: p.fullName });
				}
			}
		}

		const freshDemoStageIso =
			organizationId === DEMO_SHOWCASE_ORG_ID
				? new Date(Date.now() - 3 * 60_000)
				: null;

		return leads.map((lead) => {
			const clean = lead.phone
				? normalizePhone(lead.phone) ?? lead.phone.trim()
				: null;
			const existingPatient = clean ? patientMap.get(clean) ?? null : null;
			return {
				...lead,
				...(freshDemoStageIso ? { stageEnteredAt: freshDemoStageIso } : {}),
				existingPatient,
			};
		});
	});

	app.post("/api/leads", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead create",
		);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsed = leadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте поля лида: нужно непустое имя.",
			});
		}
		const data = parsed.data;
		const identity = getRequestIdentity(req);
		const changedByUserId =
			identity?.userId && z.string().uuid().safeParse(identity.userId).success
				? identity.userId
				: null;
		const now = new Date();

		const cleanPhone = data.phone
			? normalizePhone(data.phone) ?? data.phone.trim()
			: null;

		const lead = await db.transaction(async (tx) => {
			const insertValues: typeof crmLeads.$inferInsert = {
				organizationId,
				name: data.name,
				patientName: data.patientName,
				patientId: data.patientId,
				phone: cleanPhone,
				source: data.source,
				expectedRevenue: data.expectedRevenue,
				expectedRevenueKopecks: data.expectedRevenue
					? BigInt(parseKopecks(data.expectedRevenue))
					: null,
				notes: data.notes,
				dropReason: data.dropReason ?? data.reason ?? null,
				assignedDoctorId: data.assignedDoctorId,
				priority: data.priority || "normal",
				clinicalTags: data.clinicalTags ?? [],
				audioRecordUrl: data.audioRecordUrl,
				transcriptionSnippet: data.transcriptionSnippet,
				metadata: data.metadata ?? null,
				stageEnteredAt: now,
				status: "new",
			};
			const [created] = await tx
				.insert(crmLeads)
				.values(insertValues)
				.returning();

			if (created) {
				await tx.insert(crmLeadStageHistory).values({
					organizationId,
					leadId: created.id,
					fromStage: null,
					toStage: created.status || "new",
					changedByUserId,
					durationSeconds: 0,
					createdAt: now,
				});
			}

			return created;
		});

		let existingPatient: { id: string; fullName: string } | null = null;
		if (cleanPhone) {
			const [matched] = await db
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						eq(patients.phone, cleanPhone),
					),
				)
				.limit(1);
			if (matched) existingPatient = matched;
		}

		const leadWithPatient = { ...lead, existingPatient };

		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_CREATED",
			payload: leadWithPatient,
		});
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}
		return leadWithPatient;
	});

	async function executeLeadStageTransition(params: {
		req: FastifyRequest;
		reply: FastifyReply;
		organizationId: string;
		id: string;
		idempotencyKey: string | null | undefined;
		toStage: (typeof crmLeads.$inferInsert)["status"] & string;
		dropReason?: string | null | undefined;
		notes?: string | null | undefined;
		priority?: (typeof crmLeads.$inferInsert)["priority"] | undefined;
		clinicalTags?: string[] | undefined;
		assignedDoctorId?: string | null | undefined;
	}) {
		const {
			req,
			reply,
			organizationId,
			id,
			idempotencyKey,
			toStage,
			dropReason,
			notes,
			priority,
			clinicalTags,
			assignedDoctorId,
		} = params;

		const identity = getRequestIdentity(req);
		const changedByUserId =
			identity?.userId && isValidUuid(identity.userId) ? identity.userId : null;
		const now = new Date();

		const result = await withTenantCtx(organizationId, async (tx) => {
			const [lead] = await tx
				.select()
				.from(crmLeads)
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				)
				.for("update")
				.limit(1);

			if (!lead) {
				return { notFound: true as const };
			}

			const fromStage = lead.status;
			const stageStart = lead.stageEnteredAt || lead.createdAt;
			const durationSeconds = Math.max(
				0,
				Math.floor((now.getTime() - stageStart.getTime()) / 1000),
			);

			await tx.insert(crmLeadStageHistory).values({
				organizationId,
				leadId: lead.id,
				fromStage,
				toStage,
				changedByUserId,
				durationSeconds,
				createdAt: now,
			});

			const updateFields: Partial<typeof crmLeads.$inferInsert> = {
				status: toStage,
				stageEnteredAt: now,
			};
			if (notes !== undefined) updateFields.notes = notes;
			if (toStage === "trash" && dropReason) {
				updateFields.dropReason = dropReason;
			}
			if (priority !== undefined) updateFields.priority = priority;
			if (clinicalTags !== undefined) updateFields.clinicalTags = clinicalTags;
			if (assignedDoctorId !== undefined) {
				updateFields.assignedDoctorId = assignedDoctorId;
			}

			const [updated] = await tx
				.update(crmLeads)
				.set(updateFields)
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				)
				.returning();

			return { lead: updated };
		});

		if ("notFound" in result) {
			return reply
				.code(404)
				.send({ error: "LeadNotFound", message: "Обращение не найдено." });
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_UPDATED",
			payload: result.lead,
		});

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return result.lead;
	}

	app.patch("/api/leads/:id/stage", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead stage update",
		);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор лида.",
			});
		}
		const parsed = patchLeadStageSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					parsed.error.issues[0]?.message || "Проверьте данные смены этапа.",
			});
		}
		const { toStage, notes, priority, clinicalTags, assignedDoctorId, reason, dropReason } =
			parsed.data;

		return await executeLeadStageTransition({
			req,
			reply,
			organizationId,
			id,
			idempotencyKey,
			toStage,
			dropReason: dropReason ?? reason ?? null,
			notes,
			priority,
			clinicalTags,
			assignedDoctorId,
		});
	});

	app.get("/api/leads/:id/stage-history", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"lead stage history read",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор лида.",
			});
		}
		const history = await db
			.select()
			.from(crmLeadStageHistory)
			.where(
				and(
					eq(crmLeadStageHistory.organizationId, organizationId),
					eq(crmLeadStageHistory.leadId, id),
				),
			)
			.orderBy(desc(crmLeadStageHistory.createdAt));

		return history;
	});

	app.patch("/api/leads/:id/status", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead status update",
		);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор лида.",
			});
		}
		const statusParsed = patchLeadStatusSchema.safeParse(req.body);
		if (!statusParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте статус лида.",
			});
		}
		const { status, dropReason, reason } = statusParsed.data;
		return await executeLeadStageTransition({
			req,
			reply,
			organizationId,
			id,
			idempotencyKey,
			toStage: status,
			dropReason: dropReason ?? reason ?? null,
		});
	});

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

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор лида.",
			});
		}
		const parsed = patchLeadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте поля лида: переданы некорректные данные.",
			});
		}
		const data = parsed.data;
		if (Object.keys(data).length === 0) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Нет данных для обновления лида.",
			});
		}

		const [lead] = await db.transaction(async (tx) => {
			const [current] = await tx
				.select()
				.from(crmLeads)
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				)
				.for("update")
				.limit(1);

			if (!current) return [];

			const now = new Date();
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
			if (data.transcriptionSnippet !== undefined) updatePayload.transcriptionSnippet = data.transcriptionSnippet;
			if (data.metadata !== undefined) updatePayload.metadata = data.metadata;

			if (data.status && data.status !== current.status) {
				const fromStage = current.status;
				const stageStart = current.stageEnteredAt || current.createdAt;
				const durationSeconds = Math.max(
					0,
					Math.floor((now.getTime() - stageStart.getTime()) / 1000),
				);

				const identity = getRequestIdentity(req);
				const changedByUserId =
					identity?.userId &&
					z.string().uuid().safeParse(identity.userId).success
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
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				)
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

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор лида.",
			});
		}
		const parsed = leadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте поля лида: нужно непустое имя.",
			});
		}
		const { reason, dropReason, ...restData } = parsed.data;
		const cleanPhone = restData.phone
			? normalizePhone(restData.phone) ?? restData.phone.trim()
			: null;

		const [lead] = await withTenantCtx(organizationId, async (tx) => {
			const [current] = await tx
				.select()
				.from(crmLeads)
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				)
				.for("update")
				.limit(1);

			if (!current) return [];

			const now = new Date();
			const updatePayload: Partial<typeof crmLeads.$inferInsert> = {
				...restData,
				phone: cleanPhone,
				expectedRevenueKopecks: restData.expectedRevenue
					? BigInt(parseKopecks(restData.expectedRevenue))
					: null,
				...(dropReason !== undefined || reason !== undefined
					? { dropReason: dropReason ?? reason ?? null }
					: {}),
			};

			if (restData.status && restData.status !== current.status) {
				const fromStage = current.status;
				const stageStart = current.stageEnteredAt || current.createdAt;
				const durationSeconds = Math.max(
					0,
					Math.floor((now.getTime() - stageStart.getTime()) / 1000),
				);

				const identity = getRequestIdentity(req);
				const changedByUserId =
					identity?.userId &&
					z.string().uuid().safeParse(identity.userId).success
						? identity.userId
						: null;

				await tx.insert(crmLeadStageHistory).values({
					organizationId,
					leadId: current.id,
					fromStage,
					toStage: restData.status,
					changedByUserId,
					durationSeconds,
					createdAt: now,
				});

				updatePayload.stageEnteredAt = now;
			}

			return await tx
				.update(crmLeads)
				.set(updatePayload)
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				)
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

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор лида.",
			});
		}

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
