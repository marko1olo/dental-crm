/**
 * stockDeductionLocks.ts — PostgreSQL transactional advisory locks for stock deduction.
 */

import { sql } from "drizzle-orm";
import type { DbExecutor } from "../types.js";

export async function acquireVisitDeductionLock(
	tx: DbExecutor,
	organizationId: string,
	visitId: string,
): Promise<void> {
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':visit_deduct:' || ${visitId}))`,
	);
}

export async function acquireToothDeductionLock(
	tx: DbExecutor,
	organizationId: string,
	treatmentItemId: string,
): Promise<void> {
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId} || ':tooth_deduct:' || ${treatmentItemId}))`,
	);
}
