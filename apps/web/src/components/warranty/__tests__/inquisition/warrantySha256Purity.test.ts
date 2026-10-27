import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { generateSha256 as warrantyGenerateSha256, sha256Hex } from "../../warrantyEngine.js";

describe("2. Warranty Engine SHA-256 Purity — FIPS 180-4 Canonical Vectors", () => {
	test("warrantyGenerateSha256 produces exact FIPS 180-4 standard test vectors", () => {
		assert.equal(
			warrantyGenerateSha256(""),
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
		assert.equal(
			warrantyGenerateSha256("abc"),
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
		assert.equal(
			warrantyGenerateSha256("The quick brown fox jumps over the lazy dog"),
			"d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
		);
	});

	test("warrantyGenerateSha256 correctly encodes Cyrillic UTF-8 input with avalanche effect", () => {
		const cyrillicText = "Гарантийный паспорт стоматологического лечения ООО ДЕНТЕ 2026";
		const hash = warrantyGenerateSha256(cyrillicText);
		assert.equal(hash.length, 64);
		assert.match(hash, /^[0-9a-f]{64}$/);
		assert.equal(hash, sha256Hex(cyrillicText));

		const tamperedText = "Гарантийный паспорт стоматологического лечения ООО ДЕНТЕ 2027";
		const tamperedHash = warrantyGenerateSha256(tamperedText);
		assert.notEqual(hash, tamperedHash);

		let differingChars = 0;
		for (let i = 0; i < 64; i++) {
			if (hash[i] !== tamperedHash[i]) differingChars++;
		}
		assert.ok(differingChars > 30, "Avalanche effect must alter majority of hash digits");
	});
});
