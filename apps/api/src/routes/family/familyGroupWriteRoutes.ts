import { kopecksToNumericString, parseKopecks } from "@dental/shared";
import { and, eq, inArray, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import type { db } from "../../db/client.js";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import { familyGroups, patientRelationships, patients } from "../../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	addFamilyMemberSchema,
	createFamilyGroupSchema,
	updateFamilyGroupSchema,
	updateFamilyPermissionsSchema,
} from "./familyFinanceTypes.js";

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = DatabaseTransaction | typeof db | TenantDb;

/**
 * ensureFamilyMemberSpendAuthorization
 *
 * Automatically creates or upserts a confirmed kinship link in `patient_relationships`
 * with `can_spend_family_wallet = true` between the family wallet owner (head)
 * and the added/updated family member.
 * This guarantees that `familySpendAuthorization.ts` does NOT reject member debits with 403 Forbidden!
 */
export async function ensureFamilyMemberSpendAuthorization(
	tx: DbOrTx,
	organizationId: string,
	walletOwnerId: string,
	memberId: string,
	canSpend = true,
	relationshipType?: string,
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

	const resolvedRelationship = relationshipType?.trim() || undefined;

	if (existing) {
		await tx
			.update(patientRelationships)
			.set({
				canSpendFamilyWallet: canSpend,
				isPrimaryPayer: canSpend,
				...(resolvedRelationship ? { relationshipType: resolvedRelationship } : {}),
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
			relationshipType: resolvedRelationship ?? "relative",
			isLegalRepresentative: false,
			canViewMedicalRecord: true,
			canSignConsents: false,
			canSpendFamilyWallet: canSpend,
			isPrimaryPayer: canSpend,
			canViewRecords: true,
		});
	}
}

export interface CreateFamilyGroupData {
	name: string;
	headPatientId?: string | null | undefined;
	memberPatientIds?: string[] | undefined;
}

export type ExecuteCreateFamilyGroupResult =
	| { success: true; status: 200; family: typeof familyGroups.$inferSelect }
	| { success: false; status: 400 | 403 | 409 | 500; error: string; message: string };

