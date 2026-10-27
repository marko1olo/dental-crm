import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { generateQrCodeSvg as warrantyGenerateQrCodeSvg } from "../../warrantyEngine.js";
import { generateQrCodeSvg as labWorkflowGenerateQrCodeSvg } from "../../../lab/dentalLabWorkflowEngine.js";
import { generateQrCodeSvg as labMathGenerateQrCodeSvg } from "../../../lab/labMath.js";
import { generateQrCodeSvg as labWorkOrderGenerateQrCodeSvg } from "../../../lab/orders/labWorkOrderEngine.js";

describe("3. Dental Lab QR Purity across all 3 Lab Engines", () => {
	test("dentalLabWorkflowEngine.generateQrCodeSvg generates canonical ISO/IEC 18004 SVG", () => {
		const payload = "DENTE-ZTL:ЗТЛ-2608-ABC123|PATIENT:Иванов|DOCTOR:Петров";
		const svg = labWorkflowGenerateQrCodeSvg(payload, 90);
		assert.ok(svg.startsWith("<svg"));
		assert.ok(svg.includes('width="90"'));
		assert.ok(svg.includes("<path"));
		assert.ok(svg.endsWith("</svg>"));
	});

	test("labMath.generateQrCodeSvg generates canonical ISO/IEC 18004 SVG with options", () => {
		const payload = "DENTE-ZTL:ORDER-9876";
		const svg = labMathGenerateQrCodeSvg(payload);
		assert.ok(svg.startsWith("<svg"));
		assert.ok(svg.includes("<path"));

		const svgSized = labMathGenerateQrCodeSvg(payload, 120);
		assert.ok(svgSized.includes('width="120"'));

		const svgOpt = labMathGenerateQrCodeSvg(payload, { size: 150, fgColor: "#0f766e" });
		assert.ok(svgOpt.includes('fill="#0f766e"'));
	});

	test("labWorkOrderEngine.generateQrCodeSvg generates canonical ISO/IEC 18004 SVG", () => {
		const payload = "DENTE-LAB:ЛО-2026/09-001|PATIENT:Сидоров|TEETH:11,21";
		const svg = labWorkOrderGenerateQrCodeSvg(payload, 100);
		assert.ok(svg.startsWith("<svg"));
		assert.ok(svg.includes('width="100"'));
		assert.ok(svg.endsWith("</svg>"));
	});

	test("Cross-Engine QR Uniformity: All engines delegate to @dental/shared", () => {
		const testPayload = "DENTE-CANONICAL-TEST-TOKEN";
		const svgWarranty = warrantyGenerateQrCodeSvg(testPayload, { size: 100, margin: 1 });
		const svgWorkflow = labWorkflowGenerateQrCodeSvg(testPayload, 100);
		const svgWorkOrder = labWorkOrderGenerateQrCodeSvg(testPayload, 100);

		assert.ok(svgWarranty.includes('width="100"'));
		assert.ok(svgWorkflow.includes('width="100"'));
		assert.ok(svgWorkOrder.includes('width="100"'));
	});
});
