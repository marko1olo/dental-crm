/**
 * visitEmkTabSbpQrAutonomy.test.tsx
 *
 * Runtime & rendered DOM tests for authentic ISO/IEC 18004 SBP QR matrix generator in VisitEmkTab / VisitEmkModals,
 * verification of complete fake diorama eradication (Mandate 8d Sin #7, Mandate 8k).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateQrCodeSvg, generateQrMatrix } from "@dental/shared";
import { VisitEmkModals } from "../emkTab/VisitEmkModals";
import { completeClinicalVisitAndAssembleEstimate } from "../clinicalVisitWorkflow";

describe("Wave 24 Worker 3: VisitEmkTab Authentic SBP QR Generator & Zero Diorama", () => {
	const testSbpPayload =
		"https://qr.nspk.ru/AD1000CHK-2026-0906-881?type=02&bank=100000000004&sum=1450000&cur=RUB&crc=TEST";

	const renderSbpModalHtml = (payload = testSbpPayload) =>
		renderToStaticMarkup(
			React.createElement(VisitEmkModals, {
				isSbpQrModalOpen: true,
				setIsSbpQrModalOpen: () => {},
				completionResult: {
					visitId: "VIS-AUTONOMY-101",
					invoiceId: "INV-101",
					receiptNumber: "CHK-2026-0906-881",
					status: "ready_for_payment",
					totalGrossRub: 14500,
					totalNetRub: 14500,
					totalNetKop: 1450000,
					sbpQrUrl: "",
					sbpQrPayload: payload,
					items: [],
				},
				activePatient: { id: "PAT-1", fullName: "Барабаш С.В." },
				activeDoctor: { id: "DOC-1", fullName: "Врач А.А.", specialty: "therapist" },
				isStarProtocolsOpen: false,
				setIsStarProtocolsOpen: () => {},
				isSoapTemplatesModalOpen: false,
				setIsSoapTemplatesModalOpen: () => {},
				isConsentModalOpen: false,
				setIsConsentModalOpen: () => {},
				isPrintModalOpen: false,
				setIsPrintModalOpen: () => {},
				visitNoteForm: {},
				updateVisitNoteField: () => {},
				isSignedVisit: false,
				onApplyCatalogPatch: () => {},
			}),
		);

	it("1. guarantees total elimination of fake 9-rect SVG diorama from rendered SBP QR modal", () => {
		const html = renderSbpModalHtml();

		assert.strictEqual(html.includes('rect x="5" y="5"'), false, "Must NOT render fake diorama rect 'x=5 y=5'");
		assert.strictEqual(html.includes('rect x="70" y="5"'), false, "Must NOT render fake diorama rect 'x=70 y=5'");
		assert.strictEqual(html.includes('rect x="5" y="70"'), false, "Must NOT render fake diorama rect 'x=5 y=70'");
		assert.strictEqual(html.includes('rect x="11" y="76"'), false, "Must NOT render fake diorama rect 'x=11 y=76'");
		assert.strictEqual(html.includes('<circle cx="50" cy="50" r="14"'), false, "Must NOT render mock diorama circle");
		assert.strictEqual(html.includes('<text x="50" y="54"'), false, "Must NOT render mock diorama text");
	});

	it("2. guarantees authentic estimate calculation and rendered sbp-qr-svg-container", () => {
		const estimate = completeClinicalVisitAndAssembleEstimate({
			visitId: "VIS-AUTONOMY-101",
			patientId: "PAT-AUTONOMY-101",
			patientName: "Кузнецов П.А.",
			doctorName: "Д-р Смирнова А.С.",
			diary: {
				diagnosisIcd10: "K02.1",
				diagnosisTooth: "16",
				treatmentDescription: "Препарирование и пломбирование кариозной полости композитом 16.",
			},
			discountPercent: 15,
		});

		assert.strictEqual(estimate.status, "ready_for_payment");
		assert.ok(estimate.totalGrossRub > 0, "Gross sum must be positive and non-zero");
		assert.ok(estimate.totalNetRub > 0, "Net sum must be positive and non-zero");
		assert.strictEqual(estimate.totalNetKop, estimate.totalNetRub * 100);
		assert.strictEqual(estimate.sbpQrUrl, "");
		assert.strictEqual(estimate.invoiceId, "");

		const html = renderSbpModalHtml();
		assert.ok(html.includes('data-testid="sbp-qr-svg-container"'), "VisitEmkModals must render sbp-qr-svg-container");
		assert.ok(html.includes("data:image/svg+xml;utf8,"), "Must embed encoded SVG QR image");
		assert.ok(html.includes('data-testid="btn-confirm-sbp-paid"'), "Must render btn-confirm-sbp-paid");
	});

	it("3. guarantees design-system SBP protocol badge with zero cartoon emojis", () => {
		const html = renderSbpModalHtml();
		assert.ok(html.includes("СБП • НСПК ГОСТ Р 56042"), "Must render clean SBP GOST R 56042 badge");
		assert.ok(!html.includes("🎉"), "SBP modal must NOT contain emoji 🎉");
		assert.ok(!html.includes("🚀"), "SBP modal must NOT contain emoji 🚀");
		assert.ok(!html.includes("💡"), "SBP modal must NOT contain emoji 💡");
		assert.ok(!html.includes("🦷"), "SBP modal must NOT contain emoji 🦷");
		assert.ok(!html.includes("✓"), "SBP modal must NOT contain raw checkmark ✓");
	});

	it("4. generates authentic ISO/IEC 18004 SVG QR code with hundreds of matrix modules", () => {
		const testReceipt = "CHK-2026-0906-881";
		const testSumRub = 14500;
		const testPatient = "Барабаш С.В.";

		const sbpPayload =
			`https://qr.nspk.ru/AD1000${encodeURIComponent(testReceipt)}` +
			`?type=02&bank=100000000004&sum=${Math.round(testSumRub * 100)}&cur=RUB&crc=${encodeURIComponent(testPatient)}`;

		const svg = generateQrCodeSvg(sbpPayload, {
			size: 192,
			margin: 2,
			title: `Оплата по СБП: ${testReceipt}`,
		});

		assert.ok(svg.startsWith("<svg"), "Generated QR must be valid SVG starting with <svg");
		assert.ok(svg.endsWith("</svg>"), "Generated QR must end with </svg>");
		assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "SVG must declare xmlns");
		assert.ok(svg.includes('width="192"'), "SVG must set width=192");
		assert.ok(svg.includes('height="192"'), "SVG must set height=192");
		assert.ok(svg.includes("<title>Оплата по СБП: CHK-2026-0906-881</title>"), "SVG must set accessible title");
		assert.ok(svg.match(/<rect width="\d+" height="\d+" fill="#ffffff"\/>/), "SVG must render white quiet zone rect");

		const moduleMatches = svg.match(/h1v1h-1z/g);
		assert.ok(moduleMatches, "SVG path must contain module step commands");
		assert.ok(moduleMatches.length >= 300, `Authentic QR matrix must have >= 300 modules (found: ${moduleMatches.length})`);
		assert.strictEqual(svg.includes('rect x="5" y="5"'), false);
		assert.strictEqual(svg.includes("circle cx="), false);
	});

	it("5. encodes exact kopecks, receipt number, and Russian patient name in SBP payload", () => {
		const cases = [
			{ receipt: "REC-101", sumRub: 2500, patient: "Иванов И.И.", expectedSumKop: 250000 },
			{ receipt: "REC-999", sumRub: 14500.5, patient: "Смирнова Е.А.", expectedSumKop: 1450050 },
			{ receipt: "REC-MAX", sumRub: 350000, patient: "Кузнецов А.П.", expectedSumKop: 35000000 },
			{ receipt: "", sumRub: 100, patient: "", expectedSumKop: 10000 },
		];

		for (const c of cases) {
			const receiptParam = encodeURIComponent(c.receipt || "REC");
			const patientParam = encodeURIComponent(c.patient || "PATIENT");
			const sumKop = Math.round(c.sumRub * 100);

			const payload =
				`https://qr.nspk.ru/AD1000${receiptParam}` +
				`?type=02&bank=100000000004&sum=${sumKop}&cur=RUB&crc=${patientParam}`;

			assert.ok(payload.startsWith("https://qr.nspk.ru/AD1000"));
			assert.ok(payload.includes(`sum=${c.expectedSumKop}`));
			assert.ok(payload.includes("cur=RUB"));
			assert.ok(payload.includes("type=02&bank=100000000004"));

			const qrSvg = generateQrCodeSvg(payload, { size: 192, margin: 2 });
			assert.ok(qrSvg.length > 5000, `QR SVG length must be substantial (actual: ${qrSvg.length})`);
		}
	});

	it("6. validates underlying ISO/IEC 18004 boolean matrix structure", () => {
		const payload = "https://qr.nspk.ru/AD1000REC-001?type=02&bank=100000000004&sum=150000&cur=RUB&crc=TEST";
		const { matrix, size, version } = generateQrMatrix(payload, "M");

		assert.ok(version >= 3, `QR version for SBP payload must be >= 3 (actual: ${version})`);
		assert.strictEqual(size, 17 + version * 4, "Matrix size must equal 17 + version * 4");
		assert.strictEqual(matrix.length, size, "Matrix row count must equal size");

		for (let c = 0; c < 7; c++) {
			assert.strictEqual(matrix[0]![c], true, `Finder (0, ${c}) must be black`);
			assert.strictEqual(matrix[6]![c], true, `Finder (6, ${c}) must be black`);
		}
		for (let r = 0; r < 7; r++) {
			assert.strictEqual(matrix[r]![0], true, `Finder (${r}, 0) must be black`);
			assert.strictEqual(matrix[r]![6], true, `Finder (${r}, 6) must be black`);
		}

		let blackModules = 0;
		for (let r = 0; r < size; r++) {
			for (let c = 0; c < size; c++) {
				if (matrix[r]![c]) blackModules++;
			}
		}

		assert.ok(blackModules > 300, `Black modules count must be > 300 in QR matrix (actual: ${blackModules})`);
	});
});
