/**
 * idempotencyTypes.ts — Pure Types & Contracts for Idempotency De-duplication Engine (Layer 0).
 */

export interface IdempotencyPluginOptions {
	/** Header name to check for idempotency key. Defaults to 'x-idempotency-key'. */
	headerName?: string;
	/** Mutating HTTP methods to guard. Defaults to ['POST', 'PUT', 'PATCH']. */
	methods?: string[];
	/** Value for Retry-After header in seconds for in-flight requests. Defaults to 1. */
	retryAfterSeconds?: number;
	/** Global disable switch. */
	disabled?: boolean;
}

export interface IdempotencyContext {
	idempotencyKey: string;
	organizationId: string | null;
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
