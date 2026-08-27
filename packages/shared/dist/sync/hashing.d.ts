/**
 * Canonical JSON serialization for deterministic hashing.
 * Sorts all object keys recursively so that key order in JSON objects
 * does not affect the resulting hash.
 */
export declare function canonicalJsonStringify(value: unknown): string;
/**
 * Pure TypeScript portable SHA-256 implementation.
 * Guarantees identical 64-char hex hash in any runtime (Node.js, Browser, WebWorker, Test).
 */
export declare function sha256Hex(ascii: string): string;
/**
 * Computes deterministic SHA-256 hash of any JavaScript payload.
 */
export declare function computePayloadHash(payload: unknown): string;
/**
 * Creates composite Idempotency-Key from a UUID and a payload:
 * Format: `<uuid>#<payloadHash>` or returns clean UUID if payload is omitted.
 */
export declare function createCompositeIdempotencyKey(uuid: string, payload?: unknown): string;
/**
 * Parses an idempotency key which might be composite (`<uuid>#<hash>`) or simple UUID.
 */
export declare function parseIdempotencyKey(key: string): {
    rawKey: string;
    uuid: string;
    embeddedHash: string | null;
};
/**
 * Verifies if payload matches an expected hash or composite key.
 */
export declare function verifyPayloadHash(payload: unknown, expectedHashOrCompositeKey: string): boolean;
/**
 * Generates an RFC 9562 compliant UUIDv7.
 * Features:
 * - 48-bit millisecond timestamp (lexicographically time-sortable)
 * - 4-bit version (0x7)
 * - 12-bit sequence / counter bits (strictly monotonic within same ms)
 * - 2-bit RFC 4122 variant (0b10)
 * - 62-bit cryptographic randomness
 */
export declare function generateUuidV7(): string;
/**
 * Validates whether a given string is a valid UUIDv7.
 */
export declare function isUuidV7(uuid: string): boolean;
