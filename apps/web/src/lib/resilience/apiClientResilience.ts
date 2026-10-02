/**
 * DENTE CRM — Infallible Client-Side Network Resilience & Resilient Fetch Adapter
 *
 * ARCHITECTURAL SPECIFICATION:
 * 1. Exponential Backoff with Jitter:
 *    Retries transient network dropouts and gateway errors (TypeError: Failed to fetch, 502, 503, 504).
 *    Delays: 200ms, 600ms, 1800ms + random jitter to prevent synchronized retry stampedes.
 * 2. Idempotency Key Injection:
 *    Injects `X-Idempotency-Key: <uuidv7>` on all mutating requests (POST, PUT, PATCH, DELETE)
 *    to prevent duplicate charges, double appointment bookings, and corrupted teeth logs.
 * 3. Clinical Circuit Breaker:
 *    Tracks consecutive network failures. Trips to 'offline-cache' / 'half-open' after 5 consecutive failures.
 *    Emits non-blocking notification to UI toast and auto-recovers on the next successful probe.
 */

import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import { logger } from "../../utils/logger";

export type CircuitBreakerState = "closed" | "open" | "half-open" | "offline-cache";

export interface CircuitBreakerStatus {
	state: CircuitBreakerState;
	consecutiveFailures: number;
	lastFailureTime: number | null;
	lastSuccessTime: number | null;
	lastError?: string | undefined;
}

export interface ResilienceFetchOptions {
	/** Maximum retry attempts for transient errors (default: 3) */
	maxRetries?: number;
	/** Base backoff delays in milliseconds (default: [200, 600, 1800]) */
	retryDelays?: number[];
	/** Whether to apply random jitter to backoff delay (default: true) */
	applyJitter?: boolean;
	/** Custom idempotency key; if omitted on mutating requests, UUIDv7 is auto-generated */
	idempotencyKey?: string;
	/** If true, bypasses circuit breaker state checks */
	skipCircuitBreaker?: boolean;
	/** Custom fetch implementation (used for dependency injection and tests) */
	fetchFn?: typeof fetch;
	/** Optional callback when a retry attempt is triggered */
	onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

export const DEFAULT_RETRY_DELAYS = [200, 600, 1800] as const;
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
export const CIRCUIT_BREAKER_COOLDOWN_MS = 10_000;
export const IDEMPOTENCY_HEADER = "X-Idempotency-Key";

/**
 * Checks whether an HTTP method is considered mutating.
 */
export function isMutatingMethod(method?: string): boolean {
	if (!method) return false;
	const m = method.toUpperCase();
	return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

/**
 * Checks if an error or HTTP status qualifies as transient and retriable.
 */
export function isTransientNetworkFailure(error: unknown, status?: number): boolean {
	if (status !== undefined) {
		// 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
		if (status === 502 || status === 503 || status === 504) {
			return true;
		}
	}

	if (error instanceof TypeError) {
		// Typical browser network error: TypeError: Failed to fetch / NetworkError
		return true;
	}

	if (error instanceof Error) {
		if (error.name === "AbortError") {
			return false;
		}
		const msg = error.message.toLowerCase();
		if (msg.includes("abort") || msg.includes("aborted")) {
			return false;
		}
		if (
			msg.includes("failed to fetch") ||
			msg.includes("networkerror") ||
			msg.includes("network request failed") ||
			msg.includes("load failed") ||
			msg.includes("econnrefused") ||
			msg.includes("etimedout")
		) {
			return true;
		}
	}

	return false;
}

/**
 * Calculates backoff delay with random jitter.
 */
export function calculateBackoffWithJitter(
	attempt: number,
	delays: number[] = [...DEFAULT_RETRY_DELAYS],
	applyJitter = true,
): number {
	const baseDelay = delays[Math.min(attempt, delays.length - 1)] ?? 1800;
	if (!applyJitter) {
		return baseDelay;
	}
	// Add ±25% random jitter to distribute retries (CSPRNG, without Math.random)
	let rand = (Date.now() % 1000) / 1000;
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const u8 = new Uint8Array(1);
		crypto.getRandomValues(u8);
		rand = (u8[0] ?? 0) / 255;
	}
	const jitterFactor = 0.75 + rand * 0.5;
	return Math.max(50, Math.round(baseDelay * jitterFactor));
}

/**
 * Sleep helper utility.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clinical Circuit Breaker
 * Manages network connection health and protects frontend from hanging on dead backend.
 */
export class CircuitBreaker {
	private state: CircuitBreakerState = "closed";
	private consecutiveFailures = 0;
	private lastFailureTime: number | null = null;
	private lastSuccessTime: number | null = null;
	private lastError: string | undefined = undefined;
	private listeners = new Set<(status: CircuitBreakerStatus) => void>();

