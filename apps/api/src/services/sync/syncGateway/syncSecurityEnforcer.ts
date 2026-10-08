import { computePayloadHash, parseIdempotencyKey } from "@dental/shared";
import type { SyncMutationEnvelope, SyncSecurityValidationResult } from "./types.js";

/**
 * Enforces cryptographic payload integrity, idempotency token verification,
 * and tenant isolation boundaries for synchronization mutations.
 */
export class SyncSecurityEnforcer {
	/**
	 * Validates payload integrity by comparing canonical hash against envelope and idempotency key.
	 */
	public static validateMutationIntegrity(
		mutation: SyncMutationEnvelope,
	): SyncSecurityValidationResult & { calculatedHash: string } {
		const calculatedHash = computePayloadHash(mutation.payload);
		const parsedKey = parseIdempotencyKey(mutation.idempotencyKey);

		if (mutation.payloadHash && mutation.payloadHash !== calculatedHash) {
			return {
				isValid: false,
				calculatedHash,
				error: "Payload hash verification failed: payload content does not match payloadHash",
			};
		}

		if (parsedKey.embeddedHash && parsedKey.embeddedHash !== calculatedHash) {
			return {
				isValid: false,
				calculatedHash,
				error: "Idempotency-Key hash mismatch: payload does not match the hash embedded in the key",
			};
		}

		return {
			isValid: true,
			calculatedHash,
		};
	}

	/**
	 * Strictly validates that incoming payload matches the tenant organization boundary.
	 */
	public static enforceTenantBoundary(
		contextOrgId: string,
		payloadOrgId?: string,
	): boolean {
		if (!payloadOrgId) {
			return true;
		}
		return contextOrgId === payloadOrgId;
	}
}
