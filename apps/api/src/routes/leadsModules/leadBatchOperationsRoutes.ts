import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { batchUpdateLeadStageSchema } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { crmLeads, crmLeadStageHistory } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { wsBroker } from "../../services/websocketBroker.js";

export async function registerLeadBatchOperationsRoutes(app: FastifyInstance): Promise<void> {
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
}
