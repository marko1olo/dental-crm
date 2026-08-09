/**
 * rls.ts — PostgreSQL Row-Level Security transaction context helper.
 *
 * WHY THIS EXISTS
 * ---------------
 * Enabling RLS policies that use `current_setting('app.current_tenant', true)`
 * requires that every query touching tenant-scoped tables runs on a database
 * connection where that setting has already been established for the current
 * transaction.
 *
 * With a connection pool (pg.Pool), individual queries check out a connection,
 * run, and release it back. A SET CONFIG call in a Fastify preHandler hook runs
 * on connection A; the subsequent route query runs on connection B — a different
 * pool checkout. The setting never reaches the query.
 *
 * The ONLY safe solution with a pool is to wrap every security-critical operation
 * in a single transaction: set_config fires first, the query runs on the same
 * connection within that transaction, then the transaction closes. This is what
 * withTenantCtx does.
 *
 * USAGE
 * -----
 *   import { withTenantCtx } from '../db/rls.js';
 *
 *   // In a Fastify route handler:
 *   const rows = await withTenantCtx(request.user.organizationId, async (tx) => {
 *     return tx.select().from(patients).where(eq(patients.organizationId, orgId));
 *   });
 *
 * RLS POLICY SEMANTICS (FAIL-CLOSED)
 * -----------------------------------
 * As of migration 0157, all RLS policies are fail-closed: queries to tenant-scoped
 * tables without withTenantCtx return 0 rows. There is no permissive fallback.
 * The ONLY way to bypass tenant isolation is withSuperuserBypass, which currently
 * allows reads (writes will be blocked by WITH CHECK in migration 0159). Routes
 * must use withTenantCtx; application-level `where(eq(...))` guards alone are
 * insufficient — they will produce silent empty result sets for covered tables.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { dbRaw, transactionStorage } from "./client.js";
import type * as schema from "./schema.js";

/** Drizzle database type scoped to this project's schema. */
export type TenantDb = NodePgDatabase<typeof schema>;

/**
 * Tracks whether a superuser-bypass scope is already active on the current
 * async context. The reset in `withSuperuserBypass` is unconditional ('off'),
 * so a nested call must NOT perform its own set/reset pair: the inner reset
 * would switch the bypass off while the outer scope still relies on it,
 * silently re-enabling tenant isolation halfway through the outer operation.
 */
const bypassScope = new AsyncLocalStorage<true>();

/**
 * Executes `callback` inside a Drizzle transaction that pre-sets
 * `app.current_tenant` to `organizationId` (local to the transaction).
 *
 * The transaction guarantees that set_config and all subsequent queries
 * share the same pg connection — making RLS policies effective.
 *
 * REENTRANCY. `server.ts` installs an `onRoute` hook that auto-wraps EVERY
 * route handler in withTenantCtx whenever `request.tenantId` is set, so a
 * handler that also calls withTenantCtx explicitly (or calls a service that
 * does) nests. Without the guard below each nested call would open a SECOND
 * transaction, checking out a second connection from a pool of 10 while the
 * outer one is still held — halving effective capacity and, once the pool is
 * saturated, deadlocking: every held connection waits for a connection that
 * can never be handed out. When a transaction is already active we reuse it.
 *
 * FAST PATH (nested, same tenant). Because of that auto-wrapper the nested
 * case is the norm, and the tenant is almost always identical to the one the
 * outer scope already established. The current value still has to be read once
 * — it is needed both for the comparison and for the later restore — but when
 * it already equals `organizationId` the callback runs immediately: no
 * set_config on entry, none in `finally`. That is 1 round-trip instead of 3.
 *
 * EMPTY-STRING NORMALIZATION. A user-defined GUC does not reset to NULL: once
 * it has been set, its reset value is the EMPTY STRING, so
 * `current_setting('app.current_tenant', true)` returns ''. Restoring that
 * verbatim writes '' back, and policies casting `::uuid` then fail with 22P02
 * (invalid input syntax for type uuid), whereas NULL::uuid is simply NULL. The
 * read therefore maps '' to null, so the restore passes NULL and set_config
 * resets the parameter instead of storing an empty string explicitly. This
 * guard stands on its own; it does not depend on NULLIF() in the policies.
 *
 * BYPASS SUPPRESSION. Policies from migration 0158 read
 * `current_setting('app.superuser_bypass', true) = 'on' OR <tenant match>`,
 * and the left disjunct is true for EVERY row. A withTenantCtx call nested
 * inside an active withSuperuserBypass would inherit a transaction in which
 * the tenant setting cannot restrict anything — isolation for that scope is
 * dead. An explicit request for a tenant context means isolation is wanted, so
 * the flag is forced to 'off' for the duration of the callback and restored to
 * 'on' in `finally`, leaving the surrounding bypass scope intact.
 *
 * @param organizationId  UUID of the organization/tenant making the request.
 *                        Must be a verified, non-null value from RequestIdentity.
 * @param callback        Receives the transaction handle. All database calls
 *                        inside it are protected by tenant RLS policies.
 */
