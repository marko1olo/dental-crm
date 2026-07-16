import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	clinicalAuditLogs,
	doctorCommissions,
	inventoryItems,
	procedureMaterialRules,
	treatmentItems,
	visitDiaries,
	visitDiaryRevisions,
} from "../db/schema.js";

const diaryUpsertSchema = z.object({
	visitId: z.string().uuid(),
	patientId: z.string().uuid(),
	anamnesis: z.string().optional(),
	statusLocalis: z.string().optional(),
	diagnosisIcd10: z.string().optional(),
	diagnosisTooth: z.string().optional(),
	treatmentDescription: z.string().optional(),
	organizationId: z.string().uuid().optional(),
	status: z.enum(["draft", "signed"]).optional(),
	instrumentTrayBarcode: z.string().optional(),
});

function computeDiaryHash(
	visitId: string,
	patientId: string,
	anamnesis: string | null | undefined,
	statusLocalis: string | null | undefined,
	treatmentDescription: string | null | undefined,
): string {
	const raw = `${visitId}|${patientId}|${anamnesis ?? ""}|${statusLocalis ?? ""}|${treatmentDescription ?? ""}`;
	return crypto.createHash("sha256").update(raw).digest("hex");
}

export default async function registerDiaryRoutes(app: FastifyInstance) {
	// GET /api/diaries/visit/:visitId — fetch diary for a visit
	app.get("/api/diaries/visit/:visitId", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary"))) return;
		const { visitId } = req.params as { visitId: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		const [diary] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, orgId),
				),
			);

		return reply.send({ diary: diary ?? null });
	});

	// GET /api/diaries/:id/revisions — audit trail for a diary
	app.get("/api/diaries/:id/revisions", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary revisions")))
			return;
		const { id } = req.params as { id: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		// Verify diary belongs to org
		const [diary] = await db
			.select({ id: visitDiaries.id })
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!diary) return reply.code(404).send({ error: "NotFound" });

		const revisions = await db
			.select()
			.from(visitDiaryRevisions)
			.where(eq(visitDiaryRevisions.diaryId, id))
			.orderBy(desc(visitDiaryRevisions.revisedAt));

		return reply.send({ revisions });
	});

	// POST /api/diaries — upsert (create or update) diary draft
	app.post("/api/diaries", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "write diary")))
			return;
		const data = diaryUpsertSchema.parse(req.body);
		const userContext = (req as any).user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });
		data.organizationId = orgId;

		const [existing] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, data.visitId),
					eq(visitDiaries.organizationId, orgId),
				),
			);

		const isSigning = data.status === "signed";

		if (isSigning && role !== "doctor" && role !== "admin") {
			return reply.code(403).send({ error: "OnlyDoctorsCanSign" });
		}

		const diaryHash = isSigning
			? computeDiaryHash(
					data.visitId,
					data.patientId,
					data.anamnesis,
					data.statusLocalis,
					data.treatmentDescription,
				)
			: null;

		if (existing) {
			if (existing.isLocked) {
				return reply.code(403).send({
					error: "DiaryLocked",
					message: "Дневник подписан и заблокирован.",
				});
			}

			await db
				.update(visitDiaries)
				.set({
					anamnesis: data.anamnesis ?? existing.anamnesis,
					statusLocalis: data.statusLocalis ?? existing.statusLocalis,
					diagnosisIcd10: data.diagnosisIcd10 ?? existing.diagnosisIcd10,
					diagnosisTooth: data.diagnosisTooth ?? existing.diagnosisTooth,
					treatmentDescription:
						data.treatmentDescription ?? existing.treatmentDescription,
					updatedAt: new Date(),
					coSignedByUserId: isSigning ? userId : existing.coSignedByUserId,
					diaryHash: diaryHash ?? existing.diaryHash,
					isLocked: isSigning,
					lockedAt: isSigning ? new Date() : existing.lockedAt,
					lockedByUserId: isSigning ? userId : existing.lockedByUserId,
					instrumentTrayBarcode:
						data.instrumentTrayBarcode ?? existing.instrumentTrayBarcode,
				})
				.where(
					and(
						eq(visitDiaries.id, existing.id),
						eq(visitDiaries.organizationId, orgId),
					),
				);

			return reply.send({ success: true, id: existing.id, hash: diaryHash });
		} else {
			const inserted = await db
				.insert(visitDiaries)
				.values({
					organizationId: orgId,
					visitId: data.visitId,
					patientId: data.patientId,
					anamnesis: data.anamnesis,
					statusLocalis: data.statusLocalis,
					diagnosisIcd10: data.diagnosisIcd10,
					diagnosisTooth: data.diagnosisTooth,
					treatmentDescription: data.treatmentDescription,
					draftAuthorId: userId,
					coSignedByUserId: isSigning ? userId : null,
					diaryHash: diaryHash,
					isLocked: isSigning,
					lockedAt: isSigning ? new Date() : null,
					lockedByUserId: isSigning ? userId : null,
					instrumentTrayBarcode: data.instrumentTrayBarcode,
				})
				.returning();

			return reply.send({
				success: true,
				id: inserted[0]?.id,
				hash: diaryHash,
			});
		}
	});

	// POST /api/diaries/:id/lock — forensic lock with SHA-256 seal + revision record
	app.post("/api/diaries/:id/lock", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "lock diary")))
			return;
		const { id } = req.params as { id: string };
		const userContext = (req as any).user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		if (role !== "doctor" && role !== "admin") {
			return reply.code(403).send({ error: "OnlyDoctorsCanLock" });
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		const [existing] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!existing) return reply.code(404).send({ error: "NotFound" });
		if (existing.isLocked)
			return reply
				.code(409)
				.send({ error: "AlreadyLocked", hash: existing.diaryHash });

		const diaryHash = computeDiaryHash(
			existing.visitId,
			existing.patientId,
			existing.anamnesis,
			existing.statusLocalis,
			existing.treatmentDescription,
		);

		// Forensic lock & Cascading Transaction
		try {
			await db.transaction(async (tx) => {
				// 1. Lock the diary
				await tx
					.update(visitDiaries)
					.set({
						isLocked: true,
						lockedAt: new Date(),
						lockedByUserId: userId,
						coSignedByUserId: userId,
						diaryHash: diaryHash,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(visitDiaries.id, id),
							eq(visitDiaries.organizationId, orgId),
						),
					);

				// 1.5 Mark treatments as completed and deduct inventory
				if (existing.visitId) {
					const tItems = await tx
						.select()
						.from(treatmentItems)
						.where(eq(treatmentItems.visitId, existing.visitId));
					if (tItems.length > 0) {
						await tx
							.update(treatmentItems)
							.set({ status: "completed" as any })
							.where(eq(treatmentItems.visitId, existing.visitId));

						for (const item of tItems) {
							if (!item.serviceId) continue;
							const rules = await tx
								.select()
								.from(procedureMaterialRules)
								.where(eq(procedureMaterialRules.serviceId, item.serviceId));
							for (const rule of rules) {
								const [inv] = await tx
									.select()
									.from(inventoryItems)
									.where(eq(inventoryItems.id, rule.inventoryItemId))
									.for("update");
								if (inv) {
									const qtyToDeduct =
										Number(rule.quantityToDeduct) * Number(item.quantity);
									if (inv.stockQuantity < qtyToDeduct) {
										throw new Error(`Недостаточно материалов: ${inv.name}`);
									}
									await tx
										.update(inventoryItems)
										.set({ stockQuantity: inv.stockQuantity - qtyToDeduct })
										.where(eq(inventoryItems.id, inv.id));
								}
							}
						}
					}
				}

				// 2. Insert Commission if not exists
				if (userId) {
					const [existingCommission] = await tx
						.select()
						.from(doctorCommissions)
						.where(
							and(
								eq(doctorCommissions.userId, userId),
								eq(doctorCommissions.organizationId, orgId),
							),
						)
						.limit(1);

					if (!existingCommission) {
						await tx.insert(doctorCommissions).values({
							organizationId: orgId,
							userId: userId,
							specialty: "universal",
							serviceCategory: "therapy",
							commissionPct: 30.0,
							materialCostDeductionPct: 100.0,
							isActive: true,
						});
					}
				}

				// 3. Clinical Audit Log
				await tx.insert(clinicalAuditLogs).values({
					organizationId: orgId,
					patientId: existing.patientId,
					action: "VISIT_SIGNED_AND_LOCKED",
					userId: userId,
					entityType: "visit_diary",
					entityId: id,
				});
			});
			return reply.send({
				success: true,
				hash: diaryHash,
				lockedAt: new Date().toISOString(),
			});
		} catch (err: any) {
			return reply
				.code(400)
				.send({ error: "TransactionFailed", message: err.message });
		}
	});

	// POST /api/diaries/:id/revise — post-lock forced revision (audit court trail)
	app.post("/api/diaries/:id/revise", async (req, reply) => {
		if (
			!(await requireClinicalMutationAccess(req, reply, "revise locked diary"))
		)
			return;
		const { id } = req.params as { id: string };
		const userContext = (req as any).user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		if (role !== "admin") {
			return reply.code(403).send({
				error: "OnlyAdminsCanRevise",
				message:
					"Ревизия заблокированного дневника доступна только администратору.",
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		const [existing] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!existing) return reply.code(404).send({ error: "NotFound" });
		if (!existing.isLocked)
			return reply.code(409).send({
				error: "NotLocked",
				message: "Дневник не подписан — просто редактируйте его.",
			});

		const body = req.body as {
			anamnesis?: string;
			statusLocalis?: string;
			diagnosisIcd10?: string;
			diagnosisTooth?: string;
			treatmentDescription?: string;
			revisionReason?: string;
		};

		// Insert forensic revision record with PREVIOUS content
		await db.insert(visitDiaryRevisions).values({
			diaryId: existing.id,
			previousAnamnesis: existing.anamnesis,
			previousStatusLocalis: existing.statusLocalis,
			previousDiagnosisIcd10: existing.diagnosisIcd10,
			previousTreatmentDescription: existing.treatmentDescription,
			revisedByUserId: userId,
		});

		// Update the diary (unlock for new content, then re-lock immediately)
		const newHash = computeDiaryHash(
			existing.visitId,
			existing.patientId,
			body.anamnesis ?? existing.anamnesis,
			body.statusLocalis ?? existing.statusLocalis,
			body.treatmentDescription ?? existing.treatmentDescription,
		);

		await db
			.update(visitDiaries)
			.set({
				anamnesis: body.anamnesis ?? existing.anamnesis,
				statusLocalis: body.statusLocalis ?? existing.statusLocalis,
				diagnosisIcd10: body.diagnosisIcd10 ?? existing.diagnosisIcd10,
				diagnosisTooth: body.diagnosisTooth ?? existing.diagnosisTooth,
				treatmentDescription:
					body.treatmentDescription ?? existing.treatmentDescription,
				diaryHash: newHash,
				version: (existing.version ?? 1) + 1,
				updatedAt: new Date(),
			})
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		return reply.send({ success: true, hash: newHash, revisionCount: 1 });
	});

	// Legacy endpoint: sync-progress + plan signature (kept for backwards compat)
	app.post("/api/diaries/sync-progress", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "sync progress")))
			return;
		return reply.send({ success: true });
	});

	app.put("/api/treatment-plans/:planId/signature", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "sign plan"))) return;
		return reply.send({ success: true });
	});
}
