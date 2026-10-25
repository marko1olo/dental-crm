import { kopecksToNumericString, parseKopecks } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { familyGroups, patients } from "../../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	familyGroupForOrganization,
	familyMembersForOrganization,
} from "./familyBalanceService.js";
import {
	createFamilyGroupSchema,
	updateFamilyGroupSchema,
} from "./familyFinanceTypes.js";

export function registerFamilyGroupWriteRoutes(app: FastifyInstance) {
	// POST /api/finance/family — create a family group
	app.post("/api/finance/family", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family finance write");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const createParsed = createFamilyGroupSchema.safeParse(req.body);
		if (!createParsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Проверьте данные: нужно непустое имя." });
		}
		const data = createParsed.data;

		if (data.headPatientId) {
			const [head] = await db.select({ id: patients.id, familyGroupId: patients.familyGroupId }).from(patients)
				.where(and(eq(patients.id, data.headPatientId), eq(patients.organizationId, organizationId))).limit(1);
			if (!head) return reply.code(403).send({ error: "Forbidden", message: "Пациент не найден в клинике" });
			if (head.familyGroupId) return reply.code(409).send({ error: "PatientAlreadyInFamily", message: "Пациент уже в другой семье" });
		}

		const family = await db.transaction(async (tx) => {
			const [created] = await tx.insert(familyGroups).values({
				organizationId, name: data.name, headPatientId: data.headPatientId || null, balance: kopecksToNumericString(0),
			}).returning();

			if (data.headPatientId && created) {
				await tx.update(patients).set({ familyGroupId: created.id, updatedAt: new Date() })
					.where(and(eq(patients.id, data.headPatientId), eq(patients.organizationId, organizationId)));
			}
			return created;
		});

		wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_CREATED", payload: family });
		return family;
	});

	// PUT /api/finance/family/:id — update a family group
	app.put("/api/finance/family/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family finance write");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const { id } = req.params as { id: string };
		const updateParsed = updateFamilyGroupSchema.safeParse(req.body);
		if (!updateParsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Проверьте данные семейной группы." });
		}
		const data = updateParsed.data;

		if (data.headPatientId) {
			const [head] = await db.select({ id: patients.id, familyGroupId: patients.familyGroupId }).from(patients)
				.where(and(eq(patients.id, data.headPatientId), eq(patients.organizationId, organizationId))).limit(1);
			if (!head) return reply.code(403).send({ error: "Forbidden", message: "Пациент не найден в клинике" });
			if (head.familyGroupId && head.familyGroupId !== id) {
				return reply.code(409).send({ error: "PatientAlreadyInFamily", message: "Пациент уже в другой семье" });
			}
		}

		const family = await db.transaction(async (tx) => {
			const [updated] = await tx.update(familyGroups).set(data)
				.where(and(eq(familyGroups.id, id), eq(familyGroups.organizationId, organizationId))).returning();
			if (!updated) return null;
			if (data.headPatientId) {
				await tx.update(patients).set({ familyGroupId: id, updatedAt: new Date() })
					.where(and(eq(patients.id, data.headPatientId), eq(patients.organizationId, organizationId)));
			}
			return updated;
		});

		if (!family) return reply.code(404).send({ error: "Family group not found" });
		wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_UPDATED", payload: family });
		return family;
	});

	// DELETE /api/finance/family/:id — delete a family group
	app.delete("/api/finance/family/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family finance write");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const { id } = req.params as { id: string };
		const deleteResult = await db.transaction(async (tx) => {
			const members = await familyMembersForOrganization(id, organizationId);
			if (members.length > 0) return { status: 400, body: { error: "Cannot delete family group with members" } };
			const family = await familyGroupForOrganization(id, organizationId);
			if (!family) return { status: 404, body: { error: "Family group not found" } };
			const balanceKopecks = parseKopecks(family.balance);
			if (balanceKopecks !== 0) {
				return { status: 409, body: { error: "FamilyWalletNotEmpty", message: `На кошельке ${kopecksToNumericString(balanceKopecks)} ₽. Удалить нельзя.` } };
			}
			const [deleted] = await tx.delete(familyGroups).where(and(eq(familyGroups.id, id), eq(familyGroups.organizationId, organizationId))).returning({ id: familyGroups.id });
			if (!deleted) return { status: 404, body: { error: "Family group not found" } };
			return { status: 200, body: { success: true } };
		});

		if (deleteResult.status === 200) {
			wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_DELETED", payload: { id } });
		}
		return reply.code(deleteResult.status).send(deleteResult.body);
	});
}
