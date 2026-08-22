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
 * Pure TypeScript portable SHA-256 implementation.
 * Guarantees identical 64-char hex hash in any runtime (Node.js, Browser, WebWorker, Test).
 */
export function sha256Hex(ascii: string): string {
	const utf8Bytes = new TextEncoder().encode(ascii);
	const length = utf8Bytes.length;
	const bitLength = length * 8;

	// Calculate padded length: next multiple of 64 bytes after length + 9
	const paddedLength = Math.ceil((length + 9) / 64) * 64;
	const buffer = new Uint8Array(paddedLength);
	buffer.set(utf8Bytes);
	buffer[length] = 0x80;

	// Write 64-bit big-endian bit length at the end
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

	let hex = "";
	for (let i = 0; i < 8; i++) {
		hex += (h[i] ?? 0).toString(16).padStart(8, "0");
	}
	return hex;
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
