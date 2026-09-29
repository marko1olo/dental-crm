/**
 * resilientTransaction.ts — PostgreSQL Connection Resiliency & Deadlock Auto-Retry Engine.
 *
 * Catches transient and concurrency PostgreSQL failures:
 *   - 40001: serialization_failure
 *   - 40P01: deadlock_detected
 *   - 08006: connection_failure
 *   - 57P01: admin_shutdown
 *
 * Automatically retries transactions up to 3 times with exponential backoff:
 *   - Attempt 1 failure -> 50ms + jitter
 *   - Attempt 2 failure -> 150ms + jitter
 *   - Attempt 3 failure -> 450ms + jitter
 *
 * Guarantees that tenant context (`SET LOCAL app.current_tenant`) is cleanly
 * preserved, set on each checked-out pooled connection across retries, and scoped
 * strictly to the transaction.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { dbRaw, transactionStorage } from "./client.js";
import type * as schema from "./schema.js";

export type TenantDb = NodePgDatabase<typeof schema>;

/**
 * Transient PostgreSQL error codes eligible for automatic transaction retry.
 */
export const RETRYABLE_PG_CODES = new Set<string>([
	"40001", // serialization_failure
	"40P01", // deadlock_detected
	"08006", // connection_failure
	"57P01", // admin_shutdown
]);

/**
 * AsyncLocalStorage holding the ambient tenant ID across async call boundaries.
 */
export const currentTenantStorage = new AsyncLocalStorage<string | null>();

export interface ResilientTransactionOptions {
	/** Maximum number of retry attempts after initial failure. Defaults to 3. */
	maxRetries?: number;
	/** Initial backoff in milliseconds. Defaults to 50ms. */
	initialBackoffMs?: number;
	/** Exponential backoff factor. Defaults to 3 (50ms -> 150ms -> 450ms). */
	backoffFactor?: number;
	/** Maximum randomized jitter in milliseconds added to delay. Defaults to 25ms. */
	jitterMs?: number;
	/** Explicit tenant ID for RLS isolation. Preserved across all retry attempts. */
	tenantId?: string | null;
	/** Transaction isolation level. */
	isolationLevel?: "read committed" | "repeatable read" | "serializable";
	/** Callback invoked prior to each retry sleep. */
	onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
	/** Custom predicate to treat additional domain or network errors as retryable. */
	isRetryable?: (error: unknown) => boolean;
	/** Optional structured logger. */
	logger?: {
		info(...args: unknown[]): void;
		warn(...args: unknown[]): void;
		error(...args: unknown[]): void;
	};
}

/**
 * Extracts standard PostgreSQL error code from an error or driver error hierarchy.
 */
export function getPgErrorCode(error: unknown): string | undefined {
	if (!error || typeof error !== "object") return undefined;
	// biome-ignore lint/suspicious/noExplicitAny: error property probing
	const err = error as any;
	return (
		err.code ||
		err.cause?.code ||
		err.originalError?.code ||
		err.driverError?.code
	);
}

/**
 * Determines whether a thrown database error represents a transient failure
 * suitable for automatic retry.
 */
export function isRetryablePgError(error: unknown): boolean {
	if (!error) return false;
	const code = getPgErrorCode(error);
	if (typeof code === "string" && RETRYABLE_PG_CODES.has(code)) {
		return true;
	}

	// biome-ignore lint/suspicious/noExplicitAny: error property probing
	const err = error as any;
	const message = (err.message || "").toLowerCase();

	if (
		message.includes("deadlock detected") ||
		message.includes("could not serialize access") ||
		message.includes("serialization failure") ||
		message.includes("connection terminated") ||
		message.includes("admin shutdown") ||
		message.includes("terminating connection due to administrator command") ||
		message.includes("server closed the connection unexpectedly") ||
		err.code === "ECONNRESET" ||
		err.code === "ECONNREFUSED" ||
		err.code === "EPIPE" ||
		err.code === "ETIMEDOUT"
	) {
		return true;
	}

	return false;
}

