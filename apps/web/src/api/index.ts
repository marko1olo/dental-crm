/**
 * DENTE CRM — Core API Client & Adapters
 */

export * from "./doctorPreferencesApi";
export {
	resilientFetch,
	globalCircuitBreaker,
	CircuitBreaker,
	type CircuitBreakerState,
	type CircuitBreakerStatus,
	type ResilienceFetchOptions,
} from "../lib/resilience";