export async function executeCreateFamilyGroup(params: {
	organizationId: string;
	data: CreateFamilyGroupData;
	txClient?: TenantDb | undefined;
}): Promise<ExecuteCreateFamilyGroupResult> {
	const { organizationId, data, txClient } = params;

	const runInTx = async (tx: TenantDb): Promise<ExecuteCreateFamilyGroupResult> => {
		if (data.headPatientId) {
			const [head] = await tx
				.select({ id: patients.id, familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(and(eq(patients.id, data.headPatientId), eq(patients.organizationId, organizationId)))
				.limit(1);
			if (!head) return { success: false, status: 403, error: "Forbidden", message: "Пациент не найден в клинике" };
			if (head.familyGroupId) return { success: false, status: 409, error: "PatientAlreadyInFamily", message: "Пациент уже в другой семье" };
		}

		if (Array.isArray(data.memberPatientIds) && data.memberPatientIds.length > 0) {
			const memberIds = Array.from(new Set(data.memberPatientIds.filter((m): m is string => Boolean(m) && m !== data.headPatientId)));
			if (memberIds.length > 0) {
				const orgMembers = await tx
					.select({ id: patients.id, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(and(inArray(patients.id, memberIds), eq(patients.organizationId, organizationId)));
				if (orgMembers.length !== memberIds.length) {
					return {
						success: false,
						status: 400,
						error: "InvalidMemberPatientId",
						message: "Один или несколько пациентов не найдены в клинике (IDOR защита)",
					};
				}
				const conflicting = orgMembers.find((m) => Boolean(m.familyGroupId));
				if (conflicting) {
					return {
						success: false,
						status: 409,
						error: "PatientAlreadyInFamily",
						message: "Один или несколько выбранных пациентов уже состоят в другой семье",
					};
				}
			}
		}

		const [created] = await tx.insert(familyGroups).values({
			organizationId,
			name: data.name,
			headPatientId: data.headPatientId || null,
			balance: kopecksToNumericString(0),
			balanceKopecks: 0,
		}).returning();

		if (!created) {
			return { success: false, status: 500, error: "InsertFailed", message: "Не удалось создать семейную группу" };
		}

		if (data.headPatientId) {
			await tx.update(patients).set({ familyGroupId: created.id, updatedAt: new Date() })
				.where(and(eq(patients.id, data.headPatientId), eq(patients.organizationId, organizationId)));
		}

		if (data.headPatientId && Array.isArray(data.memberPatientIds) && data.memberPatientIds.length > 0) {
			const uniqueMemberIds = Array.from(
				new Set(data.memberPatientIds.filter((m): m is string => Boolean(m) && m !== data.headPatientId)),
			);
			for (const memberId of uniqueMemberIds) {
				await tx.update(patients).set({ familyGroupId: created.id, updatedAt: new Date() })
					.where(and(eq(patients.id, memberId), eq(patients.organizationId, organizationId)));
				await ensureFamilyMemberSpendAuthorization(tx, organizationId, data.headPatientId, memberId, true);
			}
		}

		return { success: true, status: 200, family: created };
	};

	return txClient ? runInTx(txClient) : withTenantCtx(organizationId, runInTx);
}

export type ExecuteAddFamilyMemberResult =
	| { success: true; status: 200; body: { success: true; patientId: string; familyGroupId: string; canSpendFamilyWallet: boolean } }
	| { success: false; status: 400 | 404 | 409; body: { error: string; message: string } };

export async function executeAddFamilyMember(params: {
	organizationId: string;
	familyGroupId: string;
	patientId: string;
	canSpendFamilyWallet?: boolean | undefined;
	relationshipType?: string | undefined;
	txClient?: TenantDb | undefined;
}): Promise<ExecuteAddFamilyMemberResult> {
	const { organizationId, familyGroupId, patientId, canSpendFamilyWallet = true, relationshipType, txClient } = params;

	const runInTx = async (tx: TenantDb): Promise<ExecuteAddFamilyMemberResult> => {
		const [family] = await tx.select().from(familyGroups)
			.where(and(eq(familyGroups.id, familyGroupId), eq(familyGroups.organizationId, organizationId))).for("update").limit(1);
		if (!family) return { success: false, status: 404, body: { error: "FamilyNotFound", message: "Семейная группа не найдена" } };

		const [patient] = await tx.select().from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId))).limit(1);
		if (!patient) return { success: false, status: 404, body: { error: "PatientNotFound", message: "Пациент не найден в клинике" } };

		if (patient.familyGroupId && patient.familyGroupId !== familyGroupId) {
			return { success: false, status: 409, body: { error: "PatientAlreadyInFamily", message: "Пациент уже состоит в другой семейной группе" } };
		}

		await tx.update(patients).set({ familyGroupId, updatedAt: new Date() })
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)));

		const headId = family.headPatientId || family.primaryPatientId;
		if (headId && headId !== patientId) {
			await ensureFamilyMemberSpendAuthorization(tx, organizationId, headId, patientId, canSpendFamilyWallet, relationshipType);
		}

		return { success: true, status: 200, body: { success: true, patientId, familyGroupId, canSpendFamilyWallet } };
	};

	return txClient ? runInTx(txClient) : withTenantCtx(organizationId, runInTx);
}

