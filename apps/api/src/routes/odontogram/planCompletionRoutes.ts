import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { isValidUuid, multiplyKopecks, rublesToKopecks, toExactKopecks } from "@dental/shared";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import {
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	visits,
} from "../../db/schema.js";
import { rublesFromKopecks } from "../../money/patientDebt.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { extractIdempotencyKey } from "../../utils/httpIdempotency.js";
import {
	batchCompleteTreatmentItems,
	batchUpdateStageCompletion,
	type TreatmentItemCompletionUpdateRow,
	type TreatmentPlanStageCompletionUpdateRow,
} from "../treatmentPlan/handlers/mutations/treatmentPlanBatchUpdate.js";
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

interface PlanCompletionParams {
	patientId: string;
	planId: string;
}

function resolvePlanItemMoney(item: typeof treatmentPlanItemsNew.$inferSelect) {
	const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
	const unitPriceKopecksExact =
		item.priceKopecks > 0n
			? toExactKopecks(Number(item.priceKopecks))
			: rublesToKopecks(numeric(item.price));
	const discountKopecksExact =
		item.discountKopecks > 0n
			? toExactKopecks(Number(item.discountKopecks))
			: rublesToKopecks(numeric(item.discount));
	const lineTotalKopecksExact = toExactKopecks(
		Math.max(0, multiplyKopecks(unitPriceKopecksExact, quantity) - discountKopecksExact),
	);

	return {
		quantityStr: String(quantity),
		priceRub: rublesFromKopecks(lineTotalKopecksExact),
		unitPriceRub: rublesFromKopecks(unitPriceKopecksExact),
		discountRub: rublesFromKopecks(discountKopecksExact),
		priceKopecks: BigInt(lineTotalKopecksExact),
		unitPriceKopecks: BigInt(unitPriceKopecksExact),
		discountKopecks: BigInt(discountKopecksExact),
	};
}

