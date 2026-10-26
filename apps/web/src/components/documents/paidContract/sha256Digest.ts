/**
 * paidContract/sha256Digest.ts
 * Pure SHA-256 (FIPS 180-4) implementation without external dependencies (Mandate 8b <= 120 lines)
 */

function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

const K = new Uint32Array([
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function generateSha256(inputString: string): string {
	const hash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	const utf8Bytes: number[] = [];
	for (let c = 0; c < inputString.length; c++) {
		const code = inputString.charCodeAt(c);
		if (code < 0x80) utf8Bytes.push(code);
		else if (code < 0x800) utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		else if (code < 0xd800 || code >= 0xe000) {
			utf8Bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			c++;
			const code2 = 0x10000 + (((code & 0x3ff) << 10) | (inputString.charCodeAt(c) & 0x3ff));
			utf8Bytes.push(0xf0 | (code2 >> 18), 0x80 | ((code2 >> 12) & 0x3f), 0x80 | ((code2 >> 6) & 0x3f), 0x80 | (code2 & 0x3f));
		}
	}

	const utf8BitLength = utf8Bytes.length * 8;
	utf8Bytes.push(0x80);
	while ((utf8Bytes.length % 64) !== 56) utf8Bytes.push(0);

	const highBits = Math.floor(utf8BitLength / Math.pow(2, 32));
	const lowBits = utf8BitLength >>> 0;
	for (let b = 3; b >= 0; b--) utf8Bytes.push((highBits >>> (b * 8)) & 0xff);
	for (let b = 3; b >= 0; b--) utf8Bytes.push((lowBits >>> (b * 8)) & 0xff);

	const wordsCount = utf8Bytes.length / 4;
	const words = new Uint32Array(wordsCount);
	for (let b = 0; b < wordsCount; b++) {
		const offset = b * 4;
		words[b] = ((utf8Bytes[offset] ?? 0) << 24) | ((utf8Bytes[offset + 1] ?? 0) << 16) | ((utf8Bytes[offset + 2] ?? 0) << 8) | (utf8Bytes[offset + 3] ?? 0);
	}

	const w = new Uint32Array(64);
	for (let j = 0; j < wordsCount; j += 16) {
		for (let i = 0; i < 16; i++) w[i] = words[j + i] ?? 0;
		for (let i = 16; i < 64; i++) {
			const s0 = rightRotate(w[i - 15] ?? 0, 7) ^ rightRotate(w[i - 15] ?? 0, 18) ^ ((w[i - 15] ?? 0) >>> 3);
			const s1 = rightRotate(w[i - 2] ?? 0, 17) ^ rightRotate(w[i - 2] ?? 0, 19) ^ ((w[i - 2] ?? 0) >>> 10);
			w[i] = (((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) | 0);
		}

		let [a, b, c, d, e, f, g, h] = hash;
		for (let i = 0; i < 64; i++) {
			const S1 = rightRotate(e ?? 0, 6) ^ rightRotate(e ?? 0, 11) ^ rightRotate(e ?? 0, 25);
			const ch = ((e ?? 0) & (f ?? 0)) ^ (~(e ?? 0) & (g ?? 0));
			const temp1 = ((h ?? 0) + S1 + ch + (K[i] ?? 0) + (w[i] ?? 0)) | 0;
			const S0 = rightRotate(a ?? 0, 2) ^ rightRotate(a ?? 0, 13) ^ rightRotate(a ?? 0, 22);
			const maj = ((a ?? 0) & (b ?? 0)) ^ ((a ?? 0) & (c ?? 0)) ^ ((b ?? 0) & (c ?? 0));
			const temp2 = (S0 + maj) | 0;
			h = g; g = f; f = e; e = ((d ?? 0) + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
		}
		hash[0] = ((hash[0] ?? 0) + (a ?? 0)) | 0;
		hash[1] = ((hash[1] ?? 0) + (b ?? 0)) | 0;
		hash[2] = ((hash[2] ?? 0) + (c ?? 0)) | 0;
		hash[3] = ((hash[3] ?? 0) + (d ?? 0)) | 0;
		hash[4] = ((hash[4] ?? 0) + (e ?? 0)) | 0;
		hash[5] = ((hash[5] ?? 0) + (f ?? 0)) | 0;
		hash[6] = ((hash[6] ?? 0) + (g ?? 0)) | 0;
		hash[7] = ((hash[7] ?? 0) + (h ?? 0)) | 0;
	}

	return Array.from(hash).map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("");
}
