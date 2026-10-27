import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { generateQrCodeSvg as warrantyGenerateQrCodeSvg } from "../../warrantyEngine.js";

describe("1. Warranty Engine QR Purity — Canonical ISO/IEC 18004 Vector SVG", () => {
	test("warrantyEngine.generateQrCodeSvg generates valid, standards-compliant SVG", () => {
		const url = "https://dente-clinic.ru/portal/warranty?cert=WAR-2026-001&card=043-U100";
		const svg = warrantyGenerateQrCodeSvg(url, { size: 160 });

		assert.ok(svg.startsWith("<svg"), "Must start with <svg tag");
		assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
		assert.ok(svg.includes('viewBox="0 0'));
		assert.ok(svg.includes('width="160"'));
		assert.ok(svg.includes('height="160"'));
		assert.ok(svg.includes("<rect"));
		assert.ok(svg.includes("<path"));
		assert.ok(svg.endsWith("</svg>"));
	});

	test("warrantyEngine.generateQrCodeSvg supports custom colors and margins", () => {
		const payload = "WAR-2026-TEST-PAYLOAD";
		const svgCustom = warrantyGenerateQrCodeSvg(payload, {
			size: 200,
			margin: 2,
			fgColor: "#1e293b",
			bgColor: "#f8fafc",
		});
		assert.ok(svgCustom.includes('fill="#f8fafc"'));
		assert.ok(svgCustom.includes('fill="#1e293b"'));
		assert.ok(svgCustom.includes('width="200"'));
	});

	test("Exterminated fake pseudo-QR generator: distinct inputs yield distinct outputs", () => {
		const svg1 = warrantyGenerateQrCodeSvg("https://dente.ru/w/1");
		const svg2 = warrantyGenerateQrCodeSvg("https://dente.ru/w/2");
		assert.notEqual(svg1, svg2);
		const svg1Again = warrantyGenerateQrCodeSvg("https://dente.ru/w/1");
		assert.equal(svg1, svg1Again);
	});
});
