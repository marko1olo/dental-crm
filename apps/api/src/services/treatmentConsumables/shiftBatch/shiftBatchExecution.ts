/**
 * shiftBatchExecution.ts — Layer 3: 1-click execution of shift batch consumables deduction.
 */

import { resolveValidIanaTimeZone, todayDateKeyInTimeZone } from "@dental/shared";
import { and, eq, like, or, sql } from "drizzle-orm";
import { clinics, inventoryTransactions } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import { executeUnifiedStockDeduction } from "../unifiedStockDeductionEngine.js";
import { getShiftConsumablesSummary } from "./shiftSummaryQueries.js";
import type { ExecuteShiftBatchDeductionParams, ExecuteShiftBatchDeductionResult } from "./shiftBatchTypes.js";

interface ShiftBatchTargetItem {
	itemId?: string | null | undefined;
	id?: string | null | undefined;
	inventoryItemId?: string | null | undefined;
	qty?: number | string | null | undefined;
	quantity?: number | string | null | undefined;
	qtyToDeduct?: number | string | null | undefined;
	name?: string | null | undefined;
	itemName?: string | null | undefined;
	category?: string | null | undefined;
	unit?: string | null | undefined;
}

export async function executeShiftBatchDeduction(
	tx: DbExecutor,
	params: ExecuteShiftBatchDeductionParams,
): Promise<ExecuteShiftBatchDeductionResult> {
	const { organizationId, date, userId, items, notes, idempotencyKey, clientMutationId } = params;
	const now = new Date();
	let resolvedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
	if (!resolvedDate) {
		const [clinicRow] = await tx
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);
		resolvedDate = todayDateKeyInTimeZone(resolveValidIanaTimeZone(clinicRow?.timezone), now);
	}
	const effectiveDate = resolvedDate;

	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':shift_deduct:' || ${effectiveDate}))`,
	);

	const effectiveKey = idempotencyKey || clientMutationId;
	if (effectiveKey) {
		const existingTx = await tx
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					or(
						sql`(${inventoryTransactions.metadata}->>'idempotencyKey') = ${effectiveKey}`,
						sql`(${inventoryTransactions.metadata}->>'clientMutationId') = ${effectiveKey}`,
						like(inventoryTransactions.notes, `%[idempotencyKey:${effectiveKey}]%`),
						like(inventoryTransactions.notes, `%[mutation:${effectiveKey}]%`),
					),
				),
			)
			.limit(50);

		if (existingTx.length > 0) {
			return {
				success: true,
				isOverdraft: existingTx.some((t) => t.isOverdraft),
				date: effectiveDate,
				deductedItems: existingTx.map((t) => ({
					itemId: t.itemId ?? t.inventoryItemId ?? "unknown",
					itemName: t.notes?.split("(")[0]?.trim() || "Списанный материал",
					quantity: Math.abs(Number(t.quantityChanged ?? t.qty ?? 0)),
					unit: "шт.",
					remainingStock: 0,
					isOverdraft: Boolean(t.isOverdraft),
				})),
				warnings: [],
				message: `Повторный запрос пакетного списания за смену ${effectiveDate} (ключ ${effectiveKey}). Операция дедуплицирована.`,
			};
		}
	}

	let targets: ShiftBatchTargetItem[] = items ?? [];
	if (targets.length === 0) {
		const summary = await getShiftConsumablesSummary(tx, organizationId, effectiveDate);
		targets = summary.consumablesSummary.map((c) => ({
			itemId: c.itemId,
			qty: c.qtyToDeduct,
			name: c.itemName,
		}));
	}

	if (targets.length === 0) {
		return { success: true, isOverdraft: false, date: effectiveDate, deductedItems: [], warnings: [], message: "Нет позиций для списания." };
	}

	const unifiedItems = targets.map((t: ShiftBatchTargetItem) => {
		const rawQty = Number(t.qty ?? t.quantity ?? t.qtyToDeduct ?? 1);
		const effectiveQty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
		const effectiveId = t.itemId || t.id || t.inventoryItemId || undefined;
		return {
			exactItemId: effectiveId,
			defaultName: t.name || t.itemName || `Материал ${effectiveId || "без ID"}`,
			category: t.category || "Расходные материалы",
			unit: t.unit || "шт.",
			qty: effectiveQty,
		};
	});

	const tag = effectiveKey ? ` [idempotencyKey:${effectiveKey}]` : "";
	const defaultNote = `Пакетное списание расходников за смену ${effectiveDate} (пакетное списание)`;
	const effectiveNotes = notes ? `${notes}${tag}` : `${defaultNote}${tag}`;

	const res = await executeUnifiedStockDeduction(tx, {
		organizationId,
		items: unifiedItems,
		transactionType: "shift_batch_deduction",
		userId,
		notes: effectiveNotes,
		reasonPrefix: `Списание под смену ${effectiveDate}`,
		metadata: effectiveKey ? { idempotencyKey: effectiveKey, clientMutationId: effectiveKey } : undefined,
		successMessageTemplate: (count, hasOverdraft) =>
			`Расходники за смену ${effectiveDate} списаны пакетно (${count} поз., мягкий овердрафт: ${hasOverdraft ? "активен" : "нет"}).`,
	});

	return {
		success: res.success,
		isOverdraft: res.isOverdraft,
		date: effectiveDate,
		deductedItems: res.deductedItems,
		warnings: res.warnings,
		message: res.message,
	};
}
