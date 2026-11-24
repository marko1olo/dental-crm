/**
 * idempotencyTypes.ts — Pure Types & Contracts for Idempotency De-duplication Engine (Layer 0).
 */

export interface IdempotencyPluginOptions {
	/** Header name to check for idempotency key. Defaults to 'x-idempotency-key'. */
	headerName?: string | undefined;
	/** Mutating HTTP methods to guard. Defaults to ['POST', 'PUT', 'PATCH']. */
	methods?: string[] | undefined;
	/** Value for Retry-After header in seconds for in-flight requests. Defaults to 1. */
	retryAfterSeconds?: number | undefined;
	/** Global disable switch. */
	disabled?: boolean | undefined;
	/** Paths or patterns where Idempotency-Key is strictly required (Fail-Closed 400). */
	enforceForPaths?: Array<string | RegExp> | undefined;
}

export interface IdempotencyContext {
	idempotencyKey: string;
	organizationId: string | null;
	memScope?: string | undefined;
	payloadHash: string;
	useDatabase: boolean;
}

export interface InMemoryRecord {
	idempotencyKey: string;
	payloadHash: string;
	responseStatus: number;
	responseJson: Record<string, unknown> | null;
	action: "in_flight" | "completed";
	createdAt: number;
}
