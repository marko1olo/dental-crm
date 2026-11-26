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
import { createApiLogger, safeLogError } from "../observability/logger.js";
import {
	dbRaw,
	strictUnscopedDbTrapStorage,
	tenantAlsStorage,
	transactionStorage,
	type TenantAlsMode,
	type TenantAlsStore,
	type TenantDb,
	type TenantTransaction,
} from "./client.js";
import type * as schema from "./schema.js";

const logger = createApiLogger("dbRls");

/** Drizzle database and transaction type scoped to this project's schema. */
export type { TenantAlsMode, TenantAlsStore, TenantDb, TenantTransaction };
export type DbTransaction = TenantTransaction;
export { tenantAlsStorage };

const TENANT_UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class TenantCtxModeEscalationError extends Error {
	readonly code = "TENANT_CTX_MODE_ESCALATION";

	constructor(message = "Cannot escalate read_only tenant transaction to read_write") {
		super(message);
		this.name = "TenantCtxModeEscalationError";
	}
}

export class CrossTenantContextError extends Error {
	readonly code = "CROSS_TENANT_CONTEXT_SWITCH";

	constructor(expectedOrgId: string, requestedOrgId: string) {
		super(
			`Cross-tenant context switch inside active transaction is forbidden (${expectedOrgId} -> ${requestedOrgId})`,
		);
		this.name = "CrossTenantContextError";
	}
}

export function assertValidTenantUuid(organizationId: string): void {
	if (!organizationId || !TENANT_UUID_REGEX.test(organizationId)) {
		throw new Error(`Invalid organizationId UUID for RLS context: "${organizationId}"`);
	}
}

/**
 * Tracks whether a superuser-bypass scope is already active on the current
 * async context. The reset in `withSuperuserBypass` is unconditional ('off'),
 * so a nested call must NOT perform its own set/reset pair: the inner reset
 * would switch the bypass off while the outer scope still relies on it,
 * silently re-enabling tenant isolation halfway through the outer operation.
 */
const bypassScope = new AsyncLocalStorage<boolean>();

export type PostCommitHook = () => Promise<void> | void;
const postCommitStorage = new AsyncLocalStorage<PostCommitHook[] | undefined>();

async function flushPostCommitHooks(hooks: PostCommitHook[]): Promise<void> {
	for (const hook of hooks) {
		try {
			await hook();
		} catch (err) {
			logger.error({ err: safeLogError(err) }, "Post-commit hook failed");
		}
	}
}

/**
 * Registers a side-effect callback (WebSocket broadcast, detached background sync,
 * cache invalidation) to run ONLY AFTER the enclosing `withTenantCtx` transaction
 * successfully commits.
 *
 * When invoked inside a `withSavepoint`, hooks wait until the savepoint succeeds
 * before promoting into the enclosing transaction's commit queue (so rolled-back
 * savepoints never trigger spurious side effects).
 * When invoked outside any `withTenantCtx` transaction (e.g. unit test mocks),
 * the callback runs immediately without throwing synchronously.
 */
export function onTenantTxCommit(fn: PostCommitHook): void {
	const hooks = postCommitStorage.getStore();
	if (hooks) {
		hooks.push(fn);
		return;
	}
	try {
		const res = fn();
		if (res && typeof (res as Promise<void>).catch === "function") {
			void (res as Promise<void>).catch((err) => {
				logger.error({ err: safeLogError(err) }, "Standalone post-commit async hook failed");
			});
		}
	} catch (err) {
		logger.error({ err: safeLogError(err) }, "Standalone post-commit sync hook failed");
	}
}

/**
 * Executes `callback` in a completely detached PostgreSQL transaction and clean
 * AsyncLocalStorage scope (`transactionStorage`, `postCommitStorage`, `bypassScope`
 * cleared), preventing asynchronous background jobs from inheriting an HTTP
 * request transaction that is about to commit or close.
 */
export async function runDetachedInTenantCtx<T>(
	organizationId: string,
	callback: (tx: TenantDb) => Promise<T>,
): Promise<T> {
	return bypassScope.run(false, () =>
		strictUnscopedDbTrapStorage.run(false, () =>
			tenantAlsStorage.run(undefined, () =>
				postCommitStorage.run(undefined, () =>
					transactionStorage.run(undefined, () =>
						withTenantWriteCtx(organizationId, callback),
					),
				),
			),
		),
	);
}

/**
 * Wraps a non-fatal nested DB operation inside a PostgreSQL SAVEPOINT (`tx.transaction`)
 * so that a SQL error (constraint violation, missing FK, etc.) inside `try { ... } catch`
 * rolls back cleanly to the savepoint without poisoning the enclosing PostgreSQL transaction
 * (`25P02 current transaction is aborted`).
 */
