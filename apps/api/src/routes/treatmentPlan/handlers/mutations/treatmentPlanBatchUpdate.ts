import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { TenantDb } from "../../../../db/rls.js";
import {
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlanStages,
} from "../../../../db/schema.js";

const BATCH_CHUNK_SIZE = 200;

export interface TreatmentItemSyncUpdateRow {
	id: string;
	serviceId: string | null;
	toothCode: string | null;
	title: string;
	quantity: string;
	priceRub: number;
	unitPriceRub: number;
	discountRub: number;
	priceKopecks: bigint;
	unitPriceKopecks: bigint;
	discountKopecks: bigint;
	status: "proposed" | "approved";
	plannedDoctorUserId: string | null;
	treatmentPlanItemId: string | null;
}

export interface TreatmentItemCompletionUpdateRow {
	id: string;
	visitId: string | null;
	treatmentPlanId: string;
	treatmentPlanItemId: string;
	quantity: string;
	priceRub: number;
	unitPriceRub: number;
	discountRub: number;
	priceKopecks: bigint;
	unitPriceKopecks: bigint;
	discountKopecks: bigint;
}

export interface TreatmentPlanStageCompletionUpdateRow {
	stageOrder: number;
	completionPercentage: number;
	autoArchived: boolean;
	archivedAt: Date | null;
}

export interface TreatmentPlanStageSyncUpdateRow {
	id: string;
	stageName: string;
	completionPercentage: number;
}

export interface TreatmentPlanItemNewSyncUpdateRow {
	id: string;
	stageId: string | null;
	toothNumber: number | null;
	priceId: string;
	name: string | null;
	quantity: number;
	price: string;
	discount: string;
	priceKopecks: bigint;
	discountKopecks: bigint;
	commissionKopecks: bigint;
	phase: number;
	isBundle: boolean;
	doctorId: string | null;
}

export function chunkBatchRows<T>(rows: readonly T[], chunkSize = BATCH_CHUNK_SIZE): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < rows.length; i += chunkSize) {
		chunks.push(rows.slice(i, i + chunkSize));
	}
	return chunks;
}

function dedupeAndSortById<T extends { id: string }>(rows: readonly T[]): T[] {
	const deduped = new Map<string, T>();
	for (const row of rows) {
		deduped.set(row.id, row);
	}
	return Array.from(deduped.values()).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Детерминированная блокировка строк treatment_items в порядке ORDER BY id ASC FOR UPDATE
 * для исключения взаимных блокировок (40P01) перед пакетным UPDATE ... FROM (VALUES ...).
 */
export async function lockTreatmentItemsByIdAsc(
	tx: TenantDb,
	organizationId: string,
	ids: readonly string[],
): Promise<void> {
	const uniqueSortedIds = Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
	for (const chunkIds of chunkBatchRows(uniqueSortedIds)) {
		await tx
			.select({ id: treatmentItems.id })
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					inArray(treatmentItems.id, chunkIds),
				),
			)
			.orderBy(asc(treatmentItems.id))
			.for("update");
	}
}

/**
 * Пакетное обновление существующих строк treatment_items при синхронизации плана лечения
 * через параметризованный UPDATE ... FROM (VALUES ...) без N+1 циклов.
 */
export async function batchSyncUpdateTreatmentItems(
	tx: TenantDb,
	organizationId: string,
	rows: readonly TreatmentItemSyncUpdateRow[],
): Promise<void> {
	if (rows.length === 0) return;

	const sortedRows = dedupeAndSortById(rows);
	for (const chunk of chunkBatchRows(sortedRows)) {
		await lockTreatmentItemsByIdAsc(
			tx,
			organizationId,
			chunk.map((r) => r.id),
		);

		const valuesSql = sql.join(
			chunk.map(
				(r) =>
					sql`(${r.id}::uuid, ${r.serviceId}::uuid, ${r.toothCode}::text, ${r.title}::text, ${r.quantity}::numeric(10,2), ${String(r.priceRub)}::numeric(12,2), ${String(r.unitPriceRub)}::numeric(12,2), ${String(r.discountRub)}::numeric(12,2), ${String(r.priceKopecks)}::bigint, ${String(r.unitPriceKopecks)}::bigint, ${String(r.discountKopecks)}::bigint, ${r.status}::treatment_plan_item_status, ${r.plannedDoctorUserId}::uuid, ${r.treatmentPlanItemId}::uuid)`,
			),
			sql`, `,
		);

		await tx.execute(sql`
			UPDATE treatment_items AS t
			SET
				service_id = v.service_id,
				tooth_code = v.tooth_code,
				title = v.title,
				quantity = v.quantity,
				price_rub = v.price_rub,
				unit_price_rub = v.unit_price_rub,
				discount_rub = v.discount_rub,
				price_kopecks = v.price_kopecks,
				unit_price_kopecks = v.unit_price_kopecks,
				discount_kopecks = v.discount_kopecks,
				status = v.status,
				planned_doctor_user_id = v.planned_doctor_user_id,
				treatment_plan_item_id = v.treatment_plan_item_id
			FROM (VALUES ${valuesSql}) AS v(
				id,
				service_id,
				tooth_code,
				title,
				quantity,
				price_rub,
				unit_price_rub,
				discount_rub,
				price_kopecks,
				unit_price_kopecks,
				discount_kopecks,
				status,
				planned_doctor_user_id,
				treatment_plan_item_id
			)
			WHERE t.id = v.id
				AND t.organization_id = ${organizationId}::uuid
		`);
	}
}