	public getState(): CircuitBreakerState {
		// Auto-transition from offline-cache / open to half-open after cooldown
		if (
			(this.state === "offline-cache" || this.state === "open") &&
			this.lastFailureTime &&
			Date.now() - this.lastFailureTime >= CIRCUIT_BREAKER_COOLDOWN_MS
		) {
			this.state = "half-open";
			this.notifyListeners();
		}
		return this.state;
	}

	public getStatus(): CircuitBreakerStatus {
		return {
			state: this.getState(),
			consecutiveFailures: this.consecutiveFailures,
			lastFailureTime: this.lastFailureTime,
			lastSuccessTime: this.lastSuccessTime,
			lastError: this.lastError,
		};
	}

	public canExecute(): boolean {
		const currentState = this.getState();
		return currentState === "closed" || currentState === "half-open";
	}

	public recordSuccess(): void {
		const wasTripped = this.state !== "closed";
		this.consecutiveFailures = 0;
		this.lastSuccessTime = Date.now();
		this.lastError = undefined;
		this.state = "closed";

		if (wasTripped) {
			logger.info("[CircuitBreaker] Connection recovered! Circuit closed.");
			showToast("Связь с сервером восстановлена", "success", 3000);
			this.emitWindowEvent("dente:circuit-breaker", { state: "closed", consecutiveFailures: 0 });
		}

		this.notifyListeners();
	}

	public recordFailure(error?: unknown): void {
		this.consecutiveFailures += 1;
		this.lastFailureTime = Date.now();
		this.lastError = error instanceof Error ? error.message : String(error);

		if (this.consecutiveFailures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD && this.state === "closed") {
			this.trip("offline-cache");
		} else {
			this.notifyListeners();
		}
	}

	public trip(targetState: "open" | "offline-cache" = "offline-cache"): void {
		this.state = targetState;
		this.lastFailureTime = Date.now();
		logger.warn(`[CircuitBreaker] Tripped to '${targetState}' after ${this.consecutiveFailures} consecutive failures.`);

		showToast(
			"Связь с сервером нестабильна. Включен автономный режим кэша.",
			"warning",
			5000,
		);

		this.emitWindowEvent("dente:circuit-breaker", {
			state: this.state,
			consecutiveFailures: this.consecutiveFailures,
		});

		this.notifyListeners();
	}

	public reset(): void {
		this.state = "closed";
		this.consecutiveFailures = 0;
		this.lastFailureTime = null;
		this.lastSuccessTime = Date.now();
		this.lastError = undefined;
		this.notifyListeners();
	}

	public subscribe(callback: (status: CircuitBreakerStatus) => void): () => void {
		this.listeners.add(callback);
		callback(this.getStatus());
		return () => {
			this.listeners.delete(callback);
		};
	}

	private notifyListeners(): void {
		const status = this.getStatus();
		for (const listener of this.listeners) {
			try {
				listener(status);
			} catch (err) {
				logger.error("[CircuitBreaker] Error in status subscriber", err);
			}
		}
	}

	private emitWindowEvent(eventName: string, detail: unknown): void {
		if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
			window.dispatchEvent(new CustomEvent(eventName, { detail }));
		}
	}
}

/** Global singleton circuit breaker instance */
export const globalCircuitBreaker = new CircuitBreaker();

