/**
 * informedConsentVectorPdfA.test.tsx
 *
 * Unit tests for Vector SVG Stylus Signing & ISO 19005-1 (PDF/A-1b) Generation (Mandates 8e, 8i, 8k, 8n):
 * - Vector SVG stylus pad (using <svg>, NOT <canvas>)
 * - PDF/A generation with embedded sRGB output intent and XMP metadata
 * - Confirmation in 1 click with verificationMethod: "tablet_stylus"
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { renderToString } from "react-dom/server";
import {
	InformedConsentModal,
	type SignedConsentPayload,
} from "../InformedConsentModal.js";
import {
	generatePdfA1bDocument,
	type ConsentPdfAOptions,
} from "../signaturePadMath.js";

describe("Informed Consent Vector SVG Stylus & ISO 19005-1 PDF/A-1b Engine", () => {
	const mockPatient = {
		fullName: "Кузнецов Дмитрий Иванович",
		birthDate: "03.11.1990",
		passport: "4512 № 334455",
		phone: "+7 (926) 777-88-99",
		cardNumber: "043-2026/102",
	};

	it("renders vector SVG touch pad when initialVerificationMethod is tablet_stylus without canvas element", () => {
		const html = renderToString(
			<InformedConsentModal
				isOpen={true}
				onClose={() => {}}
				initialMode="single"
				initialVerificationMethod="tablet_stylus"
				patient={mockPatient}
				doctorName="Д-р Иванов А. С."
				diagnosisIcd="K02.1"
				toothNumbers="3.6"
			/>,
		);

		// Assert NO canvas
		assert.ok(!html.includes("<canvas"), "Must not use canvas element");
		assert.ok(!html.includes("consent-canvas-element"), "Must not use legacy canvas class");

		// Assert vector SVG pad is present
		assert.ok(html.includes('data-testid="consent-vector-pad-svg"'), "Must render vector SVG pad");
		assert.ok(html.includes('data-testid="btn-confirm-tablet-signed"'), "Must render tablet confirm button");
		assert.ok(html.includes('data-testid="btn-download-pdfa"'), "Must render download PDF/A button");
	});

	it("generates valid ISO 19005-1 PDF/A-1b binary document with sRGB and XMP metadata", () => {
		const options: ConsentPdfAOptions = {
			clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
			clinicAddress: "г. Москва, ул. Клиническая, д. 10",
			patientName: "Кузнецов Дмитрий Иванович",
			patientBirthDate: "03.11.1990",
			medicalCardNumber: "043-2026/102",
			doctorName: "Д-р Иванов А. С.",
			documentTitle: "Информированное добровольное согласие на терапевтическое лечение",
			documentCode: "ИДС-01-ТЕР",
			documentText: "Я, Кузнецов Дмитрий Иванович, даю согласие на лечение зуба 3.6.",
			signedAtIso: new Date().toISOString(),
			integrityHash: "a".repeat(64),
			verificationMethod: "tablet_stylus",
			strokes: [
				{
					points: [
						{ x: 10, y: 10, time: 1000 },
						{ x: 50, y: 50, time: 1050 },
						{ x: 100, y: 20, time: 1100 },
					],
					color: "#0f172a",
				},
			],
		};

		const pdfBytes = generatePdfA1bDocument(options);
		assert.ok(pdfBytes instanceof Uint8Array);
		assert.ok(pdfBytes.length > 500, "PDF/A document must be non-empty");

		const pdfString = new TextDecoder().decode(pdfBytes);
		assert.ok(pdfString.startsWith("%PDF-1.4"), "PDF must have 1.4 header for PDF/A-1b");
		assert.ok(pdfString.includes("/GTS_PDFA1"), "Must include PDF/A-1b OutputIntent");
		assert.ok(pdfString.includes("http://www.aiim.org/pdfa/ns/id/"), "Must include PDF/A XMP namespace");
		assert.ok(pdfString.includes("<pdfaid:part>1</pdfaid:part>"), "Must declare PDF/A Part 1");
		assert.ok(pdfString.includes("<pdfaid:conformance>B</pdfaid:conformance>"), "Must declare conformance B");
		assert.ok(pdfString.includes("%%EOF"), "Must contain valid PDF trailer and EOF");
	});
});
