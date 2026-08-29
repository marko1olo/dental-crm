/**
 * Canonical JSON serialization for deterministic hashing.
 * Sorts all object keys recursively so that key order in JSON objects
 * does not affect the resulting hash.
 */
export function canonicalJsonStringify(value: unknown): string {
	if (value === null || value === undefined) {
		return "null";
	}
	if (typeof value === "boolean" || typeof value === "number") {
		return JSON.stringify(value);
	}
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	if (value instanceof Date) {
		return JSON.stringify(value.toISOString());
	}
	if (Array.isArray(value)) {
		return `[${value.map((item) => canonicalJsonStringify(item)).join(",")}]`;
	}
	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		const sortedKeys = Object.keys(obj).sort();
		const entries = sortedKeys
			.filter((k) => obj[k] !== undefined)
			.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
		return `{${entries.join(",")}}`;
	}
	return JSON.stringify(String(value));
}

// Pre-computed constants for SHA-256
const K_CONSTANTS = new Uint32Array([
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
	0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
	0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
	0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
	0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
	0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
	0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
	0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
	0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
	return (x >>> n) | (x << (32 - n));
}

/**
 * Pure TypeScript portable SHA-256 byte-level implementation.
 */
export function sha256Bytes(data: Uint8Array): Uint8Array {
	const length = data.length;
	const bitLength = length * 8;

	const paddedLength = Math.ceil((length + 9) / 64) * 64;
	const buffer = new Uint8Array(paddedLength);
	buffer.set(data);
	buffer[length] = 0x80;

	const view = new DataView(buffer.buffer);
	view.setUint32(paddedLength - 4, bitLength >>> 0, false);
	view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);

	const words = new Uint32Array(paddedLength / 4);
	for (let i = 0; i < words.length; i++) {
		words[i] = view.getUint32(i * 4, false);
	}

	const h = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	const w = new Uint32Array(64);

	for (let chunk = 0; chunk < words.length; chunk += 16) {
		for (let i = 0; i < 16; i++) {
			w[i] = words[chunk + i] ?? 0;
		}
		for (let i = 16; i < 64; i++) {
			const w15 = w[i - 15] ?? 0;
			const w2 = w[i - 2] ?? 0;
			const s0 = rotr(7, w15) ^ rotr(18, w15) ^ (w15 >>> 3);
			const s1 = rotr(17, w2) ^ rotr(19, w2) ^ (w2 >>> 10);
			w[i] = (((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) >>> 0);
		}

		let a = h[0] ?? 0;
		let b = h[1] ?? 0;
		let c = h[2] ?? 0;
		let d = h[3] ?? 0;
		let e = h[4] ?? 0;
		let f = h[5] ?? 0;
		let g = h[6] ?? 0;
		let hVal = h[7] ?? 0;

		for (let i = 0; i < 64; i++) {
			const s1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (hVal + s1 + ch + (K_CONSTANTS[i] ?? 0) + (w[i] ?? 0)) >>> 0;
			const s0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (s0 + maj) >>> 0;

			hVal = g;
			g = f;
			f = e;
			e = (d + temp1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) >>> 0;
		}

		h[0] = ((h[0] ?? 0) + a) >>> 0;
		h[1] = ((h[1] ?? 0) + b) >>> 0;
		h[2] = ((h[2] ?? 0) + c) >>> 0;
		h[3] = ((h[3] ?? 0) + d) >>> 0;
		h[4] = ((h[4] ?? 0) + e) >>> 0;
		h[5] = ((h[5] ?? 0) + f) >>> 0;
		h[6] = ((h[6] ?? 0) + g) >>> 0;
		h[7] = ((h[7] ?? 0) + hVal) >>> 0;
	}

	const out = new Uint8Array(32);
	const outView = new DataView(out.buffer);
	for (let i = 0; i < 8; i++) {
		outView.setUint32(i * 4, h[i] ?? 0, false);
	}
	return out;
}

/**
 * Pure TypeScript portable SHA-256 implementation.
 * Guarantees identical 64-char hex hash in any runtime (Node.js, Browser, WebWorker, Test).
 */
export function sha256Hex(asciiOrBytes: string | Uint8Array): string {
	const bytes = typeof asciiOrBytes === "string" ? new TextEncoder().encode(asciiOrBytes) : asciiOrBytes;
	const digest = sha256Bytes(bytes);
	return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Pure TypeScript HMAC-SHA256 implementation.
 */
export function hmacSha256(keyInput: string | Uint8Array, messageInput: string | Uint8Array): Uint8Array {
	const keyBytes = typeof keyInput === "string" ? new TextEncoder().encode(keyInput) : keyInput;
	const messageBytes = typeof messageInput === "string" ? new TextEncoder().encode(messageInput) : messageInput;

	const blockSize = 64;
	const key = new Uint8Array(blockSize);
	if (keyBytes.length > blockSize) {
		key.set(sha256Bytes(keyBytes));
	} else {
		key.set(keyBytes);
	}

	const oKeyPad = new Uint8Array(blockSize);
	const iKeyPad = new Uint8Array(blockSize);
	for (let i = 0; i < blockSize; i++) {
		oKeyPad[i] = (key[i] ?? 0) ^ 0x5c;
		iKeyPad[i] = (key[i] ?? 0) ^ 0x36;
	}

	const inner = new Uint8Array(blockSize + messageBytes.length);
	inner.set(iKeyPad, 0);
	inner.set(messageBytes, blockSize);
	const innerHash = sha256Bytes(inner);

	const outer = new Uint8Array(blockSize + 32);
	outer.set(oKeyPad, 0);
	outer.set(innerHash, blockSize);
	return sha256Bytes(outer);
}

export function hmacSha256Hex(keyInput: string | Uint8Array, messageInput: string | Uint8Array): string {
	const digest = hmacSha256(keyInput, messageInput);
	return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates cryptographically secure random bytes in hex format.
 */
export function safeRandomBytesHex(length = 16): string {
	const bytes = new Uint8Array(length);
	if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
		globalThis.crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < length; i++) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
	}
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a random integer in range [min, max).
 */
export function safeRandomInt(min: number, max: number): number {
	const range = max - min;
	if (range <= 0) return min;
	const bytes = new Uint32Array(1);
	if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
		globalThis.crypto.getRandomValues(bytes);
		return min + ((bytes[0] ?? 0) % range);
	}
	return min + Math.floor(Math.random() * range);
}

/**
 * Timing-safe string comparison.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

/**
 * Computes deterministic SHA-256 hash of any JavaScript payload.
 */
export function computePayloadHash(payload: unknown): string {
	const canonical = canonicalJsonStringify(payload);
	return sha256Hex(canonical);
}

/**
 * Creates composite Idempotency-Key from a UUID and a payload:
 * Format: `<uuid>#<payloadHash>` or returns clean UUID if payload is omitted.
 */
export function createCompositeIdempotencyKey(
	uuid: string,
	payload?: unknown,
): string {
	if (payload === undefined) return uuid;
	const hash = computePayloadHash(payload);
	return `${uuid}#${hash}`;
}

/**
 * Parses an idempotency key which might be composite (`<uuid>#<hash>`) or simple UUID.
 */
export function parseIdempotencyKey(key: string): {
	rawKey: string;
	uuid: string;
	embeddedHash: string | null;
} {
	const parts = key.split("#");
	const uuid = parts[0] ? parts[0].trim() : key;
	const embeddedHash = parts[1] ? parts[1].trim() : null;
	return {
		rawKey: key,
		uuid,
		embeddedHash,
	};
}

/**
 * Verifies if payload matches an expected hash or composite key.
 */
export function verifyPayloadHash(
	payload: unknown,
	expectedHashOrCompositeKey: string,
): boolean {
	const parsed = parseIdempotencyKey(expectedHashOrCompositeKey);
	const targetHash = parsed.embeddedHash ?? expectedHashOrCompositeKey;
	const calculatedHash = computePayloadHash(payload);
	return calculatedHash === targetHash;
}

let lastTimestampMs = 0;
let sequenceCounter = 0;

/**
 * Generates an RFC 9562 compliant UUIDv7.
 * Features:
 * - 48-bit millisecond timestamp (lexicographically time-sortable)
 * - 4-bit version (0x7)
 * - 12-bit sequence / counter bits (strictly monotonic within same ms)
 * - 2-bit RFC 4122 variant (0b10)
 * - 62-bit cryptographic randomness
 */
export function generateUuidV7(): string {
	const now = Date.now();
	if (now === lastTimestampMs) {
		sequenceCounter = (sequenceCounter + 1) & 0xfff;
	} else {
		lastTimestampMs = now;
		sequenceCounter = 0;
	}

	const bytes = new Uint8Array(16);
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.getRandomValues === "function"
	) {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < 16; i++) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
	}

	// 48-bit timestamp in ms
	bytes[0] = Math.floor(now / 0x10000000000) & 0xff;
	bytes[1] = Math.floor(now / 0x100000000) & 0xff;
	bytes[2] = Math.floor(now / 0x1000000) & 0xff;
	bytes[3] = Math.floor(now / 0x10000) & 0xff;
	bytes[4] = Math.floor(now / 0x100) & 0xff;
	bytes[5] = now & 0xff;

	// Version 7 in 4 most significant bits of byte 6 + 4 bits from sequence counter
	bytes[6] = 0x70 | ((sequenceCounter >> 8) & 0x0f);
	// 8 bits from sequence counter in byte 7
	bytes[7] = sequenceCounter & 0xff;

	// Variant 10 in 2 most significant bits of byte 8
	bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}


/**
 * Validates whether a given string is a valid UUIDv7.
 */
export function isUuidV7(uuid: string): boolean {
	if (typeof uuid !== "string") return false;
	const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return regex.test(uuid.trim());
}

