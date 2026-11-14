/**
 * Backward compatibility facade for cash CRDT operations.
 * Canonical implementation resides in packages/shared/src/sync/crdt.ts (SSOT).
 */
export {
	type CashPaymentRecord,
	type CashOperationConflictInput,
	type CashOperationConflictResult,
	resolveCashOperationCrdt,
} from "../crdt.js";