/**
 * Пакетное завершение позиций treatment_items через параметризованный UPDATE ... FROM (VALUES ...)
 * с сохранением существующего visit_id, если новый visitId не передан.
 */
export async function batchCompleteTreatmentItems(
	tx: TenantDb,
	organizationId: string,
	rows: readonly TreatmentItemCompletionUpdateRow[],
): Promise<void> {
	if (rows.length === 0) return;

	const sortedRows = dedupeAndSortById(rows);
	for (const chunk of chunkBatchRows(sortedRows)) {
		await lockTreatmentItemsByIdAsc(
			tx,
			organizationId,
			chunk.map((r) => r.id),
		);

		const valuesSql = sql.join(
			chunk.map(
				(r) =>
					sql`(${r.id}::uuid, ${r.visitId}::uuid, ${r.treatmentPlanId}::uuid, ${r.treatmentPlanItemId}::uuid, ${r.quantity}::numeric(10,2), ${String(r.priceRub)}::numeric(12,2), ${String(r.unitPriceRub)}::numeric(12,2), ${String(r.discountRub)}::numeric(12,2), ${String(r.priceKopecks)}::bigint, ${String(r.unitPriceKopecks)}::bigint, ${String(r.discountKopecks)}::bigint)`,
			),
			sql`, `,
		);

		await tx.execute(sql`
			UPDATE treatment_items AS t
			SET
				status = 'completed'::treatment_plan_item_status,
				visit_id = COALESCE(v.visit_id, t.visit_id),
				treatment_plan_id = v.treatment_plan_id,
				treatment_plan_item_id = v.treatment_plan_item_id,
				quantity = v.quantity,
				price_rub = v.price_rub,
				unit_price_rub = v.unit_price_rub,
				discount_rub = v.discount_rub,
				price_kopecks = v.price_kopecks,
				unit_price_kopecks = v.unit_price_kopecks,
				discount_kopecks = v.discount_kopecks,
				is_synced = false,
				version = t.version + 1
			FROM (VALUES ${valuesSql}) AS v(
				id,
				visit_id,
				treatment_plan_id,
				treatment_plan_item_id,
				quantity,
				price_rub,
				unit_price_rub,
				discount_rub,
				price_kopecks,
				unit_price_kopecks,
				discount_kopecks
			)
			WHERE t.id = v.id
				AND t.organization_id = ${organizationId}::uuid
				AND t.status <> 'cancelled'::treatment_plan_item_status
		`);
	}
}

/**
 * Пакетное обновление прогресса этапов плана лечения при завершении позиций.
 */
export async function batchUpdateStageCompletion(
	tx: TenantDb,
	organizationId: string,
	planId: string,
	rows: readonly TreatmentPlanStageCompletionUpdateRow[],
): Promise<void> {
	if (rows.length === 0) return;

	const deduped = new Map<number, TreatmentPlanStageCompletionUpdateRow>();
	for (const row of rows) {
		deduped.set(row.stageOrder, row);
	}
	const sortedRows = Array.from(deduped.values()).sort((a, b) => a.stageOrder - b.stageOrder);

	for (const chunk of chunkBatchRows(sortedRows)) {
		const orders = chunk.map((r) => r.stageOrder);
		await tx
			.select({ id: treatmentPlanStages.id })
			.from(treatmentPlanStages)
			.where(
				and(
					eq(treatmentPlanStages.organizationId, organizationId),
					eq(treatmentPlanStages.planId, planId),
					inArray(treatmentPlanStages.stageOrder, orders),
				),
			)
			.orderBy(asc(treatmentPlanStages.id))
			.for("update");

		const valuesSql = sql.join(
			chunk.map(
				(r) =>
					sql`(${r.stageOrder}::integer, ${r.completionPercentage}::integer, ${r.autoArchived}::boolean, ${r.archivedAt ? r.archivedAt.toISOString() : null}::timestamptz)`,
			),
			sql`, `,
		);

		await tx.execute(sql`
			UPDATE treatment_plan_stages AS s
			SET
				completion_percentage = v.completion_percentage,
				auto_archived = v.auto_archived,
				archived_at = v.archived_at
			FROM (VALUES ${valuesSql}) AS v(
				stage_order,
				completion_percentage,
				auto_archived,
				archived_at
			)
			WHERE s.organization_id = ${organizationId}::uuid
				AND s.plan_id = ${planId}::uuid
				AND s.stage_order = v.stage_order
		`);
	}
}

