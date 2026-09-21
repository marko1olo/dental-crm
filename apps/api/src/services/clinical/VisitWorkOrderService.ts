/**
 * VisitWorkOrderService.ts
 *
 * DENTE Dental CRM — Service for Transferring Treatment Plan Items to Visit Work Order.
 * Compliant with:
 * - Постановление Правительства РФ от 11.05.2023 № 736 «Платные медицинские услуги»
 * - Закон РФ от 07.02.1992 № 2300-1 «О защите прав потребителей» (ст. 10, ст. 16 — запрет навязывания услуг)
 * - Приказ Минздрава России от 13.10.2017 № 804н «Номенклатура медицинских услуг»
 * - Федеральный закон от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ» (ст. 13 — врачебная тайна)
 * - Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных»
 */

import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	clinicalAuditLogs,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
	visits,
} from "../../db/schema.js";
import { rublesFromKopecks } from "../../money/patientDebt.js";
import {
	deductMaterialsForVisit,
	type StockDeductionRecord,
} from "../inventory/materialDeduction.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VisitWorkOrderErrorCode =
	| "VALIDATION_ERROR"
	| "VISIT_NOT_FOUND"
	| "VISIT_CLOSED"
	| "PLAN_NOT_FOUND"
	| "PATIENT_MISMATCH"
	| "PLAN_NOT_APPROVED"
	| "PLAN_ITEMS_NOT_FOUND";

export class VisitWorkOrderError extends Error {
	constructor(
		public readonly code: VisitWorkOrderErrorCode,
		message: string,
		public readonly statusCode: number = 400,
	) {
		super(message);
		this.name = "VisitWorkOrderError";
	}
}

export interface ApplyPlanItemsInput {
	readonly organizationId: string;
	readonly visitId: string;
	readonly planId: string;
	readonly itemIds: readonly string[];
	readonly actorUserId?: string | null | undefined;
	readonly autoDeductMaterials?: boolean | undefined;
	readonly targetVisitStatus?: "completed" | "in_progress" | undefined;
}

export interface CompleteVisitWorkOrderInput {
	readonly organizationId: string;
	readonly visitId: string;
	readonly actorUserId?: string | null | undefined;
	readonly status?: "completed" | "in_progress" | undefined;
}

export interface CompleteVisitWorkOrderResult {
	readonly visitId: string;
	readonly previousStatus: string;
	readonly status: string;
	readonly completedTreatmentItemsCount: number;
	readonly deductions: readonly StockDeductionRecord[];
}

export interface AppliedVisitWorkOrderItem {
	readonly id: string;
	readonly planItemId: string;
	readonly serviceId: string | null;
	readonly title: string;
	readonly toothCode: string | null;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly discountRub: number;
	readonly priceRub: number;
	readonly order804nCode: string | null;
	readonly status: string;
	readonly isAlreadyApplied: boolean;
}

export interface ApplyPlanItemsResult {
	readonly visitId: string;
	readonly planId: string;
	readonly transferredItemsCount: number;
	readonly alreadyAppliedItemsCount: number;
	readonly items: readonly AppliedVisitWorkOrderItem[];
	readonly planProgress: {
		readonly totalPlanItems: number;
		readonly completedOrInProgressItems: number;
		readonly completionPercentage: number;
		readonly planStatus: string;
	};
	readonly totalAddedRub: number;
	readonly totalAddedKopecks: number;
	readonly deductions?: readonly StockDeductionRecord[];
}

function splitStoredPriceId(value: string | null): {
	priceId: string;
	name: string | null;
} {
	const stored = (value ?? "").trim();
	const separatorIndex = stored.indexOf("::");
	if (separatorIndex < 0) {
		return { priceId: stored, name: null };
	}
	return {
		priceId: stored.slice(0, separatorIndex).trim(),
		name: stored.slice(separatorIndex + 2).trim() || null,
	};
}

