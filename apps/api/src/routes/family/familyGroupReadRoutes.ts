import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { familyGroups, patients } from "../../db/schema.js";
import {
	familyGroupForOrganization,
	familyMembersForOrganization,
} from "./familyBalanceService.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const familySearchQuerySchema = z
	.object({
		search: z.string().trim().max(200).optional(),
	})
	.strict();

const familyPatientParamsSchema = z
	.object({
		patientId: z.string().trim().min(1),
	})
	.strict();

const familyIdParamsSchema = z
	.object({
		familyGroupId: z.string().trim().min(1),
	})
	.strict();

export function registerFamilyGroupReadRoutes(app: FastifyInstance) {
	// GET /api/finance/family - search families
	app.get("/api/finance/family", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family finance read",
		);
		if (!organizationId) return;

		const queryParsed = familySearchQuerySchema.safeParse(req.query ?? {});
		if (!queryParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры поиска семейных групп",
				details: queryParsed.error.issues,
			});
		}
		const { search } = queryParsed.data;
		const families = await withTenantCtx(organizationId, async (tx) =>
			tx
				.select({
					id: familyGroups.id,
					name: familyGroups.name,
					balance: familyGroups.balance,
					balanceKopecks: familyGroups.balanceKopecks,
					headPatientId: familyGroups.headPatientId,
					organizationId: familyGroups.organizationId,
					createdAt: familyGroups.createdAt,
					updatedAt: familyGroups.updatedAt,
					headPatientName: patients.fullName,
					headPatientPhone: patients.phone,
				})
				.from(familyGroups)
				.leftJoin(
					patients,
					and(
						eq(familyGroups.headPatientId, patients.id),
						eq(patients.organizationId, organizationId),
					),
				)
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
				.limit(20),
		);

		return { success: true, data: families };
	});

	// GET /api/finance/family/patient/:patientId — fetch family by patient ID
	app.get("/api/finance/family/patient/:patientId", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family finance read",
		);
		if (!organizationId) return;

		const paramsParsed = familyPatientParamsSchema.safeParse(req.params);
		if (!paramsParsed.success || !UUID_REGEX.test(paramsParsed.data.patientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID)",
			});
		}
		const { patientId } = paramsParsed.data;
		const [patient] = await withTenantCtx(organizationId, async (tx) =>
			tx
				.select({ familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(
					and(
						eq(patients.id, patientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1),
		);
		if (!patient?.familyGroupId) {
			return reply.code(404).send({ error: "Patient has no family group" });
		}

		const family = await familyGroupForOrganization(patient.familyGroupId, organizationId);
		if (!family) return reply.code(404).send({ error: "Family group not found" });

		const members = await familyMembersForOrganization(patient.familyGroupId, organizationId);
		return { success: true, data: { ...family, members } };
	});

	// GET /api/finance/family/:familyGroupId — fetch family group and members
	app.get("/api/finance/family/:familyGroupId", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family finance read",
		);
		if (!organizationId) return;

		const paramsParsed = familyIdParamsSchema.safeParse(req.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор семейной группы (ожидается UUID)",
			});
		}
		const { familyGroupId } = paramsParsed.data;
		if (familyGroupId === "patient" || familyGroupId === "pay" || familyGroupId === "topup") {
			return reply.code(404).send({ error: "Family group not found" });
		}
		if (!UUID_REGEX.test(familyGroupId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор семейной группы (ожидается UUID)",
			});
		}

		const family = await familyGroupForOrganization(familyGroupId, organizationId);
		if (!family) return reply.code(404).send({ error: "Family group not found" });

		const members = await familyMembersForOrganization(familyGroupId, organizationId);
		return { success: true, data: { ...family, members } };
	});
}