export async function withSavepoint<T>(
	tx: TenantDb,
	callback: (savepointTx: TenantDb) => Promise<T>,
): Promise<T> {
	if (typeof (tx as { transaction?: unknown }).transaction !== "function") {
		return callback(tx);
	}
	const parentHooks = postCommitStorage.getStore();
	const currentAls = tenantAlsStorage.getStore();
	const savepointHooks: PostCommitHook[] = [];
	const result = await (tx as NodePgDatabase<typeof schema>).transaction(
		async (spTx) => {
			const runScoped = () =>
				transactionStorage.run(spTx, () =>
					parentHooks
						? postCommitStorage.run(savepointHooks, () => callback(spTx))
						: callback(spTx),
				);
			if (currentAls) {
				return tenantAlsStorage.run({ ...currentAls, tx: spTx }, runScoped);
			}
			return runScoped();
		},
	);
	if (parentHooks && savepointHooks.length > 0) {
		parentHooks.push(...savepointHooks);
	}
	return result;
}

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
interface TenantSettingRow extends Record<string, unknown> {
	tenant: string | null;
}

async function runLegacyReenteredTenantTx<T>(
	existingTx: TenantDb,
	organizationId: string,
	mode: "read_only" | "read_write",
	callback: (tx: TenantDb) => Promise<T>,
): Promise<T> {
	const previous = await existingTx.execute<TenantSettingRow>(
		sql`SELECT current_setting('app.current_tenant', true) AS tenant`,
	);
	const rawTenant = previous.rows[0]?.tenant ?? null;
	const previousTenant = rawTenant === "" ? null : rawTenant;
	const bypassActive = bypassScope.getStore() === true;
	const tenantChanged = previousTenant !== organizationId;
	if (!tenantChanged && !bypassActive) {
		return tenantAlsStorage.run(
			{ tx: existingTx, organizationId, mode },
			() => callback(existingTx),
		);
	}
	if (bypassActive && tenantChanged) {
		await existingTx.execute(
			sql`SELECT set_config('app.superuser_bypass', 'off', true), set_config('app.current_tenant', ${organizationId}, true)`,
		);
	} else if (bypassActive) {
		await existingTx.execute(
			sql`SELECT set_config('app.superuser_bypass', 'off', true)`,
		);
	} else if (tenantChanged) {
		await existingTx.execute(
			sql`SELECT set_config('app.current_tenant', ${organizationId}, true)`,
		);
	}
	try {
		return await tenantAlsStorage.run(
			{ tx: existingTx, organizationId, mode },
			() => callback(existingTx),
		);
	} finally {
		if (tenantChanged) {
			try {
				await existingTx.execute(
					sql`SELECT set_config('app.current_tenant', ${previousTenant}, true)`,
				);
			} catch (err) {
				void err; // Transaction already aborted; setting dies with it.
			}
		}
		if (bypassActive) {
			try {
				await existingTx.execute(
					sql`SELECT set_config('app.superuser_bypass', 'on', true)`,
				);
			} catch (err) {
				void err; // Outer bypass scope handles cleanup; ignore on aborted tx.
			}
		}
	}
}

/**
 * Executes a strictly read-only tenant transaction (`READ COMMITTED`, `READ ONLY`).
 * Reuses an active tenant transaction in RAM with 0 extra SQL round-trips when
 * the active tenant matches. Forbids cross-tenant switching inside an active TX.
 */
export async function withTenantReadCtx<T>(
	organizationId: string,
	callback: (tx: TenantDb) => Promise<T>,
): Promise<T> {
	assertValidTenantUuid(organizationId);

	const als = tenantAlsStorage.getStore();
	if (als) {
		const bypassActive =
			als.mode === "superuser_bypass" || bypassScope.getStore() === true;
		if (bypassActive) {
			return runLegacyReenteredTenantTx(als.tx, organizationId, "read_only", callback);
		}
		if (als.organizationId !== organizationId) {
			throw new CrossTenantContextError(als.organizationId, organizationId);
		}
		if (als.mode === "read_only") {
			return callback(als.tx);
		}
		return tenantAlsStorage.run(
			{ tx: als.tx, organizationId, mode: "read_only" },
			() => callback(als.tx),
		);
	}

	const existingTx = transactionStorage.getStore();
	if (existingTx) {
		return runLegacyReenteredTenantTx(existingTx, organizationId, "read_only", callback);
	}

	return dbRaw.transaction(
		async (tx) => {
			await tx.execute(
				sql`SELECT set_config('app.current_tenant', ${organizationId}, true), set_config('app.superuser_bypass', 'off', true)`,
			);
			const store: TenantAlsStore = {
				tx,
				organizationId,
				mode: "read_only",
			};
			return postCommitStorage.run(undefined, () =>
				tenantAlsStorage.run(store, () =>
					transactionStorage.run(tx, () => callback(tx)),
				),
			);
		},
		{ isolationLevel: "read committed", accessMode: "read only" },
	);
}