export class VisitWorkOrderService {
	/**
	 * Перенос согласованных позиций плана лечения в наряд / протокол приёма.
	 */
	static async applyPlanItemsToVisit(
		params: ApplyPlanItemsInput,
	): Promise<ApplyPlanItemsResult> {
		const { organizationId, visitId, planId, itemIds, actorUserId } = params;

		if (!UUID_REGEX.test(visitId)) {
			throw new VisitWorkOrderError(
				"VALIDATION_ERROR",
				"Некорректный идентификатор приёма (visitId).",
				400,
			);
		}
		if (!UUID_REGEX.test(planId)) {
			throw new VisitWorkOrderError(
				"VALIDATION_ERROR",
				"Некорректный идентификатор плана лечения (planId).",
				400,
			);
		}
		if (!Array.isArray(itemIds) || itemIds.length === 0) {
			throw new VisitWorkOrderError(
				"VALIDATION_ERROR",
				"Необходимо передать как минимум один itemId для переноса в наряд.",
				400,
			);
		}
		for (const id of itemIds) {
			if (!UUID_REGEX.test(id)) {
				throw new VisitWorkOrderError(
					"VALIDATION_ERROR",
					`Некорректный идентификатор позиции плана: ${id}.`,
					400,
				);
			}
		}

		return await db.transaction(async (tx) => {
			// 1. Проверка существования и доступности визита с блокировкой FOR UPDATE
			const [visit] = await tx
				.select({
					id: visits.id,
					organizationId: visits.organizationId,
					patientId: visits.patientId,
					status: visits.status,
				})
				.from(visits)
				.where(
					and(
						eq(visits.id, visitId),
						eq(visits.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");

			if (!visit) {
				throw new VisitWorkOrderError("VISIT_NOT_FOUND", "Приём не найден.", 404);
			}

			if (visit.status === "signed" || visit.status === "voided") {
				throw new VisitWorkOrderError(
					"VISIT_CLOSED",
					"Нельзя добавлять позиции плана в уже подписанный или аннулированный приём.",
					409,
				);
			}

			// 2. Проверка существования и статуса плана лечения (ст. 16 ЗоЗПП, ПП РФ № 736)
			const [plan] = await tx
				.select({
					id: treatmentPlans.id,
					organizationId: treatmentPlans.organizationId,
					patientId: treatmentPlans.patientId,
					name: treatmentPlans.name,
					status: treatmentPlans.status,
				})
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, planId),
						eq(treatmentPlans.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!plan) {
				throw new VisitWorkOrderError(
					"PLAN_NOT_FOUND",
					"План лечения не найден.",
					404,
				);
			}

			// 152-ФЗ, 323-ФЗ ст. 13: Изоляция пациентов
			if (plan.patientId !== visit.patientId) {
				throw new VisitWorkOrderError(
					"PATIENT_MISMATCH",
					"План лечения принадлежит другому пациенту. Перенос чужих услуг категорически запрещен (152-ФЗ, 323-ФЗ ст. 13).",
					400,
				);
			}

			// Разрешен перенос услуг из планов со статусами Draft, Active, Approved, Completed.
			// Блокируются только явно аннулированные или отклоненные планы (Rejected).
			if (plan.status === "Rejected") {
				throw new VisitWorkOrderError(
					"PLAN_NOT_APPROVED",
					`Перенос услуг в наряд невозможен: план лечения был аннулирован или отклонен (статус 'Rejected').`,
					422,
				);
			}

			// 3. Получение запрашиваемых позиций плана
			const planItems = await tx
				.select()
				.from(treatmentPlanItemsNew)
				.where(
					and(
						eq(treatmentPlanItemsNew.planId, plan.id),
						eq(treatmentPlanItemsNew.organizationId, organizationId),
						inArray(treatmentPlanItemsNew.id, [...itemIds]),
					),
				);

			const foundIds = new Set(planItems.map((p) => p.id));
			const missingIds = itemIds.filter((id) => !foundIds.has(id));
			if (missingIds.length > 0) {
				throw new VisitWorkOrderError(
					"PLAN_ITEMS_NOT_FOUND",
					`Позиции плана лечения не найдены: ${missingIds.join(", ")}`,
					404,
				);
			}

			// 4. Поиск услуг в прейскуранте (serviceCatalogItems) для Номенклатуры 804н
			const priceIdCandidates: string[] = [];
			for (const pi of planItems) {
				const { priceId } = splitStoredPriceId(pi.priceId);
				if (UUID_REGEX.test(priceId)) {
					priceIdCandidates.push(priceId);
				}
			}

			const catalogMap = new Map<
				string,
				typeof serviceCatalogItems.$inferSelect
			>();
			if (priceIdCandidates.length > 0) {
				const catalogRows = await tx
					.select()
					.from(serviceCatalogItems)
					.where(
						and(
							eq(serviceCatalogItems.organizationId, organizationId),
							inArray(serviceCatalogItems.id, priceIdCandidates),
						),
					);
				for (const row of catalogRows) {
					catalogMap.set(row.id, row);
				}
			}

			// 5. Проверка идемпотентности: проверяем уже добавленные в этот визит позиции
			const existingVisitItems = await tx
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.visitId, visit.id),
					),
				);

			const existingByPlanItemId = new Map<
				string,
				typeof treatmentItems.$inferSelect
			>();
			for (const row of existingVisitItems) {
				if (row.notes) {
					const match = row.notes.match(/\[plan_item:([0-9a-fA-F-]+)\]/);
					if (match && match[1]) {
						existingByPlanItemId.set(match[1].toLowerCase(), row);
					}
				}
			}

			// 6. Формирование позиций наряда с копеечно-точной арифметикой
			const appliedItems: AppliedVisitWorkOrderItem[] = [];
			let totalAddedKopecks = 0;

			type PendingInsert = {
				item: typeof planItems[0];
				lineTotalKopecks: number;
				unitPriceRub: number;
				discountRub: number;
				priceRub: number;
				order804nCode: string | null;
				quantity: number;
				insertValues: typeof treatmentItems.$inferInsert;
			};

			const pendingInserts: PendingInsert[] = [];

			for (const item of planItems) {
				const existing = existingByPlanItemId.get(item.id.toLowerCase());
				if (existing) {
					// Идемпотентно возвращаем уже существующую запись наряда
					appliedItems.push({
						id: existing.id,
						planItemId: item.id,
						serviceId: existing.serviceId,
						title: existing.title,
						toothCode: existing.toothCode,
						quantity: Number(existing.quantity),
						unitPriceRub: existing.unitPriceRub,
						discountRub: existing.discountRub,
						priceRub: existing.priceRub,
						order804nCode: null,
						status: existing.status,
						isAlreadyApplied: true,
					});
					continue;
				}

				const { priceId, name: rawName } = splitStoredPriceId(item.priceId);
				const catalogItem = catalogMap.get(priceId);
				const title = catalogItem?.title ?? rawName ?? item.priceId;
				const order804nCode = catalogItem?.order804nCode ?? null;
				const serviceId = catalogItem?.id ?? (UUID_REGEX.test(priceId) ? priceId : null);

				const quantity = Math.max(1, item.quantity || 1);
				const unitPriceKopecks = Math.round(Number(item.price) * 100);
				const discountKopecks = Math.round(Number(item.discount) * 100);
				const lineTotalKopecks = Math.max(
					0,
					unitPriceKopecks * quantity - discountKopecks,
				);

				const unitPriceRub = rublesFromKopecks(unitPriceKopecks);
				const discountRub = rublesFromKopecks(discountKopecks);
				const priceRub = rublesFromKopecks(lineTotalKopecks);

				const noteTag = `[plan_item:${item.id}] [plan_id:${plan.id}] [804n:${order804nCode ?? "NONE"}] План: ${plan.name}`;

				pendingInserts.push({
					item,
					lineTotalKopecks,
					unitPriceRub,
					discountRub,
					priceRub,
					order804nCode,
					quantity,
					insertValues: {
						organizationId,
						patientId: visit.patientId,
						visitId: visit.id,
						serviceId,
						toothCode:
							item.toothNumber !== null && item.toothNumber !== undefined
								? String(item.toothNumber)
								: null,
						title,
						quantity: String(quantity),
						priceRub,
						unitPriceRub,
						discountRub,
						status: "in_progress",
						plannedDoctorUserId: actorUserId ?? null,
						notes: noteTag,
						isSynced: false,
						version: 1,
					},
				});
			}

			if (pendingInserts.length > 0) {
				const insertedRows = await tx
					.insert(treatmentItems)
					.values(pendingInserts.map((p) => p.insertValues))
					.returning();

				for (let i = 0; i < insertedRows.length; i++) {
					const inserted = insertedRows[i];
					const meta = pendingInserts[i];
					if (inserted && meta) {
						totalAddedKopecks += meta.lineTotalKopecks;
						appliedItems.push({
							id: inserted.id,
							planItemId: meta.item.id,
							serviceId: inserted.serviceId,
							title: inserted.title,
							toothCode: inserted.toothCode,
							quantity: meta.quantity,
							unitPriceRub: meta.unitPriceRub,
							discountRub: meta.discountRub,
							priceRub: meta.priceRub,
							order804nCode: meta.order804nCode,
							status: inserted.status,
							isAlreadyApplied: false,
						});
					}
				}
			}

			// 7. Расчет и обновление прогресса выполнения плана
			const [totalItemsRow] = await tx
				.select({ count: sql<number>`count(*)::int` })
				.from(treatmentPlanItemsNew)
				.where(
					and(
						eq(treatmentPlanItemsNew.planId, plan.id),
						eq(treatmentPlanItemsNew.organizationId, organizationId),
					),
				);

			const totalPlanItems = totalItemsRow?.count ?? planItems.length;

			const planPrefix = plan.id.slice(0, 32).toLowerCase();
			const [activeOrDoneRow] = await tx
				.select({ count: sql<number>`count(*)::int` })
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, visit.patientId),
						or(
							sql`lower(left(${treatmentItems.id}::text, 32)) = ${planPrefix}`,
							sql`${treatmentItems.notes} LIKE ${`%[plan_id:${plan.id}]%`}`,
						),
						inArray(treatmentItems.status, ["in_progress", "completed"]),
					),
				);

			const completedOrInProgressItems = activeOrDoneRow?.count ?? appliedItems.length;
			const completionPercentage =
				totalPlanItems > 0
					? Math.min(100, Math.round((completedOrInProgressItems / totalPlanItems) * 100))
					: 0;

			// Синхронизация прогресса с этапами treatment_plan_stages, если они заведены
			await tx
				.update(treatmentPlanStages)
				.set({ completionPercentage })
				.where(
					and(
						eq(treatmentPlanStages.organizationId, organizationId),
						eq(treatmentPlanStages.planTitle, plan.name),
					),
				);

			// 8. Фиксация в аудит-логе клиники
			const newlyTransferred = appliedItems.filter((i) => !i.isAlreadyApplied);
			if (newlyTransferred.length > 0) {
				await tx.insert(clinicalAuditLogs).values({
					organizationId,
					patientId: visit.patientId,
					actorUserId: actorUserId ?? null,
					action: "APPLY_TREATMENT_PLAN_ITEMS_TO_VISIT",
					resourceType: "visits",
					resourceId: visit.id,
					meta: {
						planId: plan.id,
						planName: plan.name,
						transferredItemIds: newlyTransferred.map((i) => i.planItemId),
						alreadyAppliedCount: appliedItems.length - newlyTransferred.length,
						totalAddedRub: rublesFromKopecks(totalAddedKopecks),
						completionPercentage,
					},
				});
			}

			let deductions: readonly StockDeductionRecord[] = [];
			if (params.autoDeductMaterials) {
				const deductionResult = await deductMaterialsForVisit(tx, {
					organizationId,
					visitId: visit.id,
					userId: actorUserId ?? null,
					transactionType: "auto_deduct",
				});
				deductions = deductionResult.deductions;
			}

			if (params.targetVisitStatus) {
				await tx
					.update(visits)
					.set({
						status: params.targetVisitStatus,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(visits.id, visit.id),
							eq(visits.organizationId, organizationId),
						),
					);
			}

			return {
				visitId: visit.id,
				planId: plan.id,
				transferredItemsCount: newlyTransferred.length,
				alreadyAppliedItemsCount: appliedItems.length - newlyTransferred.length,
				items: appliedItems,
				planProgress: {
					totalPlanItems,
					completedOrInProgressItems,
					completionPercentage,
					planStatus: plan.status,
				},
				totalAddedRub: rublesFromKopecks(totalAddedKopecks),
				totalAddedKopecks,
				...(deductions.length > 0 ? { deductions } : {}),
			};
		});
	}

	/**
	 * Атомарное завершение наряда приёма: списание материалов со склада и фиксация статуса визита.
	 * Обернуто в единую транзакцию db.transaction(...), исключая частичные записи при сбоях.
	 */
	static async completeVisitWorkOrder(
		params: CompleteVisitWorkOrderInput,
	): Promise<CompleteVisitWorkOrderResult> {
		const { organizationId, visitId, actorUserId, status = "completed" } = params;

		if (!UUID_REGEX.test(visitId)) {
			throw new VisitWorkOrderError(
				"VALIDATION_ERROR",
				"Некорректный идентификатор приёма (visitId).",
				400,
			);
		}

		return await db.transaction(async (tx) => {
			// 1. Проверка существования и доступности приёма с блокировкой FOR UPDATE
			const [visit] = await tx
				.select({
					id: visits.id,
					organizationId: visits.organizationId,
					patientId: visits.patientId,
					status: visits.status,
				})
				.from(visits)
				.where(
					and(
						eq(visits.id, visitId),
						eq(visits.organizationId, organizationId),
					),
				)
				.limit(1)
				.for("update");

			if (!visit) {
				throw new VisitWorkOrderError(
					"VISIT_NOT_FOUND",
					"Приём не найден.",
					404,
				);
			}

			if (visit.status === "signed" || visit.status === "voided") {
				throw new VisitWorkOrderError(
					"VISIT_CLOSED",
					"Нельзя списать материалы и завершить уже подписанный или аннулированный приём.",
					409,
				);
			}

			// 2. Атомарное списание расходных материалов со склада клиники
			const deductionResult = await deductMaterialsForVisit(tx, {
				organizationId,
				visitId: visit.id,
				userId: actorUserId ?? null,
				transactionType: "auto_deduct",
			});

			// 3. Атомарная фиксация статуса визита
			const now = new Date();
			await tx
				.update(visits)
				.set({
					status,
					updatedAt: now,
				})
				.where(
					and(
						eq(visits.id, visit.id),
						eq(visits.organizationId, organizationId),
					),
				);

			// 4. Юридический след в клиническом журнале аудита
			await tx.insert(clinicalAuditLogs).values({
				organizationId,
				patientId: visit.patientId,
				actorUserId: actorUserId ?? null,
				action: "COMPLETE_VISIT_WORK_ORDER",
				resourceType: "visits",
				resourceId: visit.id,
				meta: {
					previousStatus: visit.status,
					newStatus: status,
					completedTreatmentItemsCount: deductionResult.completedTreatmentItems,
					deductionsCount: deductionResult.deductions.length,
					deductions: deductionResult.deductions,
				},
			});

			return {
				visitId: visit.id,
				previousStatus: visit.status,
				status,
				completedTreatmentItemsCount: deductionResult.completedTreatmentItems,
				deductions: deductionResult.deductions,
			};
		});
	}
}
