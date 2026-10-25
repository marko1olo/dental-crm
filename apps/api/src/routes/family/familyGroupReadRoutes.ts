import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { familyGroups, patients } from "../../db/schema.js";
import {
	familyGroupForOrganization,
	familyMembersForOrganization,
} from "./familyBalanceService.js";

export function registerFamilyGroupReadRoutes(app: FastifyInstance) {
	// GET /api/finance/family - search families
	app.get("/api/finance/family", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family finance read",
		);
		if (!organizationId) return;

		const { search } = req.query as { search?: string };
		const families = await db
			.select({
				id: familyGroups.id,
				name: familyGroups.name,
				balance: familyGroups.balance,
				headPatientId: familyGroups.headPatientId,
				organizationId: familyGroups.organizationId,
				createdAt: familyGroups.createdAt,
				updatedAt: familyGroups.updatedAt,
				headPatientName: patients.fullName,
				headPatientPhone: patients.phone,
			})
			.from(familyGroups)
			.leftJoin(patients, eq(familyGroups.headPatientId, patients.id))
			.where(
				search
					? and(
							eq(familyGroups.organizationId, organizationId),
							or(
								ilike(familyGroups.name, `%${search}%`),
								ilike(patients.phone, `%${search}%`),
								ilike(patients.fullName, `%${search}%`),
							),
						)
					: eq(familyGroups.organizationId, organizationId),
			)
			.orderBy(desc(familyGroups.createdAt))
			.limit(20);

		return families;
	});

	// GET /api/finance/family/patient/:patientId — fetch family by patient ID
	app.get("/api/finance/family/patient/:patientId", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family finance read",
		);
		if (!organizationId) return;

		const { patientId } = req.params as { patientId: string };
		const [patient] = await db
			.select({ familyGroupId: patients.familyGroupId })
			.from(patients)
			.where(
				and(
					eq(patients.id, patientId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!patient?.familyGroupId) {
			return reply.code(404).send({ error: "Patient has no family group" });
		}

		const family = await familyGroupForOrganization(patient.familyGroupId, organizationId);
		if (!family) return reply.code(404).send({ error: "Family group not found" });

		const members = await familyMembersForOrganization(patient.familyGroupId, organizationId);
		return { ...family, members };
	});

	// GET /api/finance/family/:familyGroupId — fetch family group and members
	app.get("/api/finance/family/:familyGroupId", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family finance read",
		);
		if (!organizationId) return;

		const { familyGroupId } = req.params as { familyGroupId: string };
		if (familyGroupId === "patient" || familyGroupId === "pay" || familyGroupId === "topup") {
			return reply.code(404).send({ error: "Family group not found" });
		}

		const family = await familyGroupForOrganization(familyGroupId, organizationId);
		if (!family) return reply.code(404).send({ error: "Family group not found" });

		const members = await familyMembersForOrganization(familyGroupId, organizationId);
		return { ...family, members };
	});
}