function calculateDelay(
	attempt: number,
	initialBackoffMs: number,
	backoffFactor: number,
	jitterMs: number,
): number {
	const base = initialBackoffMs * Math.pow(backoffFactor, attempt);
	const jitter = jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0;
	return base + jitter;
}

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps a transaction callback with automatic retries on serialization failures,
 * deadlocks, and connection failures.
 *
 * Supports both signatures:
 *   withResilientTransaction(db, fn, options)
 *   withResilientTransaction(fn, options)
 */
export async function withResilientTransaction<T>(
	dbOrFn: TenantDb | ((tx: TenantDb) => Promise<T>),
	fnOrOptions?: ((tx: TenantDb) => Promise<T>) | ResilientTransactionOptions,
	maybeOptions?: ResilientTransactionOptions,
): Promise<T> {
	let targetDb: TenantDb;
	let fn: (tx: TenantDb) => Promise<T>;
	let options: ResilientTransactionOptions;

	if (typeof dbOrFn === "function") {
		targetDb = dbRaw as unknown as TenantDb;
		fn = dbOrFn;
		options = (fnOrOptions as ResilientTransactionOptions) ?? {};
	} else {
		targetDb = dbOrFn;
		fn = fnOrOptions as (tx: TenantDb) => Promise<T>;
		options = maybeOptions ?? {};
	}

	const maxRetries = options.maxRetries ?? 3;
	const initialBackoffMs = options.initialBackoffMs ?? 50;
	const backoffFactor = options.backoffFactor ?? 3;
	const jitterMs = options.jitterMs ?? 25;
	const effectiveTenantId =
		options.tenantId !== undefined
			? options.tenantId
			: (currentTenantStorage.getStore() ?? null);

	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			// Execute inside a fresh transaction checked out from the pool
			const txResult = await targetDb.transaction(
				async (tx) => {
					if (effectiveTenantId) {
						// Guaranteed tenant context: set_config with is_local=true cleanly
						// scopes the tenant to this transaction, preserving isolation.
						await tx.execute(
							sql`SELECT set_config('app.current_tenant', ${effectiveTenantId}, true)`,
						);
					}

					// Bind transaction to transactionStorage for proxy queries
					// biome-ignore lint/suspicious/noExplicitAny: Drizzle tx typing
					return await transactionStorage.run(tx as any, () =>
						// biome-ignore lint/suspicious/noExplicitAny: Drizzle tx typing
						fn(tx as any),
					);
				},
				options.isolationLevel
					? { isolationLevel: options.isolationLevel }
					: undefined,
			);

			return txResult;
		} catch (error: unknown) {
			lastError = error;

			const isRetryable =
				options.isRetryable?.(error) ?? isRetryablePgError(error);

			if (!isRetryable || attempt >= maxRetries) {
				throw error;
			}

			const delayMs = calculateDelay(
				attempt,
				initialBackoffMs,
				backoffFactor,
				jitterMs,
			);

			const code = getPgErrorCode(error) ?? "TRANSIENT_ERROR";
			options.logger?.warn?.(
				{
					attempt: attempt + 1,
					maxRetries,
					delayMs,
					pgErrorCode: code,
					tenantId: effectiveTenantId,
					error: error instanceof Error ? error.message : String(error),
				},
				`[ResilientTransaction] Transient PG error ${code}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`,
			);

			options.onRetry?.(error, attempt + 1, delayMs);

			await sleep(delayMs);
		}
	}

	throw lastError;
}

/**
 * Runs an asynchronous block with ambient tenant context populated in currentTenantStorage.
 */
export async function withResilientTenantContext<T>(
	tenantId: string | null,
	fn: () => Promise<T>,
): Promise<T> {
	return currentTenantStorage.run(tenantId, fn);
}
