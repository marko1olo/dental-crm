import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	visits,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	ensurePatientInOrganization,
	ledgerRowId,
	loadTreatmentPlansForPatient,
	numeric,
	splitStoredPriceId,
} from "./planHelpers.js";
import {
	LEDGER_ID_PREFIX_LENGTH,
	UUID_SHAPE,
} from "./types.js";

export function registerPlanCompletionRoutes(app: FastifyInstance) {
	/**
	 * Завершение позиций плана лечения (или целого этапа) при проведении приема
	 * (Closed Loop Lifecycle: useVisitCompletion -> complete-items -> TreatmentPlanRoadmap)
	 */
	app.post(
		"/api/patients/:patientId/treatment-plans/:planId/complete-items",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"complete treatment plan items",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.write",
					role: staffRole,
					message: `Отказ в завершении позиций плана лечения (152-ФЗ / 323-ФЗ): ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params as {
				patientId: string;
				planId: string;
			};
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const completeItemsSchema = z.object({
				itemIds: z.array(z.string()).optional(),
				phase: z.number().int().positive().optional(),
				visitId: z.string().uuid().optional().nullable(),
				renderedServices: z
					.array(
						z.object({
							code: z.string().optional(),
							name: z.string().optional(),
							toothNumber: z.union([z.number(), z.string()]).optional().nullable(),
						}),
					)
					.optional(),
			});

			const parsed = completeItemsSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					details: parsed.error.issues,
				});
			}

			const body = parsed.data;

			const [plan] = await db
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, planId),
						eq(treatmentPlans.patientId, patientId),
						eq(treatmentPlans.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!plan) {
				return reply.code(404).send({ error: "TreatmentPlanNotFound" });
			}

			const planItems = await db
				.select()
				.from(treatmentPlanItemsNew)
				.where(
					and(
						eq(treatmentPlanItemsNew.planId, planId),
						eq(treatmentPlanItemsNew.organizationId, organizationId),
					),
				)
				.orderBy(treatmentPlanItemsNew.createdAt);

			if (planItems.length === 0) {
				const updatedPlans = await loadTreatmentPlansForPatient(patientId, organizationId);
				return reply.send({
					success: true,
					planId,
					completedItemIds: [],
					isFullyCompleted: true,
					plan: updatedPlans.find((p) => p.id === planId) ?? null,
				});
			}

			// Определяем целевые индексы позиций плана
			const targetIndices = new Set<number>();

			if (body.phase !== undefined) {
				planItems.forEach((item, idx) => {
					if (item.phase === body.phase) {
						targetIndices.add(idx);
					}
				});
			}

			if (body.itemIds && body.itemIds.length > 0) {
				const idSet = new Set(body.itemIds.map((id) => id.toLowerCase()));
				planItems.forEach((item, idx) => {
					const ledgerId = ledgerRowId(planId, idx).toLowerCase();
					if (idSet.has(item.id.toLowerCase()) || idSet.has(ledgerId)) {
						targetIndices.add(idx);
					}
				});
			}

			if (body.renderedServices && body.renderedServices.length > 0) {
				for (const srv of body.renderedServices) {
					const srvTooth =
						srv.toothNumber !== undefined && srv.toothNumber !== null
							? Number(srv.toothNumber)
							: null;
					const srvCode = (srv.code || "").trim().toLowerCase();
					const srvName = (srv.name || "").trim().toLowerCase();

					planItems.forEach((item, idx) => {
						const { priceId, name } = splitStoredPriceId(item.priceId);
						const itemTooth = item.toothNumber;
						const toothMatches =
							srvTooth === null || itemTooth === null || srvTooth === itemTooth;
						const codeMatches =
							Boolean(srvCode) && priceId.toLowerCase().includes(srvCode);
						const nameMatches =
							Boolean(srvName) &&
							(name.toLowerCase().includes(srvName) || srvName.includes(name.toLowerCase()));

						if (toothMatches && (codeMatches || nameMatches)) {
							targetIndices.add(idx);
						}
					});
				}
			}

			// Если ничего конкретного не передано — завершаем все позиции плана
			if (
				body.phase === undefined &&
				(!body.itemIds || body.itemIds.length === 0) &&
				(!body.renderedServices || body.renderedServices.length === 0)
			) {
				planItems.forEach((_, idx) => targetIndices.add(idx));
			}

			// Записываем статус completed в treatmentItems
			await withTenantCtx(organizationId, async (tx) => {
				let validVisitId: string | null = null;
				if (body.visitId) {
					const [visRow] = await tx
						.select({ id: visits.id })
						.from(visits)
						.where(
							and(
								eq(visits.id, body.visitId),
								eq(visits.organizationId, organizationId),
							),
						)
						.limit(1);
					if (visRow) {
						validVisitId = visRow.id;
					}
				}

				for (const idx of targetIndices) {
					const item = planItems[idx];
					if (!item) continue;
					const ledgerId = ledgerRowId(planId, idx);

					const [existing] = await tx
						.select({ id: treatmentItems.id })
						.from(treatmentItems)
						.where(
							and(
								eq(treatmentItems.id, ledgerId),
								eq(treatmentItems.organizationId, organizationId),
							),
						)
						.limit(1);

					if (existing) {
						await tx
							.update(treatmentItems)
							.set({
								status: "completed",
								visitId: validVisitId,
								isSynced: false,
								version: sql`${treatmentItems.version} + 1`,
							})
							.where(
								and(
									eq(treatmentItems.id, ledgerId),
									eq(treatmentItems.organizationId, organizationId),
								),
							);
					} else {
						const { name } = splitStoredPriceId(item.priceId);
						await tx.insert(treatmentItems).values({
							id: ledgerId,
							organizationId,
							patientId,
							visitId: validVisitId,
							serviceId: UUID_SHAPE.test(item.priceId) ? item.priceId : null,
							toothCode:
								item.toothNumber !== null && item.toothNumber !== undefined
									? String(item.toothNumber)
									: null,
							title: name,
							quantity: String(item.quantity),
							priceRub: numeric(item.price),
							unitPriceRub: numeric(item.price),
							discountRub: numeric(item.discount),
							status: "completed",
							plannedDoctorUserId: item.doctorId ?? null,
							notes: body.visitId ? `Завершено в приёме ${body.visitId}` : null,
							isSynced: false,
							version: 1,
						});
					}
				}

				// Проверяем, все ли позиции плана теперь завершены
				const ledgerRows = await tx
					.select({ id: treatmentItems.id, status: treatmentItems.status })
					.from(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, organizationId),
							eq(treatmentItems.patientId, patientId),
							sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${planId.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase()}`,
						),
					);

				const completedLedgerIds = new Set(
					ledgerRows
						.filter((r) => r.status === "completed")
						.map((r) => r.id.toLowerCase()),
				);

				const allCompleted = planItems.every((_, idx) =>
					completedLedgerIds.has(ledgerRowId(planId, idx).toLowerCase()),
				);

				if (allCompleted) {
					await tx
						.update(treatmentPlans)
						.set({
							status: "Completed",
							updatedAt: new Date(),
							version: sql`${treatmentPlans.version} + 1`,
						})
						.where(
							and(
								eq(treatmentPlans.id, planId),
								eq(treatmentPlans.organizationId, organizationId),
							),
						);
				} else if (targetIndices.size > 0 && plan.status === "Draft") {
					await tx
						.update(treatmentPlans)
						.set({
							status: "Active",
							updatedAt: new Date(),
							version: sql`${treatmentPlans.version} + 1`,
						})
						.where(
							and(
								eq(treatmentPlans.id, planId),
								eq(treatmentPlans.organizationId, organizationId),
							),
						);
				}
			});

			wsBroker.broadcastToPatient(organizationId, patientId, {
				type: "treatment_plan_updated",
				planId,
				completedItemCount: targetIndices.size,
				totalItemCount: planItems.length,
			});

			const updatedPlans = await loadTreatmentPlansForPatient(patientId, organizationId);
			const updatedPlan = updatedPlans.find((p) => p.id === planId) ?? null;

			const completedPlanItemIds = Array.from(targetIndices)
				.map((idx) => planItems[idx]?.id)
				.filter((id): id is string => Boolean(id));

			return reply.send({
				success: true,
				planId,
				completedItemIds: completedPlanItemIds,
				isFullyCompleted: updatedPlan?.status === "Completed",
				plan: updatedPlan,
			});
		},
	);
}
