import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { familyGroups, patients, payments } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

const familyPaymentSchema = z.object({
	organizationId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	familyGroupId: z.string().uuid(),
	amountRub: z.number().positive(),
	documentId: z.string().uuid().optional(),
	visitId: z.string().uuid().optional(),
});

async function familyGroupForOrganization(
	familyGroupId: string,
	organizationId: string,
) {
	const [family] = await db
		.select()
		.from(familyGroups)
		.where(
			and(
				eq(familyGroups.id, familyGroupId),
				or(
					eq(familyGroups.organizationId, organizationId),
					isNull(familyGroups.organizationId),
				),
			),
		)
		.limit(1);
	if (!family) return null;
	if (!family.organizationId) {
		await db
			.update(familyGroups)
			.set({ organizationId })
			.where(eq(familyGroups.id, family.id));
		return { ...family, organizationId };
	}
	return family;
}

async function familyMembersForOrganization(
	familyGroupId: string,
	organizationId: string,
) {
	return db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
		})
		.from(patients)
		.where(
			and(
				eq(patients.familyGroupId, familyGroupId),
				eq(patients.organizationId, organizationId),
			),
		);
}

export async function registerFamilyFinanceRoutes(app: FastifyInstance) {
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
				headPatientPhone: patients.phone
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
								ilike(patients.fullName, `%${search}%`)
							)
					  )
					: eq(familyGroups.organizationId, organizationId)
			)
			.orderBy(desc(familyGroups.createdAt))
			.limit(20);

		return families;
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
		const family = await familyGroupForOrganization(
			familyGroupId,
			organizationId,
		);
		if (!family)
			return reply.code(404).send({ error: "Family group not found" });

		const members = await familyMembersForOrganization(
			familyGroupId,
			organizationId,
		);
		if (members.length === 0)
			return reply.code(404).send({ error: "Family group not found" });

		return {
			...family,
			members,
		};
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
		if (!patient || !patient.familyGroupId) {
			return reply.code(404).send({ error: "Patient has no family group" });
		}

		const family = await familyGroupForOrganization(
			patient.familyGroupId,
			organizationId,
		);
		if (!family)
			return reply.code(404).send({ error: "Family group not found" });

		const members = await familyMembersForOrganization(
			patient.familyGroupId,
			organizationId,
		);

		return {
			...family,
			members,
		};
	});

	// POST /api/finance/family — create a family group
	app.post("/api/finance/family", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family finance write",
		);
		if (!organizationId) return;

		const data = z
			.object({
				name: z.string().min(1),
				headPatientId: z.string().uuid().optional(),
			})
			.parse(req.body);

		if (data.headPatientId) {
			const [headPatient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.id, data.headPatientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!headPatient) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Указанный пациент не найден в вашей клинике",
				});
			}
		}

		const result = (await db
			.insert(familyGroups)
			.values({
				organizationId,
				name: data.name,
				headPatientId: data.headPatientId || null,
				balance: "0.00",
			})
			.returning()) as any;
		const family = result[0];

		wsBroker.broadcastToOrganization(organizationId, {
			type: "FAMILY_GROUP_CREATED",
			payload: family,
		});
		return family;
	});

	// PUT /api/finance/family/:id — update a family group
	app.put("/api/finance/family/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family finance write",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const data = z
			.object({
				name: z.string().min(1).optional(),
				headPatientId: z.string().uuid().nullable().optional(),
			})
			.parse(req.body);

		if (data.headPatientId) {
			const [headPatient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.id, data.headPatientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!headPatient) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Указанный пациент не найден в вашей клинике",
				});
			}
		}

		const [family] = await db
			.update(familyGroups)
			.set(data)
			.where(
				and(
					eq(familyGroups.id, id),
					eq(familyGroups.organizationId, organizationId),
				),
			)
			.returning();

		if (!family)
			return reply.code(404).send({ error: "Family group not found" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "FAMILY_GROUP_UPDATED",
			payload: family,
		});
		return family;
	});

	// DELETE /api/finance/family/:id — delete a family group
	app.delete("/api/finance/family/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family finance write",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };

		// Check if it has members
		const members = await familyMembersForOrganization(id, organizationId);
		if (members.length > 0) {
			return reply
				.code(400)
				.send({ error: "Cannot delete family group with members" });
		}

		const result = (await db
			.delete(familyGroups)
			.where(
				and(
					eq(familyGroups.id, id),
					eq(familyGroups.organizationId, organizationId),
				),
			)
			.returning()) as any;
		const family = result[0];

		if (!family)
			return reply.code(404).send({ error: "Family group not found" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "FAMILY_GROUP_DELETED",
			payload: { id },
		});
		return { success: true };
	});

	// POST /api/finance/family/pay — deduct balance in transaction
	app.post("/api/finance/family/pay", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family finance payment",
		);
		if (!organizationId) return;
		const payload = familyPaymentSchema.parse(req.body);

		try {
			const result = await db.transaction(async (tx) => {
				const [patient] = await tx
					.select({ id: patients.id, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(
						and(
							eq(patients.id, payload.patientId),
							eq(patients.organizationId, organizationId),
						),
					)
					.limit(1);
				if (!patient || patient.familyGroupId !== payload.familyGroupId) {
					const err = new Error("Пациент не найден в семейной группе клиники");
					(err as any).statusCode = 404;
					throw err;
				}

				// 1. Get Family Group & Lock it
				const [family] = await tx
					.select()
					.from(familyGroups)
					.where(
						and(
							eq(familyGroups.id, payload.familyGroupId),
							or(
								eq(familyGroups.organizationId, organizationId),
								isNull(familyGroups.organizationId),
							),
						),
					)
					.limit(1)
					.for("update");
				if (!family) {
					const err = new Error("Семейная группа не найдена");
					(err as any).statusCode = 404;
					throw err;
				}

				const currentBalance = Number(family.balance ?? 0);
				if (currentBalance < payload.amountRub) {
					const err = new Error("Недостаточно средств на семейном балансе");
					(err as any).statusCode = 402;
					throw err;
				}

				// 2. Deduct Balance
				const newBalance = currentBalance - payload.amountRub;
				await tx
					.update(familyGroups)
					.set({ balance: newBalance.toFixed(2), organizationId })
					.where(eq(familyGroups.id, family.id));

				// 3. Create Payment Record
				const [payment] = await tx
					.insert(payments)
					.values({
						organizationId,
						patientId: payload.patientId,
						amountRub: Math.round(payload.amountRub),
						method: "family_wallet", // family_wallet
						documentId: payload.documentId,
						visitId: payload.visitId,
						status: "paid",
					})
					.returning();

				return { payment, newBalance };
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "FAMILY_BALANCE_UPDATED",
				payload: {
					organizationId,
					familyGroupId: payload.familyGroupId,
					balance: result.newBalance,
				},
			});
			wsBroker.broadcastToOrganization(organizationId, {
				type: "PAYMENT_CREATED",
				payload: result.payment,
			});

			return result;
		} catch (err: any) {
			const statusCode = err.statusCode || 500;
			const message = err.message || "Internal Server Error";
			return reply.code(statusCode).send({
				error: statusCode === 402 ? "InsufficientFunds" : "PaymentFailed",
				message,
			});
		}
	});
}
