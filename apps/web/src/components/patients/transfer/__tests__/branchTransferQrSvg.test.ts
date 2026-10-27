import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	generateTransferVerificationQrDataUri,
	generateTransferVerificationQrSvg,
} from "../branchTransferEngine.js";
import { createTestSnapshot } from "./testSnapshotHelper.js";

describe("Branch Transfer QR Code SVG Generation", () => {
	it("4. Eliminates the fake static 8-rectangle SVG diorama completely", () => {
		const snapshot = createTestSnapshot();
		const svg = generateTransferVerificationQrSvg(snapshot, 200);

		assert.ok(svg.includes("<svg"), "Must produce valid SVG");
		assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "Must have standard SVG namespace");
		assert.ok(svg.includes('width="200"'), "Must respect requested width");
		assert.ok(svg.includes('height="200"'), "Must respect requested height");
		assert.ok(svg.includes("viewBox="), "Must contain scalable viewBox");
		assert.ok(svg.includes("crispEdges"), "Must use crispEdges for barcode scanner readability");

		assert.ok(!svg.includes('viewBox="0 0 100 100"'), "Must NOT have fake fixed 0 0 100 100");
		assert.ok(!svg.includes('rect x="10" y="10" width="30" height="30"'), "Zero fake static rect 1");
		assert.ok(!svg.includes('rect x="60" y="10" width="30" height="30"'), "Zero fake static rect 2");
		assert.ok(!svg.includes('rect x="10" y="60" width="30" height="30"'), "Zero fake static rect 3");
		assert.ok(!svg.includes('rect x="45" y="45" width="10" height="10"'), "Zero fake static center dot");

		assert.ok(svg.includes("<path d="), "Must contain SVG path element for QR code modules");
		assert.ok(svg.length > 500, `Authentic QR SVG must be detailed (actual: ${svg.length})`);
	});

	it("5. Supports direct string payload or PatientClinicalSnapshot polymorphism", () => {
		const testPayload = "DENTE:TRF:SNAP-CUSTOM:PAT-999:CHECKSUM12345678";
		const svgFromString = generateTransferVerificationQrSvg(testPayload, 150);

		assert.ok(svgFromString.includes("<svg"), "Must generate SVG from raw payload string");
		assert.ok(svgFromString.includes('width="150"'), "Must respect custom size");

		const dataUriFromString = generateTransferVerificationQrDataUri(testPayload, 150);
		assert.ok(dataUriFromString.startsWith("data:image/svg+xml;utf8,"), "Data URI must use standard scheme");
		assert.ok(decodeURIComponent(dataUriFromString).includes("<svg"), "Decoded data URI must contain SVG");
	});

	it("6. Dynamically differentiates QR codes for different patient transfer data", () => {
		const snapshotA = createTestSnapshot();
		const snapshotB = createTestSnapshot({
			staffName: "Петров С. В.",
			transferReasonRu: "Трансфер в связи со сменой места жительства",
		});

		const svgA = generateTransferVerificationQrSvg(snapshotA);
		const svgB = generateTransferVerificationQrSvg(snapshotB);

		assert.notEqual(svgA, svgB, "QR code SVG must vary dynamically based on patient snapshot data");
	});
});
