/**
 * treatmentItemReconciler.ts — Fetches and reconciles visit treatment items status.
 */

import { and, eq, inArray, ne } from "drizzle-orm";
import { inventoryTransactions, treatmentItems } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";

export async function fetchAndCompleteTreatmentItemsForVisit(
	tx: DbExecutor,
	organizationId: string,
	safeVisitId: string,
): Promise<Array<typeof treatmentItems.$inferSelect>> {
	let targetItems = await tx
		.select()
		.from(treatmentItems)
		.where(
			and(
				eq(treatmentItems.visitId, safeVisitId),
				eq(treatmentItems.organizationId, organizationId),
				ne(treatmentItems.status, "completed"),
			),
		);

	if (targetItems.length === 0) {
		const existingTx = await tx
			.select({ id: inventoryTransactions.id })
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.visitId, safeVisitId),
					eq(inventoryTransactions.organizationId, organizationId),
				),
			)
			.limit(1);

		if (existingTx.length === 0) {
			targetItems = await tx
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.visitId, safeVisitId),
						eq(treatmentItems.organizationId, organizationId),
						ne(treatmentItems.status, "cancelled"),
					),
				);
		}
	}

	const uncompletedToMark = targetItems.filter((it) => it.status !== "completed");
	if (uncompletedToMark.length > 0) {
		await tx
			.update(treatmentItems)
			.set({ status: "completed" })
			.where(
				and(
					eq(treatmentItems.visitId, safeVisitId),
					eq(treatmentItems.organizationId, organizationId),
					inArray(
						treatmentItems.id,
						uncompletedToMark.map((it) => it.id),
					),
				),
			);
	}

	return targetItems;
}
