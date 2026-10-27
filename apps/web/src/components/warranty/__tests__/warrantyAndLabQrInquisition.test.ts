import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	generateQrCodeSvg as warrantyGenerateQrCodeSvg,
	generateSha256 as warrantyGenerateSha256,
	sha256Hex,
} from "../warrantyEngine.js";

describe("Warranty & Lab QR Inquisition: Master Verification", () => {
	test("verifies QR code SVG generation", () => {
		const svg = warrantyGenerateQrCodeSvg("https://dente.ru/w/1", { size: 100 });
		assert.ok(svg.startsWith("<svg"));
		assert.ok(svg.includes('width="100"'));
	});

	test("verifies SHA-256 standard NIST vector", () => {
		assert.equal(
			warrantyGenerateSha256("abc"),
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
		assert.equal(warrantyGenerateSha256("test"), sha256Hex("test"));
	});
});