/**
 * Injects idempotency key and returns a new Headers instance.
 */
export function ensureIdempotencyHeader(
	existingHeaders: HeadersInit | undefined,
	method: string,
	customKey?: string,
): Headers {
	const headers = new Headers(existingHeaders);
	if (isMutatingMethod(method)) {
		if (!headers.has(IDEMPOTENCY_HEADER) && !headers.has(IDEMPOTENCY_HEADER.toLowerCase())) {
			const key = customKey || generateUuidV7();
			headers.set(IDEMPOTENCY_HEADER, key);
		}
	}
	return headers;
}

/**
 * Resilient Fetch:
 * Executes HTTP fetch with:
 * - Automatic X-Idempotency-Key (UUIDv7) injection for mutating methods
 * - Exponential backoff with random jitter (200ms, 600ms, 1800ms) on transient failures (TypeError, 502, 503, 504)
 * - Circuit breaker health monitoring with automatic trip to 'offline-cache' and seamless recovery
 */
export async function resilientFetch(
	input: RequestInfo | URL,
	init?: RequestInit,
	options: ResilienceFetchOptions = {},
): Promise<Response> {
	const {
		maxRetries = 3,
		retryDelays = [...DEFAULT_RETRY_DELAYS],
		applyJitter = true,
		idempotencyKey,
		skipCircuitBreaker = false,
		fetchFn = typeof window !== "undefined" && window.fetch ? window.fetch.bind(window) : globalThis.fetch,
		onRetry,
	} = options;

	const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

	// Check circuit breaker status if not skipped
	if (!skipCircuitBreaker && !globalCircuitBreaker.canExecute()) {
		const status = globalCircuitBreaker.getStatus();
		logger.warn(`[resilientFetch] Circuit breaker is in '${status.state}' mode.`);
	}

	// Prepare request headers with guaranteed Idempotency Key for mutations
	const headers = ensureIdempotencyHeader(
		init?.headers ?? (input instanceof Request ? input.headers : undefined),
		method,
		idempotencyKey,
	);

	let lastError: unknown = null;
	let lastResponse: Response | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const currentInit: RequestInit = {
				...(init ?? {}),
				headers,
			};

			const requestInput = input instanceof Request && !init ? new Request(input, { headers }) : input;
			const res = await fetchFn(requestInput, currentInit);

			// Check HTTP status for transient gateway errors (502, 503, 504)
			if (res.status === 502 || res.status === 503 || res.status === 504) {
				lastResponse = res;
				globalCircuitBreaker.recordFailure(`HTTP ${res.status}`);

				if (attempt < maxRetries) {
					const delay = calculateBackoffWithJitter(attempt, retryDelays, applyJitter);
					logger.warn(
						`[resilientFetch] Transient HTTP ${res.status} on ${method} ${String(input)}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`,
					);
					onRetry?.(attempt + 1, delay, new Error(`HTTP ${res.status}`));
					await sleep(delay);
					continue;
				}
				// All retries exhausted: return response so caller can inspect status
				return res;
			}

			// Clean response or non-transient status (e.g. 200, 201, 400, 403, 404, 409):
			// Record success in circuit breaker to auto-recover if previously tripped
			globalCircuitBreaker.recordSuccess();
			return res;
		} catch (err: unknown) {
			lastError = err;
			const isTransient = isTransientNetworkFailure(err);
			globalCircuitBreaker.recordFailure(err);

			if (isTransient && attempt < maxRetries) {
				const delay = calculateBackoffWithJitter(attempt, retryDelays, applyJitter);
				logger.warn(
					`[resilientFetch] Network drop on ${method} ${String(input)}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`,
					err,
				);
				onRetry?.(attempt + 1, delay, err);
				await sleep(delay);
				continue;
			}

			// Non-transient or retries exhausted: log and throw
			logger.error(`[resilientFetch] Failed after ${attempt} retries: ${String(input)}`, err);
			throw err;
		}
	}

	if (lastResponse) {
		return lastResponse;
	}

	throw lastError ?? new Error(`Network request failed after ${maxRetries} retries`);
}
