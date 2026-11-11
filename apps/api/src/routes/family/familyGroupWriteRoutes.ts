import { kopecksToNumericString, parseKopecks } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { familyGroups, patientRelationships, patients } from "../../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	familyGroupForOrganization,
	familyMembersForOrganization,
} from "./familyBalanceService.js";
import {
	addFamilyMemberSchema,
	createFamilyGroupSchema,
	updateFamilyGroupSchema,
	updateFamilyPermissionsSchema,
} from "./familyFinanceTypes.js";

/**
 * ensureFamilyMemberSpendAuthorization
 *
 * Automatically creates or upserts a confirmed kinship link in `patient_relationships`
 * with `can_spend_family_wallet = true` between the family wallet owner (head)
 * and the added/updated family member.
 * This guarantees that `familySpendAuthorization.ts` does NOT reject member debits with 403 Forbidden!
 */
export async function ensureFamilyMemberSpendAuthorization(
	tx: any,
	organizationId: string,
	walletOwnerId: string,
	memberId: string,
	canSpend = true,
) {
	if (!walletOwnerId || !memberId || walletOwnerId === memberId) return;

	const [existing] = await tx
		.select({ id: patientRelationships.id })
		.from(patientRelationships)
		.where(
			and(
				eq(patientRelationships.organizationId, organizationId),
				or(
					and(
						eq(patientRelationships.patientId, walletOwnerId),
						eq(patientRelationships.relatedPatientId, memberId),
					),
					and(
						eq(patientRelationships.patientId, memberId),
						eq(patientRelationships.relatedPatientId, walletOwnerId),
					),
				),
			),
		)
		.limit(1);

	if (existing) {
		await tx
			.update(patientRelationships)
			.set({
				canSpendFamilyWallet: canSpend,
				isPrimaryPayer: canSpend,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(patientRelationships.id, existing.id),
					eq(patientRelationships.organizationId, organizationId),
				),
			);
	} else {
		await tx.insert(patientRelationships).values({
			organizationId,
			patientId: walletOwnerId,
			relatedPatientId: memberId,
			relationshipType: "relative",
			isLegalRepresentative: false,
			canViewMedicalRecord: true,
			canSignConsents: false,
			canSpendFamilyWallet: canSpend,
			isPrimaryPayer: canSpend,
			canViewRecords: true,
		});
	}
}

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

			if (created && data.headPatientId && Array.isArray(data.memberPatientIds) && data.memberPatientIds.length > 0) {
				for (const memberId of data.memberPatientIds) {
					if (memberId && memberId !== data.headPatientId) {
						await tx.update(patients).set({ familyGroupId: created.id, updatedAt: new Date() })
							.where(and(eq(patients.id, memberId), eq(patients.organizationId, organizationId)));
						await ensureFamilyMemberSpendAuthorization(tx, organizationId, data.headPatientId, memberId, true);
					}
				}
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

			const effectiveHeadId = data.headPatientId || updated.headPatientId;

			if (data.headPatientId) {
				await tx.update(patients).set({ familyGroupId: id, updatedAt: new Date() })
					.where(and(eq(patients.id, data.headPatientId), eq(patients.organizationId, organizationId)));
			}

			if (effectiveHeadId) {
				// Автоматический upsert прав списания для всех существующих членов группы при назначении/смене главы
				const existingMembers = await tx.select({ id: patients.id }).from(patients)
					.where(and(eq(patients.familyGroupId, id), eq(patients.organizationId, organizationId)));
				for (const member of existingMembers) {
					if (member.id !== effectiveHeadId) {
						await ensureFamilyMemberSpendAuthorization(tx, organizationId, effectiveHeadId, member.id, true);
					}
				}

				if (Array.isArray(data.memberPatientIds) && data.memberPatientIds.length > 0) {
					for (const memberId of data.memberPatientIds) {
						if (memberId && memberId !== effectiveHeadId) {
							await tx.update(patients).set({ familyGroupId: id, updatedAt: new Date() })
								.where(and(eq(patients.id, memberId), eq(patients.organizationId, organizationId)));
							await ensureFamilyMemberSpendAuthorization(tx, organizationId, effectiveHeadId, memberId, true);
						}
					}
				}
			}
			return updated;
		});

		if (!family) return reply.code(404).send({ error: "Family group not found" });
		wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_UPDATED", payload: family });
		return family;
	});

	// POST /api/finance/family/:id/members — добавить пациента в семью с правами списания
	app.post("/api/finance/family/:id/members", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family member add");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const { id } = req.params as { id: string };
		const parsed = addFamilyMemberSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный ID пациента для добавления в семью" });
		}
		const { patientId, canSpendFamilyWallet } = parsed.data;

		const result = await db.transaction(async (tx) => {
			const [family] = await tx.select().from(familyGroups)
				.where(and(eq(familyGroups.id, id), eq(familyGroups.organizationId, organizationId))).limit(1);
			if (!family) return { status: 404, body: { error: "FamilyNotFound", message: "Семейная группа не найдена" } };

			const [patient] = await tx.select().from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId))).limit(1);
			if (!patient) return { status: 404, body: { error: "PatientNotFound", message: "Пациент не найден в клинике" } };

			if (patient.familyGroupId && patient.familyGroupId !== id) {
				return { status: 409, body: { error: "PatientAlreadyInFamily", message: "Пациент уже состоит в другой семейной группе" } };
			}

			await tx.update(patients).set({ familyGroupId: id, updatedAt: new Date() })
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)));

			const headId = family.headPatientId || family.primaryPatientId;
			if (headId && headId !== patientId) {
				await ensureFamilyMemberSpendAuthorization(tx, organizationId, headId, patientId, canSpendFamilyWallet ?? true);
			}

			return { status: 200, body: { success: true, patientId, familyGroupId: id, canSpendFamilyWallet: canSpendFamilyWallet ?? true } };
		});

		if (result.status === 200) {
			wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_UPDATED", payload: { id } });
		}
		return reply.code(result.status).send(result.body);
	});

	// DELETE /api/finance/family/:id/members/:patientId — исключить пациента из семьи
	app.delete("/api/finance/family/:id/members/:patientId", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family member remove");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const { id, patientId } = req.params as { id: string; patientId: string };
		const result = await db.transaction(async (tx) => {
			const [family] = await tx.select().from(familyGroups)
				.where(and(eq(familyGroups.id, id), eq(familyGroups.organizationId, organizationId))).limit(1);
			if (!family) return { status: 404, body: { error: "FamilyNotFound", message: "Семейная группа не найдена" } };

			await tx.update(patients).set({ familyGroupId: null, updatedAt: new Date() })
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)));

			const isHead = family.headPatientId === patientId || family.primaryPatientId === patientId;
			if (isHead) {
				// Если удаляемый пациент являлся главой кошелька, обнуляем headPatientId / primaryPatientId для сохранения ссылочной целостности
				await tx.update(familyGroups).set({
					headPatientId: family.headPatientId === patientId ? null : family.headPatientId,
					primaryPatientId: family.primaryPatientId === patientId ? null : family.primaryPatientId,
					updatedAt: new Date(),
				}).where(and(eq(familyGroups.id, id), eq(familyGroups.organizationId, organizationId)));
			}

			return { status: 200, body: { success: true, removedPatientId: patientId, familyGroupId: id } };
		});

		if (result.status === 200) {
			wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_UPDATED", payload: { id, removedMemberId: patientId } });
		}
		return reply.code(result.status).send(result.body);
	});

	// PATCH /api/finance/family/permissions — сохранение прав списания семейного аванса
	const updatePermissionsHandler = async (req: any, reply: any) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family permissions write");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const params = req.params as { id?: string };
		const parsed = updateFamilyPermissionsSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры прав доступа", details: parsed.error.issues });
		}
		const data = parsed.data;
		const targetFamilyId = params.id || data.familyGroupId;

		const result = await db.transaction(async (tx) => {
			let family: typeof familyGroups.$inferSelect | undefined;
			if (targetFamilyId) {
				const [found] = await tx.select().from(familyGroups)
					.where(and(eq(familyGroups.id, targetFamilyId), eq(familyGroups.organizationId, organizationId))).limit(1);
				family = found;
			} else if (data.patientId) {
				const [pat] = await tx.select({ familyGroupId: patients.familyGroupId }).from(patients)
					.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, organizationId))).limit(1);
				if (pat?.familyGroupId) {
					const [found] = await tx.select().from(familyGroups)
						.where(and(eq(familyGroups.id, pat.familyGroupId), eq(familyGroups.organizationId, organizationId))).limit(1);
					family = found;
				}
			}

			if (!family) {
				return { status: 404, body: { error: "FamilyNotFound", message: "Семейная группа не найдена" } };
			}

			const headId = family.headPatientId || family.primaryPatientId || data.patientId;
			if (!headId) {
				return { status: 400, body: { error: "MissingHead", message: "В семье не назначен владелец кошелька" } };
			}

			if (Array.isArray(data.permissions) && data.permissions.length > 0) {
				for (const item of data.permissions) {
					if (item.memberId && item.memberId !== headId) {
						await ensureFamilyMemberSpendAuthorization(tx, organizationId, headId, item.memberId, item.canSpendFamilyWallet);
					}
				}
			} else if (data.memberId && typeof data.canSpendFamilyWallet === "boolean") {
				if (data.memberId !== headId) {
					await ensureFamilyMemberSpendAuthorization(tx, organizationId, headId, data.memberId, data.canSpendFamilyWallet);
				}
			}

			return { status: 200, body: { success: true, familyGroupId: family.id, message: "Права распоряжения семейным авансом сохранены" } };
		});

		if (result.status === 200) {
			wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_BALANCE_UPDATED", payload: { organizationId, familyGroupId: targetFamilyId } });
		}
		return reply.code(result.status).send(result.body);
	};

	app.patch("/api/finance/family/permissions", updatePermissionsHandler);
	app.patch("/api/finance/family/:id/permissions", updatePermissionsHandler);

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
