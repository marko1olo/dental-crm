import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	batchUpdateLeadStageSchema,
	leadPipelineMetricsSchema,
	leadPriorityEnum,
	leadStatusEnum,
	patchLeadStageSchema,
} from "@dental/shared";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { createAppointmentInDb } from "../db/appointmentsQuery.js";
import { db } from "../db/client.js";
import {
	chairs,
	clinicChairs,
	crmLeads,
	crmLeadStageHistory,
	patients,
	users,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import { normalizePatientAdministrativeProfile } from "../utils/patientAdministrativeProfile.js";
import { wsBroker } from "../services/websocketBroker.js";

export { leadStatusEnum };

const leadSchema = z.object({
	name: z.string().min(1),
	patientName: z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	source: z.string().optional().nullable(),
	expectedRevenue: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	priority: leadPriorityEnum.optional(),
	clinicalTags: z.array(z.string()).optional(),
	audioRecordUrl: z.string().optional().nullable(),
	transcriptionSnippet: z.string().optional().nullable(),
});

const patchLeadSchema = z.object({
	name: z.string().min(1).optional(),
	patientName: z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	source: z.string().optional().nullable(),
	expectedRevenue: z.string().optional().nullable(),
	status: leadStatusEnum.optional(),
	notes: z.string().optional().nullable(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	priority: leadPriorityEnum.optional(),
	clinicalTags: z.array(z.string()).optional(),
	audioRecordUrl: z.string().optional().nullable(),
	transcriptionSnippet: z.string().optional().nullable(),
});

const convertLeadSchema = z.object({
	appointmentStart: z.string().datetime(),
	appointmentEnd: z.string().datetime(),
	chairId: z.string().optional().nullable(),
	doctorId: z.string().optional().nullable(),
	organizationId: z.string().uuid().optional(),
});

export async function registerLeadsRoutes(app: FastifyInstance) {
	app.get("/api/leads", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"leads read",
		);
		if (!organizationId) return;

		const leads = await db
			.select()
			.from(crmLeads)
			.where(eq(crmLeads.organizationId, organizationId));
		return leads;
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

		const lead = await db.transaction(async (tx) => {
			const insertValues: typeof crmLeads.$inferInsert = {
				organizationId,
				name: data.name,
				patientName: data.patientName,
				phone: data.phone,
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

		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_CREATED",
			payload: lead,
		});
		return lead;
	});

	app.get("/api/leads/pipeline-metrics", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"leads pipeline metrics read",
		);
		if (!organizationId) return;

		const leads = await db
			.select()
			.from(crmLeads)
			.where(eq(crmLeads.organizationId, organizationId));

		const totalLeads = leads.length;
		const stageCounts: Record<string, number> = {
			new: 0,
			contacted: 0,
			consult_booked: 0,
			showed_up: 0,
			no_answer: 0,
			trash: 0,
		};

		let slaBreachedCount = 0;
		let urgentCount = 0;
		let pipelineExpectedRevenueRub = 0;
		const now = new Date();

		for (const lead of leads) {
			const st = (lead.status || "new") as string;
			stageCounts[st] = (stageCounts[st] || 0) + 1;

			if (lead.priority === "urgent") {
				urgentCount++;
			}

			if (st === "new" || st === "contacted") {
				const enteredAt = lead.stageEnteredAt || lead.createdAt;
				const elapsedMin = Math.floor(
					(now.getTime() - enteredAt.getTime()) / (60 * 1000),
				);
				if (elapsedMin >= 60) {
					slaBreachedCount++;
				}
			}

			if (lead.expectedRevenue) {
				const val = Number.parseFloat(lead.expectedRevenue);
				if (!Number.isNaN(val) && val > 0) {
					pipelineExpectedRevenueRub += val;
				}
			}
		}

		// Stage duration averages from audit history and active leads
		const historyRecords = await db
			.select({
				fromStage: crmLeadStageHistory.fromStage,
				durationSeconds: crmLeadStageHistory.durationSeconds,
			})
			.from(crmLeadStageHistory)
			.where(eq(crmLeadStageHistory.organizationId, organizationId));

		const stageDurations: Record<string, number[]> = {
			new: [],
			contacted: [],
			consult_booked: [],
			showed_up: [],
			no_answer: [],
			trash: [],
		};

		for (const h of historyRecords) {
			if (
				h.fromStage &&
				typeof h.durationSeconds === "number" &&
				h.durationSeconds >= 0
			) {
				const arr = stageDurations[h.fromStage] ?? (stageDurations[h.fromStage] = []);
				arr.push(h.durationSeconds);
			}
		}

		for (const lead of leads) {
			const st = lead.status || "new";
			const entered = lead.stageEnteredAt || lead.createdAt;
			const elapsedSec = Math.max(
				0,
				Math.floor((now.getTime() - entered.getTime()) / 1000),
			);
			const arr = stageDurations[st] ?? (stageDurations[st] = []);
			arr.push(elapsedSec);
		}

		const averageDurationSecondsByStage: Record<string, number> = {};
		for (const [st, arr] of Object.entries(stageDurations)) {
			if (arr.length > 0) {
				const sum = arr.reduce((acc, v) => acc + v, 0);
				averageDurationSecondsByStage[st] = Math.round(sum / arr.length);
			} else {
				averageDurationSecondsByStage[st] = 0;
			}
		}

		const countContacted = stageCounts.contacted || 0;
		const countBooked = stageCounts.consult_booked || 0;
		const countShowed = stageCounts.showed_up || 0;

		const reachedContactedOrBeyond = countContacted + countBooked + countShowed;
		const reachedBookedOrBeyond = countBooked + countShowed;
		const reachedShowedOrBeyond = countShowed;
		const basePool = Math.max(1, totalLeads);

		const stageConversionRates: Record<string, number> = {
			new_to_contacted:
				totalLeads > 0
					? Math.round((reachedContactedOrBeyond / basePool) * 1000) / 10
					: 0,
			contacted_to_consult_booked:
				reachedContactedOrBeyond > 0
					? Math.round(
							(reachedBookedOrBeyond / reachedContactedOrBeyond) * 1000,
						) / 10
					: 0,
			consult_booked_to_showed_up:
				reachedBookedOrBeyond > 0
					? Math.round((reachedShowedOrBeyond / reachedBookedOrBeyond) * 1000) /
						10
					: 0,
			overall_conversion:
				totalLeads > 0
					? Math.round((reachedShowedOrBeyond / basePool) * 1000) / 10
					: 0,
		};

		return {
			totalLeads,
			stageCounts,
			averageDurationSecondsByStage,
			stageConversionRates,
			slaBreachedCount,
			urgentCount,
			pipelineExpectedRevenueRub:
				Math.round(pipelineExpectedRevenueRub * 100) / 100,
		};
	});

	app.post("/api/leads/batch-stage", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"leads batch stage update",
		);
		if (!organizationId) return;

		const parsed = batchUpdateLeadStageSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					parsed.error.issues[0]?.message ||
					"Проверьте параметры пакетного переноса лидов.",
			});
		}
		const { leadIds, toStage, reason, assignedDoctorId } = parsed.data;

		const identity = getRequestIdentity(req);
		const changedByUserId =
			identity?.userId && z.string().uuid().safeParse(identity.userId).success
				? identity.userId
				: null;
		const now = new Date();

		const updatedLeads = await db.transaction(async (tx) => {
			const leadsToUpdate = await tx
				.select()
				.from(crmLeads)
				.where(
					and(
						eq(crmLeads.organizationId, organizationId),
						inArray(crmLeads.id, leadIds),
					),
				)
				.for("update");

			if (leadsToUpdate.length === 0) {
				return [];
			}

			const results: (typeof crmLeads.$inferSelect)[] = [];
			for (const lead of leadsToUpdate) {
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
				if (assignedDoctorId !== undefined) {
					updateFields.assignedDoctorId = assignedDoctorId;
				}
				if (reason) {
					updateFields.notes = lead.notes
						? `${lead.notes}\n[Пакетный перенос]: ${reason}`
						: `[Пакетный перенос]: ${reason}`;
				}

				const [updated] = await tx
					.update(crmLeads)
					.set(updateFields)
					.where(
						and(
							eq(crmLeads.id, lead.id),
							eq(crmLeads.organizationId, organizationId),
						),
					)
					.returning();

				if (updated) {
					results.push(updated);
				}
			}

			return results;
		});

		for (const lead of updatedLeads) {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "LEAD_UPDATED",
				payload: lead,
			});
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEADS_BATCH_UPDATED",
			payload: {
				toStage,
				count: updatedLeads.length,
				leadIds: updatedLeads.map((l) => l.id),
			},
		});

		return {
			success: true,
			updatedCount: updatedLeads.length,
			leads: updatedLeads,
		};
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
			})
			.safeParse(req.body);
		if (!statusParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте статус лида.",
			});
		}
		const { status } = statusParsed.data;
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

			const [updated] = await tx
				.update(crmLeads)
				.set({ status, stageEnteredAt: now })
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
			if (data.phone !== undefined) updatePayload.phone = data.phone;
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

		const [lead] = await db
			.update(crmLeads)
			.set(data)
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

	app.post("/api/leads/:id/convert", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead convert",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const convertParsed = convertLeadSchema.safeParse(req.body);
		if (!convertParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте данные конвертации лида: даты, кресло и врач.",
			});
		}
		const payload = convertParsed.data;

		// Transaction for Lead conversion with row-level lock
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

			if (lead.status === "consult_booked") {
				return { alreadyConverted: true as const };
			}

			// Doctor resolution:
			// If payload.doctorId is provided and is a valid UUID, attempt to find that active user.
			// If not provided, or if "default-doctor", or if user is not found:
			// Find the first active user in organizationId (from users table where organizationId = organizationId and isActive = true).
			// If an active user is found, use that doctor's ID! Only if NO active users exist at all in the organization, return { doctorNotFound: true as const }.
			let doctor: { id: string } | undefined;
			const candidateDoctorId = payload.doctorId;
			const isValidDoctorUuid =
				typeof candidateDoctorId === "string" &&
				candidateDoctorId !== "default-doctor" &&
				z.string().uuid().safeParse(candidateDoctorId).success;

			if (isValidDoctorUuid && candidateDoctorId) {
				const [foundDoctor] = await tx
					.select({ id: users.id })
					.from(users)
					.where(
						and(
							eq(users.id, candidateDoctorId),
							eq(users.organizationId, organizationId),
							eq(users.isActive, true),
						),
					)
					.limit(1);
				doctor = foundDoctor;
			}

			if (!doctor) {
				const [fallbackDoctor] = await tx
					.select({ id: users.id })
					.from(users)
					.where(
						and(
							eq(users.organizationId, organizationId),
							eq(users.isActive, true),
						),
					)
					.limit(1);
				doctor = fallbackDoctor;
			}

			if (!doctor) return { doctorNotFound: true as const };

			// Chair resolution:
			// If payload.chairId is provided, not "default-chair", and is a valid UUID, attempt to find that chair in clinicChairs.
			// If not found, or if payload.chairId is "default-chair" or omitted:
			// Find the first chair in clinicChairs for this organizationId. If found, use its ID.
			// If NO chairs exist in clinicChairs at all, resolvedChairId is undefined (since createAppointmentInDb accepts optional chairId and schema.appointments.chairId is nullable).
			let resolvedChairId: string | undefined;
			const candidateChairId = payload.chairId;
			const isValidChairUuid =
				typeof candidateChairId === "string" &&
				candidateChairId !== "default-chair" &&
				z.string().uuid().safeParse(candidateChairId).success;

			if (isValidChairUuid && candidateChairId) {
				const [foundChair] = await tx
					.select({ id: clinicChairs.id })
					.from(clinicChairs)
					.where(
						and(
							eq(clinicChairs.id, candidateChairId),
							eq(clinicChairs.organizationId, organizationId),
						),
					)
					.limit(1);
				if (foundChair) {
					resolvedChairId = foundChair.id;
				}
			}

			if (!resolvedChairId) {
				const [firstChair] = await tx
					.select({ id: clinicChairs.id })
					.from(clinicChairs)
					.where(eq(clinicChairs.organizationId, organizationId))
					.limit(1);
				if (firstChair) {
					resolvedChairId = firstChair.id;
				}
			}

			// If clinicChairs didn't yield a chair, check if chairs table has a matching chair for the organization
			if (!resolvedChairId && isValidChairUuid && candidateChairId) {
				const [foundInChairs] = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.id, candidateChairId),
							eq(chairs.organizationId, organizationId),
						),
					)
					.limit(1);
				if (foundInChairs) {
					resolvedChairId = foundInChairs.id;
				}
			}

			if (!resolvedChairId) {
				const [firstInChairs] = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.organizationId, organizationId),
							eq(chairs.isActive, true),
						),
					)
					.limit(1);
				if (firstInChairs) {
					resolvedChairId = firstInChairs.id;
				}
			}

			// In createAppointmentInDb, input.chairId is checked against schema.chairs.
			// If resolvedChairId was from clinicChairs and not present in schema.chairs,
			// verify it exists in schema.chairs so foreign key constraint does not fail.
			if (resolvedChairId) {
				const [existsInChairs] = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.id, resolvedChairId),
							eq(chairs.organizationId, organizationId),
						),
					)
					.limit(1);
				if (!existsInChairs) {
					resolvedChairId = undefined;
				}
			}

			// 1. Create Patient from Lead with advertising source preserved
			const leadSource = lead.source ? String(lead.source).trim() : null;
			const [patient] = await tx
				.insert(patients)
				.values({
					organizationId,
					fullName: lead.name || lead.patientName || "Пациент",
					phone: lead.phone,
					status: "active",
					notes: leadSource ? `Источник: ${leadSource}` : null,
					administrativeProfile: leadSource
						? normalizePatientAdministrativeProfile({
								preferredAppointmentNote: `src:${leadSource}`,
							})
						: null,
				})
				.returning();
			if (!patient)
				throw new Error("Не удалось создать карту пациента из лида");

			// 2. Create Appointment via protected business logic
			const appointment = await createAppointmentInDb(
				organizationId,
				{
					patientId: patient.id,
					doctorUserId: doctor.id,
					chairId: resolvedChairId ?? undefined,
					startsAt: payload.appointmentStart,
					endsAt: payload.appointmentEnd,
					status: "planned",
				},
				tx,
			);

			// 3. Mark lead as booked
			await tx
				.update(crmLeads)
				.set({ status: "consult_booked" })
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				);

			return { patient, appointment };
		});

		if ("notFound" in result) {
			return reply.status(404).send({ error: "Lead not found" });
		}
		if ("alreadyConverted" in result) {
			return reply.status(409).send({
				error: "LeadAlreadyConverted",
				message: "Лид уже был сконвертирован в запись другим администратором.",
			});
		}
		if ("doctorNotFound" in result) {
			return reply.code(400).send({ error: "DoctorNotFound" });
		}
		if ("chairNotFound" in result) {
			return reply.code(400).send({ error: "ChairNotFound" });
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_UPDATED",
			payload: { id, organizationId, status: "consult_booked" },
		});
		wsBroker.broadcastToOrganization(organizationId, {
			type: "APPOINTMENT_CREATED",
			payload: result.appointment,
		});

		return result;
	});

	const createPatientFromLeadHandler = async (req: any, reply: any) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead create patient",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };

		// 1. Find lead
		const [lead] = await db
			.select()
			.from(crmLeads)
			.where(
				and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
			)
			.limit(1);

		if (!lead) {
			return reply.code(404).send({
				error: "LeadNotFound",
				message: "Обращение не найдено в клинике.",
			});
		}

		// 2. Check if patient already exists by phone (if provided)
		const cleanPhone = lead.phone ? lead.phone.trim() : null;
		if (cleanPhone) {
			const [existingPatient] = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						eq(patients.phone, cleanPhone),
					),
				)
				.limit(1);

			if (existingPatient) {
				return reply.code(200).send({
					success: true,
					alreadyExisted: true,
					patient: existingPatient,
					patientId: existingPatient.id,
					message: `Пациент с номером ${cleanPhone} уже существует в базе: ${existingPatient.fullName}`,
				});
			}
		}

		// 3. Create Patient from Lead preserving name, phone, source in 1 click
		const leadSource = lead.source ? String(lead.source).trim() : null;
		const [patient] = await db
			.insert(patients)
			.values({
				organizationId,
				fullName: lead.name || lead.patientName || "Пациент из воронки",
				phone: cleanPhone,
				status: "active",
				notes: leadSource ? `Источник: ${leadSource}` : null,
				administrativeProfile: leadSource
					? normalizePatientAdministrativeProfile({
							preferredAppointmentNote: `src:${leadSource}`,
						})
					: null,
			})
			.returning();

		if (!patient) {
			return reply.code(500).send({
				error: "PatientCreationFailed",
				message: "Не удалось создать карту пациента из лида.",
			});
		}

		// Broadcast real-time websocket notification
		wsBroker.broadcastToOrganization(organizationId, {
			type: "PATIENT_CREATED",
			payload: patient,
		});

		return reply.code(201).send({
			success: true,
			alreadyExisted: false,
			patient,
			patientId: patient.id,
			message: `Создана амбулаторная карта: ${patient.fullName}`,
		});
	};

	app.post("/api/leads/:id/create-patient", createPatientFromLeadHandler);
	app.post("/api/leads/:id/convert-to-patient", createPatientFromLeadHandler);
}