export function registerFamilyGroupWriteRoutes(app: FastifyInstance) {
	// POST /api/finance/family — create a family group
	app.post("/api/finance/family", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family finance write");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({ error: "InvalidIdempotencyKey", message: "Некорректный заголовок Idempotency-Key (ожидается UUID)" });
		}

		const createParsed = createFamilyGroupSchema.safeParse(req.body);
		if (!createParsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Проверьте данные: нужно непустое имя." });
		}
		const data = createParsed.data;

		const result = await executeCreateFamilyGroup({ organizationId, data });
		if (!result.success) {
			return reply.code(result.status).send({ error: result.error, message: result.message });
		}

		wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_CREATED", payload: result.family });
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}
		return result.family;
	});

	// PUT /api/finance/family/:id — update a family group
	app.put("/api/finance/family/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family finance write");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({ error: "InvalidIdempotencyKey", message: "Некорректный заголовок Idempotency-Key (ожидается UUID)" });
		}

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор семейной группы (ожидается UUID)" });
		}
		const updateParsed = updateFamilyGroupSchema.safeParse(req.body);
		if (!updateParsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Проверьте данные семейной группы." });
		}
		const data = updateParsed.data;

		const updateResult = await withTenantCtx(organizationId, async (tx) => {
			if (data.headPatientId) {
				const [head] = await tx
					.select({ id: patients.id, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(and(eq(patients.id, data.headPatientId), eq(patients.organizationId, organizationId)))
					.limit(1);
				if (!head) return { status: 403 as const, body: { error: "Forbidden", message: "Пациент не найден в клинике" } };
				if (head.familyGroupId && head.familyGroupId !== id) {
					return { status: 409 as const, body: { error: "PatientAlreadyInFamily", message: "Пациент уже в другой семье" } };
				}
			}

			if (Array.isArray(data.memberPatientIds) && data.memberPatientIds.length > 0) {
				const memberIds = Array.from(new Set(data.memberPatientIds.filter((m): m is string => Boolean(m) && m !== data.headPatientId)));
				if (memberIds.length > 0) {
					const orgMembers = await tx
						.select({ id: patients.id, familyGroupId: patients.familyGroupId })
						.from(patients)
						.where(and(inArray(patients.id, memberIds), eq(patients.organizationId, organizationId)));
					if (orgMembers.length !== memberIds.length) {
						return {
							status: 400 as const,
							body: {
								error: "InvalidMemberPatientId",
								message: "Один или несколько пациентов не найдены в клинике (IDOR защита)",
							},
						};
					}
					const conflicting = orgMembers.find((m) => m.familyGroupId && m.familyGroupId !== id);
					if (conflicting) {
						return {
							status: 409 as const,
							body: {
								error: "PatientAlreadyInFamily",
								message: "Один или несколько пациентов уже состоят в другой семье",
							},
						};
					}
				}
			}

			const familyUpdates: Partial<typeof familyGroups.$inferInsert> = {
				updatedAt: new Date(),
			};
			if (data.name !== undefined) familyUpdates.name = data.name;
			if (data.headPatientId !== undefined) familyUpdates.headPatientId = data.headPatientId;

			const [updated] = await tx
				.update(familyGroups)
				.set(familyUpdates)
				.where(and(eq(familyGroups.id, id), eq(familyGroups.organizationId, organizationId)))
				.returning();
			if (!updated) return { status: 404 as const, body: { error: "Family group not found" } };

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
			return { status: 200 as const, body: updated };
		});

		if (updateResult.status !== 200) {
			return reply.code(updateResult.status).send(updateResult.body);
		}
		wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_UPDATED", payload: updateResult.body });
		return updateResult.body;
	});

	// POST /api/finance/family/:id/members — добавить пациента в семью с правами списания
	app.post("/api/finance/family/:id/members", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family member add");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({ error: "InvalidIdempotencyKey", message: "Некорректный заголовок Idempotency-Key (ожидается UUID)" });
		}

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор семейной группы (ожидается UUID)" });
		}
		const parsed = addFamilyMemberSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный ID пациента для добавления в семью" });
		}
		const { patientId, canSpendFamilyWallet, relationshipType } = parsed.data;

		const result = await executeAddFamilyMember({
			organizationId,
			familyGroupId: id,
			patientId,
			canSpendFamilyWallet,
			relationshipType,
		});

		if (result.status === 200) {
			wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_UPDATED", payload: { id } });
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}
		return reply.code(result.status).send(result.body);
	});

	// DELETE /api/finance/family/:id/members/:patientId — исключить пациента из семьи
	app.delete("/api/finance/family/:id/members/:patientId", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family member remove");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const { id, patientId } = req.params as { id: string; patientId: string };
		if (!isValidUuid(id) || !isValidUuid(patientId)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный UUID семейной группы или пациента" });
		}
		const result = await withTenantCtx(organizationId, async (tx) => {
			const [family] = await tx.select().from(familyGroups)
				.where(and(eq(familyGroups.id, id), eq(familyGroups.organizationId, organizationId))).for("update").limit(1);
			if (!family) return { status: 404, body: { error: "FamilyNotFound", message: "Семейная группа не найдена" } };

			await tx.update(patients).set({ familyGroupId: null, updatedAt: new Date() })
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)));

			const headId = family.headPatientId || family.primaryPatientId;
			if (headId) {
				await tx
					.update(patientRelationships)
					.set({
						canSpendFamilyWallet: false,
						isPrimaryPayer: false,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(patientRelationships.organizationId, organizationId),
							or(
								and(
									eq(patientRelationships.patientId, headId),
									eq(patientRelationships.relatedPatientId, patientId),
								),
								and(
									eq(patientRelationships.patientId, patientId),
									eq(patientRelationships.relatedPatientId, headId),
								),
							),
						),
					);
			}

			const isHead = family.headPatientId === patientId || family.primaryPatientId === patientId;
			if (isHead) {
				// При удалении главы семьи автоматически переносим роль главы на следующего
				// совершеннолетнего члена группы, предотвращая потерю главы и ошибки при последующих операциях.
				const remainingMembers = await tx
					.select({
						id: patients.id,
						birthDate: patients.birthDate,
						createdAt: patients.createdAt,
					})
					.from(patients)
					.where(
						and(
							eq(patients.familyGroupId, id),
							eq(patients.organizationId, organizationId),
						),
					);

				let nextHeadId: string | null = null;
				if (remainingMembers.length > 0) {
					const now = new Date();
					const adults = remainingMembers.filter((m) => {
						if (!m.birthDate) return true;
						const b = new Date(m.birthDate);
						if (Number.isNaN(b.getTime())) return true;
						let age = now.getFullYear() - b.getFullYear();
						const mDiff = now.getMonth() - b.getMonth();
						if (mDiff < 0 || (mDiff === 0 && now.getDate() < b.getDate())) {
							age--;
						}
						return age >= 18;
					});

					nextHeadId = adults[0]?.id ?? remainingMembers[0]?.id ?? null;
				}

				await tx
					.update(familyGroups)
					.set({
						headPatientId: nextHeadId,
						primaryPatientId: nextHeadId,
						updatedAt: new Date(),
					})
					.where(and(eq(familyGroups.id, id), eq(familyGroups.organizationId, organizationId)));

				if (nextHeadId) {
					for (const rem of remainingMembers) {
						if (rem.id !== nextHeadId) {
							await ensureFamilyMemberSpendAuthorization(tx, organizationId, nextHeadId, rem.id, true);
						}
					}
				}
			}

			return { status: 200, body: { success: true, removedPatientId: patientId, familyGroupId: id } };
		});

		if (result.status === 200) {
			wsBroker.broadcastToOrganization(organizationId, { type: "FAMILY_GROUP_UPDATED", payload: { id, removedMemberId: patientId } });
		}
		return reply.code(result.status).send(result.body);
	});

	// PATCH /api/finance/family/permissions — сохранение прав списания семейного аванса
	const updatePermissionsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family permissions write");
		if (!organizationId) return;
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const params = req.params as { id?: string };
		if (params.id && !isValidUuid(params.id)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор семейной группы (ожидается UUID)" });
		}
		const parsed = updateFamilyPermissionsSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры прав доступа", details: parsed.error.issues });
		}
		const data = parsed.data;
		const targetFamilyId = params.id || data.familyGroupId;

		const result = await withTenantCtx(organizationId, async (tx) => {
			let family: typeof familyGroups.$inferSelect | undefined;
			if (targetFamilyId) {
				const [found] = await tx.select().from(familyGroups)
					.where(and(eq(familyGroups.id, targetFamilyId), eq(familyGroups.organizationId, organizationId))).for("update").limit(1);
				family = found;
			} else if (data.patientId) {
				const [pat] = await tx.select({ familyGroupId: patients.familyGroupId }).from(patients)
					.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, organizationId))).limit(1);
				if (pat?.familyGroupId) {
					const [found] = await tx.select().from(familyGroups)
						.where(and(eq(familyGroups.id, pat.familyGroupId), eq(familyGroups.organizationId, organizationId))).for("update").limit(1);
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

		const idempotencyKey = extractIdempotencyKey(req);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({ error: "InvalidIdempotencyKey", message: "Некорректный заголовок Idempotency-Key (ожидается UUID)" });
		}

		const { id } = req.params as { id: string };
		if (!isValidUuid(id)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор семейной группы (ожидается UUID)" });
		}
		const deleteResult = await withTenantCtx(organizationId, async (tx) => {
			const [family] = await tx
				.select()
				.from(familyGroups)
				.where(and(eq(familyGroups.id, id), eq(familyGroups.organizationId, organizationId)))
				.for("update");
			if (!family) return { status: 404, body: { error: "Family group not found" } };

			const members = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.familyGroupId, id), eq(patients.organizationId, organizationId)))
				.limit(1);
			if (members.length > 0) return { status: 400, body: { error: "Cannot delete family group with members" } };

			const balanceKopecks = Number(family.balanceKopecks != null ? family.balanceKopecks : parseKopecks(family.balance));
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