export function registerPlanCompletionRoutes(app: FastifyInstance) {
	/**
	 * Завершение позиций плана лечения (или целого этапа) при проведении приема
	 * (Closed Loop Lifecycle: useVisitCompletion -> complete-items -> TreatmentPlanRoadmap)
	 */
	app.post<{ Params: PlanCompletionParams }>(
		"/api/patients/:patientId/treatment-plans/:planId/complete-items",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"complete treatment plan items",
			);
			if (!organizationId) return;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.treatment_plan.write",
					role: staffRole,
					message: `Отказ в завершении позиций плана лечения: ${evalAccess.reason}`,
				});
			}

			const { patientId, planId } = request.params;
			if (!UUID_SHAPE.test(patientId) || !UUID_SHAPE.test(planId)) {
				return reply.code(400).send({ error: "InvalidParameters" });
			}

			const rawIdempotencyKey = extractIdempotencyKey(request);
			const idempotencyKey = rawIdempotencyKey?.trim() ? rawIdempotencyKey.trim() : null;
			if (idempotencyKey) {
				if (!isValidUuid(idempotencyKey)) {
					return reply.code(400).send({
						error: "InvalidIdempotencyKey",
						message: "Заголовок Idempotency-Key должен быть валидным UUID.",
					});
				}
				reply.header("Idempotency-Key", idempotencyKey);
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
						}).strict(),
					)
					.optional(),
			}).strict();

			const parsed = completeItemsSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					details: parsed.error.issues,
				});
			}

			const body = parsed.data;

			const result = await withTenantCtx(organizationId, async (tx) => {
				if (!(await ensurePatientInOrganization(patientId, organizationId, tx))) {
					return { patientNotFound: true as const };
				}
				const [plan] = await tx
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
					return { notFound: true as const };
				}

				const planItems = await tx
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
					const updatedPlans = await loadTreatmentPlansForPatient(patientId, organizationId, tx);
					return {
						empty: true as const,
						updatedPlan: updatedPlans.find((p) => p.id === planId) ?? null,
					};
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

				const ledgerIdByIdx = new Map<number, string>();
				for (const idx of targetIndices) {
					if (planItems[idx]) {
						ledgerIdByIdx.set(idx, ledgerRowId(planId, idx));
					}
				}

				const targetLedgerIds = Array.from(ledgerIdByIdx.values());

				const targetItemIds = Array.from(targetIndices)
					.map((idx) => planItems[idx]?.id)
					.filter((id): id is string => Boolean(id));

				const existingRows =
					targetLedgerIds.length > 0 || targetItemIds.length > 0
						? await tx
								.select({
									id: treatmentItems.id,
									status: treatmentItems.status,
									visitId: treatmentItems.visitId,
									treatmentPlanItemId: treatmentItems.treatmentPlanItemId,
								})
								.from(treatmentItems)
								.where(
									and(
										eq(treatmentItems.organizationId, organizationId),
										ne(treatmentItems.status, "cancelled"),
										or(
											targetLedgerIds.length > 0
												? inArray(treatmentItems.id, targetLedgerIds)
												: sql`false`,
											targetItemIds.length > 0
												? inArray(treatmentItems.treatmentPlanItemId, targetItemIds)
												: sql`false`,
										),
									),
								)
						: [];

				const existingIdSet = new Set(existingRows.map((r) => r.id));
				const existingPlanItemIdSet = new Set(
					existingRows
						.map((r) => r.treatmentPlanItemId)
						.filter((id): id is string => Boolean(id)),
				);

				const updatesToApply: TreatmentItemCompletionUpdateRow[] = [];
				const itemsToInsert: (typeof treatmentItems.$inferInsert)[] = [];

				for (const idx of targetIndices) {
					const item = planItems[idx];
					if (!item) continue;
					const ledgerId = ledgerIdByIdx.get(idx) ?? ledgerRowId(planId, idx);
					const matchingExistingRows = existingRows.filter(
						(row) => row.id === ledgerId || row.treatmentPlanItemId === item.id,
					);

					if (matchingExistingRows.length > 0) {
						const money = resolvePlanItemMoney(item);
						for (const existingRow of matchingExistingRows) {
							updatesToApply.push({
								id: existingRow.id,
								visitId: validVisitId,
								treatmentPlanId: planId,
								treatmentPlanItemId: item.id,
								quantity: money.quantityStr,
								priceRub: money.priceRub,
								unitPriceRub: money.unitPriceRub,
								discountRub: money.discountRub,
								priceKopecks: money.priceKopecks,
								unitPriceKopecks: money.unitPriceKopecks,
								discountKopecks: money.discountKopecks,
							});
						}
					} else if (!existingIdSet.has(ledgerId) && !existingPlanItemIdSet.has(item.id)) {
						const { priceId: parsedPriceId, name } = splitStoredPriceId(item.priceId);
						const money = resolvePlanItemMoney(item);
						const title = item.name?.trim() || name || "Услуга плана лечения";
						const resolvedServiceId = UUID_SHAPE.test(parsedPriceId)
							? parsedPriceId
							: (UUID_SHAPE.test(item.priceId) ? item.priceId : null);
						itemsToInsert.push({
							id: ledgerId,
							organizationId,
							patientId,
							treatmentPlanId: planId,
							treatmentPlanItemId: item.id,
							visitId: validVisitId,
							serviceId: resolvedServiceId,
							toothCode:
								item.toothNumber !== null && item.toothNumber !== undefined
									? String(item.toothNumber)
									: null,
							title,
							quantity: money.quantityStr,
							priceRub: money.priceRub,
							unitPriceRub: money.unitPriceRub,
							discountRub: money.discountRub,
							priceKopecks: money.priceKopecks,
							unitPriceKopecks: money.unitPriceKopecks,
							discountKopecks: money.discountKopecks,
							status: "completed",
							plannedDoctorUserId: item.doctorId ?? null,
							notes: validVisitId ? `Завершено в приёме ${validVisitId}` : null,
							isSynced: false,
							version: 1,
						});
					}
				}

				if (updatesToApply.length > 0) {
					await batchCompleteTreatmentItems(tx, organizationId, updatesToApply);
				}

				if (itemsToInsert.length > 0) {
					await tx.insert(treatmentItems).values(itemsToInsert);
				}

				// Проверяем, все ли позиции плана теперь завершены
				const ledgerRows = await tx
					.select({
						id: treatmentItems.id,
						status: treatmentItems.status,
						treatmentPlanItemId: treatmentItems.treatmentPlanItemId,
					})
					.from(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, organizationId),
							eq(treatmentItems.patientId, patientId),
							or(
								eq(treatmentItems.treatmentPlanId, planId),
								sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${planId.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase()}`,
								sql`${treatmentItems.treatmentPlanItemId} IN (SELECT id FROM treatment_plan_items_new WHERE plan_id = ${planId} AND organization_id = ${organizationId})`,
							),
						),
					);

				const completedLedgerIds = new Set(
					ledgerRows
						.filter((r) => r.status === "completed")
						.map((r) => r.id.toLowerCase()),
				);
				const completedPlanItemIdsSet = new Set(
					ledgerRows
						.filter(
							(r): r is typeof r & { treatmentPlanItemId: string } =>
								r.status === "completed" && typeof r.treatmentPlanItemId === "string",
						)
						.map((r) => r.treatmentPlanItemId.toLowerCase()),
				);

				const allCompleted = planItems.every((item, idx) =>
					completedPlanItemIdsSet.has(item.id.toLowerCase()) ||
					completedLedgerIds.has((ledgerIdByIdx.get(idx) ?? ledgerRowId(planId, idx)).toLowerCase()),
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

				// Синхронизация прогресса этапов treatmentPlanStages (Мандат 8e / Closed-loop)
				const targetPhases = new Set<number>();
				if (body.phase !== undefined) {
					targetPhases.add(body.phase);
				} else {
					for (const idx of targetIndices) {
						if (planItems[idx]?.phase) {
							targetPhases.add(planItems[idx].phase);
						}
					}
				}

				const stageUpdates: TreatmentPlanStageCompletionUpdateRow[] = [];
				for (const phaseNum of targetPhases) {
					const phaseIndices = planItems
						.map((it, idx) => (it.phase === phaseNum ? idx : -1))
						.filter((idx) => idx >= 0);
					const isPhaseItemCompleted = (idx: number): boolean => {
						const planItem = planItems[idx];
						if (!planItem) return false;
						return (
							completedPlanItemIdsSet.has(planItem.id.toLowerCase()) ||
							completedLedgerIds.has(
								(ledgerIdByIdx.get(idx) ?? ledgerRowId(planId, idx)).toLowerCase(),
							) ||
							targetIndices.has(idx)
						);
					};
					const allPhaseCompleted =
						phaseIndices.length > 0 &&
						phaseIndices.every(isPhaseItemCompleted);
					const completedPhaseCount = phaseIndices.filter(isPhaseItemCompleted).length;
					const phasePercentage =
						phaseIndices.length > 0
							? Math.min(100, Math.round((completedPhaseCount / phaseIndices.length) * 100))
							: 0;

					stageUpdates.push({
						stageOrder: phaseNum,
						completionPercentage: phasePercentage,
						autoArchived: allPhaseCompleted,
						archivedAt: allPhaseCompleted ? new Date() : null,
					});
				}

				if (stageUpdates.length > 0) {
					await batchUpdateStageCompletion(tx, organizationId, planId, stageUpdates);
				}

				const completedPlanItemIds = Array.from(targetIndices)
					.map((idx) => planItems[idx]?.id)
					.filter((id): id is string => Boolean(id));

				onTenantTxCommit(() => {
					wsBroker.broadcastToPatient(organizationId, patientId, {
						type: "treatment_plan_updated",
						planId,
						completedItemCount: targetIndices.size,
						totalItemCount: planItems.length,
					});
				});

				const updatedPlans = await loadTreatmentPlansForPatient(patientId, organizationId, tx);

				return {
					success: true as const,
					allCompleted,
					completedPlanItemIds,
					targetCount: targetIndices.size,
					totalCount: planItems.length,
					updatedPlan: updatedPlans.find((p) => p.id === planId) ?? null,
				};
			});

			if ("patientNotFound" in result) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			if ("notFound" in result) {
				return reply.code(404).send({ error: "TreatmentPlanNotFound" });
			}

			if ("empty" in result) {
				return reply.send({
					success: true,
					planId,
					completedItemIds: [],
					isFullyCompleted: true,
					plan: result.updatedPlan,
				});
			}

			const updatedPlan = result.updatedPlan;

			const completedPlanItemIds = result.completedPlanItemIds;

			return reply.send({
				success: true,
				planId,
				completedItemIds: completedPlanItemIds,
				isFullyCompleted: result.allCompleted || updatedPlan?.status === "Completed",
				plan: updatedPlan,
			});
		},
	);
}
