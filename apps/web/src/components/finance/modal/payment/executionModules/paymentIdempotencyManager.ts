/**
 * apps/web/src/components/finance/modal/payment/executionModules/paymentIdempotencyManager.ts
 *
 * Client Idempotency-Key & In-Flight Double-Click Lock Manager.
 * Complies with 54-FZ FFD 1.2, Mandate 8e, Mandate 8i (Protection against duplicate financial mutations).
 */

import {
	createCompositeIdempotencyKey,
	generateUuidV7,
	type StomxCashBoxType,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../../../lib/denteRequestHeaders.js";

let paymentMutationSeq = 0;
const inFlightPaymentLocks = new Set<string>();

export interface CreateIdempotencyKeyParams {
	readonly prefix: string;
	readonly patientId: string;
	readonly amountRub: number;
	readonly method: string;
	readonly cashBoxType?: StomxCashBoxType | undefined;
}

export interface PaymentIdempotencyContext {
	readonly clientMutationId: string;
	readonly headers: Record<string, string>;
}

/**
 * Generates a unique, composite idempotency key incorporating RFC 9562 UUIDv7.
 */
export function generatePaymentIdempotencyKey(params: CreateIdempotencyKeyParams): PaymentIdempotencyContext {
	const uuidV7 = generateUuidV7();

	const clientMutationId = createCompositeIdempotencyKey(uuidV7, {
		patientId: params.patientId,
		amountRub: params.amountRub,
		method: params.method,
		cashBoxType: params.cashBoxType || "main",
	});

	const headers = denteAdminSecretRequestHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": clientMutationId,
	});

	return {
		clientMutationId,
		headers,
	};
}

/**
 * Acquires an in-flight execution lock for the given patient or mutation key.
 * Prevents race conditions from accidental rapid double-clicks on payment buttons.
 */
export function acquirePaymentLock(lockKey: string): boolean {
	if (inFlightPaymentLocks.has(lockKey)) {
		return false;
	}
	inFlightPaymentLocks.add(lockKey);
	return true;
}

/**
 * Releases the execution lock once the payment network call completes or fails.
 */
export function releasePaymentLock(lockKey: string): void {
	inFlightPaymentLocks.delete(lockKey);
}

/**
 * Checks whether an in-flight execution lock is active for the given key.
 */
export function isInFlightPaymentLocked(lockKey: string): boolean {
	return inFlightPaymentLocks.has(lockKey);
}

/**
 * Clears all active payment locks (e.g. on modal close or test teardown).
 */
export function clearAllPaymentLocks(): void {
	inFlightPaymentLocks.clear();
}