/**
 * Executes a read-write tenant transaction (`READ COMMITTED`, `READ WRITE`)
 * with post-commit hook collection. Reuses an active `read_write` same-tenant
 * transaction in RAM with 0 extra SQL round-trips, and rejects mode escalation
 * from inside `withTenantReadCtx` or cross-tenant switching.
 */
export async function withTenantWriteCtx<T>(
	organizationId: string,
	callback: (tx: TenantDb) => Promise<T>,
): Promise<T> {
	assertValidTenantUuid(organizationId);

	const als = tenantAlsStorage.getStore();
	if (als) {
		if (als.mode === "read_only") {
			throw new TenantCtxModeEscalationError();
		}
		const bypassActive =
			als.mode === "superuser_bypass" || bypassScope.getStore() === true;
		if (bypassActive) {
			return runLegacyReenteredTenantTx(als.tx, organizationId, "read_write", callback);
		}
		if (als.organizationId !== organizationId) {
			throw new CrossTenantContextError(als.organizationId, organizationId);
		}
		return callback(als.tx);
	}

	const existingTx = transactionStorage.getStore();
	if (existingTx) {
		return runLegacyReenteredTenantTx(existingTx, organizationId, "read_write", callback);
	}

	const postCommitHooks: PostCommitHook[] = [];
	const result = await dbRaw.transaction(
		async (tx) => {
			await tx.execute(
				sql`SELECT set_config('app.current_tenant', ${organizationId}, true), set_config('app.superuser_bypass', 'off', true)`,
			);
			const store: TenantAlsStore = {
				tx,
				organizationId,
				mode: "read_write",
			};
			return postCommitStorage.run(postCommitHooks, () =>
				tenantAlsStorage.run(store, () =>
					transactionStorage.run(tx, () => callback(tx)),
				),
			);
		},
		{ isolationLevel: "read committed", accessMode: "read write" },
	);
	await flushPostCommitHooks(postCommitHooks);
	return result;
}

export async function withTenantCtx<T>(
	organizationId: string,
	callback: (tx: TenantDb) => Promise<T>,
): Promise<T> {
	assertValidTenantUuid(organizationId);

	const als = tenantAlsStorage.getStore();
	if (
		als &&
		als.mode !== "superuser_bypass" &&
		als.organizationId === organizationId &&
		bypassScope.getStore() !== true
	) {
		// RAM fast path: zero SQL round-trips on reentrant same-tenant call.
		return callback(als.tx);
	}

	const existingTx = als?.tx ?? transactionStorage.getStore();
	if (existingTx) {
		const preservedMode: "read_only" | "read_write" =
			als?.mode === "read_only" ? "read_only" : "read_write";
		return runLegacyReenteredTenantTx(
			existingTx,
			organizationId,
			preservedMode,
			callback,
		);
	}

	return withTenantWriteCtx(organizationId, callback);
}

export async function withSuperuserBypass<T>(
	callback: (tx: TenantDb) => Promise<T>,
): Promise<T> {
	const existingAls = tenantAlsStorage.getStore();
	const existingTx = existingAls?.tx ?? transactionStorage.getStore();
	if (existingTx) {
		// A bypass scope is already open on this transaction; it owns the flag and
		// its reset. Doing another set/reset pair here would turn the bypass off
		// while the outer scope is still using it.
		if (bypassScope.getStore() === true) {
			return callback(existingTx);
		}
		await existingTx.execute(
			sql`SELECT set_config('app.superuser_bypass', 'on', true)`,
		);
		const bypassAls: TenantAlsStore = {
			tx: existingTx,
			organizationId: existingAls?.organizationId ?? "__superuser_bypass__",
			mode: "superuser_bypass",
		};
		try {
			return await tenantAlsStorage.run(bypassAls, () =>
				bypassScope.run(true, () => callback(existingTx)),
			);
		} finally {
			// Reset the flag even if the callback threw. If the transaction is already
			// aborted, this cleanup will fail — suppress that error to preserve the
			// original exception from the callback.
			try {
				await existingTx.execute(
					sql`SELECT set_config('app.superuser_bypass', 'off', true)`,
				);
			} catch (err) {
				void err; // Cleanup failed, likely because the transaction is aborted. Ignore.
			}
		}
	}
	return dbRaw.transaction(async (tx) => {
		await tx.execute(
			sql`SELECT set_config('app.superuser_bypass', 'on', true)`,
		);
		const bypassAls: TenantAlsStore = {
			tx,
			organizationId: "__superuser_bypass__",
			mode: "superuser_bypass",
		};
		return tenantAlsStorage.run(bypassAls, () =>
			transactionStorage.run(tx, () =>
				bypassScope.run(true, () => callback(tx)),
			),
		);
	});
}