export async function withTenantCtx<T>(
	organizationId: string,
	callback: (tx: TenantDb) => Promise<T>,
): Promise<T> {
	const existingTx = transactionStorage.getStore();
	if (existingTx) {
		// Re-assert the tenant on the existing transaction rather than opening a
		// new one. This is not a no-op: the inner scope may target a different
		// tenant than the outer, and the value must be restored afterwards so the
		// remainder of the outer transaction keeps its own tenant context.
		const previous = await existingTx.execute(
			sql`SELECT current_setting('app.current_tenant', true) AS tenant`,
		);
		const rawTenant =
			(previous as unknown as { rows?: Array<{ tenant: string | null }> })
				.rows?.[0]?.tenant ?? null;
		// Reset value of a user-defined GUC is '' rather than NULL. Writing ''
		// back would make the `::uuid` casts in the policies raise 22P02; NULL
		// casts cleanly. Normalize on read so the restore below passes NULL.
		const previousTenant = rawTenant === "" ? null : rawTenant;
		// An enclosing withSuperuserBypass left `app.superuser_bypass = 'on'` on
		// this transaction, which satisfies the permissive disjunct of every 0158
		// policy for every row. Asking for a tenant context means asking for
		// isolation, so the flag is suppressed for the callback and handed back to
		// the outer scope in `finally`.
		const bypassActive = bypassScope.getStore() === true;
		const tenantChanged = previousTenant !== organizationId;
		if (!tenantChanged && !bypassActive) {
			// The transaction already carries exactly this tenant and no bypass to
			// undo: set_config would write back the value that is already there, and
			// the restore would write it a second time. Skip both.
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			return callback(existingTx as any);
		}
		if (bypassActive) {
			await existingTx.execute(
				sql`SELECT set_config('app.superuser_bypass', 'off', true)`,
			);
		}
		if (tenantChanged) {
			await existingTx.execute(
				sql`SELECT set_config('app.current_tenant', ${organizationId}, true)`,
			);
		}
		try {
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			return await callback(existingTx as any);
		} finally {
			// Each restore gets its own try/catch: on an aborted transaction every
			// statement fails, and a throw from here would replace the original error
			// from the callback. Failing the first must not skip the second either.
			if (tenantChanged) {
				try {
					await existingTx.execute(
						sql`SELECT set_config('app.current_tenant', ${previousTenant}, true)`,
					);
				} catch {
					// Transaction already aborted; the setting dies with it. Suppress so
					// the original error from the callback is not masked.
				}
			}
			if (bypassActive) {
				try {
					await existingTx.execute(
						sql`SELECT set_config('app.superuser_bypass', 'on', true)`,
					);
				} catch {
					// Same reasoning: the outer bypass scope resets the flag itself, and
					// on an aborted transaction nothing survives anyway.
				}
			}
		}
	}
	return dbRaw.transaction(async (tx) => {
		// is_local = true: the setting expires when this transaction commits or
		// rolls back, preventing the setting from leaking to the next request that
		// reuses the same pooled connection.
		await tx.execute(
			sql`SELECT set_config('app.current_tenant', ${organizationId}, true)`,
		);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		return transactionStorage.run(tx as any, () => callback(tx as any));
	});
}

export async function withSuperuserBypass<T>(
	callback: (tx: TenantDb) => Promise<T>,
): Promise<T> {
	const existingTx = transactionStorage.getStore();
	if (existingTx) {
		// A bypass scope is already open on this transaction; it owns the flag and
		// its reset. Doing another set/reset pair here would turn the bypass off
		// while the outer scope is still using it.
		if (bypassScope.getStore()) {
			return callback(existingTx);
		}
		await existingTx.execute(
			sql`SELECT set_config('app.superuser_bypass', 'on', true)`,
		);
		try {
			return await bypassScope.run(true, () => callback(existingTx));
		} finally {
			// Reset the flag even if the callback threw. If the transaction is already
			// aborted, this cleanup will fail — suppress that error to preserve the
			// original exception from the callback.
			try {
				await existingTx.execute(
					sql`SELECT set_config('app.superuser_bypass', 'off', true)`,
				);
			} catch {
				// Cleanup failed, likely because the transaction is aborted. Ignore.
			}
		}
	}
	return dbRaw.transaction(async (tx) => {
		await tx.execute(
			sql`SELECT set_config('app.superuser_bypass', 'on', true)`,
		);
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		return transactionStorage.run(tx as any, () =>
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			bypassScope.run(true, () => callback(tx as any)),
		);
	});
}
