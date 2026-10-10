import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	DEMO_SHOWCASE_ORG_ID,
	normalizePhone,
	patchLeadStageSchema,
} from "@dental/shared";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
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
	leadStatusEnum,
	patchLeadSchema,
} from "./types.js";

export async function registerLeadLifecycleRoutes(app: FastifyInstance): Promise<void> {
	app.get("/api/leads", async (req, reply) => {
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

		if (leads.length === 0 && organizationId === DEMO_SHOWCASE_ORG_ID) {
			try {
				const freshStageDate = new Date(Date.now() - 3 * 60_000);
				leads = await db
					.insert(crmLeads)
					.values(
						DEMO_SHOWCASE_SEED_LEADS.map((seed) => ({
							organizationId,
							name: seed.name,
							phone: seed.phone,
							source: seed.source,
							status: seed.status,
							expectedRevenue: seed.expectedRevenue,
							notes: seed.notes,
							clinicalTags: [...seed.clinicalTags],
							priority: "normal" as const,
							stageEnteredAt: freshStageDate,
						})),
					)
					.returning();
			} catch {
				// Ignore seed error if concurrent request already seeded
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
				phone: cleanPhone,
				source: data.source,
				expectedRevenue: data.expectedRevenue,
				notes: data.notes,
				assignedDoctorId: data.assignedDoctorId,
				priority: data.priority || "normal",
				clinicalTags: data.clinicalTags ?? [],
				audioRecordUrl: data.audioRecordUrl,
				transcriptionSnippet: data.transcriptionSnippet,
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
		return leadWithPatient;
	});

	app.patch("/api/leads/:id/stage", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead stage update",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const parsed = patchLeadStageSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					parsed.error.issues[0]?.message || "Проверьте данные смены этапа.",
			});
		}
		const { toStage, notes, priority, clinicalTags, assignedDoctorId } =
			parsed.data;
		const bodyObj = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
		const dropReason = typeof bodyObj.dropReason === "string" ? bodyObj.dropReason : (typeof bodyObj.reason === "string" ? bodyObj.reason : null);

		const identity = getRequestIdentity(req);
		const changedByUserId =
			identity?.userId && z.string().uuid().safeParse(identity.userId).success
				? identity.userId
				: null;
		const now = new Date();

		const result = await db.transaction(async (tx) => {
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
				updateFields.notes = updateFields.notes
					? `${updateFields.notes}\n[Причина срыва]: ${dropReason}`
					: (lead.notes ? `${lead.notes}\n[Причина срыва]: ${dropReason}` : `[Причина срыва]: ${dropReason}`);
			}
			if (priority !== undefined) updateFields.priority = priority;
			if (clinicalTags !== undefined) updateFields.clinicalTags = clinicalTags;
			if (assignedDoctorId !== undefined)
				updateFields.assignedDoctorId = assignedDoctorId;

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

		return result.lead;
	});

	app.get("/api/leads/:id/stage-history", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"lead stage history read",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
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

		const { id } = req.params as { id: string };
		const statusParsed = z
			.object({
				status: leadStatusEnum,
				reason: z.string().optional().nullable(),
				dropReason: z.string().optional().nullable(),
			})
			.safeParse(req.body);
		if (!statusParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте статус лида.",
			});
		}
		const { status } = statusParsed.data;
		const dropReason = statusParsed.data.dropReason || statusParsed.data.reason;
		const identity = getRequestIdentity(req);
		const changedByUserId =
			identity?.userId && z.string().uuid().safeParse(identity.userId).success
				? identity.userId
				: null;
		const now = new Date();

		const result = await db.transaction(async (tx) => {
			const [lead] = await tx
				.select()
				.from(crmLeads)
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				)
				.for("update")
				.limit(1);

			if (!lead) return { notFound: true as const };

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
				toStage: status,
				changedByUserId,
				durationSeconds,
				createdAt: now,
			});

			const updateFields: Partial<typeof crmLeads.$inferInsert> = {
				status,
				stageEnteredAt: now,
			};
			if (status === "trash" && dropReason) {
				updateFields.notes = lead.notes
					? `${lead.notes}\n[Причина срыва]: ${dropReason}`
					: `[Причина срыва]: ${dropReason}`;
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

		if ("notFound" in result) return reply.code(404).send({ error: "LeadNotFound" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_UPDATED",
			payload: result.lead,
		});
		return result.lead;
	});

	app.patch("/api/leads/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead update",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
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
			if (data.phone !== undefined) {
				updatePayload.phone = data.phone
					? normalizePhone(data.phone) ?? data.phone.trim()
					: null;
			}
			if (data.source !== undefined) updatePayload.source = data.source;
			if (data.expectedRevenue !== undefined) updatePayload.expectedRevenue = data.expectedRevenue;
			if (data.status !== undefined) updatePayload.status = data.status;
			if (data.notes !== undefined) updatePayload.notes = data.notes;
			if (data.assignedDoctorId !== undefined) updatePayload.assignedDoctorId = data.assignedDoctorId;
			if (data.priority !== undefined) updatePayload.priority = data.priority;
			if (data.clinicalTags !== undefined) updatePayload.clinicalTags = data.clinicalTags;
			if (data.audioRecordUrl !== undefined) updatePayload.audioRecordUrl = data.audioRecordUrl;
			if (data.transcriptionSnippet !== undefined) updatePayload.transcriptionSnippet = data.transcriptionSnippet;

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
		return lead;
	});

	app.put("/api/leads/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead update",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const parsed = leadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте поля лида: нужно непустое имя.",
			});
		}
		const data = parsed.data;
		const cleanPhone = data.phone
			? normalizePhone(data.phone) ?? data.phone.trim()
			: null;

		const [lead] = await db
			.update(crmLeads)
			.set({ ...data, phone: cleanPhone })
			.where(
				and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
			)
			.returning();
		if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_UPDATED",
			payload: lead,
		});
		return lead;
	});

	app.delete("/api/leads/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead delete",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };

		const [lead] = await db
			.delete(crmLeads)
			.where(
				and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
			)
			.returning();
		if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_DELETED",
			payload: { id },
		});
		return { success: true };
	});
}
