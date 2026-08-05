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
 * INCREMENTAL ADOPTION
 * --------------------
 * Existing routes without withTenantCtx still rely on application-level
 * `where(eq(table.organizationId, orgId))` guards. The RLS policies use
 * `current_setting('app.current_tenant', true) IS NULL OR ...` so they are
 * permissive when no tenant context is set, preventing instant breakage.
 * Routes should be migrated to withTenantCtx incrementally — prioritising
 * those that perform writes or return sensitive clinical data.
 */

import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from './client.js';
import type * as schema from './schema.js';

/** Drizzle database type scoped to this project's schema. */
export type TenantDb = NodePgDatabase<typeof schema>;

/**
 * Executes `callback` inside a Drizzle transaction that pre-sets
 * `app.current_tenant` to `organizationId` (local to the transaction).
 *
 * The transaction guarantees that set_config and all subsequent queries
 * share the same pg connection — making RLS policies effective.
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
  return db.transaction(async (tx) => {
    // is_local = true: the setting expires when this transaction commits or
    // rolls back, preventing the setting from leaking to the next request that
    // reuses the same pooled connection.
    await tx.execute(
      sql`SELECT set_config('app.current_tenant', ${organizationId}, true)`,
    );
    return callback(tx as unknown as TenantDb);
  });
}