/**
 * Пакетное обновление этапов при сохранении/ревизии плана лечения.
 */
export async function batchSyncUpdatePlanStages(
	tx: TenantDb,
	organizationId: string,
	rows: readonly TreatmentPlanStageSyncUpdateRow[],
): Promise<void> {
	if (rows.length === 0) return;

	const sortedRows = dedupeAndSortById(rows);
	for (const chunk of chunkBatchRows(sortedRows)) {
		await tx
			.select({ id: treatmentPlanStages.id })
			.from(treatmentPlanStages)
			.where(
				and(
					eq(treatmentPlanStages.organizationId, organizationId),
					inArray(
						treatmentPlanStages.id,
						chunk.map((r) => r.id),
					),
				),
			)
			.orderBy(asc(treatmentPlanStages.id))
			.for("update");

		const valuesSql = sql.join(
			chunk.map(
				(r) =>
					sql`(${r.id}::uuid, ${r.stageName}::text, ${r.completionPercentage}::integer)`,
			),
			sql`, `,
		);

		await tx.execute(sql`
			UPDATE treatment_plan_stages AS s
			SET
				stage_name = v.stage_name,
				completion_percentage = v.completion_percentage
			FROM (VALUES ${valuesSql}) AS v(
				id,
				stage_name,
				completion_percentage
			)
			WHERE s.id = v.id
				AND s.organization_id = ${organizationId}::uuid
		`);
	}
}

/**
 * Пакетное обновление позиций сметы плана лечения (treatment_plan_items_new).
 */
export async function batchSyncUpdatePlanItemsNew(
	tx: TenantDb,
	organizationId: string,
	rows: readonly TreatmentPlanItemNewSyncUpdateRow[],
): Promise<void> {
	if (rows.length === 0) return;

	const sortedRows = dedupeAndSortById(rows);
	for (const chunk of chunkBatchRows(sortedRows)) {
		await tx
			.select({ id: treatmentPlanItemsNew.id })
			.from(treatmentPlanItemsNew)
			.where(
				and(
					eq(treatmentPlanItemsNew.organizationId, organizationId),
					inArray(
						treatmentPlanItemsNew.id,
						chunk.map((r) => r.id),
					),
				),
			)
			.orderBy(asc(treatmentPlanItemsNew.id))
			.for("update");

		const valuesSql = sql.join(
			chunk.map(
				(r) =>
					sql`(${r.id}::uuid, ${r.stageId}::uuid, ${r.toothNumber}::integer, ${r.priceId}::text, ${r.name}::text, ${r.quantity}::integer, ${r.price}::numeric(12,2), ${r.discount}::numeric(12,2), ${String(r.priceKopecks)}::bigint, ${String(r.discountKopecks)}::bigint, ${String(r.commissionKopecks)}::bigint, ${r.phase}::integer, ${r.isBundle}::boolean, ${r.doctorId}::uuid)`,
			),
			sql`, `,
		);

		await tx.execute(sql`
			UPDATE treatment_plan_items_new AS t
			SET
				stage_id = v.stage_id,
				tooth_number = v.tooth_number,
				price_id = v.price_id,
				name = v.name,
				quantity = v.quantity,
				price = v.price,
				discount = v.discount,
				price_kopecks = v.price_kopecks,
				discount_kopecks = v.discount_kopecks,
				commission_kopecks = v.commission_kopecks,
				phase = v.phase,
				is_bundle = v.is_bundle,
				doctor_id = v.doctor_id
			FROM (VALUES ${valuesSql}) AS v(
				id,
				stage_id,
				tooth_number,
				price_id,
				name,
				quantity,
				price,
				discount,
				price_kopecks,
				discount_kopecks,
				commission_kopecks,
				phase,
				is_bundle,
				doctor_id
			)
			WHERE t.id = v.id
				AND t.organization_id = ${organizationId}::uuid
		`);
	}
}
